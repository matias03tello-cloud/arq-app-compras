import { cantidadValida } from '../security/identidadProducto';
export type TipoMovimiento = 'consumo' | 'desperdicio';
export const MOTIVOS_DESPERDICIO = ['Vencimiento','Deterioro','Otro'] as const;
export function calcularSalida(disponible:number,texto:string,codigo:string,unidad:string) {
  const valor=texto.trim().replace(',','.'); const cantidad=Number(valor);
  if(!/^\d+(?:\.\d{1,3})?$/.test(valor) || !cantidadValida(cantidad,codigo,unidad) || !Number.isFinite(disponible) || cantidad>disponible) throw new Error('Revisa la cantidad: no puede superar lo disponible y los envases o unidades deben ser enteros.');
  return {cantidad,restante:Math.round((disponible-cantidad)*1000)/1000};
}
