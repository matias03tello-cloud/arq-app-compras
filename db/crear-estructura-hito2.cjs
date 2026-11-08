#!/usr/bin/env node
'use strict';
const { createRequire } = require('node:module');
const requireFunctions = createRequire(require.resolve('../functions/package.json'));
const { initializeApp } = requireFunctions('firebase-admin/app');
const { getFirestore, FieldValue } = requireFunctions('firebase-admin/firestore');

function validarEntorno(env, uid) {
  const host = env.FIRESTORE_EMULATOR_HOST || '';
  const proyecto = env.GCLOUD_PROJECT || '';
  if (!/^(?:127\.0\.0\.1|localhost):\d{1,5}$/u.test(host) || !proyecto.startsWith('demo-')) {
    throw new Error('Bloqueado: inicia Firestore Emulator con un proyecto demo-* y FIRESTORE_EMULATOR_HOST local.');
  }
  const port = Number(host.split(':').at(-1));
  if (port < 1 || port > 65535) throw new Error('FIRESTORE_EMULATOR_HOST no tiene un puerto válido.');
  if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/u.test(uid)) throw new Error('Indica --uid con el UID de una cuenta de prueba.');
  return { host, proyecto };
}

async function main(args = process.argv.slice(2), env = process.env) {
  const indice = args.indexOf('--uid');
  if (indice < 0 || !args[indice + 1] || args.filter(a => a === '--uid').length !== 1 || args.length !== 2) {
    throw new Error('Uso: node db/crear-estructura-hito2.cjs --uid UID_DE_PRUEBA');
  }
  const uid = args[indice + 1];
  const { proyecto } = validarEntorno(env, uid);
  const app = initializeApp({ projectId:proyecto }, `hito2-seed-${Date.now()}`);
  try {
    const db = getFirestore(app);
    await db.doc('productos/7801234567890').set({
      codigoBarras:'7801234567890', nombre:'Leche', marca:'Ejemplo', categoria:'Lacteos',
      formato:'1 L', unidad:'unidad', activo:true,
    }, { merge:false });
    await db.doc(`usuarios/${uid}/inventario/hito2-seed-leche`).set({
      codigoBarras:'7801234567890', nombre:'Leche', marca:'Ejemplo', categoria:'Lacteos',
      formato:'1 L', unidad:'unidad', cantidad:1, vencimiento:'Sin fecha',
      fechaRegistro:new Date().toISOString(), creadoEn:FieldValue.serverTimestamp(), ubicacion:'Refrigerador',
    }, { merge:false });
    await db.doc(`usuarios/${uid}/listaCompras/hito2-seed-arroz`).set({
      nombre:'Arroz de prueba', cantidad:1, unidad:'unidad', comprado:false,
      creadoEn:FieldValue.serverTimestamp(), actualizadoEn:FieldValue.serverTimestamp(),
    }, { merge:false });
    console.log(`Datos sintéticos preparados solo en ${proyecto} / Firestore Emulator para UID ${uid}.`);
  } finally { await app.delete(); }
}

if (require.main === module) main().catch(error => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
module.exports = { validarEntorno, main };
