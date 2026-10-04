import {createContext,useContext,useRef,useState,type ReactNode} from 'react';
import {auth,obtenerUidActual} from '../../services/auth';
import {guardarCompraMultiple,nuevaEntrada,type EntradaCompra} from '../../services/compraMultiple';
import type {NuevoProductoInventario} from '../../services/productos';
interface Estado {items:EntradaCompra[];confirmados:string[];ocupado:boolean;iniciado:boolean;error:string;agregar:(p:NuevoProductoInventario)=>void;quitar:(id:string)=>void;guardar:()=>Promise<void>;terminar:()=>void}
const Contexto=createContext<Estado|null>(null);
export function CompraMultipleProvider({children}:{children:ReactNode}) {
 const uid=auth.currentUser?.uid;const [items,setItems]=useState<EntradaCompra[]>([]);const [confirmados,setConfirmados]=useState<string[]>([]);const [ocupado,setOcupado]=useState(false);const [iniciado,setIniciado]=useState(false);const [error,setError]=useState('');const bloqueo=useRef(false);const actuales=useRef<EntradaCompra[]>([]);
 const vigente=()=>!!uid && auth.currentUser?.uid===uid;
 function agregar(p:NuevoProductoInventario){if(!vigente() || iniciado || bloqueo.current)throw new Error('Termina la compra anterior antes de preparar otra.');if(actuales.current.length>=20)throw new Error('Esta compra admite hasta 20 registros.');const e=nuevaEntrada(p);actuales.current=[...actuales.current,e];setItems(actuales.current);}
 async function guardar(){if(bloqueo.current || !vigente())return;bloqueo.current=true;setOcupado(true);setIniciado(true);setError('');try{obtenerUidActual();await guardarCompraMultiple(items.filter(e=>!confirmados.includes(e.id)),ids=>{if(vigente())setConfirmados(a=>[...new Set([...a,...ids])]);});}catch(e){if(vigente())setError(e instanceof Error && !('code' in e)?e.message:'No pudimos terminar de guardar. Los registros confirmados se conservan; reintenta los pendientes con conexión.');}finally{bloqueo.current=false;setOcupado(false);}}
 return <Contexto.Provider value={{items,confirmados,ocupado,iniciado,error,agregar,guardar,quitar:id=>{if(!iniciado && !bloqueo.current){actuales.current=actuales.current.filter(e=>e.id!==id);setItems(actuales.current);}},terminar:()=>{if(!bloqueo.current){actuales.current=[];setItems([]);setConfirmados([]);setIniciado(false);setError('');}}}}>{children}</Contexto.Provider>;
}
export function useCompraMultiple(){const v=useContext(Contexto);if(!v)throw new Error('La compra debe abrirse dentro de tu sesión.');return v;}
