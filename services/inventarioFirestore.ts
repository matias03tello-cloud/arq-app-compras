/** Operaciones de inventario. Conserva la lectura de registros v4 por su propietario original. */
import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { idValido } from '../security/validation';
import { obtenerUidActual, usuarioActual } from './auth';
import { NuevoProductoInventario, ProductoInventario, validarProducto } from './productos';

import { normalizarFechaVencimiento } from './fechas';
// Reexportar conserva los imports de las pantallas sin duplicar la lógica.
export { fechaTextoADate, calcularDiasRestantes, obtenerEstadoVencimiento, ordenarPorVencimiento } from './fechas';
export type { EstadoVencimiento, EstadoProducto } from './fechas';

// Conserva valores por defecto para registros históricos incompletos.
function normalizarProducto(data: Partial<ProductoInventario>, id: string): ProductoInventario {
  return { id, codigoBarras: data.codigoBarras ?? '', nombre: data.nombre ?? 'Producto',
    marca: data.marca ?? 'Sin marca', categoria: data.categoria ?? 'Otros', formato: data.formato ?? '',
    unidad: data.unidad ?? 'unidad', cantidad: Number(data.cantidad) > 0 ? Number(data.cantidad) : 1,
    vencimiento: data.vencimiento ?? 'Sin fecha', fechaRegistro: data.fechaRegistro ?? '' };
}
/** Consulta por UID y descarta respuestas que llegan tras cambiar de cuenta.
 * Esta versión aún carga el inventario completo: la paginación es un cambio pendiente.
 */
export async function obtenerInventario(): Promise<ProductoInventario[]> {
  const usuario = usuarioActual();
  if (!usuario) return [];
  const uid = usuario.uid;
  const [actual, antiguo] = await Promise.all([
    getDocs(collection(db, 'usuarios', uid, 'inventario')),
    getDocs(query(collection(db, 'inventario'), where('usuarioId', '==', uid))),
  ]);
  // No devolver una respuesta que llegó después de cambiar de cuenta.
  if (usuarioActual()?.uid !== uid) return [];
  return [
    ...actual.docs.map(d => normalizarProducto(d.data(), `v5:${d.id}`)),
    ...antiguo.docs.map(d => normalizarProducto(d.data(), `v4:${d.id}`)),
  ];
}
export async function agregarAlInventario(producto: NuevoProductoInventario): Promise<ProductoInventario> {
  const uid = obtenerUidActual();
  const catalogo = validarProducto({ ...producto, formato: producto.formato ?? '', unidad: producto.unidad ?? 'unidad', activo: true });
  if (!Number.isInteger(producto.cantidad) || producto.cantidad < 1 || producto.cantidad > 999) throw new Error('Cantidad inválida.');
  const vencimiento = normalizarFechaVencimiento(producto.vencimiento);
  const { activo: _activo, ...campos } = catalogo;
  const fechaRegistro = new Date().toISOString();
  const datos = { ...campos, cantidad: producto.cantidad, vencimiento, fechaRegistro };
  const ref = await addDoc(collection(db, 'usuarios', uid, 'inventario'), { ...datos, creadoEn: serverTimestamp() });
  return { ...datos, id: `v5:${ref.id}` };
}
export async function eliminarProductoInventario(id: string): Promise<void> {
  const uid = obtenerUidActual();
  const version = id.slice(0, 3);
  const recordId = idValido(id.slice(3));
  if (version === 'v5:') await deleteDoc(doc(db, 'usuarios', uid, 'inventario', recordId));
  else if (version === 'v4:') await deleteDoc(doc(db, 'inventario', recordId));
  else throw new Error('Versión de registro inválida.');
  // La propiedad del documento antiguo también la valida Firestore, nunca solo la UI.
}
/** Borra en lotes acotados y comprueba la sesión antes de cada lote. */
export async function vaciarInventarioUsuario(): Promise<number> {
  const uid = obtenerUidActual();
  let total = 0;
  for (const target of [collection(db, 'usuarios', uid, 'inventario'), query(collection(db, 'inventario'), where('usuarioId', '==', uid))]) {
    for (;;) {
      if (usuarioActual()?.uid !== uid) throw new Error('La sesión cambió.');
      const page = await getDocs(query(target, limit(400)));
      if (page.empty) break;
      const batch = writeBatch(db);
      page.docs.forEach(d => batch.delete(d.ref));
      await batch.commit(); total += page.size;
    }
  }
  return total;
}

