import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { auth, obtenerUidActual } from './auth';
import { validarCompra, type UnidadCompra } from './comprasModelo';
export interface Compra { id: string; nombre: string; cantidad: number; unidad: UnidadCompra; comprado: boolean }
export function useCompras() {
  const uid = auth.currentUser?.uid;
  const [revision, setRevision] = useState(0);
  const [estado, setEstado] = useState<{ uid?: string; items: Compra[]; cargando: boolean; cache: boolean; error: string }>({ items: [], cargando: true, cache: true, error: '' });
  useEffect(() => {
    let activo = true;
    if (!uid) return;
    const vigente = () => activo && auth.currentUser?.uid === uid;
    const detener = onSnapshot(collection(db, 'usuarios', uid, 'listaCompras'), { includeMetadataChanges: true }, snap => {
      if (vigente()) setEstado({ uid, items: snap.docs.map(d => ({ ...d.data(), id: d.id } as Compra)).sort((a,b) => Number(a.comprado)-Number(b.comprado) || a.nombre.localeCompare(b.nombre, 'es')), cargando: false, cache: snap.metadata.fromCache || snap.metadata.hasPendingWrites, error: '' });
    }, () => { if (vigente()) setEstado({ uid, items: [], cargando: false, cache: true, error: 'No pudimos consultar tu lista. Revisa la conexión y las reglas de Firebase.' }); });
    const detenerAuth = onAuthStateChanged(auth, u => { if (u?.uid !== uid) { activo = false; detener(); setEstado({ items: [], cargando: true, cache: true, error: '' }); } });
    return () => { activo = false; detener(); detenerAuth(); };
  }, [uid, revision]);
  const ocupadoRef = useRef(false);
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');
  async function ejecutar(accion: (uid: string) => Promise<void>) {
    if (ocupadoRef.current) return false;
    const actual = obtenerUidActual();
    if (actual !== uid || estado.uid !== uid || estado.cache || estado.cargando || estado.error) { setErrorAccion('Espera la confirmación del servidor antes de modificar la lista.'); return false; }
    ocupadoRef.current = true; setOcupado(true); setErrorAccion('');
    try { await accion(actual); return auth.currentUser?.uid === actual; }
    catch (e) { if (auth.currentUser?.uid === actual) setErrorAccion(e instanceof Error && !('code' in e) ? e.message : 'No pudimos guardar el cambio. Revisa la conexión.'); return false; }
    finally { ocupadoRef.current = false; setOcupado(false); }
  }
  return { ...estado, items: estado.uid === uid ? estado.items : [], ocupado, errorAccion,
    reintentar: () => { setEstado({ uid, items: [], cargando: true, cache: true, error: '' }); setErrorAccion(''); setRevision(r => r + 1); },
    agregar: (nombre: string, cantidad: string, unidad: UnidadCompra) => ejecutar(async actual => {
      const datos = validarCompra(nombre, cantidad, unidad);
      await setDoc(doc(collection(db, 'usuarios', actual, 'listaCompras')), { ...datos, comprado: false, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() });
    }),
    marcar: (item: Compra) => ejecutar(actual => updateDoc(doc(db, 'usuarios', actual, 'listaCompras', item.id), { comprado: !item.comprado, actualizadoEn: serverTimestamp() })),
    eliminar: (item: Compra) => ejecutar(actual => deleteDoc(doc(db, 'usuarios', actual, 'listaCompras', item.id))),
  };
}
