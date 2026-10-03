/** Fuente única de tipos del producto y acceso al catálogo común o privado del usuario. */
import { doc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CATEGORIAS, codigoValido, texto } from '../security/validation';
import { obtenerUidActual } from './auth';
import { alimentoGenerico, mismaIdentidad, validarNombreManual } from '../security/identidadProducto';

export type CategoriaProducto = typeof CATEGORIAS[number];
export interface ProductoCatalogo {
  codigoBarras: string; nombre: string; marca: string; categoria: CategoriaProducto;
  formato: string; unidad: string; activo: boolean;
  origen?: 'catalogo' | 'personal' | 'generico';
}
export interface ProductoInventario {
  id: string; codigoBarras: string; nombre: string; marca: string; categoria: CategoriaProducto;
  formato?: string; unidad?: string; cantidad: number; vencimiento: string; fechaRegistro: string;
  ubicacion?: 'Despensa' | 'Refrigerador' | 'Congelador';
}
// Firestore asigna el ID y el servicio registra la fecha de alta.
export type NuevoProductoInventario = Omit<ProductoInventario, 'id' | 'fechaRegistro'>;

/** Valida la entrada antes de guardar; las reglas siguen siendo obligatorias. */
export function validarProducto(producto: ProductoCatalogo): ProductoCatalogo {
  if (producto.codigoBarras.startsWith('sin:')) {
    const generico = alimentoGenerico(producto.codigoBarras, producto.unidad);
    if (!mismaIdentidad(producto, generico)) throw new Error('El alimento no coincide con el catálogo sin código.');
    return generico;
  }
  if (!CATEGORIAS.includes(producto.categoria)) throw new Error('Categoría inválida.');
  return {
    codigoBarras: codigoValido(producto.codigoBarras), nombre: texto(producto.nombre, 'Nombre', 120, 1),
    marca: texto(producto.marca, 'Marca', 80, 1), categoria: producto.categoria,
    formato: texto(producto.formato, 'Formato', 80), unidad: texto(producto.unidad, 'Unidad', 30, 1),
    activo: producto.activo === true,
  };
}
/** El catálogo compartido prevalece, incluso si existe un registro privado antiguo. */
export async function buscarProductoPorCodigo(codigoBarras: string): Promise<ProductoCatalogo | null> {
  const uid = obtenerUidActual();
  const codigo = codigoValido(codigoBarras);
  const publico = await getDocFromServer(doc(db, 'productos', codigo));
  if (publico.exists()) {
    if (!publico.data().activo) throw new Error('Este producto está desactivado en el catálogo.');
    return { ...publico.data(), origen: 'catalogo' } as ProductoCatalogo;
  }
  const propio = await getDocFromServer(doc(db, 'usuarios', uid, 'productosPrivados', codigo));
  return propio.exists() && propio.data().activo ? { ...propio.data(), origen: 'personal' } as ProductoCatalogo : null;
}
// Nombre conservado para compatibilidad con la cámara. Guarda SOLO en catálogo privado.
export async function guardarProductoCatalogo(producto: ProductoCatalogo): Promise<void> {
  const uid = obtenerUidActual();
  const datos = validarProducto(producto);
  codigoValido(datos.codigoBarras);
  datos.nombre = validarNombreManual(datos.nombre);
  const existente = await getDocFromServer(doc(db, 'productos', datos.codigoBarras));
  if (existente.exists()) throw new Error('El código ya pertenece al catálogo. Vuelve a buscarlo.');
  await setDoc(doc(db, 'usuarios', uid, 'productosPrivados', datos.codigoBarras), datos);
}

/** Reporte privado; no altera el catálogo. El mismo código reutiliza el reporte. */
export async function reportarErrorProducto(codigo: string, detalle: string): Promise<void> {
  const uid = obtenerUidActual();
  const codigoBarras = codigoValido(codigo);
  await setDoc(doc(db, 'usuarios', uid, 'reportesCatalogo', codigoBarras), {
    codigoBarras, detalle: texto(detalle, 'Describe el error', 300, 5), creadoEn: serverTimestamp(),
  });
}
