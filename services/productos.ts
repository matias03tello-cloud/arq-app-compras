import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CATEGORIAS, codigoValido, texto } from '../security/validation';
import { obtenerUidActual } from './auth';

export type CategoriaProducto = typeof CATEGORIAS[number];
export interface ProductoCatalogo {
  codigoBarras: string; nombre: string; marca: string; categoria: CategoriaProducto;
  formato: string; unidad: string; activo: boolean;
}
export interface ProductoInventario {
  id: string; codigoBarras: string; nombre: string; marca: string; categoria: CategoriaProducto;
  formato?: string; unidad?: string; cantidad: number; vencimiento: string; fechaRegistro: string;
}
export function validarProducto(producto: ProductoCatalogo): ProductoCatalogo {
  if (!CATEGORIAS.includes(producto.categoria)) throw new Error('Categoría inválida.');
  return {
    codigoBarras: codigoValido(producto.codigoBarras), nombre: texto(producto.nombre, 'Nombre', 120, 1),
    marca: texto(producto.marca, 'Marca', 80, 1), categoria: producto.categoria,
    formato: texto(producto.formato, 'Formato', 80), unidad: texto(producto.unidad, 'Unidad', 30, 1),
    activo: producto.activo === true,
  };
}
export async function buscarProductoPorCodigo(codigoBarras: string): Promise<ProductoCatalogo | null> {
  const uid = obtenerUidActual();
  const codigo = codigoValido(codigoBarras);
  const propio = await getDoc(doc(db, 'usuarios', uid, 'productosPrivados', codigo));
  if (propio.exists()) return propio.data().activo ? propio.data() as ProductoCatalogo : null;
  const publico = await getDoc(doc(db, 'productos', codigo));
  return publico.exists() && publico.data().activo ? publico.data() as ProductoCatalogo : null;
}
// Nombre conservado para compatibilidad con la cámara. Guarda SOLO en catálogo privado.
export async function guardarProductoCatalogo(producto: ProductoCatalogo): Promise<void> {
  const uid = obtenerUidActual();
  const datos = validarProducto(producto);
  await setDoc(doc(db, 'usuarios', uid, 'productosPrivados', datos.codigoBarras), datos);
}
export async function obtenerProductosCatalogo(): Promise<ProductoCatalogo[]> {
  const uid = obtenerUidActual();
  const [comun, privado] = await Promise.all([
    getDocs(collection(db, 'productos')), getDocs(collection(db, 'usuarios', uid, 'productosPrivados')),
  ]);
  const mapa = new Map<string, ProductoCatalogo>();
  [...comun.docs, ...privado.docs].forEach(d => mapa.set(d.id, d.data() as ProductoCatalogo));
  return Array.from(mapa.values()).filter(p => p.activo);
}
