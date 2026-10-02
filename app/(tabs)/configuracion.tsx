/** Preferencias del dispositivo y acciones de cuenta. No concede permisos administrativos. */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Appearance,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { auth, cerrarSesion } from '../../services/auth';
import { vaciarInventarioUsuario } from '../../services/inventarioFirestore';

const THEME_KEY = '@preferencia_tema';

export default function PantallaAjustes() {
  const router = useRouter();
  const esquemaSistema = useColorScheme();
  const [temaSeleccionado, setTemaSeleccionado] = useState<'light' | 'dark' | 'system'>('system');

  const isDark = temaSeleccionado === 'system'
    ? esquemaSistema === 'dark'
    : temaSeleccionado === 'dark';

  const usuario = auth.currentUser;
  const nombre = usuario?.displayName || 'Usuario FrescApp';
  const email = usuario?.email || '';
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || 'FA';

  useEffect(() => {
    const cargarTema = async () => {
      try {
        const temaGuardado = await AsyncStorage.getItem(THEME_KEY);
        if (temaGuardado === 'light' || temaGuardado === 'dark' || temaGuardado === 'system') {
          setTemaSeleccionado(temaGuardado);
          Appearance.setColorScheme(temaGuardado === 'system' ? 'unspecified' : temaGuardado);
        }
      } catch {
        
      }
    };

    cargarTema();
  }, []);

  const cambiarTema = async (nuevoTema: 'light' | 'dark' | 'system') => {
    try {
      setTemaSeleccionado(nuevoTema);
      Appearance.setColorScheme(nuevoTema === 'system' ? 'unspecified' : nuevoTema);
      await AsyncStorage.setItem(THEME_KEY, nuevoTema);
    } catch {
      
    }
  };

  const confirmarVaciarDespensa = () => {
    Alert.alert(
      '⚠️ Vaciar despensa',
      'Se borrarán solamente los productos de tu cuenta. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar todo',
          style: 'destructive',
          onPress: async () => {
            try {
              const cantidad = await vaciarInventarioUsuario();
              Alert.alert('Despensa vaciada', `Se eliminaron ${cantidad} registros.`);
            } catch (error: any) {
              Alert.alert('Error', error?.message ?? 'No se pudo vaciar la despensa.');
            }
          },
        },
      ]
    );
  };

  const confirmarCerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Quieres salir de tu cuenta de FrescApp?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await cerrarSesion();
              // app/_layout.tsx detecta que ya no hay usuario y abre /login.
            } catch (error: any) {
              Alert.alert('Error', error?.message ?? 'No se pudo cerrar la sesión.');
            }
          },
        },
      ]
    );
  };

  const colorFondo = isDark ? '#000000' : '#F2F2F7';
  const colorTarjeta = isDark ? '#1C1C1E' : '#FFFFFF';
  const colorTexto = isDark ? '#FFFFFF' : '#000000';
  const colorSubtexto = '#8E8E93';
  const colorBorde = isDark ? '#38383A' : '#E5E5EA';

  return (
    <View style={[styles.fondo, { backgroundColor: colorFondo }]}>
      <View style={styles.cabecera}>
        <Text style={[styles.tituloCabecera, { color: colorTexto }]}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.tarjeta, { backgroundColor: colorTarjeta }]}>
          <View style={styles.perfilFila}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{iniciales}</Text>
            </View>

            <View style={styles.perfilInfo}>
              <Text style={[styles.perfilNombre, { color: colorTexto }]}>{nombre}</Text>
              <Text style={styles.perfilRol}>{email}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.tituloSeccion}>APARIENCIA</Text>
        <View style={[styles.tarjeta, { backgroundColor: colorTarjeta, paddingVertical: 5 }]}>
          <TouchableOpacity
            style={[styles.filaOpcion, { borderBottomColor: colorBorde }]}
            onPress={() => cambiarTema('system')}
          >
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#8E8E93' }]}>
                <Ionicons name="phone-portrait-outline" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: colorTexto }]}>Usar ajuste del sistema</Text>
            </View>
            {temaSeleccionado === 'system' && <Ionicons name="checkmark" size={24} color="#34C759" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filaOpcion, { borderBottomColor: colorBorde }]}
            onPress={() => cambiarTema('light')}
          >
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#FF9500' }]}>
                <Ionicons name="sunny" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: colorTexto }]}>Modo Claro</Text>
            </View>
            {temaSeleccionado === 'light' && <Ionicons name="checkmark" size={24} color="#34C759" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filaOpcion, { borderBottomWidth: 0 }]}
            onPress={() => cambiarTema('dark')}
          >
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#5856D6' }]}>
                <Ionicons name="moon" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: colorTexto }]}>Modo Oscuro</Text>
            </View>
            {temaSeleccionado === 'dark' && <Ionicons name="checkmark" size={24} color="#34C759" />}
          </TouchableOpacity>
        </View>

        <Text style={styles.tituloSeccion}>PREFERENCIAS</Text>
        <View style={[styles.tarjeta, { backgroundColor: colorTarjeta, paddingVertical: 5 }]}>
          <View style={[styles.filaOpcion, { borderBottomWidth: 0 }]}>
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#FF2D55' }]}>
                <Ionicons name="notifications" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: colorTexto }]}>Alertas de vencimiento</Text>
            </View>
            <Text style={{ color: colorSubtexto, fontSize: 12, maxWidth: 100 }}>Disponibles en Inicio</Text>
          </View>
        </View>

        <Text style={styles.tituloSeccion}>CUENTA Y DATOS</Text>
        <TouchableOpacity style={[styles.filaOpcion, { backgroundColor: colorTarjeta, borderRadius: 12, marginBottom: 12 }]} onPress={() => router.push('/privacidad')}>
          <Text style={[styles.textoOpcion, { color: colorTexto }]}>Privacidad y datos</Text>
          <Ionicons name="shield-checkmark-outline" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <View style={[styles.tarjeta, { backgroundColor: colorTarjeta, paddingVertical: 5 }]}>
          <TouchableOpacity
            style={[styles.filaOpcion, { borderBottomColor: colorBorde }]}
            onPress={confirmarVaciarDespensa}
          >
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#FF3B30' }]}>
                <Ionicons name="trash" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: '#FF3B30', fontWeight: '600' }]}>Vaciar mi despensa</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filaOpcion, { borderBottomWidth: 0 }]}
            onPress={confirmarCerrarSesion}
          >
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#636366' }]}>
                <Ionicons name="log-out-outline" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: colorTexto }]}>Cerrar sesión</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.versionTexto, { color: colorSubtexto }]}>FrescApp - V5 Seguridad y privacidad</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  cabecera: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  tituloCabecera: { fontSize: 34, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 15 },
  tituloSeccion: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 25,
    marginBottom: 8,
    marginLeft: 15,
    letterSpacing: 0.5,
  },
  tarjeta: { borderRadius: 12, overflow: 'hidden' },
  perfilFila: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarTexto: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  perfilInfo: { flex: 1 },
  perfilNombre: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  perfilRol: { fontSize: 14, color: '#8E8E93' },
  filaOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 0.5,
  },
  filaIzquierda: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconoCaja: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textoOpcion: { fontSize: 17, flexShrink: 1 },
  versionTexto: { textAlign: 'center', marginTop: 30, fontSize: 13 },
});
