import {AjustesAvisos} from '../../components/mobile/AjustesAvisos';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { auth, cerrarSesion } from '../../services/auth';
import { vaciarInventarioUsuario } from '../../services/inventarioFirestore';
import { mensajeSeguro } from '../../security/errors';
import { useTemaApp } from '../../components/mobile/TemaApp';
import { Aviso, BotonApp, Confirmacion, Encabezado, Pantalla, ui } from '../../components/mobile/UI';

const TEMAS = [{ valor: 'system', texto: 'Del dispositivo', icono: 'phone-portrait-outline' }, { valor: 'light', texto: 'Claro', icono: 'sunny-outline' }, { valor: 'dark', texto: 'Oscuro', icono: 'moon-outline' }] as const;
export default function PantallaAjustes() {
  const router = useRouter();
  const { colores, preferencia, cambiarTema } = useTemaApp();
  const [accion, setAccion] = useState<'vaciar' | 'salir' | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [guardandoTema, setGuardandoTema] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const bloqueo = useRef(false);
  const nombre = auth.currentUser?.displayName || 'Mi cuenta';
  async function confirmar() {
    if (bloqueo.current || !accion) return;
    bloqueo.current = true; setOcupado(true); setError('');
    try {
      if (accion === 'salir') await cerrarSesion();
      else { const cantidad = await vaciarInventarioUsuario(); setAviso(`Se eliminaron ${cantidad} registros de tu despensa.`); }
      setAccion(null);
    } catch (e) { setError(mensajeSeguro(e)); }
    finally { bloqueo.current = false; setOcupado(false); }
  }
  return <Pantalla><ScrollView contentContainerStyle={ui.contenido}>
    <Encabezado titulo="Ajustes" detalle="Tu cuenta y la apariencia de FrescApp."/>
    <View style={[styles.tarjeta, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}><View style={ui.fila}><View style={[styles.avatar, { backgroundColor: colores.suave }]}><Ionicons name="person-outline" size={25} color={colores.verde}/></View><View style={{ flex: 1, gap: 5 }}><Text style={[styles.nombre, { color: colores.texto }]}>{nombre}</Text><Text style={{ color: colores.secundario, fontSize: 13 }}>{auth.currentUser?.email}</Text></View></View></View>
    <Text accessibilityRole="header" style={[styles.seccion, { color: colores.texto }]}>Apariencia</Text>
    <View style={[styles.tarjeta, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}>{TEMAS.map(t => <Pressable key={t.valor} accessibilityRole="radio" accessibilityState={{ checked: preferencia === t.valor, disabled: guardandoTema }} disabled={guardandoTema} onPress={async () => { setGuardandoTema(true); setAviso(''); try { await cambiarTema(t.valor); } catch (e) { setAviso(e instanceof Error ? e.message : 'No se pudo guardar el tema.'); } finally { setGuardandoTema(false); } }} style={styles.opcion}><Ionicons name={t.icono} size={23} color={colores.verde}/><Text style={{ color: colores.texto, fontSize: 15, flex: 1 }}>{t.texto}</Text>{preferencia === t.valor && <Ionicons name="checkmark-circle" size={22} color={colores.verde}/>}</Pressable>)}</View>
    <AjustesAvisos/>
    <Text accessibilityRole="header" style={[styles.seccion, { color: colores.texto }]}>Cuenta y datos</Text>
    <BotonApp texto="Privacidad y mis datos" icono="shield-checkmark-outline" secundario onPress={() => router.push('/privacidad')}/>
    <BotonApp texto="Cerrar sesión" icono="log-out-outline" secundario onPress={() => { setError(''); setAccion('salir'); }}/>
    {!!aviso && <Aviso texto={aviso}/>}
    <View style={[styles.tarjeta, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}><Text style={{ color: colores.peligro, fontSize: 16, fontWeight: '700' }}>Vaciar mi despensa</Text><Text style={[ui.detalle, { color: colores.secundario }]}>Borra todos tus registros de alimentos. Tu cuenta y el catálogo común se conservan.</Text><BotonApp texto="Vaciar despensa" secundario peligro icono="trash-outline" onPress={() => { setError(''); setAccion('vaciar'); }}/></View>
    <Text style={{ color: colores.secundario, fontSize: 12, textAlign: 'center' }}>FrescApp · Tu despensa bajo control</Text>
  </ScrollView><Confirmacion visible={!!accion} titulo={accion === 'vaciar' ? '¿Vaciar toda tu despensa?' : '¿Cerrar sesión?'} detalle={accion === 'vaciar' ? 'Se borrarán todos los alimentos de tu cuenta. Esta acción no se puede deshacer.' : 'Tus productos seguirán guardados en tu cuenta. Podrás volver a entrar con tu correo y contraseña.'} textoConfirmar={accion === 'vaciar' ? 'Borrar todos mis alimentos' : 'Cerrar sesión'} ocupado={ocupado} error={error} confirmar={confirmar} cerrar={() => { if (!bloqueo.current) setAccion(null); }}/></Pantalla>;
}
const styles = StyleSheet.create({ tarjeta: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 13 }, avatar: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' }, nombre: { fontSize: 18, fontWeight: '700' }, seccion: { fontSize: 18, fontWeight: '700', marginTop: 5 }, opcion: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 } });
