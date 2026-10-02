/** Comprueba integridad de sesiones fragmentadas, fallos de escritura y validaciones de entrada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createChunkedStorage } from '../security/chunkedStorage.ts';
import { codigoValido, idValido, validarPassword } from '../security/validation.ts';

function fixture() {
  const map = new Map();
  let fail = false;
  let counter = 0;
  const io = {
    getItem: async key => map.get(key) ?? null,
    setItem: async (key, value) => {
      if (fail && key.endsWith('_1')) { fail = false; throw new Error('native storage failure'); }
      assert.ok(Buffer.byteLength(value, 'utf8') <= 2048);
      map.set(key, value);
    },
    removeItem: async key => { map.delete(key); },
  };
  return { map, io, storage: createChunkedStorage(io, () => `generation-${++counter}`), failNext: () => { fail = true; } };
}
test('sesiones grandes Unicode se guardan completas en bloques pequeños', async () => {
  const f = fixture();
  const payload = JSON.stringify({ token: 'abc'.repeat(3000), nombre: 'Matías😀'.repeat(200) });
  await f.storage.setItem('firebase:authUser:test:[DEFAULT]', payload);
  assert.equal(await f.storage.getItem('firebase:authUser:test:[DEFAULT]'), payload);
  await f.storage.removeItem('firebase:authUser:test:[DEFAULT]');
  assert.equal(f.map.size, 0);
});
test('un fallo parcial mantiene la sesión anterior sin mezclar bloques', async () => {
  const f = fixture();
  await f.storage.setItem('session', 'old'.repeat(400));
  f.failNext();
  await assert.rejects(f.storage.setItem('session', 'new'.repeat(800)));
  assert.equal(await f.storage.getItem('session'), 'old'.repeat(400));
  await f.storage.removeItem('session');
  assert.equal(f.map.size, 0);
});
test('escrituras concurrentes y cierre de sesión quedan serializados', async () => {
  const f = fixture();
  await Promise.all([f.storage.setItem('session', 'one'.repeat(400)), f.storage.setItem('session', 'two'.repeat(600)), f.storage.removeItem('session')]);
  assert.equal(await f.storage.getItem('session'), null);
  assert.equal(f.map.size, 0);
});
test('claves que contienen signos distintos no colisionan', async () => {
  const f = fixture();
  await f.storage.setItem('a:b', 'first'); await f.storage.setItem('a_b', 'second');
  assert.equal(await f.storage.getItem('a:b'), 'first');
  assert.equal(await f.storage.getItem('a_b'), 'second');
});
test('bloque incompleto falla cerrado', async () => {
  const f = fixture(); await f.storage.setItem('session', 'x'.repeat(1000));
  f.map.delete(Array.from(f.map.keys()).find(k => k.endsWith('_1')));
  await assert.rejects(f.storage.getItem('session'), /Incomplete/);
});
test('validación impide códigos con rutas y contraseñas débiles nuevas', () => {
  for (const invalid of ['../12345678', '123/56789', '', '123', 'abc12345']) assert.throws(() => codigoValido(invalid));
  assert.throws(() => idValido('../otro'));
  assert.throws(() => validarPassword('123456'));
  assert.doesNotThrow(() => validarPassword('Una frase larga segura'));
});
