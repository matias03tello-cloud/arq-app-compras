'use strict';
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineBoolean } = require('firebase-functions/params');
const { assertRecentAuthentication, deleteAccountData } = require('./deletion');
initializeApp();
const db = getFirestore();
const adminAuth = getAuth();
// Cambiar a true después de integrar App Check en TODAS las plataformas usadas.
const enforceAppCheck = defineBoolean('ENFORCE_APP_CHECK', { default: false });
const options = { region: 'southamerica-west1', enforceAppCheck, maxInstances: 3 };

async function ignoreMissing(operation) {
  try { await operation(); }
  catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
}
const deletionDeps = {
  disableAndRevoke: async uid => {
    await ignoreMissing(() => adminAuth.updateUser(uid, { disabled: true }));
    await ignoreMissing(() => adminAuth.revokeRefreshTokens(uid));
  },
  deleteLegacyInventory: async uid => {
    // Consulta paginada por propietario; nunca borra usuario_demo.
    for (;;) {
      const page = await db.collection('inventario').where('usuarioId', '==', uid).limit(400).get();
      if (page.empty) return;
      const batch = db.batch();
      page.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  },
  deletePrivateTree: uid => db.recursiveDelete(db.doc(`usuarios/${uid}`)),
  deleteAuth: uid => ignoreMissing(() => adminAuth.deleteUser(uid)),
  markCompleted: uid => db.doc(`eliminaciones/${uid}`).update({ estado: 'completada', completadaEn: FieldValue.serverTimestamp() }),
};

exports.solicitarEliminacionCuenta = onCall(options, async request => {
  let uid;
  try { uid = assertRecentAuthentication(request.auth, Date.now() / 1000); }
  catch { throw new HttpsError('unauthenticated', 'Vuelve a autenticarte.'); }
  if (request.data !== null && request.data !== undefined && Object.keys(request.data).length !== 0) {
    throw new HttpsError('invalid-argument', 'Esta operación no acepta un UID ni otros datos.');
  }
  // El UID procede exclusivamente del token validado por el framework.
  const ref = db.doc(`eliminaciones/${uid}`);
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) tx.create(ref, { estado: 'pendiente', solicitadaEn: FieldValue.serverTimestamp() });
  });
  return { estado: 'solicitada' };
});

exports.procesarEliminacionCuenta = onDocumentCreated({
  document: 'eliminaciones/{uid}', region: 'southamerica-west1', retry: true,
  timeoutSeconds: 540, maxInstances: 3,
}, async event => {
  if (!event.data) return;
  const current = await event.data.ref.get();
  if (!current.exists || current.data().estado === 'completada') return;
  try { await deleteAccountData(event.params.uid, deletionDeps); }
  catch { throw new Error('ACCOUNT_DELETION_RETRY'); } // Sin documentos ni identidad en el error.
});

exports.mantenimientoEliminaciones = onSchedule({
  schedule: 'every 60 minutes', region: 'southamerica-west1', timeoutSeconds: 540, maxInstances: 1,
}, async () => {
  const pending = await db.collection('eliminaciones').where('estado', '==', 'pendiente').limit(50).get();
  let failed = false;
  for (const item of pending.docs) {
    // Dejar tiempo al trigger inicial; las operaciones siguen siendo idempotentes.
    if (item.data().solicitadaEn.toMillis() > Date.now() - 120000) continue;
    try { await deleteAccountData(item.id, deletionDeps); } catch { failed = true; }
  }
  const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const expired = await db.collection('eliminaciones').where('completadaEn', '<', cutoff).limit(400).get();
  const batch = db.batch();
  expired.docs.forEach(item => batch.delete(item.ref));
  if (!expired.empty) await batch.commit();
  if (failed) throw new Error('ACCOUNT_DELETION_PENDING');
});

exports.actualizarPerfil = onCall(options, async request => {
  const uid = request.auth?.uid;
  if (!uid || request.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'Inicia sesión.');
  }
  const nombre = request.data?.nombre;
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 80
      || /[\u0000-\u001f\u007f]/.test(nombre) || Object.keys(request.data).some(k => k !== 'nombre')) {
    throw new HttpsError('invalid-argument', 'Nombre inválido.');
  }
  if ((await db.doc(`eliminaciones/${uid}`).get()).exists) {
    throw new HttpsError('failed-precondition', 'Cuenta en eliminación.');
  }
  await adminAuth.updateUser(uid, { displayName: nombre.trim() });
  // Eliminar las copias antiguas: Auth es la única fuente de nombre/correo.
  const profile = db.doc(`usuarios/${uid}`);
  await db.runTransaction(async tx => {
    const snap = await tx.get(profile);
    if (snap.exists) tx.update(profile, { nombre: FieldValue.delete(), email: FieldValue.delete() });
  });
  return { actualizado: true };
});
