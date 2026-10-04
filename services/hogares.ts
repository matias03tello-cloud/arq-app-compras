import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../firebase';
import { auth, obtenerUidActual } from './auth';
import { validarCompra, type UnidadCompra } from './comprasModelo';
import { normalizarProducto } from './inventarioModelo';
import type { ProductoInventario } from './productos';
import type { Compra } from './compras';
export interface Hogar { nombre: string; propietario: string; miembros: string[]; nombres: Record<string,string> }
interface EstadoHogar { id: string; hogar?: Hogar; productos: ProductoInventario[]; compras: Compra[]; cache: boolean; error: string }
const vacio = (id: string): EstadoHogar => ({ id, productos: [], compras: [], cache: true, error: '' });
export function useHogar() {
  const uid = auth.currentUser?.uid;
  const [referencias, setReferencias] = useState<{uid?: string; items: {id: string; nombre: string}[]; cache: boolean; error: string}>({items: [],cache:true,error:''});
  const [elegido, setElegido] = useState(''); const [revision, setRevision] = useState(0);
  const grupos = referencias.uid === uid ? referencias.items : [];
  const id = grupos.some(g => g.id === elegido) ? elegido : grupos[0]?.id || '';
  const [estado, setEstado] = useState<EstadoHogar>(vacio(''));
  const [ocupado, setOcupado] = useState(false); const bloqueo = useRef(false); const [errorAccion, setErrorAccion] = useState(''); const [codigo, setCodigo] = useState('');
  useEffect(() => {
    if (!uid) return;
    let activo = true;
    const stop = onSnapshot(collection(db,'usuarios',uid,'hogares'),{includeMetadataChanges:true},s => {
      if (activo && auth.currentUser?.uid === uid) setReferencias({uid,items:s.docs.map(d=>({id:d.id,nombre:String(d.data().nombre)})),cache:s.metadata.fromCache || s.metadata.hasPendingWrites,error:''});
    },()=> { if (activo) setReferencias({uid,items:[],cache:true,error:'No pudimos consultar tus hogares. Revisa conexión y reglas.'}); });
    const stopAuth = onAuthStateChanged(auth,u => { if (u?.uid !== uid) { activo=false;stop();setReferencias({items:[],cache:true,error:''});setCodigo(''); } });
    return () => { activo=false;stop();stopAuth(); };
  },[uid,revision]);
  useEffect(() => {
    if (!id || !uid) return;
    let activo = true; const stops: (()=>void)[] = [];
    const fuentes: boolean[] = []; const caches: boolean[] = []; let hogar: Hogar | undefined; let productos: ProductoInventario[] = []; let compras: Compra[] = [];
    const vigente = () => activo && auth.currentUser?.uid === uid;
    const emitir = () => { if (vigente() && fuentes[0] && fuentes[1] && fuentes[2]) setEstado({id,hogar,productos,compras,cache:caches.some(Boolean),error:''}); };
    const fallar = () => { if (!vigente()) return; activo=false;stops.forEach(fn=>fn());setEstado({...vacio(id),error:'El hogar no está disponible o ya no tienes acceso. Sus datos se retiraron de esta vista.'});setCodigo(''); };
    stops.push(onSnapshot(doc(db,'hogares',id),{includeMetadataChanges:true},s=> { if (!vigente()) return;if (!s.exists()) { fallar();return; } hogar=s.data() as Hogar;fuentes[0]=true;caches[0]=s.metadata.fromCache || s.metadata.hasPendingWrites;emitir(); },fallar));
    stops.push(onSnapshot(collection(db,'hogares',id,'inventario'),{includeMetadataChanges:true},s=>{if(!vigente())return;productos=s.docs.map(d=>normalizarProducto(d.data(),d.id));fuentes[1]=true;caches[1]=s.metadata.fromCache || s.metadata.hasPendingWrites;emitir();},fallar));
    stops.push(onSnapshot(collection(db,'hogares',id,'listaCompras'),{includeMetadataChanges:true},s=>{if(!vigente())return;compras=s.docs.map(d=>({...d.data(),id:d.id} as Compra)).sort((a,b)=>Number(a.comprado)-Number(b.comprado)||a.nombre.localeCompare(b.nombre,'es'));fuentes[2]=true;caches[2]=s.metadata.fromCache || s.metadata.hasPendingWrites;emitir();},fallar));
    const stopAuth=onAuthStateChanged(auth,u=>{if(u?.uid!==uid)fallar();});stops.push(stopAuth);
    return ()=>{activo=false;stops.forEach(fn=>fn());};
  },[id,uid,revision]);
  const vista = estado.id === id ? estado : vacio(id);
  async function ejecutar(fn:(uid:string)=>Promise<void>, requiereHogar=true) {
    if (bloqueo.current) return false;
    if (!uid || obtenerUidActual() !== uid || referencias.uid !== uid || referencias.cache || referencias.error || (requiereHogar && (!vista.hogar || vista.cache || vista.error))) {setErrorAccion('Espera la conexión y la confirmación de tus permisos.');return false;}
    bloqueo.current=true;setOcupado(true);setErrorAccion('');
    try { await fn(uid);return auth.currentUser?.uid === uid; }
    catch(e) { if(auth.currentUser?.uid===uid) setErrorAccion(e instanceof Error && !('code' in e) ? e.message : 'No pudimos completar el cambio. Revisa conexión, permisos o pide una invitación nueva.');return false; }
    finally {bloqueo.current=false;setOcupado(false);}
  }
  async function gestionar(accion:string,datos:Record<string,string>={}) {
    return ejecutar(async actual=>{
      const call=httpsCallable<Record<string,string>,{id:string;codigo?:string}>(getFunctions(app,'southamerica-west1'),'gestionarHogar');
      const r=await call({accion,...(['crear','entrar'].includes(accion)?{}:{id}),...datos});
      if(auth.currentUser?.uid===actual){setCodigo(r.data.codigo || '');setElegido(r.data.id);}
    },!['crear','entrar','cerrar'].includes(accion));
  }
  return { ...vista, id, grupos, ocupado, errorAccion, codigo, referenciasCache: referencias.cache, errorReferencias: referencias.error,
    elegir: (nuevo:string)=>{setElegido(nuevo);setCodigo('');setErrorAccion('');},reintentar:()=>setRevision(r=>r+1),gestionar,
    agregarCompra:(nombre:string,cantidad:string,unidad:UnidadCompra)=>ejecutar(async()=>{ const datos=validarCompra(nombre,cantidad,unidad);await addDoc(collection(db,'hogares',id,'listaCompras'),{...datos,comprado:false,creadoEn:serverTimestamp(),actualizadoEn:serverTimestamp()});}),
    marcar:(item:Compra)=>ejecutar(()=>updateDoc(doc(db,'hogares',id,'listaCompras',item.id),{comprado:!item.comprado,actualizadoEn:serverTimestamp()})),
    borrarCompra:(item:Compra)=>ejecutar(()=>deleteDoc(doc(db,'hogares',id,'listaCompras',item.id))),
    borrarProducto:(item:ProductoInventario)=>ejecutar(()=>deleteDoc(doc(db,'hogares',id,'inventario',item.id))),
    compartir:(item:ProductoInventario)=>ejecutar(async()=>{
      const {id:_id,...datos}=item;
      await addDoc(collection(db,'hogares',id,'inventario'),{...datos,formato:datos.formato || '',unidad:datos.unidad || 'unidad',creadoEn:serverTimestamp()});
    }),
  };
}
