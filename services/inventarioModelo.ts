import type { ProductoInventario } from './productos';

/** Mismos valores históricos en la app y en las suscripciones de la web. */
export function normalizarProducto(data: Partial<ProductoInventario>, id: string): ProductoInventario {
  const cantidad = data.cantidad === undefined ? 1 : Number(data.cantidad);
  return { id, codigoBarras: data.codigoBarras ?? '', nombre: data.nombre ?? 'Producto',
    marca: data.marca ?? 'Sin marca', categoria: data.categoria ?? 'Otros', formato: data.formato ?? '',
    unidad: data.unidad ?? 'unidad', cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 0,
    vencimiento: data.vencimiento ?? 'Sin fecha', fechaRegistro: data.fechaRegistro ?? '',
    ...(typeof data.abiertoEn === 'string' ? { abiertoEn: data.abiertoEn } : {}),
    ...(data.ubicacion ? { ubicacion: data.ubicacion } : {}) };
}
