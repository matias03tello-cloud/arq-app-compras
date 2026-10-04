import type { ProductoInventario } from './productos';

/** Mismos valores históricos en la app y en las suscripciones de la web. */
export function normalizarProducto(data: Partial<ProductoInventario>, id: string): ProductoInventario {
  return { id, codigoBarras: data.codigoBarras ?? '', nombre: data.nombre ?? 'Producto',
    marca: data.marca ?? 'Sin marca', categoria: data.categoria ?? 'Otros', formato: data.formato ?? '',
    unidad: data.unidad ?? 'unidad', cantidad: Number(data.cantidad) > 0 ? Number(data.cantidad) : 1,
    vencimiento: data.vencimiento ?? 'Sin fecha', fechaRegistro: data.fechaRegistro ?? '',
    ...(data.ubicacion ? { ubicacion: data.ubicacion } : {}) };
}
