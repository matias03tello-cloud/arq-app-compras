/** Pruebas del filtrado y calendario, sin Firebase ni acceso a datos reales. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Compila solo módulos puros a un directorio temporal para resolver imports de TS en Node.
const temp = mkdtempSync(join(tmpdir(), 'frescapp-experiencia-'));
for (const archivo of ['services/vistaInventario.ts', 'services/fechas.ts', 'security/identidadProducto.ts']) {
  const salida = join(temp, archivo.replace(/\.ts$/, '.js'));
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, ts.transpileModule(readFileSync(new URL('../' + archivo, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
}
after(() => rmSync(temp, { recursive: true, force: true }));
const { filtrarInventario, filtroValido, claveFecha, crearMes, productosDelMes } = createRequire(import.meta.url)(join(temp, 'services/vistaInventario.js'));
const hoy = new Date(2026, 8, 6);
const p = (id, vencimiento, campos = {}) => ({ id, nombre: id, marca: 'Colun', categoria: 'Lacteos', codigoBarras: '7801234567890', cantidad: 1, vencimiento, fechaRegistro: '', ...campos });
const productos = [p('vencido', '05/09/2026'), p('hoy', '06/09/2026'), p('limite', '13/09/2026'), p('fuera', '14/09/2026'), p('sin', 'Sin fecha')];

test('semana incluye hoy y siete días, excluye vencidos y fechas ausentes durante cambio horario', () => {
  assert.deepEqual(filtrarInventario(productos, { estado: 'semana' }, hoy).map(x => x.id), ['hoy', 'limite']);
});
test('vencidos y sin fecha son grupos diferentes; fechas imposibles no se interpretan como válidas', () => {
  assert.deepEqual(filtrarInventario(productos, { estado: 'vencido' }, hoy).map(x => x.id), ['vencido']);
  assert.deepEqual(filtrarInventario([...productos, p('invalido', '31/02/2026')], { estado: 'sin-fecha' }, hoy).map(x => x.id), ['sin', 'invalido']);
});
test('búsqueda por nombre con tildes, marca, categoría y código', () => {
  const lista = [p('fruta', 'Sin fecha', { nombre: 'Plátano', marca: 'Sin marca', categoria: 'Frutas', codigoBarras: 'sin:platano' }), p('leche', '12/09/2026')];
  for (const q of [' PLATANO ', 'frutas', 'sin:platano']) assert.deepEqual(filtrarInventario(lista, { busqueda: q }).map(x => x.id), ['fruta']);
  for (const q of ['colun', '7801234567890']) assert.deepEqual(filtrarInventario(lista, { busqueda: q }).map(x => x.id), ['leche']);
});
test('filtros de texto, ubicación y vencimiento se combinan sin perder registros históricos', () => {
  const lista = [p('uno', '08/09/2026', { ubicacion: 'Refrigerador' }), p('dos', '08/09/2026'), p('tres', 'Sin fecha', { ubicacion: 'Refrigerador' })];
  assert.deepEqual(filtrarInventario(lista, { busqueda: 'colun', ubicacion: 'Refrigerador', estado: 'semana' }, hoy).map(x => x.id), ['uno']);
  assert.deepEqual(filtrarInventario(lista, { ubicacion: 'Sin ubicación' }).map(x => x.id), ['dos']);
});
test('ordenar nunca muta el inventario recibido y deja sin fecha al final', () => {
  const lista = [productos[4], productos[2], productos[0]]; const antes = [...lista];
  assert.deepEqual(filtrarInventario(lista, {}).map(x => x.id), ['vencido', 'limite', 'sin']);
  assert.deepEqual(lista, antes);
  assert.deepEqual(filtrarInventario(lista, { orden: 'nombre' }).map(x => x.id), ['limite', 'sin', 'vencido']);
});
test('parámetros de ruta inesperados vuelven al filtro todos', () => {
  for (const dato of [undefined, null, ['vencido'], 'otro']) assert.equal(filtroValido(dato), 'todos');
  assert.equal(filtroValido('vencido'), 'vencido');
});
test('calendario respeta años bisiestos y el cambio de año', () => {
  assert.equal(crearMes(2028, 1).length, 29); assert.equal(crearMes(2026, 1).length, 28);
  assert.equal(crearMes(2026, 12)[0].clave, '2027-01-01');
  assert.equal(crearMes(2026, -1).at(-1).clave, '2025-12-31');
});
test('mes/año aparece en el mes correcto y los registros sin fecha quedan fuera del calendario', () => {
  const lista = [p('mes', '02/2028'), p('dia', '29/02/2028'), p('otro', '01/03/2028'), p('sin', 'Sin fecha')];
  assert.deepEqual(productosDelMes(lista, new Date(2028, 1, 1)).map(x => x.id), ['mes', 'dia']);
  assert.equal(claveFecha(new Date(2026, 8, 6, 23, 59)), '2026-09-06');
});
