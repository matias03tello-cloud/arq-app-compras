/** La web utiliza los avisos en pantalla; no pide permisos de notificaciones. */
import type {AvisoProgramado} from './avisosModelo';
export const disponible=false;
export const limpiar=async()=>{};
export const permiso=async(_pedir=false)=>false;
export const programar=async(_uid:string,_a:AvisoProgramado)=>'';
export const cancelar=async(_id:string)=>{};
