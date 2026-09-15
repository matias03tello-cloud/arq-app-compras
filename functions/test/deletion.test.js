const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertRecentAuthentication, deleteAccountData } = require('../deletion');

test('el servidor exige identidad autenticada y login reciente', () => {
  const valid = { uid: 'A', token: { auth_time: 990, firebase: { sign_in_provider: 'password' } } };
  assert.equal(assertRecentAuthentication(valid, 1000), 'A');
  for (const auth of [null, { uid: 'A', token: {} }, { ...valid, token: { ...valid.token, auth_time: 100 } }, { ...valid, token: { ...valid.token, auth_time: 2000 } }, { ...valid, token: { ...valid.token, firebase: { sign_in_provider: 'anonymous' } } }]) {
    assert.throws(() => assertRecentAuthentication(auth, 1000), /RECENT_AUTH_REQUIRED/);
  }
});
test('fallo durante borrado no elimina Auth ni marca completada; reintento termina', async () => {
  const calls = [];
  let fail = true;
  const deps = Object.fromEntries(['disableAndRevoke','deleteLegacyInventory','deletePrivateTree','deleteAuth','markCompleted'].map(name => [name, async uid => {
    assert.equal(uid, 'A'); calls.push(name);
    if (name === 'deletePrivateTree' && fail) { fail = false; throw new Error('temporarily unavailable'); }
  }]));
  await assert.rejects(deleteAccountData('A', deps));
  assert.deepEqual(calls, ['disableAndRevoke','deleteLegacyInventory','deletePrivateTree']);
  calls.length = 0;
  await deleteAccountData('A', deps);
  assert.deepEqual(calls, ['disableAndRevoke','deleteLegacyInventory','deletePrivateTree','deleteAuth','markCompleted']);
});
test('no marcar completada si falla borrar la cuenta de Authentication', async () => {
  let complete = false;
  await assert.rejects(deleteAccountData('A', {
    disableAndRevoke: async () => {}, deleteLegacyInventory: async () => {}, deletePrivateTree: async () => {},
    deleteAuth: async () => { throw new Error('retry'); }, markCompleted: async () => { complete = true; },
  }));
  assert.equal(complete, false);
});
