/** Formulario de acceso, registro y recuperación. La autenticación se delega al servicio auth. */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { iniciarSesion, recuperarPassword, registrarUsuario } from '../services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [avisoLeido, setAvisoLeido] = useState(false);
  const [modoRegistro, setModoRegistro] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Faltan datos', 'Ingresa tu correo y contraseña.');
      return;
    }

    if (modoRegistro && password.length < 12) {
      Alert.alert('Contraseña muy corta', 'Usa al menos 12 caracteres. Puedes usar una frase larga.');
      return;
    }

    if (modoRegistro && !nombre.trim()) {
      Alert.alert('Falta tu nombre', 'Ingresa un nombre para tu cuenta.');
      return;
    }

    try {
      setCargando(true);

      if (modoRegistro) {
        await registrarUsuario(nombre, email, password, avisoLeido);
      } else {
        await iniciarSesion(email, password);
      }

      // No hacemos router.push aquí. app/_layout.tsx detecta la sesión
      // y redirige automáticamente a las pestañas.
    } catch (error: any) {
      Alert.alert(
        modoRegistro ? 'No se pudo crear la cuenta' : 'No se pudo iniciar sesión',
        error?.message ?? 'Ocurrió un error.'
      );
    } finally {
      setPassword('');
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.fondo}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <Ionicons name="leaf" size={44} color="#FFFFFF" />
        </View>

        <Text style={styles.marca}>FrescApp</Text>
        <Text style={styles.lema}>Tu despensa bajo control</Text>

        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>
            {modoRegistro ? 'Crear cuenta' : 'Bienvenido'}
          </Text>

          <Text style={styles.subtitulo}>
            {modoRegistro
              ? 'Crea tu cuenta para guardar tu despensa.'
              : 'Inicia sesión para ver tus productos.'}
          </Text>

          {modoRegistro && (
            <>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                maxLength={80}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Matías"
                placeholderTextColor="#9AA09A"
                autoCapitalize="words"
                style={styles.input}
              />
            </>
          )}

          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            maxLength={254}
            value={email}
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#9AA09A"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordContenedor}>
            <TextInput
              maxLength={128}
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
              placeholder={modoRegistro ? "Mínimo 12 caracteres" : "Tu contraseña"}
              placeholderTextColor="#9AA09A"
              secureTextEntry={!mostrarPassword}
              autoCapitalize="none"
              style={styles.passwordInput}
            />

            <TouchableOpacity
              onPress={() => setMostrarPassword((valor) => !valor)}
              style={styles.ojo}
            >
              <Ionicons
                name={mostrarPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#5F685F"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/aviso-privacidad')} disabled={cargando} style={{ paddingVertical: 14 }}>
            <Text style={styles.cambiarModoTexto}>Leer información de privacidad</Text>
          </TouchableOpacity>
          {modoRegistro && <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: avisoLeido }} disabled={cargando} onPress={() => setAvisoLeido(v => !v)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Ionicons name={avisoLeido ? 'checkbox' : 'square-outline'} size={24} color="#2E7D32" />
            <Text style={{ flex: 1, color: '#303630', lineHeight: 20 }}>He leído la información sobre el uso de mis datos.</Text>
          </TouchableOpacity>}
          {!modoRegistro && <TouchableOpacity disabled={cargando} onPress={async () => {
            setCargando(true);
            try { await recuperarPassword(email); Alert.alert('Recuperar contraseña', 'Si existe una cuenta con ese correo, recibirás las instrucciones.'); }
            catch (e) { Alert.alert('Recuperar contraseña', e instanceof Error ? e.message : 'Intenta nuevamente.'); }
            finally { setCargando(false); }
          }}><Text style={styles.cambiarModoTexto}>Olvidé mi contraseña</Text></TouchableOpacity>}
          <TouchableOpacity
            style={[styles.boton, cargando && styles.botonDeshabilitado]}
            disabled={cargando}
            onPress={enviar}
          >
            {cargando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.botonTexto}>
                {modoRegistro ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cambiarModo}
            disabled={cargando}
            onPress={() => {
              setModoRegistro((valor) => !valor);
              setPassword('');
            }}
          >
            <Text style={styles.cambiarModoTexto}>
              {modoRegistro
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pie}>Controla • Consume • Ahorra</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#F3F8F3' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
  },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  marca: {
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '800',
    color: '#1B5E20',
  },
  lema: {
    textAlign: 'center',
    fontSize: 15,
    color: '#697269',
    marginTop: 4,
    marginBottom: 28,
  },
  tarjeta: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  titulo: { fontSize: 25, fontWeight: '800', color: '#202520' },
  subtitulo: { color: '#717871', marginTop: 5, marginBottom: 18, lineHeight: 20 },
  label: { fontWeight: '700', color: '#303630', marginTop: 12, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: '#D9E2D9',
    backgroundColor: '#FAFCFA',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#202520',
  },
  passwordContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9E2D9',
    backgroundColor: '#FAFCFA',
    borderRadius: 13,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#202520',
  },
  ojo: { paddingHorizontal: 14, paddingVertical: 10 },
  boton: {
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 22,
  },
  botonDeshabilitado: { opacity: 0.65 },
  botonTexto: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  cambiarModo: { alignItems: 'center', paddingVertical: 17 },
  cambiarModoTexto: { color: '#2E7D32', fontWeight: '700' },
  pie: { textAlign: 'center', color: '#7A827A', marginTop: 26, fontWeight: '600' },
});
