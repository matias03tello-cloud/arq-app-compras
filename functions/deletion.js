/** Secuencia de eliminación reintentable y validación de autenticación reciente. */
'use strict';

function assertRecentAuthentication(auth, nowSeconds) {
  const seconds = auth?.token?.auth_time;
  if (!auth?.uid || auth.token.firebase?.sign_in_provider === 'anonymous'
      || !Number.isFinite(seconds) || seconds > nowSeconds + 60 || nowSeconds - seconds > 300) {
    throw new Error('RECENT_AUTH_REQUIRED');
  }
  return auth.uid;
}

// Idempotente: repetir después de un fallo nunca vuelve a habilitar escrituras.
// El bloqueo se crea antes de invocar este proceso y persiste al menos 24 h
// después del borrado de Authentication, superando la vigencia de sus ID tokens.
async function deleteAccountData(uid, deps) {
  await deps.disableAndRevoke(uid);
  await deps.deleteLegacyInventory(uid);
  await deps.deletePrivateTree(uid);
  await deps.deleteAuth(uid);
  await deps.markCompleted(uid);
}

module.exports = { assertRecentAuthentication, deleteAccountData };
