/** Pruebas con productos sintéticos: no constituyen un catálogo para publicar. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarCatalogo, validarGtin } = require('../tools/catalogo-validacion.cjs');
const { prepararCarga, aplicarCarga } = require('../tools/catalogo-importacion.cjs');
const { argumentos } = require('../tools/importar-catalogo.cjs');

function fila(cambios = {}) {
  return { codigoBarras: '2900000000018', nombre: 'PRUEBA SINTÉTICA', marca: 'Laboratorio',
    categoria: 'Despensa', formato: '100 g', unidad: 'unidad', activo: true,
    fuente: 'Prueba automatizada', evidencia: 'Fixture sintético; no publicar', verificado: true, ...cambios };
}

function baseFalsa(inicial = {}, antesCrear = null) {
  const datos = new Map(Object.entries(inicial)); let escrituras = 0;
  function referencia(codigo) {
    return { id: codigo,
      async get() { return { exists: datos.has(codigo), data: () => datos.get(codigo) }; },
      async create(producto) {
        if (antesCrear) await antesCrear(codigo, datos);
        if (datos.has(codigo)) { const error = Error('Existe'); error.code = 6; throw error; }
        datos.set(codigo, producto); escrituras++;
      } };
  }
  return { datos, get escrituras() { return escrituras; },
    collection(nombre) { assert.equal(nombre, 'productos'); return { doc: referencia }; },
    getAll(...refs) { return Promise.all(refs.map(ref => ref.get())); } };
}

test('Conserva ceros iniciales y valida longitudes GTIN admitidas', () => {
  assert.equal(validarGtin('036000291452'), '036000291452');
  assert.equal(validarGtin('0036000291452'), '0036000291452');
  assert.equal(validarGtin('96385074'), '96385074');
  assert.throws(() => validarGtin(36000291452));
  assert.throws(() => validarGtin('2900000000016'));
  assert.throws(() => validarGtin('00000000'));
  assert.throws(() => validarGtin('123456789'));
});

test('Bloquea datos incompletos, controles, tipos incorrectos y campos ajenos', () => {
  for (const cambio of [{ nombre: ' ' }, { nombre: 'Nombre\nOculto' }, { activo: 'true' },
    { categoria: 'Lácteos' }, { verificado: false }, { evidencia: '' }, { fuente: '' },
    { formato: '' }, { usuarioId: 'no-corresponde' }, { codigoBarras: '../otra-ruta' }]) {
    assert.equal(validarCatalogo([fila(cambio)]).errores.length, 1);
  }
  assert.throws(() => validarCatalogo([]));
  assert.throws(() => validarCatalogo(Array(10001).fill(fila())));
});

test('Elimina duplicados idénticos y bloquea códigos con datos contradictorios', () => {
  const iguales = validarCatalogo([fila(), fila()]);
  assert.equal(iguales.registros.length, 1); assert.equal(iguales.avisos.length, 1);
  assert.equal(validarCatalogo([fila(), fila({ marca: 'Otra' })]).errores.length, 1);
});

test('Detecta equivalencias UPC/EAN y conserva los identificadores exactos', () => {
  const resultado = validarCatalogo([fila({ codigoBarras: '036000291452' }), fila({ codigoBarras: '0036000291452' })]);
  assert.equal(resultado.registros.length, 2); assert.equal(resultado.avisos.length, 1);
  assert.equal(validarCatalogo([fila({ codigoBarras: '036000291452' }),
    fila({ codigoBarras: '0036000291452', nombre: 'Otro' })]).errores.length, 1);
});

test('La procedencia permanece fuera del documento público', () => {
  const { producto, procedencia } = validarCatalogo([fila()]).registros[0];
  assert.equal(Object.keys(producto).length, 7);
  assert.equal(producto.fuente, undefined); assert.ok(procedencia.fuente);
});

test('Comparar no escribe; aplicar dos veces no duplica ni sobrescribe', async () => {
  const db = baseFalsa(); const registros = validarCatalogo([fila()]).registros;
  const acciones = await prepararCarga(db, registros);
  assert.equal(db.escrituras, 0); assert.equal(acciones[0].estado, 'nuevo');
  await aplicarCarga(db, acciones); assert.equal(db.escrituras, 1);
  const segunda = await prepararCarga(db, registros);
  await aplicarCarga(db, segunda);
  assert.equal(segunda[0].estado, 'ya_existe'); assert.equal(db.escrituras, 1);
});

test('Un conflicto detectado antes de aplicar bloquea toda la carga', async () => {
  const registro = validarCatalogo([fila()]).registros[0];
  const existente = { ...registro.producto, nombre: 'Producto protegido' };
  const db = baseFalsa({ [existente.codigoBarras]: existente });
  const acciones = await prepararCarga(db, [registro]);
  await assert.rejects(aplicarCarga(db, acciones));
  assert.equal(db.escrituras, 0); assert.deepEqual(db.datos.get(existente.codigoBarras), existente);
});

test('Una escritura concurrente diferente no se sobrescribe', async () => {
  const registros = validarCatalogo([fila()]).registros;
  const db = baseFalsa({}, (codigo, datos) => datos.set(codigo, { nombre: 'Otro administrador' }));
  const acciones = await prepararCarga(db, registros);
  await assert.rejects(aplicarCarga(db, acciones));
  assert.equal(db.escrituras, 0); assert.equal(acciones[0].estado, 'conflicto');
  assert.equal(db.datos.get(fila().codigoBarras).nombre, 'Otro administrador');
});

test('Una escritura concurrente idéntica se trata como ya existente', async () => {
  const registros = validarCatalogo([fila()]).registros;
  const db = baseFalsa({}, (codigo, datos) => datos.set(codigo, registros[0].producto));
  const acciones = await prepararCarga(db, registros);
  await aplicarCarga(db, acciones); assert.equal(acciones[0].estado, 'ya_existe');
});

test('Un fallo de red conserva el avance y permite reanudar', async () => {
  let fallar = true;
  const db = baseFalsa({}, () => { if (fallar) { const e = Error('Red'); e.code = 14; throw e; } });
  const registros = validarCatalogo([fila()]).registros;
  const acciones = await prepararCarga(db, registros); let guardados = 0;
  await assert.rejects(aplicarCarga(db, acciones, () => guardados++));
  assert.equal(acciones[0].estado, 'error'); assert.equal(guardados, 1);
  fallar = false; await aplicarCarga(db, await prepararCarga(db, registros));
  assert.equal(db.escrituras, 1);
});

test('La línea de comandos impide destinos ambiguos y escrituras sin confirmación', () => {
  assert.throws(() => argumentos(['--archivo', 'x.json', '--aplicar', '--proyecto', 'super-ahorro-app']));
  assert.throws(() => argumentos(['--archivo', 'x.json', '--comparar', '--aplicar']));
  assert.throws(() => argumentos(['--archivo', 'x.json', '--proyecto', 'super-ahorro-app']));
  assert.throws(() => argumentos(['--archivo', 'x.json', '--comparar', '--proyecto', '../mal']));
  assert.throws(() => argumentos(['--archivo', 'x.json', '--archivo', 'otro.json']));
  assert.equal(argumentos(['--archivo', 'x.json'])['--archivo'], 'x.json');
});

test('No confunde el emulador con producción', () => {
  const anterior = process.env.FIRESTORE_EMULATOR_HOST;
  try {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    assert.throws(() => argumentos(['--archivo', 'x.json', '--comparar', '--proyecto', 'super-ahorro-app']));
    assert.throws(() => argumentos(['--archivo', 'x.json', '--comparar', '--proyecto', 'super-ahorro-app', '--emulador']));
    assert.equal(argumentos(['--archivo', 'x.json', '--comparar', '--proyecto', 'demo-catalogo', '--emulador'])['--emulador'], true);
    process.env.FIRESTORE_EMULATOR_HOST = 'servidor-remoto:8080';
    assert.throws(() => argumentos(['--archivo', 'x.json', '--comparar', '--proyecto', 'demo-catalogo', '--emulador']));
  } finally {
    if (anterior === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = anterior;
  }
});
