import { fechaTextoADate } from './fechas';
export function validarApertura(texto: string, hoy = new Date()): string {
  if (!texto.trim()) return '';
  if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto.trim())) throw new Error('Escribe la apertura como DD/MM/AAAA.');
  const fecha = fechaTextoADate(texto);
  if (!fecha || fecha.getFullYear() < 1900) throw new Error('La fecha de apertura no existe.');
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if (iso(fecha) > iso(hoy)) throw new Error('La apertura no puede estar en el futuro.');
  return iso(fecha);
}
export function mostrarApertura(iso?: string) { return iso ? iso.split('-').reverse().join('/') : ''; }
