import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { mensajeSeguro } from '../security/errors';
import { auth, obtenerUidActual } from './auth';
import { normalizarProducto } from './inventarioModelo';
import type { ProductoInventario } from './productos';

export interface EstadoInventarioWeb {
  productos: ProductoInventario[];
  cargando: boolean;
  desdeCache: boolean;
  error: string;
}
export const ESTADO_INICIAL: EstadoInventarioWeb = { productos: [], cargando: true, desdeCache: true, error: '' };

/** Una suscripción por cuenta, compartida entre las pantallas web.
 * No muestra un inventario parcial mientras falta la primera respuesta de una colección.
 * Firestore conserva aquí solo su caché de memoria; no se habilita persistencia en disco.
 */
export function observarInventario(emitir: (estado: EstadoInventarioWeb) => void): () => void {
  const uid = obtenerUidActual();
  let activa = true;
  const cancelar: (() => void)[] = [];
  const fuentes: ({ productos: ProductoInventario[]; cache: boolean } | undefined)[] = [];
  const detener = () => { activa = false; cancelar.splice(0).forEach(fn => fn()); };
  const fallar = (error: string) => {
    if (!activa) return;
    detener();
    emitir({ productos: [], cargando: false, desdeCache: true, error });
  };
  const vigente = () => activa && auth.currentUser?.uid === uid;
  emitir(ESTADO_INICIAL);
  cancelar.push(onAuthStateChanged(auth, user => {
    if (user?.uid !== uid) fallar('La sesión cambió. Vuelve a iniciar sesión.');
  }));
  const consultas = [
    collection(db, 'usuarios', uid, 'inventario'),
    query(collection(db, 'inventario'), where('usuarioId', '==', uid)),
  ];
  consultas.forEach((consulta, i) => {
    cancelar.push(onSnapshot(consulta, { includeMetadataChanges: true }, snapshot => {
      if (!vigente()) return;
      fuentes[i] = {
        productos: snapshot.docs.map(d => normalizarProducto(d.data(), `${i === 0 ? 'v5' : 'v4'}:${d.id}`)),
        cache: snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites,
      };
      if (!fuentes[0] || !fuentes[1]) return;
      emitir({ productos: [...fuentes[0].productos, ...fuentes[1].productos], cargando: false,
        desdeCache: fuentes.some(f => f?.cache), error: '' });
    }, error => fallar(mensajeSeguro(error))));
  });
  return detener;
}
