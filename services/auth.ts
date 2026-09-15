import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth, initializeAuth,
  reauthenticateWithCredential,
  sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut, updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AVISO_VERSION } from '../constants/privacidad';
import { app, db } from '../firebase';
import { codigoError, mensajeSeguro } from '../security/errors';
import { limpiarPersistenciaWebAnterior } from '../security/legacyPersistence';
import { sessionPersistence } from '../security/persistence';
import { texto, validarPassword } from '../security/validation';
import { limpiarTemporales } from './archivosPrivados';

let instance: Auth;
try { instance = initializeAuth(app, { persistence: sessionPersistence }); }
catch (e) {
  if (codigoError(e) !== 'auth/already-initialized') throw e;
  instance = getAuth(app);
}
export const auth = instance;
let operando = false;
const listeners = new Set<() => void>();
export const operacionCuentaEnCurso = () => operando;
export const observarOperacionCuenta = (callback: () => void) => { listeners.add(callback); return () => { listeners.delete(callback); }; };
function setOperando(value: boolean) { operando = value; listeners.forEach(fn => fn()); }

export async function prepararSesion(): Promise<void> {
  // No importar credenciales antiguas en texto plano al almacén cifrado.
  const keys = await AsyncStorage.getAllKeys();
  const legacy = keys.filter(k => k.startsWith('firebase:') && k.includes(String(app.options.apiKey)));
  if (legacy.length) await AsyncStorage.multiRemove(legacy);
  await limpiarPersistenciaWebAnterior(String(app.options.apiKey));
  await limpiarTemporales();
}

export async function registrarUsuario(nombre: string, email: string, password: string, avisoLeido: boolean): Promise<User> {
  const displayName = texto(nombre, 'Nombre o apodo', 80, 1);
  validarPassword(password);
  if (!avisoLeido) throw new Error('Lee la información de privacidad antes de crear tu cuenta.');
  setOperando(true);
  let created: User | undefined;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    created = cred.user;
    await updateProfile(created, { displayName });
    // Es constancia de lectura, no consentimiento universal ni base de licitud.
    await setDoc(doc(db, 'usuarios', created.uid, 'privacidad', 'aviso'), {
      version: AVISO_VERSION, leidoEn: serverTimestamp(),
    });
    return created;
  } catch (e) {
    if (created) {
      // No indicar "cuenta no creada" después de que Auth ya la creó.
      await signOut(auth);
      throw new Error('La cuenta se creó, pero no se completó su configuración. Inicia sesión para continuar y revisa Privacidad y datos.');
    }
    throw new Error(mensajeSeguro(e));
  } finally { setOperando(false); }
}

export async function iniciarSesion(email: string, password: string): Promise<User> {
  setOperando(true);
  try { return (await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)).user; }
  catch (e) { throw new Error(mensajeSeguro(e)); }
  finally { setOperando(false); }
}

export async function cerrarSesion(): Promise<void> {
  try { await signOut(auth); }
  catch (e) { throw new Error(mensajeSeguro(e)); }
  await limpiarTemporales();
}

export async function recuperarPassword(email: string): Promise<void> {
  if (!email.trim()) throw new Error('Ingresa tu correo electrónico.');
  try { await sendPasswordResetEmail(auth, email.trim().toLowerCase()); }
  catch (e) {
    if (!['auth/user-not-found', 'auth/invalid-credential'].includes(codigoError(e))) throw new Error(mensajeSeguro(e));
  }
}

export async function verificarCorreo(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Inicia sesión.');
  try { await sendEmailVerification(user); } catch (e) { throw new Error(mensajeSeguro(e)); }
}

export async function reautenticar(password: string): Promise<User> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Inicia sesión con correo y contraseña.');
  try { await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password)); }
  catch (e) { throw new Error(mensajeSeguro(e)); }
  await user.getIdToken(true);
  return user;
}
export function usuarioActual(): User | null { return auth.currentUser; }
export function obtenerUidActual(): string {
  if (!auth.currentUser) throw new Error('Debes iniciar sesión para realizar esta acción.');
  return auth.currentUser.uid;
}
