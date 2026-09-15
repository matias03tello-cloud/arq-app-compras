import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { AVISO_LISTO, AVISO_PARRAFOS, CONTACTO_PRIVACIDAD, RESPONSABLE } from '../constants/privacidad';
export default function AvisoPrivacidad() {
  const router = useRouter();
  return <ScrollView contentContainerStyle={styles.page}>
    <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}><Text style={styles.link}>← Volver</Text></TouchableOpacity>
    <Text style={styles.title}>Información de privacidad</Text>
    {!AVISO_LISTO && <Text style={styles.pending}>Borrador para pruebas del proyecto. Falta completar el responsable, contacto y condiciones de tratamiento antes de abrir el registro al público.</Text>}
    <Text style={styles.text}>Responsable: {RESPONSABLE || 'Por definir'}{ '\n' }Contacto para solicitudes sobre tus datos: {CONTACTO_PRIVACIDAD || 'Por definir'}</Text>
    {AVISO_PARRAFOS.map(p => <Text key={p} style={styles.text}>{p}</Text>)}
    <Text style={styles.pending}>Este borrador debe completarse con las bases de licitud, plazos de conservación, tratamiento de respaldos, transferencias internacionales y procedimiento de derechos antes del lanzamiento. Registrar los datos del responsable no completa por sí solo esa revisión.</Text>
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 50, backgroundColor: '#F3F8F3' }, title: { fontSize: 28, fontWeight: '800', color: '#1B5E20', marginVertical: 20 }, text: { fontSize: 16, lineHeight: 25, color: '#273327', marginBottom: 18 }, link: { color: '#2E7D32', fontWeight: '700', fontSize: 16 }, pending: { backgroundColor: '#FFF3CD', padding: 16, borderRadius: 12, color: '#5B4600', lineHeight: 22, marginBottom: 18 } });
