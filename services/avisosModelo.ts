import {calcularDiasRestantes} from './fechas';
export interface PreferenciasAvisos {activo:boolean;hora:number;minuto:number;anticipacion:1|3|7}
export const AVISOS_INICIALES:PreferenciasAvisos={activo:false,hora:19,minuto:0,anticipacion:3};
export function preferenciasValidas(p:unknown):PreferenciasAvisos {
 if(!p || typeof p!=='object')throw new Error('Preferencias inválidas.');
 const v=p as PreferenciasAvisos;
 if(typeof v.activo!=='boolean' || !Number.isInteger(v.hora) || v.hora<0 || v.hora>23 || !Number.isInteger(v.minuto) || v.minuto<0 || v.minuto>59 || ![1,3,7].includes(v.anticipacion))throw new Error('Revisa hora y anticipación.');
 return {activo:v.activo,hora:v.hora,minuto:v.minuto,anticipacion:v.anticipacion};
}
export interface AvisoProgramado {fecha:Date;registros:number}
/** Un resumen diario, hasta siete días. Las fechas se calculan como días civiles locales. */
export function planificarAvisos(productos:{vencimiento:string;cantidad:number}[],p:PreferenciasAvisos,ahora=new Date()):AvisoProgramado[] {
 preferenciasValidas(p);if(!p.activo)return [];
 const result:AvisoProgramado[]=[];
 for(let dia=0;dia<7;dia++){
  const fecha=new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate()+dia,p.hora,p.minuto);
  if(fecha.getTime()<=ahora.getTime())continue;
  const registros=productos.filter(a=>{const d=calcularDiasRestantes(a.vencimiento,fecha);return a.cantidad>0 && d!==null && d>=0 && d<=p.anticipacion;}).length;
  if(registros)result.push({fecha,registros});
 }
 return result;
}
