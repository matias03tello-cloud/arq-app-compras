import type { ProductoInventario } from './productos';
import { calcularDiasRestantes, fechaTextoADate, ordenarPorVencimiento } from './fechas';
import { normalizarBusqueda } from '../security/identidadProducto';

export const FILTROS_VENCIMIENTO = ['todos', 'semana', 'vencido', 'sin-fecha'] as const;
export type FiltroVencimiento = typeof FILTROS_VENCIMIENTO[number];
export function filtroValido(valor: unknown): FiltroVencimiento {
  return FILTROS_VENCIMIENTO.includes(valor as FiltroVencimiento) ? valor as FiltroVencimiento : 'todos';
}
export function filtrarInventario(lista: ProductoInventario[], filtros: { busqueda?: string; ubicacion?: string; estado?: FiltroVencimiento; orden?: 'fecha' | 'nombre' }, hoy = new Date()): ProductoInventario[] {
  const texto = normalizarBusqueda(filtros.busqueda || '');
  const datos = lista.filter(p => {
    if (texto && !normalizarBusqueda(`${p.nombre} ${p.marca} ${p.categoria} ${p.codigoBarras}`).includes(texto)) return false;
    if (filtros.ubicacion && filtros.ubicacion !== 'Todos' && (p.ubicacion || 'Sin ubicación') !== filtros.ubicacion) return false;
    const dias = calcularDiasRestantes(p.vencimiento, hoy);
    switch (filtros.estado) {
      case 'semana': return dias !== null && dias >= 0 && dias <= 7;
      case 'vencido': return dias !== null && dias < 0;
      case 'sin-fecha': return dias === null;
      default: return true;
    }
  });
  return filtros.orden === 'nombre' ? datos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) : ordenarPorVencimiento(datos);
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
