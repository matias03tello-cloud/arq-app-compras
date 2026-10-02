// Casos de calendario que antes no estaban cubiertos por la suite de seguridad.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDiasRestantes, fechaTextoADate, normalizarFechaVencimiento, ordenarPorVencimiento } from '../services/fechas.ts';

process.env.TZ = 'America/Santiago';

test('cuenta días civiles al terminar el horario de verano en Chile', () => {
  assert.equal(calcularDiasRestantes('05/04/2027', new Date(2027, 3, 3, 12)), 2);
  assert.equal(calcularDiasRestantes('03/04/2027', new Date(2027, 3, 5, 12)), -2);
});

test('ordena fechas consecutivas al comenzar el horario de verano', () => {
  const lista = [{ vencimiento: '07/09/2026' }, { vencimiento: '06/09/2026' }];
  assert.deepEqual(ordenarPorVencimiento(lista).map(p => p.vencimiento), ['06/09/2026', '07/09/2026']);
  assert.equal(lista[0].vencimiento, '07/09/2026');
  assert.equal(calcularDiasRestantes('07/09/2026', new Date(2026, 8, 5, 12)), 2);
});

test('normaliza fechas manuales y conserva la precisión mes/año', () => {
  assert.equal(normalizarFechaVencimiento(' 5/9/2026 '), '05/09/2026');
  assert.equal(normalizarFechaVencimiento('2/2028'), '02/2028');
  assert.equal(fechaTextoADate('02/2028').getDate(), 29);
  assert.equal(fechaTextoADate('02/2027').getDate(), 28);
});

test('rechaza fechas inexistentes y formatos que no aceptan las reglas', () => {
  for (const texto of ['31/02/2026', '29/02/2027', '00/12/2026', '13/2026', '2/26', '1.5/2026', '1e1/2026', 'Sin fecha', '']) {
    assert.equal(fechaTextoADate(texto), null, texto);
  }
  assert.throws(() => normalizarFechaVencimiento('31/02/2026'));
  assert.notEqual(fechaTextoADate('29/02/2028'), null);
});

test('mantiene referencias, empates y registros sin fecha al final', () => {
  const a = { id: 'a', vencimiento: '20/09/2026' };
  const b = { id: 'b', vencimiento: '20/09/2026' };
  const sinFecha = { id: 'c', vencimiento: 'Sin fecha' };
  const resultado = ordenarPorVencimiento([sinFecha, a, b]);
  assert.deepEqual(resultado, [a, b, sinFecha]);
  assert.equal(resultado[0], a);
  assert.deepEqual(ordenarPorVencimiento([]), []);
});
