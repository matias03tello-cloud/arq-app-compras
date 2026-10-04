import AsyncStorage from '@react-native-async-storage/async-storage';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from './auth';
import * as dispositivo from './avisosDispositivo';
import {AVISOS_INICIALES,planificarAvisos,preferenciasValidas,type PreferenciasAvisos} from './avisosModelo';
export {AVISOS_INICIALES};export type {PreferenciasAvisos};
export const avisosDisponibles=dispositivo.disponible;
const clave=(uid:string)=>`@frescapp_avisos:${uid}`;
let revision=0;let cola=Promise.resolve();let firma='';
const listeners=new Set<()=>void>();export const observarAvisos=(f:()=>void)=>{listeners.add(f);return()=>{listeners.delete(f);};};
let error='';export const errorAvisos=()=>error;
function avisar(e:string){if(error===e)return;error=e;listeners.forEach(f=>f());}
function encolar(accion:()=>Promise<void>){const tarea=cola.then(accion);cola=tarea.catch(()=>{avisar('No pudimos actualizar los avisos. Abre Ajustes y reintenta con el permiso habilitado.');});return tarea;}
export function cancelarAvisos(){revision++;firma='';return encolar(()=>dispositivo.limpiar());}
/** Instalar desde la raíz: también cancela cuando se cierra sesión o cambia la cuenta. */
export function iniciarAvisos(){return onAuthStateChanged(auth,()=>{void cancelarAvisos().catch(()=>{});});}
export async function leerPreferenciasAvisos(uid:string){const texto=await AsyncStorage.getItem(clave(uid));if(!texto)return {...AVISOS_INICIALES};try{return preferenciasValidas(JSON.parse(texto));}catch{return {...AVISOS_INICIALES};}}
export async function guardarPreferenciasAvisos(p:PreferenciasAvisos){const uid=auth.currentUser?.uid;if(!uid)throw new Error('Inicia sesión.');preferenciasValidas(p);if(p.activo && !await dispositivo.permiso(true))throw new Error('Permiso denegado. Puedes habilitar las notificaciones desde Ajustes de Android.');if(auth.currentUser?.uid!==uid)throw new Error('La sesión cambió.');await AsyncStorage.setItem(clave(uid),JSON.stringify(p));await cancelarAvisos();listeners.forEach(f=>f());}
export function actualizarAvisos(uid:string,productos:{vencimiento:string;cantidad:number}[],p:PreferenciasAvisos){
 const plan=planificarAvisos(productos,p);const nueva=JSON.stringify([uid,plan.map(a=>[a.fecha.getTime(),a.registros])]);if(nueva===firma)return Promise.resolve();const rev=++revision;
 return encolar(async()=>{
  if(rev!==revision || auth.currentUser?.uid!==uid)return;
  await dispositivo.limpiar();firma='';
  if(rev!==revision || auth.currentUser?.uid!==uid)return;
  if(p.activo && !await dispositivo.permiso()){avisar('Los avisos están activados en FrescApp, pero falta el permiso del dispositivo.');return;}
  for(const a of plan){if(rev!==revision || auth.currentUser?.uid!==uid)return;const id=await dispositivo.programar(uid,a);if(rev!==revision || auth.currentUser?.uid!==uid){await dispositivo.cancelar(id);return;}}
  firma=nueva;avisar('');
 });
}
