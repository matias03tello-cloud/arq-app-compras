/** Fechas civiles de vencimiento: centraliza validación, etiquetas y orden. */

export type EstadoVencimiento = 'vencido' | 'urgente' | 'pronto' | 'atencion' | 'bien' | 'sin-fecha';
export interface EstadoProducto { estado: EstadoVencimiento; dias: number | null; etiqueta: string; }

/** DD/MM/AAAA admite escritura manual sin ceros; MM/AAAA vence a fin de mes. */
export function fechaTextoADate(texto: string): Date | null {
  if (typeof texto !== 'string') return null;
  const partes = texto.trim().match(/^(?:(\d{1,2})\/)?(\d{1,2})\/(\d{4})$/);
  if (!partes) return null;
  const mes = Number(partes[2]);
  const anio = Number(partes[3]);
  if (anio < 1000 || mes < 1 || mes > 12) return null;
  const dia = partes[1] ? Number(partes[1]) : new Date(anio, mes, 0).getDate();
  const fecha = new Date(anio, mes - 1, dia);
  // Date ajusta silenciosamente fechas imposibles; comparar evita aceptar 31/02.
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia
    ? fecha : null;
}

/** Produce el formato que aceptan las reglas, conservando la precisión mes/año. */
export function normalizarFechaVencimiento(texto: string): string {
  const fecha = fechaTextoADate(texto);
  if (!fecha) throw new Error('Fecha de vencimiento inválida.');
  const mesAnio = `${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
  return texto.trim().split('/').length === 2 ? mesAnio
    : `${String(fecha.getDate()).padStart(2, '0')}/${mesAnio}`;
}

// UTC se usa como clave numérica de día civil, no para cambiar la fecha del usuario.
// Así un día de 23 o 25 horas por cambio de horario sigue contando como un día.
function claveDia(fecha: Date): number {
  return Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / 86400000;
}

export function calcularDiasRestantes(texto: string, hoy: Date = new Date()): number | null {
  const fecha = fechaTextoADate(texto);
  return fecha ? claveDia(fecha) - claveDia(hoy) : null;
}

export function obtenerEstadoVencimiento(texto: string): EstadoProducto {
  const dias = calcularDiasRestantes(texto);
  if (dias === null) return { estado: 'sin-fecha', dias, etiqueta: 'Sin fecha' };
  if (dias < 0) return { estado: 'vencido', dias, etiqueta: `Vencido hace ${Math.abs(dias)} d` };
  if (dias === 0) return { estado: 'urgente', dias, etiqueta: 'Vence hoy' };
  if (dias <= 3) return { estado: 'urgente', dias, etiqueta: `Vence en ${dias} d` };
  if (dias <= 7) return { estado: 'pronto', dias, etiqueta: `Vence en ${dias} d` };
  if (dias <= 15) return { estado: 'atencion', dias, etiqueta: `Vence en ${dias} d` };
  return { estado: 'bien', dias, etiqueta: `${dias} días` };
}

/** Calcula una clave por fecha distinta y conserva el array original y los empates. */
export function ordenarPorVencimiento<T extends { vencimiento: string }>(lista: T[]): T[] {
  const claves = new Map<string, number>();
  for (const producto of lista) {
    if (claves.has(producto.vencimiento)) continue;
    const fecha = fechaTextoADate(producto.vencimiento);
    claves.set(producto.vencimiento, fecha ? claveDia(fecha) : Number.POSITIVE_INFINITY);
  }
  return [...lista].sort((a, b) => {
    const da = claves.get(a.vencimiento)!;
    const db = claves.get(b.vencimiento)!;
    // Infinity - Infinity da NaN: los dos registros sin fecha quedan empatados.
    return da === db ? 0 : da - db;
  });
}
