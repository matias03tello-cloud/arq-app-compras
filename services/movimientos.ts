import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { auth, obtenerUidActual } from './auth';
import { idValido } from '../security/validation';
import { calcularSalida, MOTIVOS_DESPERDICIO, type TipoMovimiento } from './movimientosModelo';
export interface Movimiento {id:string;productoId:string;codigoBarras:string;nombre:string;marca:string;formato:string;unidad:string;vencimiento:string;tipo:TipoMovimiento;motivo:string;cantidad:number;restante:number;creadoEn?:{toDate:()=>Date}}
export async function registrarMovimiento(id:string,tipo:TipoMovimiento,cantidad:string,motivo:string,hogar?:string,eventoId?:string) {
  const uid=obtenerUidActual();
  if(!['consumo','desperdicio'].includes(tipo) || (tipo==='desperdicio' && !MOTIVOS_DESPERDICIO.includes(motivo as typeof MOTIVOS_DESPERDICIO[number]))) throw new Error('Selecciona un movimiento válido.');
  if(!hogar && !id.startsWith('v5:')) throw new Error('Vuelve a registrar este lote antiguo para gestionar sus cantidades.');
  const base=hogar ? ['hogares',idValido(hogar)] : ['usuarios',uid];
  const productoId=idValido(hogar?id:id.slice(3));
  const ref=doc(db,base[0],base[1],'inventario',productoId);const event=eventoId ? doc(db,base[0],base[1],'historial',idValido(eventoId)) : doc(collection(db,base[0],base[1],'historial'));
  const testigo=doc(db,base[0],base[1],'salidasConfirmadas',productoId);
  await runTransaction(db,async tx=>{
    if(auth.currentUser?.uid!==uid)throw new Error('La sesión cambió.');
    const anterior=await tx.get(event);if(anterior.exists())return;
    const snap=await tx.get(ref);if(!snap.exists())throw new Error('El lote ya no está disponible. Actualiza tu despensa.');
    const p=snap.data();const salida=calcularSalida(Number(p.cantidad),cantidad,p.codigoBarras,p.unidad || 'unidad');
    tx.set(event,{productoId,codigoBarras:p.codigoBarras,nombre:p.nombre,marca:p.marca,formato:p.formato || '',unidad:p.unidad || 'unidad',vencimiento:p.vencimiento,tipo,motivo:tipo==='consumo'?'Consumido':motivo,...salida,creadoEn:serverTimestamp()});
    tx.set(testigo,{eventoId:event.id});
    if(salida.restante===0)tx.delete(ref);else tx.update(ref,{cantidad:salida.restante});
  });
}
export function useHistorial(hogar?:string) {
  const uid=auth.currentUser?.uid;const scope=`${uid || ''}:${hogar || ''}`;
  const [revision,setRevision]=useState(0);const [tope,setTope]=useState(50);
  const [estado,setEstado]=useState<{scope:string;items:Movimiento[];cache:boolean;error:string}>({scope:'',items:[],cache:true,error:''});
  useEffect(()=>{
    if(!uid)return;let activo=true;const stops:(()=>void)[]=[];
    const vigente=()=>activo && auth.currentUser?.uid===uid;
    const fallar=()=>{if(!vigente())return;activo=false;stops.forEach(s=>s());setEstado({scope,items:[],cache:true,error:'No pudimos consultar el historial o ya no tienes acceso.'});};
    if(hogar)stops.push(onSnapshot(doc(db,'hogares',hogar),s=>{if(vigente() && (!s.exists() || s.data().estado!=='activo' || !s.data().miembros.includes(uid)))fallar();},fallar));
    const base=hogar?['hogares',hogar]:['usuarios',uid];
    stops.push(onSnapshot(query(collection(db,base[0],base[1],'historial'),orderBy('creadoEn','desc'),limit(tope+1)),{includeMetadataChanges:true},s=>{if(vigente())setEstado({scope,items:s.docs.map(d=>({...d.data(),id:d.id} as Movimiento)),cache:s.metadata.fromCache || s.metadata.hasPendingWrites,error:''});},fallar));
    stops.push(onAuthStateChanged(auth,u=>{if(u?.uid!==uid)fallar();}));return()=>{activo=false;stops.forEach(s=>s());};
  },[uid,hogar,scope,revision,tope]);
  const actual=estado.scope===scope?estado:{scope,items:[],cache:true,error:''};
  return {...actual,items:actual.items.slice(0,tope),hayMas:actual.items.length>tope,tope,reintentar:()=>setRevision(r=>r+1),mas:()=>setTope(n=>Math.min(n+50,500))};
}
