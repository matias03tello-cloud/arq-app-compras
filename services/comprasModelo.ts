import type { ProductoInventario } from './productos';
import { validarNombreManual } from '../security/identidadProducto';
export const UNIDADES_COMPRA = ['unidad', 'kg', 'g', 'L'] as const;
export type UnidadCompra = typeof UNIDADES_COMPRA[number];
export function validarCompra(nombre: string, cantidad: string, unidad: UnidadCompra) {
  const limpio = validarNombreManual(nombre);
  const valor = cantidad.trim().replace(',', '.');
  if (!UNIDADES_COMPRA.includes(unidad) || !/^\d+(?:\.\d{1,3})?$/.test(valor) || Number(valor) <= 0 || Number(valor) > 999 || (unidad === 'unidad' && !Number.isInteger(Number(valor)))) throw new Error('Usa una cantidad entre 0 y 999; las unidades deben ser enteras y el peso admite hasta tres decimales.');
  return { nombre: limpio, cantidad: Number(valor), unidad };
}
export function avisoDuplicado(codigo: string, productos: ProductoInventario[]) {
  const iguales = productos.filter(p => p.codigoBarras === codigo);
  return iguales.length ? `Ya tienes ${iguales.length} registro${iguales.length === 1 ? '' : 's'} de este mismo producto en tu despensa. Revisa sus fechas antes de comprar más. Puedes guardar otro lote con su propia fecha.` : '';
}
