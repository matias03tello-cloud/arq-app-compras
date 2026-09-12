import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { auth } from '../services/auth';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (usuarioFirebase) => {
      setUsuario(usuarioFirebase);
      setCargando(false);
    });

    return cancelar;
  }, []);

  useEffect(() => {
    if (cargando) return;

    const estaEnLogin = segments[0] === 'login';

    if (!usuario && !estaEnLogin) {
      router.replace('/login');
      return;
    }

    if (usuario && estaEnLogin) {
      router.replace('/(tabs)');
    }
  }, [usuario, cargando, segments, router]);

  if (cargando) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6FAF6',
  },
});
