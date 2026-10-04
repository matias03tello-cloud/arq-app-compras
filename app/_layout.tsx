/** Entrada de navegación. Espera la preparación segura de sesión y protege las rutas privadas. */
import {iniciarAvisos} from '../services/avisos';
import { Stack } from 'expo-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { auth, observarOperacionCuenta, operacionCuentaEnCurso, prepararSesion } from '../services/auth';

export default function RootLayout() {
  useEffect(iniciarAvisos,[]);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const operando = useSyncExternalStore(observarOperacionCuenta, operacionCuentaEnCurso, () => false);
  useEffect(() => {
    let mounted = true;
    let cancel: (() => void) | undefined;
    prepararSesion().then(() => {
      if (!mounted) return;
      cancel = onAuthStateChanged(auth, user => {
        if (mounted) { setUsuario(user); setCargando(false); }
      });
    }).catch(() => { if (mounted) { setError(true); setCargando(false); } });
    return () => { mounted = false; cancel?.(); };
  }, [intento]);
  if (cargando || error) return <View style={styles.cargando}>
    {error ? <><Text>No se pudo preparar la sesión de forma segura.</Text><Button title="Reintentar" onPress={() => { setError(false); setCargando(true); setIntento(i => i + 1); }} /></> : <ActivityIndicator size="large" color="#2E7D32" />}
  </View>;
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!usuario || operando}><Stack.Screen name="login" /></Stack.Protected>
    <Stack.Protected guard={!!usuario && !operando}>
      <Stack.Screen name="(tabs)" /><Stack.Screen name="privacidad" />
    </Stack.Protected>
    <Stack.Screen name="aviso-privacidad" />
  </Stack>;
}
const styles = StyleSheet.create({ cargando: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6FAF6', gap: 16, padding: 24 } });

