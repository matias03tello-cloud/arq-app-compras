/** Dataset propio de alimentos genéricos. Los IDs sin: no son códigos de barras. */
export const ALIMENTOS_SIN_CODIGO = [
  ['manzana', 'Manzana', 'Frutas'], ['platano', 'Plátano', 'Frutas'],
  ['naranja', 'Naranja', 'Frutas'], ['mandarina', 'Mandarina', 'Frutas'],
  ['limon', 'Limón', 'Frutas'], ['pera', 'Pera', 'Frutas'],
  ['durazno', 'Durazno', 'Frutas'], ['ciruela', 'Ciruela', 'Frutas'],
  ['frutilla', 'Frutilla', 'Frutas'], ['uva', 'Uva', 'Frutas'],
  ['kiwi', 'Kiwi', 'Frutas'], ['sandia', 'Sandía', 'Frutas'],
  ['melon', 'Melón', 'Frutas'], ['pina', 'Piña', 'Frutas'],
  ['arandano', 'Arándano', 'Frutas'], ['palta', 'Palta', 'Frutas'],
  ['tomate', 'Tomate', 'Verduras'], ['papa', 'Papa', 'Verduras'],
  ['cebolla', 'Cebolla', 'Verduras'], ['zanahoria', 'Zanahoria', 'Verduras'],
  ['lechuga', 'Lechuga', 'Verduras'], ['pepino', 'Pepino', 'Verduras'],
  ['zapallo', 'Zapallo', 'Verduras'], ['zapallo-italiano', 'Zapallo italiano', 'Verduras'],
  ['brocoli', 'Brócoli', 'Verduras'], ['coliflor', 'Coliflor', 'Verduras'],
  ['espinaca', 'Espinaca', 'Verduras'], ['acelga', 'Acelga', 'Verduras'],
  ['pimenton', 'Pimentón', 'Verduras'], ['ajo', 'Ajo', 'Verduras'],
  ['apio', 'Apio', 'Verduras'], ['repollo', 'Repollo', 'Verduras'],
] as const;

export const UBICACIONES = ['Despensa', 'Refrigerador', 'Congelador'] as const;
export const UNIDADES_GRANEL = ['unidad', 'kg', 'g'] as const;

export function alimentoGenerico(codigo: string, unidad = 'unidad') {
  const alimento = ALIMENTOS_SIN_CODIGO.find(([id]) => codigo === `sin:${id}`);
  if (!alimento || !UNIDADES_GRANEL.some(u => u === unidad)) throw new Error('Selecciona un alimento y una unidad del catálogo.');
  return { codigoBarras: codigo, nombre: alimento[1], marca: 'Sin marca', categoria: alimento[2],
    formato: 'A granel', unidad, activo: true };
}

type Identidad = { codigoBarras: string; nombre: string; marca: string; categoria: string; formato?: string; unidad?: string };
export function mismaIdentidad(a: Identidad, b: Identidad): boolean {
  return a.codigoBarras === b.codigoBarras && a.nombre === b.nombre && a.marca === b.marca
    && a.categoria === b.categoria && (a.formato ?? '') === (b.formato ?? '') && (a.unidad ?? 'unidad') === (b.unidad ?? 'unidad');
}

export function cantidadValida(cantidad: number, codigo: string, unidad: string): boolean {
  if (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 999) return false;
  if (!codigo.startsWith('sin:') || unidad === 'unidad') return Number.isInteger(cantidad);
  return (unidad === 'kg' || unidad === 'g') && Math.abs(cantidad * 1000 - Math.round(cantidad * 1000)) < 0.000001;
}

/** Higiene del texto: no verifica la identidad física de un alimento desconocido. */
export function validarNombreManual(nombre: string): string {
  const limpio = nombre.trim().replace(/ +/g, ' ');
  if (limpio.length < 2 || limpio.length > 120 || !/[a-záéíóúüñ]/i.test(limpio)
    || /[\u0000-\u001f\u007f<>]|https?:\/\/|www\.|@/i.test(limpio)) {
    throw new Error('Escribe solo el nombre del alimento, entre 2 y 120 caracteres, sin enlaces ni correos.');
  }
  return limpio;
}

export function normalizarBusqueda(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function etiquetaCantidad(p: { codigoBarras: string; cantidad: number; unidad?: string }): string {
  return `${p.cantidad} ${p.codigoBarras.startsWith('sin:') ? (p.unidad ?? 'unidad') : 'envases'}`;
}
export function resumenCantidades(lista: { codigoBarras: string; cantidad: number; unidad?: string }[]): string {
  const grupos = new Map<string, number>();
  for (const p of lista) {
    const unidad = p.codigoBarras.startsWith('sin:') ? (p.unidad ?? 'unidad') : 'envases';
    grupos.set(unidad, (grupos.get(unidad) ?? 0) + p.cantidad);
  }
  return [...grupos].map(([u, n]) => `${Math.round(n * 1000) / 1000} ${u}`).join(' · ');
}
