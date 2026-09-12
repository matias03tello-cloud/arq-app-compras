import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type CategoriaProducto =
  | 'Lacteos'
  | 'Carnes'
  | 'Frutas'
  | 'Verduras'
  | 'Despensa'
  | 'Bebidas'
  | 'Congelados'
  | 'Snacks'
  | 'Otros';

export interface ProductoCatalogo {
  codigoBarras: string;
  nombre: string;
  marca: string;
  categoria: CategoriaProducto;
  formato: string;
  unidad: string;
  activo: boolean;
}

export interface ProductoInventario {
  id: string;
  codigoBarras: string;
  nombre: string;
  marca: string;
  categoria: CategoriaProducto;
  formato?: string;
  unidad?: string;
  cantidad: number;
  vencimiento: string;
  fechaRegistro: string;
}

export async function buscarProductoPorCodigo(
  codigoBarras: string
): Promise<ProductoCatalogo | null> {
  const referencia = doc(db, 'productos', codigoBarras);
  const resultado = await getDoc(referencia);

  if (!resultado.exists()) return null;

  return resultado.data() as ProductoCatalogo;
}

export async function guardarProductoCatalogo(
  producto: ProductoCatalogo
): Promise<void> {
  const referencia = doc(db, 'productos', producto.codigoBarras);
  await setDoc(referencia, producto, { merge: true });
}

export async function obtenerProductosCatalogo(): Promise<ProductoCatalogo[]> {
  const resultado = await getDocs(collection(db, 'productos'));
  return resultado.docs.map((documento) => documento.data() as ProductoCatalogo);
}
