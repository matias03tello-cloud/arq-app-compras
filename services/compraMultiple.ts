import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { auth, obtenerUidActual } from './auth';
import { cantidadValida, UBICACIONES } from '../security/identidadProducto';
import { normalizarFechaVencimiento } from './fechas';
import { validarProducto, type NuevoProductoInventario } from './productos';
export interface EntradaCompra {id:string;producto:NuevoProductoInventario}
export function validarEntrada(p:NuevoProductoInventario):NuevoProductoInventario {
 const {activo:_activo,origen:_origen,...identidad}=validarProducto({...p,formato:p.formato || '',unidad:p.unidad || 'unidad',activo:true});
 if(!cantidadValida(p.cantidad,identidad.codigoBarras,identidad.unidad))throw new Error('Cantidad inválida.');
 const ubicacion=p.ubicacion || 'Despensa';if(!UBICACIONES.includes(ubicacion))throw new Error('Ubicación inválida.');
 return {...identidad,cantidad:p.cantidad,ubicacion,vencimiento:p.vencimiento==='Sin fecha'?'Sin fecha':normalizarFechaVencimiento(p.vencimiento)};
}
/** Dos productos por transacción, con testigo privado que sobrevive al consumo del lote. */
export async function guardarCompraMultiple(entradas:EntradaCompra[],confirmar:(ids:string[])=>void) {
 const uid=obtenerUidActual();if(!entradas.length || entradas.length>20)throw new Error('Prepara entre 1 y 20 registros por compra.');
 for(let inicio=0;inicio<entradas.length;inicio+=2){
  const grupo=entradas.slice(inicio,inicio+2).map(e=>({...e,producto:validarEntrada(e.producto)}));
  if(auth.currentUser?.uid!==uid)throw new Error('La sesión cambió.');
  await runTransaction(db,async tx=>{
   if(auth.currentUser?.uid!==uid)throw new Error('La sesión cambió.');
   const refs=grupo.map(e=>doc(db,'usuarios',uid,'comprasRegistradas',e.id));
   const testigos=await Promise.all(refs.map(r=>tx.get(r)));
   grupo.forEach((e,i)=>{
    if(testigos[i].exists()){if(testigos[i].data()?.codigoBarras!==e.producto.codigoBarras)throw new Error('El registro de esta compra cambió.');return;}
    tx.set(doc(db,'usuarios',uid,'inventario',e.id),{...e.producto,fechaRegistro:new Date().toISOString(),creadoEn:serverTimestamp()});
    tx.set(refs[i],{codigoBarras:e.producto.codigoBarras,creadoEn:serverTimestamp()});
   });
  });
  if(auth.currentUser?.uid!==uid)throw new Error('La sesión cambió.');
  confirmar(grupo.map(e=>e.id));
 }
}
export function nuevaEntrada(producto:NuevoProductoInventario):EntradaCompra {
 const uid=obtenerUidActual();return {id:doc(collection(db,'usuarios',uid,'inventario')).id,producto:validarEntrada(producto)};
}
