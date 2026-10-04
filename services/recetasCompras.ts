import {collection,doc,getDocsFromServer,runTransaction,serverTimestamp} from 'firebase/firestore';
import {db} from '../firebase';
import {auth,obtenerUidActual} from './auth';
import {INGREDIENTES,type IngredienteId} from '../data/recetas';
import {esIngrediente} from './recetasModelo';
import {validarCompra,type UnidadCompra} from './comprasModelo';
/** ID estable por ingrediente: reintentar esta función no repite la misma compra. */
export async function agregarIngredienteACompras(id:IngredienteId,cantidad:string,unidad:UnidadCompra):Promise<'agregado'|'pendiente'|'comprado'>{
 const uid=obtenerUidActual();if(!Object.hasOwn(INGREDIENTES,id))throw new Error('Ingrediente inválido.');
 const datos=validarCompra(INGREDIENTES[id].nombre,cantidad,unidad);
 const lista=await getDocsFromServer(collection(db,'usuarios',uid,'listaCompras'));
 if(auth.currentUser?.uid!==uid)throw new Error('La sesión cambió.');
 const iguales=lista.docs.filter(d=>esIngrediente(d.data().nombre,id));
 if(iguales.some(d=>!d.data().comprado))return 'pendiente';
 if(iguales.length)return 'comprado';
 const ref=doc(db,'usuarios',uid,'listaCompras',`receta-${id}`);
 return runTransaction(db,async tx=>{
  if(auth.currentUser?.uid!==uid)throw new Error('La sesión cambió.');
  const previo=await tx.get(ref);if(previo.exists())return previo.data().comprado?'comprado':'pendiente';
  tx.set(ref,{...datos,comprado:false,creadoEn:serverTimestamp(),actualizadoEn:serverTimestamp()});return 'agregado';
 });
}
