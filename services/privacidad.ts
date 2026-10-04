/** Orquesta las solicitudes de privacidad. El borrado de cuenta se procesa en el backend. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reload, verifyBeforeUpdateEmail } from 'firebase/auth';
import { collection, doc, getDocFromServer, getDocsFromServer, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { AVISO_VERSION } from '../constants/privacidad';
import { app, db } from '../firebase';
import { mensajeSeguro } from '../security/errors';
import { texto } from '../security/validation';
import { compartirJson } from './archivosPrivados';
import { auth, cerrarSesion, obtenerUidActual, reautenticar } from './auth';
const functions = getFunctions(app, 'southamerica-west1');

function serializar(value: unknown): unknown {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializar);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, serializar(v)]));
  return value;
}
export async function exportarMisDatos(password: string): Promise<void> {
  const user = await reautenticar(password);
  const uid = user.uid;
  try {
    const [perfil, inventario, historico, catalogo, aviso, tema, reportes, compras, grupos, movimientos, recibos] = await Promise.all([
      getDocFromServer(doc(db, 'usuarios', uid)),
      getDocsFromServer(collection(db, 'usuarios', uid, 'inventario')),
      getDocsFromServer(query(collection(db, 'inventario'), where('usuarioId', '==', uid))),
      getDocsFromServer(collection(db, 'usuarios', uid, 'productosPrivados')),
      getDocsFromServer(collection(db, 'usuarios', uid, 'privacidad')),
      AsyncStorage.getItem('@preferencia_tema'),
      getDocsFromServer(collection(db, 'usuarios', uid, 'reportesCatalogo')),
      getDocsFromServer(collection(db, 'usuarios', uid, 'listaCompras')),
      getDocsFromServer(collection(db, 'usuarios', uid, 'hogares')),
      getDocsFromServer(collection(db, 'usuarios', uid, 'historial')),
      getDocsFromServer(collection(db, 'usuarios', uid, 'comprasRegistradas')),
    ]);
    const hogares = await Promise.all(grupos.docs.map(async g => {
      const [grupo, alimentos, lista, historialHogar] = await Promise.all([getDocFromServer(doc(db,'hogares',g.id)),getDocsFromServer(collection(db,'hogares',g.id,'inventario')),getDocsFromServer(collection(db,'hogares',g.id,'listaCompras')),getDocsFromServer(collection(db,'hogares',g.id,'historial'))]);
      return { id:g.id, nombre:grupo.data()?.nombre, historial:historialHogar.docs.map(d=>({id:d.id,...d.data()})), inventario:alimentos.docs.map(d=>({id:d.id,...d.data()})), listaCompras:lista.docs.map(d=>({id:d.id,...d.data()})) };
    }));
    if (auth.currentUser?.uid !== uid) throw new Error('La sesión cambió.');
    const rows = (snapshot: typeof inventario) => snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const datos = {
      formato: 'frescapp-export-v1', exportadoEn: new Date().toISOString(),
      cuenta: { uid, nombre: user.displayName, email: user.email, emailVerificado: user.emailVerified, creadaEn: user.metadata.creationTime },
      perfilHistorico: perfil.exists() ? perfil.data() : null,
      inventario: rows(inventario), inventarioAnterior: rows(historico), productosPrivados: rows(catalogo),
      privacidad: rows(aviso), reportesCatalogo: rows(reportes), listaCompras: rows(compras), hogares, historial:rows(movimientos), comprasRegistradas:rows(recibos), preferenciasDispositivo: { tema: tema ?? 'system' },
    };
    await compartirJson(JSON.stringify(serializar(datos), null, 2));
  } catch (e) { throw new Error(mensajeSeguro(e)); }
}
export async function corregirNombre(nombre: string): Promise<void> {
  const limpio = texto(nombre, 'Nombre o apodo', 80, 1);
  const user = auth.currentUser;
  if (!user) throw new Error('Inicia sesión.');
  try {
    await httpsCallable(functions, 'actualizarPerfil')({ nombre: limpio });
    await reload(user);
  } catch (e) { throw new Error(mensajeSeguro(e)); }
}
export async function cambiarCorreo(email: string, password: string): Promise<void> {
  const user = await reautenticar(password);
  try {
    // Elimina copias antiguas antes de iniciar la verificación del nuevo correo.
    await httpsCallable(functions, 'actualizarPerfil')({ nombre: user.displayName || 'Usuario FrescApp' });
    await verifyBeforeUpdateEmail(user, email.trim().toLowerCase());
  } catch (e) { throw new Error(mensajeSeguro(e)); }
}
export async function solicitarEliminacion(password: string): Promise<void> {
  await reautenticar(password);
  try { await httpsCallable(functions, 'solicitarEliminacionCuenta')({}); }
  catch (e) { throw new Error(mensajeSeguro(e)); }
  // La solicitud ya quedó registrada; el servidor continúa independientemente.
  try { await cerrarSesion(); }
  catch { throw new Error('La eliminación ya fue solicitada, pero no se pudo limpiar la sesión local. Cierra y vuelve a abrir la aplicación.'); }
}
export async function registrarLecturaAviso(): Promise<void> {
  const uid = obtenerUidActual();
  try { await setDoc(doc(db, 'usuarios', uid, 'privacidad', 'aviso'), { version: AVISO_VERSION, leidoEn: serverTimestamp() }); }
  catch (e) { throw new Error(mensajeSeguro(e)); }
}
