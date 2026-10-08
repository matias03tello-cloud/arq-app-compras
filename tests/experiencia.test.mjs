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
const { crearIndiceInventario, filtrarIndiceInventario, filtrarInventario, filtroValido, claveFecha, crearMes, productosDelMes } = createRequire(import.meta.url)(join(temp, 'services/vistaInventario.js'));
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

test('índice reutilizable conserva identidades, empates y las búsquedas combinadas', () => {
  const lista = [p('b', 'Sin fecha', { nombre: 'Plátano' }), p('a', '08/09/2026'), p('c', '08/09/2026')];
  const indice = crearIndiceInventario(lista, hoy);
  assert.deepEqual(filtrarIndiceInventario(indice, {}).map(x => x.id), ['a', 'c', 'b']);
  assert.deepEqual(filtrarIndiceInventario(indice, { busqueda: 'platano' }), [lista[0]]);
  assert.deepEqual(filtrarIndiceInventario(indice, { ubicacion: 'Todas', estado: 'semana' }), [lista[1], lista[2]]);
  assert.deepEqual(lista.map(x => x.id), ['b', 'a', 'c']);
});
test('reconstruir el índice al cambiar el día actualiza semana y vencidos', () => {
  const lista = [p('hoy', '06/09/2026')];
  assert.equal(filtrarIndiceInventario(crearIndiceInventario(lista, hoy), { estado: 'semana' }).length, 1);
  assert.equal(filtrarIndiceInventario(crearIndiceInventario(lista, new Date(2026, 8, 7)), { estado: 'vencido' }).length, 1);
});
test('un nuevo inventario reemplaza el texto buscable y no mantiene productos eliminados', () => {
  const primero = [p('uno', 'Sin fecha', { nombre: 'Arroz' })];
  const siguiente = [p('dos', 'Sin fecha', { nombre: 'Fideos' })];
  assert.equal(filtrarIndiceInventario(crearIndiceInventario(primero), { busqueda: 'arroz' }).length, 1);
  const indice = crearIndiceInventario(siguiente);
  assert.equal(filtrarIndiceInventario(indice, { busqueda: 'arroz' }).length, 0);
  assert.deepEqual(filtrarIndiceInventario(indice, { busqueda: 'fideos' }), siguiente);
});
test('diez mil registros mantienen resultados completos sin truncar la búsqueda', () => {
  const lista = Array.from({ length: 10000 }, (_, i) => p(String(i), i % 2 ? 'Sin fecha' : '08/09/2026', { nombre: i === 9999 ? 'Lentejas únicas' : 'Arroz' }));
  const indice = crearIndiceInventario(lista, hoy);
  assert.equal(filtrarIndiceInventario(indice, {}).length, 10000);
  assert.equal(filtrarIndiceInventario(indice, { estado: 'semana' }).length, 5000);
  assert.equal(filtrarIndiceInventario(indice, { busqueda: 'lentejas unicas' })[0].id, '9999');
});
if (process.env.FRESCAPP_BENCHMARK === '1') {
  const { performance } = await import('node:perf_hooks');
  for (const total of [1000, 10000, 50000]) {
    const lista = Array.from({ length: total }, (_, i) => p(String(i), `${String(i % 28 + 1).padStart(2, '0')}/09/2026`, { nombre: i % 2 ? 'Arroz' : 'Lentejas' }));
    const inicio = performance.now(); const indice = crearIndiceInventario(lista, hoy); const preparacion = performance.now() - inicio;
    const consultas = ['arroz', 'lentejas', 'colun', '780', 'sin resultados'];
    let resultados = 0; const consulta = performance.now();
    for (let i = 0; i < 20; i++) resultados += filtrarIndiceInventario(indice, { busqueda: consultas[i % consultas.length] }).length;
    console.log(JSON.stringify({ registros: total, preparacionMs: +preparacion.toFixed(2), promedioConsultaMs: +((performance.now() - consulta) / 20).toFixed(2), resultados }));
  }
}
