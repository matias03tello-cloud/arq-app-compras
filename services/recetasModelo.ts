import {INGREDIENTES,RECETAS,type IngredienteId,type Receta} from '../data/recetas';
import {calcularDiasRestantes} from './fechas';
import type {ProductoInventario} from './productos';
export const normalizarAlimento=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
// Se evita inferir ingredientes por marca, categoría o nombres de productos compuestos.
const COMPUESTO=/\b(sabor|galletas?|bebida|harina|salsa|instantaneos?|postre|pure|helado|jugo|yogur|yoghurt|snack|sopa|crema|dulce|chocolate|hamburguesa|croqueta|condensad[oa]|rellen[oa]|proteina)\b/;
export function esIngrediente(nombre:string,id:IngredienteId){
 const n=normalizarAlimento(nombre);if(COMPUESTO.test(n) || /\barroz con leche\b/.test(n) || /\bleche de (almendra|soya|soja|avena|coco|arroz)\b/.test(n) || /\ben polvo\b/.test(n))return false;
 if(id==='arroz' && /\b(fideos|pasta|tallarines|noodles)\b/.test(n))return false;
 if(id==='porotos' && /\bverdes\b/.test(n))return false;
 if(id==='zapallo' && /\bzapallo italiano\b/.test(n))return false;
 return new RegExp(`\\b(?:${INGREDIENTES[id].patron})\\b`).test(n);
}
export interface IdeaReceta {receta:Receta;disponibles:{id:IngredienteId;lotes:ProductoInventario[]}[];faltantes:Receta['ingredientes'];urgentes:number;sinFecha:number}
export function sugerirRecetas(productos:ProductoInventario[],hoy=new Date()):IdeaReceta[]{
 const elegibles=productos.filter(p=>{const d=calcularDiasRestantes(p.vencimiento,hoy);return p.cantidad>0 && (p.vencimiento==='Sin fecha' || (d!==null && d>=0));});
 const grupos=new Map<IngredienteId,ProductoInventario[]>();
 for(const id of Object.keys(INGREDIENTES) as IngredienteId[])grupos.set(id,elegibles.filter(p=>esIngrediente(p.nombre,id)).sort((a,b)=>(calcularDiasRestantes(a.vencimiento,hoy)??Infinity)-(calcularDiasRestantes(b.vencimiento,hoy)??Infinity)));
 return RECETAS.map(receta=>{
  const disponibles=receta.ingredientes.filter(a=>grupos.get(a.id)?.length).map(a=>({id:a.id,lotes:grupos.get(a.id)!}));
  const faltantes=receta.ingredientes.filter(a=>!grupos.get(a.id)?.length);
  const urgentes=disponibles.filter(a=>a.lotes.some(p=>{const d=calcularDiasRestantes(p.vencimiento,hoy);return d!==null && d>=0 && d<=3;})).length;
  const sinFecha=disponibles.filter(a=>a.lotes.some(p=>p.vencimiento==='Sin fecha')).length;
  return {receta,disponibles,faltantes,urgentes,sinFecha};
 }).sort((a,b)=>b.urgentes-a.urgentes || a.faltantes.length-b.faltantes.length || b.disponibles.length-a.disponibles.length || a.receta.nombre.localeCompare(b.receta.nombre,'es'));
}
