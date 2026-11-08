'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ApiError, validarCompra, validarCambioCompra } = require('../api/validators');

function compra(overrides = {}) {
  return { nombre: 'Arroz', cantidad: 1, unidad: 'kg', ...overrides };
}

function esErrorCantidad(error) {
  return error instanceof ApiError
    && error.status === 400
    && error.code === 'VALIDATION_ERROR'
    && /tres decimales/u.test(error.message);
}

test('acepta hasta tres decimales, incluyendo valores sensibles a redondeo', () => {
  assert.equal(validarCompra(compra({ cantidad: 1.005 })).cantidad, 1.005);
  assert.equal(validarCompra(compra({ cantidad: 12.345 })).cantidad, 12.345);
});

test('rechaza más de tres decimales al crear y actualizar una compra', () => {
  assert.throws(() => validarCompra(compra({ cantidad: 1.2345 })), esErrorCantidad);
  assert.throws(() => validarCambioCompra(compra(), { cantidad: 1.2345 }), esErrorCantidad);
});

test('mantiene las unidades enteras para la unidad de compra', () => {
  assert.equal(validarCompra(compra({ cantidad: 2, unidad: 'unidad' })).cantidad, 2);
  assert.throws(() => validarCompra(compra({ cantidad: 2.5, unidad: 'unidad' })), /Unidad o cantidad no válida/u);
});
