/** Integra handlers con Auth/Firestore emulados. No valida transporte HTTP ni App Check nativo. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp as initializeClient, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { getApp, deleteApp: deleteAdminApp } = require('firebase-admin/app');
const { getFirestore: getAdminFirestore, Timestamp } = require('firebase-admin/firestore');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');

const projectId = 'demo-frescapp-security';
if (process.env.GCLOUD_PROJECT !== projectId || !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Solo se permite ejecutar en emuladores del proyecto demo.');

test('handlers con Auth y Firestore emulados: perfil, identidad y borrado de más de 400 registros', { timeout: 60000 }, async () => {
  const handlers = require('../functions/index.js');
  const server = getApp();
  const adminDB = getAdminFirestore(server);
  const adminAuth = getAdminAuth(server);
  const a = initializeClient({ projectId, apiKey: 'demo-api-key', authDomain: 'demo.invalid' }, 'integration-a');
  const b = initializeClient({ projectId, apiKey: 'demo-api-key', authDomain: 'demo.invalid' }, 'integration-b');
  try {
    const authA = getAuth(a); connectAuthEmulator(authA, 'http://127.0.0.1:9099', { disableWarnings: true });
    const authB = getAuth(b); connectAuthEmulator(authB, 'http://127.0.0.1:9099', { disableWarnings: true });
    const { user: userA } = await createUserWithEmailAndPassword(authA, 'integration-a@example.test', 'Local-test-only-1298');
    const { user: userB } = await createUserWithEmailAndPassword(authB, 'integration-b@example.test', 'Local-test-only-9851');
    const dbA = getFirestore(a); connectFirestoreEmulator(dbA, '127.0.0.1', 8080);
    // Invocación directa de handlers con tokens verificados por Admin en Auth
    // Emulator. No simula el transporte HTTP ni la atestación de App Check.
    const callFor = (user, name) => async data => {
      const token = await adminAuth.verifyIdToken(await user.getIdToken());
      return handlers[name].run({ auth: { uid: token.uid, token }, data });
    };
    const callA = name => callFor(userA, name);
    const callB = name => callFor(userB, name);
    const privateRoot = adminDB.doc(`usuarios/${userA.uid}`);
    await privateRoot.set({ nombre: 'Viejo', email: 'old@example.test', uid: userA.uid });
    await callA('actualizarPerfil')({ nombre: 'Nuevo nombre' });
    assert.equal((await adminAuth.getUser(userA.uid)).displayName, 'Nuevo nombre');
    const corrected = (await privateRoot.get()).data();
    assert.equal(corrected.nombre, undefined); assert.equal(corrected.email, undefined);
    await assert.rejects(callB('actualizarPerfil')({ nombre: 'Ataque', uid: userA.uid }));
    const writer = adminDB.bulkWriter();
    for (let i = 0; i < 405; i++) writer.set(adminDB.doc(`inventario/legacy-${i}`), { usuarioId: userA.uid, nombre: `Item ${i}` });
    writer.set(adminDB.doc(`inventario/otro`), { usuarioId: userB.uid, nombre: 'Producto B' });
    writer.set(adminDB.doc(`usuarios/${userA.uid}/inventario/item`), { nombre: 'A' });
    writer.set(adminDB.doc(`usuarios/${userA.uid}/productosPrivados/12345678`), { nombre: 'Privado' });
    writer.set(adminDB.doc(`usuarios/${userA.uid}/privacidad/aviso`), { version: 'test' });
    writer.set(adminDB.doc(`usuarios/${userA.uid}/listas/lista/items/item`), { nombre: 'Subcolección futura' });
    writer.set(adminDB.doc(`usuarios/${userB.uid}/inventario/item`), { nombre: 'B' });
    await writer.close();
    const call = callA('solicitarEliminacionCuenta');
    await assert.rejects(call({ uid: userB.uid }));
    assert.equal((await adminDB.doc(`eliminaciones/${userB.uid}`).get()).exists, false);
    assert.equal((await call({})).estado, 'solicitada');
    await assert.rejects(setDoc(doc(dbA, 'usuarios', userA.uid, 'inventario', 'ataque'), { nombre: 'recrear' }));
    const job = await adminDB.doc(`eliminaciones/${userA.uid}`).get();
    await handlers.procesarEliminacionCuenta.run({ data: job, params: { uid: userA.uid } });
    assert.equal((await job.ref.get()).data().estado, 'completada');
    // Entrega repetida del mismo evento no vuelve a crear ni modificar la cuenta.
    await handlers.procesarEliminacionCuenta.run({ data: job, params: { uid: userA.uid } });
    await assert.rejects(adminAuth.getUser(userA.uid), { code: 'auth/user-not-found' });
    assert.equal((await privateRoot.get()).exists, false);
    assert.equal((await adminDB.collection('inventario').where('usuarioId', '==', userA.uid).get()).size, 0);
    assert.equal((await adminDB.doc(`usuarios/${userA.uid}/listas/lista/items/item`).get()).exists, false);
    assert.equal((await adminDB.doc(`usuarios/${userB.uid}/inventario/item`).get()).exists, true);
    assert.equal((await adminDB.doc('inventario/otro').get()).exists, true);
    assert.ok(await adminAuth.getUser(userB.uid));
    assert.equal((await adminDB.doc(`eliminaciones/${userA.uid}`).get()).exists, true, 'Conservar bloqueo de tokens anteriores');
    await job.ref.update({ completadaEn: Timestamp.fromMillis(Date.now() - 25 * 60 * 60 * 1000) });
    await handlers.mantenimientoEliminaciones.run({ scheduleTime: new Date().toISOString() });
    assert.equal((await job.ref.get()).exists, false, 'Retirar bloqueo una vez cumplida su retención');
  } finally { await Promise.all([deleteApp(a), deleteApp(b), deleteAdminApp(server)]); }
});
