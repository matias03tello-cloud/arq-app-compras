import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALIMENTOS_SIN_CODIGO, alimentoGenerico, mismaIdentidad, cantidadValida, validarNombreManual, normalizarBusqueda, resumenCantidades } from '../security/identidadProducto.ts';

test('identidad: una margarina no se puede sustituir por fideos', () => {
  const original = { codigoBarras: '7801234567890', nombre: 'Margarina', marca: 'Ejemplo', categoria: 'Lacteos', formato: '250 g', unidad: 'unidad' };
  assert.ok(mismaIdentidad(original, { ...original }));
  for (const campo of ['nombre', 'marca', 'categoria', 'formato', 'unidad', 'codigoBarras']) {
    assert.equal(mismaIdentidad(original, { ...original, [campo]: 'Fideos' }), false);
  }
});
test('dataset sin código tiene IDs únicos y conserva nombre/categoría', () => {
  assert.equal(new Set(ALIMENTOS_SIN_CODIGO.map(a => a[0])).size, ALIMENTOS_SIN_CODIGO.length);
  for (const [id, nombre, categoria] of ALIMENTOS_SIN_CODIGO) {
    for (const unidad of ['unidad', 'kg', 'g']) {
      const p = alimentoGenerico(`sin:${id}`, unidad);
      assert.equal(p.nombre, nombre); assert.equal(p.categoria, categoria); assert.equal(p.unidad, unidad);
    }
  }
  assert.throws(() => alimentoGenerico('sin:inventado'));
  assert.throws(() => alimentoGenerico('sin:tomate', 'litros'));
});
test('cantidades: envases/unidades enteros, peso decimal, límites y no finitos', () => {
  assert.equal(cantidadValida(1.25, 'sin:tomate', 'kg'), true);
  assert.equal(cantidadValida(250, 'sin:tomate', 'g'), true);
  assert.equal(cantidadValida(0.001, 'sin:tomate', 'kg'), true);
  assert.equal(cantidadValida(1.25, 'sin:tomate', 'unidad'), false);
  assert.equal(cantidadValida(1.25, '7801234567890', 'kg'), false);
  for (const n of [NaN, Infinity, -1, 0, 1000, 1.2345]) assert.equal(cantidadValida(n, 'sin:tomate', 'kg'), false);
});
test('nombre manual: alimentos, tildes y números válidos; rutas web y texto ajeno rechazados', () => {
  assert.equal(validarNombreManual('  Leche   0%  '), 'Leche 0%');
  for (const n of ['', '1', '1234', '<script>', 'http://example.com', 'WWW.ejemplo.cl', 'a@b.cl', 'Fideos\nsopa']) {
    assert.throws(() => validarNombreManual(n));
  }
});
test('búsqueda ignora tildes y resumen nunca mezcla envases con kilos', () => {
  assert.equal(normalizarBusqueda(' PLÁTANO '), 'platano');
  assert.equal(resumenCantidades([
    { codigoBarras: '12345678', cantidad: 2, unidad: 'kg' },
    { codigoBarras: 'sin:tomate', cantidad: 0.5, unidad: 'kg' },
    { codigoBarras: 'sin:manzana', cantidad: 3, unidad: 'unidad' },
  ]), '2 envases · 0.5 kg · 3 unidad');
});
