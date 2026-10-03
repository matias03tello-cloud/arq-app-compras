import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accionPermisoCamara, motivoCamaraWeb, crearControlCamara } from '../security/camara.ts';
import { ejecutarOCRLocal, validarUriFotoLocal } from '../services/ocrLocal.ts';
import { extraerFechasOCR } from '../services/fechas.ts';

test('permiso inicial, denegado recuperable, denegado permanente y concedido', () => {
  assert.equal(accionPermisoCamara(null), 'consultando');
  assert.equal(accionPermisoCamara({ granted: false, canAskAgain: true }), 'solicitar');
  assert.equal(accionPermisoCamara({ granted: false, canAskAgain: false }), 'ajustes');
  assert.equal(accionPermisoCamara({ granted: true, canAskAgain: false }), 'concedido');
});
test('web sin detector integrado ofrece ingreso manual en lugar de usar la descarga externa', () => {
  const c = { contextoSeguro: true, capturaDisponible: true, lectorIntegrado: true };
  assert.equal(motivoCamaraWeb(c), null);
  for (const k of Object.keys(c)) assert.equal(typeof motivoCamaraWeb({ ...c, [k]: false }), 'string');
});
test('captura espera onCameraReady y un callback viejo no habilita una sesión nueva', () => {
  const cam = crearControlCamara();
  assert.throws(() => cam.iniciar());
  const id = cam.abrir(); assert.throws(() => cam.iniciar());
  cam.lista(id); assert.equal(cam.iniciar(), id);
  cam.cerrar(); assert.equal(cam.vigente(id), false);
  const siguiente = cam.abrir(); cam.lista(id); assert.throws(() => cam.iniciar());
  cam.lista(siguiente); assert.equal(cam.iniciar(), siguiente);
});
test('salir de pantalla o ir a segundo plano invalida el trabajo y actualiza la vista', () => {
  const cam = crearControlCamara(); const estados = [];
  const salir = cam.suscribir(() => estados.push(cam.estado()));
  const id = cam.abrir(); cam.lista(id); cam.cerrar();
  assert.equal(cam.vigente(id), false); assert.deepEqual(cam.estado(), { id: null, lista: false });
  assert.equal(estados.length, 3); salir(); cam.abrir(); assert.equal(estados.length, 3);
});
test('OCR rechaza URLs remotas, incluso dentro de una URI file, antes de procesar', async () => {
  for (const uri of ['https://example.com/foto.jpg', 'http://example.com/foto.jpg', 'file:///tmp/https://example.com/x', 'data:image/jpeg;base64,abc', undefined]) {
    assert.throws(() => validarUriFotoLocal(uri));
  }
  assert.equal(validarUriFotoLocal('file:///cache/foto.jpg'), 'file:///cache/foto.jpg');
  let lecturas = 0;
  await assert.rejects(ejecutarOCRLocal({ capturar: async () => 'https://example.com/x', reducir: async u => u, reconocer: async () => { lecturas++; return ''; }, eliminar: async () => {}, vigente: () => true }));
  assert.equal(lecturas, 0);
});
function fixture() {
  const borradas = []; const pasos = []; let activa = true;
  return { borradas, pasos, apagar: () => { activa = false; }, deps: {
    capturar: async () => { pasos.push('capturar'); return 'file:///cache/original.jpg'; },
    reducir: async () => { pasos.push('reducir'); return 'file:///cache/reducida.jpg'; },
    reconocer: async () => { pasos.push('reconocer'); return 'VENCE 25/10/2026'; },
    eliminar: async uri => { borradas.push(uri); }, vigente: () => activa,
  } };
}
test('OCR usa archivos locales y elimina original y copia después del reconocimiento', async () => {
  const f = fixture(); const resultado = await ejecutarOCRLocal(f.deps);
  assert.equal(resultado.texto, 'VENCE 25/10/2026'); assert.equal(resultado.limpiezaPendiente, false);
  assert.deepEqual(f.pasos, ['capturar', 'reducir', 'reconocer']); assert.equal(f.borradas.length, 2);
});
test('OCR limpia ambas fotos aun cuando falla el reconocedor', async () => {
  const f = fixture(); f.deps.reconocer = async () => { throw new Error('fallo nativo'); };
  await assert.rejects(ejecutarOCRLocal(f.deps)); assert.equal(f.borradas.length, 2);
});
test('no empieza OCR en segundo plano y limpia la captura si se sale durante la foto', async () => {
  const f = fixture(); f.apagar(); assert.equal(await ejecutarOCRLocal(f.deps), null); assert.equal(f.pasos.length, 0);
  const g = fixture(); g.deps.capturar = async () => { g.apagar(); return 'file:///cache/original.jpg'; };
  assert.equal(await ejecutarOCRLocal(g.deps), null); assert.deepEqual(g.borradas, ['file:///cache/original.jpg']); assert.equal(g.pasos.length, 0);
});
test('si se cierra durante el reconocimiento, no entrega el resultado y sí limpia', async () => {
  const f = fixture(); f.deps.reconocer = async () => { f.apagar(); return '25/10/2026'; };
  assert.equal(await ejecutarOCRLocal(f.deps), null); assert.equal(f.borradas.length, 2);
});
test('un fallo de limpieza no impide borrar la otra foto y queda indicado', async () => {
  const f = fixture(); f.deps.eliminar = async uri => { f.borradas.push(uri); if (uri.includes('original')) throw new Error('fallo'); };
  const r = await ejecutarOCRLocal(f.deps); assert.equal(r.limpiezaPendiente, true); assert.equal(f.borradas.length, 2);
});
test('OCR descarta fechas imposibles sin rescatar un mes/año engañoso', () => {
  for (const texto of ['31/02/2026', '29/02/2025', '40/13/2026', '31-02-2026']) assert.deepEqual(extraerFechasOCR(texto), []);
});
test('OCR distingue fechas válidas completas, mes/año y formato ISO', () => {
  assert.deepEqual(extraerFechasOCR('VENCE: 25/10/2026'), ['25/10/2026']);
  assert.deepEqual(extraerFechasOCR('25.10.26'), ['25/10/2026']);
  assert.deepEqual(extraerFechasOCR('VENCE 10/2026'), ['10/2026']);
  assert.deepEqual(extraerFechasOCR('2026-10-25'), ['25/10/2026']);
  assert.deepEqual(extraerFechasOCR('29/02/2028'), ['29/02/2028']);
});
test('elaboración y vencimiento diferentes requieren selección; repetidos no duplican opciones', () => {
  assert.deepEqual(extraerFechasOCR('ELAB 01/10/2026 VENCE 25/10/2026 25/10/2026'), ['01/10/2026', '25/10/2026']);
  assert.deepEqual(extraerFechasOCR('31/02/2026 VENCE 25/10/2026'), ['25/10/2026']);
});
