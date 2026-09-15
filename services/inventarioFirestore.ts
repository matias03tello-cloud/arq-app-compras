import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { idValido } from '../security/validation';
import { obtenerUidActual, usuarioActual } from './auth';
import { ProductoInventario, validarProducto } from './productos';

export type EstadoVencimiento = 'vencido' | 'urgente' | 'pronto' | 'atencion' | 'bien' | 'sin-fecha';
export interface EstadoProducto { estado: EstadoVencimiento; dias: number | null; etiqueta: string; }

function normalizarProducto(data: Partial<ProductoInventario>, id: string): ProductoInventario {
  return { id, codigoBarras: data.codigoBarras ?? '', nombre: data.nombre ?? 'Producto',
    marca: data.marca ?? 'Sin marca', categoria: data.categoria ?? 'Otros', formato: data.formato ?? '',
    unidad: data.unidad ?? 'unidad', cantidad: Number(data.cantidad) > 0 ? Number(data.cantidad) : 1,
    vencimiento: data.vencimiento ?? 'Sin fecha', fechaRegistro: data.fechaRegistro ?? '' };
}
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
export async function agregarAlInventario(producto: ProductoInventario): Promise<ProductoInventario> {
  const uid = obtenerUidActual();
  const catalogo = validarProducto({ ...producto, formato: producto.formato ?? '', unidad: producto.unidad ?? 'unidad', activo: true });
  if (!Number.isInteger(producto.cantidad) || producto.cantidad < 1 || producto.cantidad > 999) throw new Error('Cantidad inválida.');
  if (!fechaTextoADate(producto.vencimiento)) throw new Error('Fecha de vencimiento inválida.');
  const { activo: _activo, ...campos } = catalogo;
  const fechaRegistro = new Date().toISOString();
  const datos = { ...campos, cantidad: producto.cantidad, vencimiento: producto.vencimiento, fechaRegistro };
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

export function fechaTextoADate(fechaStr: string): Date | null {
  if (!fechaStr || fechaStr === 'No visible' || fechaStr === 'Sin fecha') {
    return null;
  }

  const partes = fechaStr.trim().split('/').map(Number);

  if (partes.length === 3) {
    const [dia, mes, anio] = partes;

    if (!dia || !mes || !anio || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      return null;
    }

    const fecha = new Date(anio, mes - 1, dia);

    if (
      fecha.getFullYear() !== anio ||
      fecha.getMonth() !== mes - 1 ||
      fecha.getDate() !== dia
    ) {
      return null;
    }

    return fecha;
  }

  if (partes.length === 2) {
    const [mes, anio] = partes;
    if (!mes || !anio || mes < 1 || mes > 12) return null;
    return new Date(anio, mes, 0);
  }

  return null;
}

export function calcularDiasRestantes(fechaStr: string): number | null {
  const fechaVencimiento = fechaTextoADate(fechaStr);
  if (!fechaVencimiento) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaVencimiento.setHours(0, 0, 0, 0);

  return Math.ceil(
    (fechaVencimiento.getTime() - hoy.getTime()) / 86400000
  );
}

export function obtenerEstadoVencimiento(fechaStr: string): EstadoProducto {
  const dias = calcularDiasRestantes(fechaStr);

  if (dias === null) {
    return { estado: 'sin-fecha', dias: null, etiqueta: 'Sin fecha' };
  }

  if (dias < 0) {
    return {
      estado: 'vencido',
      dias,
      etiqueta: `Vencido hace ${Math.abs(dias)} d`,
    };
  }

  if (dias === 0) {
    return { estado: 'urgente', dias, etiqueta: 'Vence hoy' };
  }

  if (dias <= 3) {
    return { estado: 'urgente', dias, etiqueta: `Vence en ${dias} d` };
  }

  if (dias <= 7) {
    return { estado: 'pronto', dias, etiqueta: `Vence en ${dias} d` };
  }

  if (dias <= 15) {
    return { estado: 'atencion', dias, etiqueta: `Vence en ${dias} d` };
  }

  return { estado: 'bien', dias, etiqueta: `${dias} días` };
}

export function ordenarPorVencimiento(
  lista: ProductoInventario[]
): ProductoInventario[] {
  return [...lista].sort((a, b) => {
    const da = calcularDiasRestantes(a.vencimiento);
    const db = calcularDiasRestantes(b.vencimiento);

    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;

    return da - db;
  });
}
