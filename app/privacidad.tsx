import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, verificarCorreo } from '../services/auth';
import { cambiarCorreo, corregirNombre, exportarMisDatos, registrarLecturaAviso, solicitarEliminacion } from '../services/privacidad';

type Accion = 'exportar' | 'eliminar' | 'correo' | null;
export default function PrivacidadScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState(auth.currentUser?.displayName ?? '');
  const [email, setEmail] = useState(auth.currentUser?.email ?? '');
  const [accion, setAccion] = useState<Accion>(null);
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const run = async (operation: () => Promise<void>, success: string) => {
    if (ocupado) return;
    setOcupado(true); setError('');
    try { await operation(); Alert.alert('Privacidad y datos', success); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); }
    finally { setOcupado(false); }
  };
  const close = () => { if (!ocupado) { setAccion(null); setPassword(''); setConfirmacion(''); setError(''); } };
  const execute = async () => {
    if (!password || ocupado) return;
    if (accion === 'eliminar' && confirmacion !== 'ELIMINAR') { setError('Escribe ELIMINAR para confirmar.'); return; }
    setOcupado(true); setError('');
    try {
      if (accion === 'exportar') await exportarMisDatos(password);
      if (accion === 'correo') {
        await cambiarCorreo(email, password);
        Alert.alert('Verifica tu correo', 'Revisa el enlace enviado al nuevo correo. El cambio se aplica después de verificarlo.');
      }
      if (accion === 'eliminar') {
        await solicitarEliminacion(password);
        Alert.alert('Solicitud registrada', 'El servidor procesará la eliminación. Puede continuar aunque cierres la aplicación.');
      }
      setAccion(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); }
    finally { setPassword(''); setConfirmacion(''); setOcupado(false); }
  };
  const button = (title: string, onPress: () => void, danger = false) => <TouchableOpacity disabled={ocupado} accessibilityRole="button" onPress={onPress} style={[styles.button, danger && styles.danger, ocupado && { opacity: 0.6 }]}><Text style={styles.buttonText}>{title}</Text></TouchableOpacity>;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <TouchableOpacity disabled={ocupado} onPress={() => router.back()}><Text style={styles.link}>← Ajustes</Text></TouchableOpacity>
      <Text style={styles.title}>Privacidad y datos</Text>
      <Text style={styles.label}>Nombre o apodo</Text>
      <TextInput style={styles.input} maxLength={80} value={nombre} onChangeText={setNombre} editable={!ocupado} />
      {button('Guardar nombre', () => run(() => corregirNombre(nombre), 'Nombre actualizado.'))}
      <Text style={styles.label}>Correo electrónico</Text>
      <TextInput style={styles.input} maxLength={254} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!ocupado} />
      {button('Cambiar correo', () => { setError(''); setAccion('correo'); })}
      {button('Enviar verificación de mi correo actual', () => run(verificarCorreo, 'Revisa tu correo para verificar la cuenta.'))}
      <Text style={styles.text}>Puedes descargar una copia de tus datos en formato JSON. Contiene información personal; elige dónde guardarla.</Text>
      {button('Descargar mis datos', () => { setError(''); setAccion('exportar'); })}
      {button('Leer información de privacidad', () => router.push('/aviso-privacidad'))}
      {button('Registrar que leí la información', () => run(registrarLecturaAviso, 'Lectura registrada. No autoriza usos adicionales.'))}
      <Text style={styles.text}>Eliminar la cuenta borra tu despensa, catálogo privado, perfil y acceso a FrescApp. Descarga tus datos antes si quieres conservarlos.</Text>
      {button('Eliminar mi cuenta y datos', () => { setError(''); setAccion('eliminar'); }, true)}
      {!accion && !!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {ocupado && !accion && <ActivityIndicator color="#2E7D32" />}
    </ScrollView>
    <Modal transparent visible={accion !== null} animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.dialog}>
            <Text style={styles.subtitle}>{accion === 'eliminar' ? 'Confirmar eliminación' : 'Confirma tu identidad'}</Text>
            <Text style={styles.text}>Ingresa tu contraseña actual para continuar.</Text>
            <TextInput accessibilityLabel="Contraseña actual" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password" editable={!ocupado} />
            {accion === 'eliminar' && <><Text style={styles.text}>Esta acción es definitiva. Escribe ELIMINAR.</Text><TextInput accessibilityLabel="Escribe ELIMINAR" style={styles.input} value={confirmacion} onChangeText={setConfirmacion} autoCapitalize="characters" autoCorrect={false} editable={!ocupado} /></>}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {ocupado ? <ActivityIndicator color="#2E7D32" /> : button(accion === 'eliminar' ? 'Solicitar eliminación definitiva' : 'Continuar', execute, accion === 'eliminar')}
            {button('Cancelar', close)}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 60, backgroundColor: '#F3F8F3' },
  title: { fontSize: 28, fontWeight: '800', color: '#1B5E20', marginVertical: 20 }, subtitle: { fontSize: 22, fontWeight: '700', color: '#1B5E20' },
  text: { fontSize: 15, lineHeight: 22, color: '#425042', marginVertical: 12 }, label: { marginTop: 16, marginBottom: 8, fontWeight: '700', color: '#273327' },
  input: { backgroundColor: '#FFF', color: '#202520', borderColor: '#CBDCCB', borderWidth: 1, padding: 14, borderRadius: 12, fontSize: 16 },
  button: { backgroundColor: '#2E7D32', padding: 15, borderRadius: 12, marginTop: 12, alignItems: 'center' }, buttonText: { color: '#FFF', fontWeight: '700', textAlign: 'center' },
  danger: { backgroundColor: '#B3261E' }, link: { color: '#2E7D32', fontSize: 16, fontWeight: '700' }, error: { color: '#B3261E', marginVertical: 12, lineHeight: 22 },
  overlay: { flex: 1, backgroundColor: '#0008' }, modalScroll: { flexGrow: 1, justifyContent: 'center', padding: 22 }, dialog: { backgroundColor: '#F3F8F3', borderRadius: 20, padding: 22, width: '100%', maxWidth: 520, alignSelf: 'center' },
});
