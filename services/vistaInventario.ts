import type { ProductoInventario } from './productos';
import { calcularDiasRestantes, fechaTextoADate, ordenarPorVencimiento } from './fechas';
import { normalizarBusqueda } from '../security/identidadProducto';

export const FILTROS_VENCIMIENTO = ['todos', 'semana', 'vencido', 'sin-fecha'] as const;
export type FiltroVencimiento = typeof FILTROS_VENCIMIENTO[number];
export function filtroValido(valor: unknown): FiltroVencimiento {
  return FILTROS_VENCIMIENTO.includes(valor as FiltroVencimiento) ? valor as FiltroVencimiento : 'todos';
}
export type FiltrosInventario = { busqueda?: string; ubicacion?: string; estado?: FiltroVencimiento; orden?: 'fecha' | 'nombre' };
/** Se reconstruye al recibir productos o cambiar el día; cada búsqueda solo filtra. */
export function crearIndiceInventario(lista: ProductoInventario[], hoy = new Date()) {
  const diasPorFecha = new Map<string, number | null>();
  const entradas = lista.map(producto => {
    if (!diasPorFecha.has(producto.vencimiento)) diasPorFecha.set(producto.vencimiento, calcularDiasRestantes(producto.vencimiento, hoy));
    return { producto, texto: normalizarBusqueda(`${producto.nombre} ${producto.marca} ${producto.categoria} ${producto.codigoBarras}`), dias: diasPorFecha.get(producto.vencimiento)! };
  });
  return {
    fecha: [...entradas].sort((a, b) => a.dias === b.dias ? 0 : (a.dias ?? Infinity) - (b.dias ?? Infinity)),
    nombre: [...entradas].sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, 'es')),
  };
}
export function filtrarIndiceInventario(indice: ReturnType<typeof crearIndiceInventario>, filtros: FiltrosInventario): ProductoInventario[] {
  const texto = normalizarBusqueda(filtros.busqueda || '');
  return indice[filtros.orden === 'nombre' ? 'nombre' : 'fecha'].filter(({ producto: p, texto: buscable, dias }) => {
    if (texto && !buscable.includes(texto)) return false;
    if (filtros.ubicacion && filtros.ubicacion !== 'Todos' && filtros.ubicacion !== 'Todas' && (p.ubicacion || 'Sin ubicación') !== filtros.ubicacion) return false;
    switch (filtros.estado) {
      case 'semana': return dias !== null && dias >= 0 && dias <= 7;
      case 'vencido': return dias !== null && dias < 0;
      case 'sin-fecha': return dias === null;
      default: return true;
    }
  }).map(entrada => entrada.producto);
}
export function filtrarInventario(lista: ProductoInventario[], filtros: FiltrosInventario, hoy = new Date()): ProductoInventario[] {
  return filtrarIndiceInventario(crearIndiceInventario(lista, hoy), filtros);
}
export function claveFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}
export function crearMes(anio: number, mes: number): { fecha: Date; clave: string; dia: number }[] {
  const cantidad = new Date(anio, mes + 1, 0).getDate();
  return Array.from({ length: cantidad }, (_, i) => { const fecha = new Date(anio, mes, i + 1); return { fecha, clave: claveFecha(fecha), dia: i + 1 }; });
}
export function productosDelMes(lista: ProductoInventario[], mes: Date): ProductoInventario[] {
  return ordenarPorVencimiento(lista.filter(p => { const d = fechaTextoADate(p.vencimiento); return d && d.getFullYear() === mes.getFullYear() && d.getMonth() === mes.getMonth(); }));
}
