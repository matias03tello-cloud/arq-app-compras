import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Linking, Text, TextInput, View } from 'react-native';
import { auth } from '../../services/auth';
import { AVISOS_INICIALES, avisosDisponibles, errorAvisos, guardarPreferenciasAvisos, leerPreferenciasAvisos, observarAvisos, type PreferenciasAvisos } from '../../services/avisos';
import { useTemaApp } from './TemaApp';
import { Aviso, BotonApp, Chip, ui } from './UI';
export function AjustesAvisos(){
 const uid=auth.currentUser?.uid;const {colores}=useTemaApp();const [p,setP]=useState<PreferenciasAvisos>(AVISOS_INICIALES);const [hora,setHora]=useState('19:00');const [cargando,setCargando]=useState(true);const [ocupado,setOcupado]=useState(false);const [error,setError]=useState('');const [mensaje,setMensaje]=useState('');const bloqueo=useRef(false);
 const fallo=useSyncExternalStore(observarAvisos,errorAvisos,()=> '');
 useEffect(()=>{let vivo=true;if(uid)leerPreferenciasAvisos(uid).then(v=>{if(vivo){setP(v);setHora(`${String(v.hora).padStart(2,'0')}:${String(v.minuto).padStart(2,'0')}`);}}).catch(()=>{if(vivo)setError('No pudimos leer tus preferencias.');}).finally(()=>{if(vivo)setCargando(false);});return()=>{vivo=false;};},[uid]);
 async function guardar(activo=p.activo){if(bloqueo.current)return;bloqueo.current=true;setOcupado(true);setError('');setMensaje('');try{const m=hora.trim().match(/^(\d{2}):(\d{2})$/);if(!m && activo)throw new Error('Usa HH:MM, por ejemplo 19:00.');const valor={...p,activo,hora:activo && m?Number(m[1]):p.hora,minuto:activo && m?Number(m[2]):p.minuto};await guardarPreferenciasAvisos(valor);if(auth.currentUser?.uid===uid){setP(valor);setMensaje(activo?'Preferencias guardadas. Los avisos se programan al confirmar tu despensa con el servidor.':'Avisos desactivados y programación eliminada.');}}catch(e){setError(e instanceof Error && !('code' in e)?e.message:'No pudimos guardar los avisos.');}finally{bloqueo.current=false;setOcupado(false);}}
 return <View style={{gap:12}}><Text accessibilityRole="header" style={{color:colores.texto,fontSize:18,fontWeight:'700'}}>Avisos de vencimiento</Text><Aviso texto="Un resumen diario de tu despensa personal, sin nombres de alimentos. Se programa para los próximos 7 días; vuelve a abrir la app con conexión para renovarlo. Cada cuenta guarda sus preferencias en este dispositivo."/>{!avisosDisponibles?<Aviso texto="Las notificaciones están disponibles en la APK de Android. En web puedes revisar el calendario y los avisos de Inicio."/>:<>
 <Text style={{color:colores.texto}}>Estado guardado: {p.activo?'Activados':'Desactivados'}</Text><TextInput accessibilityLabel="Horario de avisos" value={hora} onChangeText={setHora} editable={!ocupado && !cargando} maxLength={5} placeholder="HH:MM" style={{color:colores.texto,borderColor:colores.borde,borderWidth:1,padding:12,borderRadius:12,minHeight:48}}/>
 <Text style={{color:colores.secundario}}>Avisar cuando falten hasta:</Text><View style={[ui.fila,{flexWrap:'wrap'}]}>{([1,3,7] as const).map(d=><Chip key={d} texto={`${d} días`} elegido={p.anticipacion===d} onPress={()=>{if(!ocupado && !cargando)setP(a=>({...a,anticipacion:d}));}}/>)}</View>
 <BotonApp texto={p.activo?'Guardar horario y anticipación':'Activar avisos'} ocupado={ocupado} deshabilitado={cargando} onPress={()=>{void guardar(true);}}/><BotonApp texto="Desactivar avisos" secundario deshabilitado={ocupado || cargando} onPress={()=>{void guardar(false);}}/><BotonApp texto="Abrir permisos del dispositivo" secundario onPress={()=>{void Linking.openSettings().catch(()=>setError('Abre manualmente Ajustes de Android → FrescApp → Notificaciones.'));}}/>
 {!!mensaje && <Aviso texto={mensaje} />}
{!!(error || fallo) && (
  <Aviso texto={error || fallo} error />
)}
</>}
 </View>;
}
