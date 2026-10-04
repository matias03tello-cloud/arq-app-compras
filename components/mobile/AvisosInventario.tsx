import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {auth} from '../../services/auth';
import {actualizarAvisos,cancelarAvisos,leerPreferenciasAvisos,observarAvisos} from '../../services/avisos';
import {useInventarioApp} from './InventarioApp';
/** Programa únicamente desde la respuesta completa y confirmada de la despensa personal. */
export function AvisosInventario(){
 const i=useInventarioApp();const uid=auth.currentUser?.uid;const [revision,setRevision]=useState(0);
 useEffect(()=>observarAvisos(()=>setRevision(n=>n+1)),[]);
 useEffect(()=>{const s=AppState.addEventListener('change',v=>{if(v==='active')void cancelarAvisos().catch(()=>{}).finally(()=>setRevision(n=>n+1));});return()=>s.remove();},[]);
 useEffect(()=>{let vigente=true;if(!uid)return;if(i.error){void cancelarAvisos().catch(()=>{});return;}if(i.cargando || i.desdeCache)return;
 leerPreferenciasAvisos(uid).then(p=>{if(vigente && auth.currentUser?.uid===uid)return actualizarAvisos(uid,i.productos,p);}).catch(()=>{});
 return()=>{vigente=false;};
 },[uid,i.productos,i.cargando,i.desdeCache,i.error,i.revisionDia,revision]);
 return null;
}
