import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from 'firebase/app';
import type { User } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Importar db arriba inicializa el Firebase App que ya existe en tu firebase.ts.
// Así NO necesitamos tocar ni copiar tu configuración actual de Firebase.
const app = getApp();

const {
  createUserWithEmailAndPassword,
  getAuth,
  initializeAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} = FirebaseAuth;

// Expo/React Native expone esta función en tiempo de ejecución.
// El cast evita un falso error de tipos de TypeScript con la resolución web.
const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence;

let authInstance;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Evita "Auth already initialized" durante Fast Refresh.
  authInstance = getAuth(app);
}

export const auth = authInstance;

function mensajeErrorAuth(error: any): string {
  const codigo = error?.code ?? '';

  switch (codigo) {
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/email-already-in-use':
      return 'Ese correo ya está registrado.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/user-disabled':
      return 'Esta cuenta fue deshabilitada.';
    case 'auth/too-many-requests':
      return 'Se hicieron demasiados intentos. Intenta nuevamente más tarde.';
    case 'auth/network-request-failed':
      return 'No se pudo conectar. Revisa tu conexión a internet.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication aún no está activado. En Firebase Console ve a Authentication > Comenzar > Sign-in method > Email/Password y actívalo.';
    default:
      return error?.message || 'Ocurrió un error con la cuenta.';
  }
}

export async function registrarUsuario(
  nombre: string,
  email: string,
  password: string
): Promise<User> {
  try {
    const credencial = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );

    await updateProfile(credencial.user, {
      displayName: nombre.trim(),
    });

    await setDoc(
      doc(db, 'usuarios', credencial.user.uid),
      {
        uid: credencial.user.uid,
        nombre: nombre.trim(),
        email: credencial.user.email,
        creadoEn: serverTimestamp(),
      },
      { merge: true }
    );

    return credencial.user;
  } catch (error) {
    throw new Error(mensajeErrorAuth(error));
  }
}

export async function iniciarSesion(
  email: string,
  password: string
): Promise<User> {
  try {
    const credencial = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );

    return credencial.user;
  } catch (error) {
    throw new Error(mensajeErrorAuth(error));
  }
}

export async function cerrarSesion(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(mensajeErrorAuth(error));
  }
}

export function usuarioActual(): User | null {
  return auth.currentUser;
}

export function obtenerUidActual(): string {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error('Debes iniciar sesión para realizar esta acción.');
  }

  return usuario.uid;
}
