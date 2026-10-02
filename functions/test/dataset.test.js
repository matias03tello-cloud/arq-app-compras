/** Fixtures sintéticos: comprueban el conversor; no son productos para Firebase real. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { gzipSync } = require('node:zlib');
const { createHash } = require('node:crypto');
const { leerFilas } = require('../tools/dataset-csv.cjs');
const { convertir, argumentos } = require('../tools/convertir-dataset.cjs');
const { validarCatalogo } = require('../tools/catalogo-validacion.cjs');

const cabecera = 'code\tproduct_name\tbrands\tquantity\tcountries_tags\tcategories_tags\n';
const fila = (codigo = '036000291452', pais = 'en:chile', nombre = 'FICTICIO') =>
  `${codigo}\t${nombre}\tPrueba\t100 g\t${pais}\ten:snacks\n`;
async function entorno(t, contenido, comprimido = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frescapp-dataset-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const entrada = path.join(dir, comprimido ? 'prueba.csv.gz' : 'prueba.csv');
  fs.writeFileSync(entrada, comprimido ? gzipSync(contenido) : contenido);
  return { entrada, salida: path.join(dir, 'salida'), max: 1000, separador: '\t' };
}
const leerProductos = o => JSON.parse(fs.readFileSync(path.join(o.salida, 'productos-para-revisar.json'), 'utf8'));

test('CSV: comillas, CRLF, BOM y saltos internos en bloques de un carácter', async () => {
  const csv = '\uFEFFa,b\r\n"a,b","Línea\ncon ""comillas"""\r\nx,y';
  const filas = [];
  for await (const f of leerFilas(Readable.from([...csv]), ',')) filas.push(f);
  assert.deepEqual(filas, [['a', 'b'], ['a,b', 'Línea\ncon "comillas"'], ['x', 'y']]);
});

test('CSV roto falla explícitamente', async () => {
  for (const csv of ['a\t"sin cierre', 'a\t"x"texto', 'x"y\tz']) {
    await assert.rejects(async () => { for await (const f of leerFilas(Readable.from([csv]))) void f; });
  }
});

test('Filtra por país exacto, conserva ceros y bloquea publicación sin revisión', async t => {
  const o = await entorno(t, cabecera + fila() + fila('96385074', 'en:argentina') + fila('96385074', 'en:chilean'));
  const r = await convertir(o), p = leerProductos(o);
  assert.equal(r.filasLeidas, 3); assert.equal(r.filasChile, 1); assert.equal(p.length, 1);
  assert.equal(p[0].codigoBarras, '036000291452'); assert.equal(p[0].verificado, false);
  assert.equal(p[0].categoria, 'Snacks'); assert.equal(validarCatalogo(p).errores.length, 1);
  assert.equal(validarCatalogo(p.map(x => ({ ...x, verificado: true }))).errores.length, 0);
  assert.equal(p[0].vencimiento, undefined);
});

test('Gzip da los mismos productos y registra la huella del archivo comprimido', async t => {
  const o = await entorno(t, cabecera + fila(), true);
  const r = await convertir(o);
  assert.equal(r.candidatos, 1);
  assert.equal(r.sha256Archivo, createHash('sha256').update(fs.readFileSync(o.entrada)).digest('hex'));
});

test('Duplicados UPC/EAN no inflan el total; contradicciones excluyen el producto', async t => {
  const o = await entorno(t, cabecera + fila() + fila('0036000291452') + fila('96385074') + fila('96385074', 'en:chile', 'DISTINTO'));
  const r = await convertir(o);
  assert.equal(r.candidatos, 1); assert.equal(r.duplicadosIdenticos, 1);
  assert.deepEqual(r.conflictos, ['96385074']);
});

test('Máximo de selección no impide detectar contradicciones al final del archivo', async t => {
  const o = await entorno(t, cabecera + fila() + fila('96385074').repeat(10000) + fila('036000291452', 'en:chile', 'DISTINTO'));
  o.max = 1;
  const r = await convertir(o);
  assert.equal(r.filasLeidas, 10002); assert.equal(r.fueraDeSeleccion, 10000);
  assert.equal(r.candidatos, 0); assert.equal(r.conflictos.length, 1);
});

test('Aparta códigos incorrectos, códigos locales y campos incompletos', async t => {
  const o = await entorno(t, cabecera + fila('2900000000018') + fila('036000291451') + fila('96385074', 'en:chile', ''));
  const r = await convertir(o);
  assert.equal(r.candidatos, 0); assert.equal(r.ejemplosExcluidos.length, 3);
});

test('Una salida existente permanece intacta', async t => {
  const o = await entorno(t, cabecera + fila());
  await convertir(o);
  const antes = fs.readFileSync(path.join(o.salida, 'productos-para-revisar.json'));
  await assert.rejects(convertir(o), /ya existe/);
  assert.deepEqual(fs.readFileSync(path.join(o.salida, 'productos-para-revisar.json')), antes);
});

test('Cabecera o filas desplazadas fallan sin generar catálogo', async t => {
  for (const contenido of ['code\tname\nx\ty', cabecera + '1\t2\n', cabecera + '"abierto']) {
    const o = await entorno(t, contenido);
    await assert.rejects(convertir(o)); assert.equal(fs.existsSync(o.salida), false);
  }
});

test('Gzip truncado falla sin crear resultado parcial', async t => {
  const o = await entorno(t, cabecera + fila(), true);
  const b = fs.readFileSync(o.entrada); fs.writeFileSync(o.entrada, b.subarray(0, b.length - 12));
  await assert.rejects(convertir(o)); assert.equal(fs.existsSync(o.salida), false);
});

test('Rechaza URL, opciones repetidas y cantidades fuera del límite', () => {
  const base = ['--entrada', 'local.csv', '--salida', 'nuevo'];
  for (const extra of [['--max', '10001'], ['--max', '0'], ['--max', '1.2'], ['--entrada', 'otro']]) {
    assert.throws(() => argumentos([...base, ...extra]));
  }
  assert.throws(() => argumentos(['--entrada', 'https://ejemplo.test/archivo', '--salida', 'nuevo']));
  assert.equal(argumentos(base).max, 1000);
});
