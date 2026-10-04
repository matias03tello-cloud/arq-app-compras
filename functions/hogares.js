/** Hogares privados: invitaciones de alta entropía, membresía solo desde servidor. */
'use strict';
const { Buffer } = require('node:buffer');
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const hash = token => createHash('sha256').update(token).digest('hex');
const newInvite = id => { const token = randomBytes(32).toString('hex'); return { codigo: `${id}.${token}`, hash: hash(token) }; };
function crearGestorHogares({ db, FieldValue, Timestamp, HttpsError }) {
  const error = (code, message) => { throw new HttpsError(code, message); };
  async function cerrar(id, uid) {
    const ref = db.doc(`hogares/${id}`);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      if (snap.data().propietario !== uid) error('permission-denied', 'Solo el administrador puede cerrar el hogar.');
      tx.update(ref, { estado: 'cerrado' });
    });
    await db.recursiveDelete(ref);
    // Los índices privados tienen hogarId: también se recuperan tras un cierre parcial.
    const indices = await db.collectionGroup('hogares').where('hogarId','==',id).get();
    const batch = db.batch(); indices.docs.forEach(d => batch.delete(d.ref)); await batch.commit();
    const owned = db.doc(`usuarios/${uid}/hogarAdministrado/actual`);
    await db.runTransaction(async tx => { const snap = await tx.get(owned); if (snap.exists && snap.data().id === id) tx.delete(owned); });
  }
  async function gestionar(request) {
    const uid = request.auth?.uid;
    if (!uid || request.auth.token.firebase?.sign_in_provider === 'anonymous') error('unauthenticated', 'Inicia sesión.');
    const d = request.data;
    const allowed = { crear: ['accion','nombre'], entrar: ['accion','codigo'], renovar: ['accion','id'], salir: ['accion','id'], quitar: ['accion','id','integrante'], cerrar: ['accion','id'] };
    if (!d || !Object.hasOwn(allowed, d.accion) || Object.keys(d).some(k => !allowed[d.accion].includes(k))) error('invalid-argument', 'Solicitud inválida.');
    let id = d.accion === 'crear' ? randomBytes(16).toString('hex') : d.id;
    let token;
    if (d.accion === 'entrar') {
      const m = typeof d.codigo === 'string' && d.codigo.trim().match(/^([A-Za-z0-9_-]{1,128})\.([a-f0-9]{64})$/);
      if (!m) error('invalid-argument', 'El código de invitación no es válido.');
      [, id, token] = m;
    }
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) error('invalid-argument', 'Hogar inválido.');
    let nombre;
    if (d.accion === 'crear') {
      nombre = typeof d.nombre === 'string' ? d.nombre.trim().replace(/\s+/g,' ') : '';
      if (nombre.length < 2 || nombre.length > 60 || /[<>@\x00-\x1f]|https?:|www\./i.test(nombre)) error('invalid-argument', 'Usa un nombre de hogar de 2 a 60 caracteres.');
    }
    const invite = ['crear','renovar'].includes(d.accion) ? newInvite(id) : null;
    const ref = db.doc(`hogares/${id}`);
    // El marcador impide incorporar cuentas que están siendo eliminadas.
    const respuesta = await db.runTransaction(async tx => {
      const [bloqueo, snap] = await Promise.all([tx.get(db.doc(`eliminaciones/${uid}`)),tx.get(ref)]);
      if (bloqueo.exists) error('permission-denied', 'La cuenta está en proceso de eliminación.');
      const expires = Timestamp.fromMillis(Date.now() + 7 * 86400000);
      const apodo = String(request.auth.token.name || 'Integrante').replace(/[<>\x00-\x1f]/g,'').slice(0,80);
      if (d.accion === 'crear') {
        const owned = db.doc(`usuarios/${uid}/hogarAdministrado/actual`);
        const actual = await tx.get(owned);
        if (actual.exists && (await tx.get(db.doc(`hogares/${actual.data().id}`))).exists) error('already-exists', 'Ya administras un hogar. Ábrelo desde la lista o reintenta su cierre.');
        tx.set(owned, { id });
        tx.create(ref, { nombre, propietario: uid, miembros: [uid], nombres: { [uid]: apodo }, estado: 'activo', inviteHash: invite.hash, inviteHasta: expires, creadoEn: FieldValue.serverTimestamp() });
        tx.set(db.doc(`usuarios/${uid}/hogares/${id}`), { nombre, hogarId: id });
        return { id, codigo: invite.codigo };
      }
      if (d.accion === 'cerrar' && !snap.exists) return { id, cerrar: true };
      if (d.accion === 'salir' && !snap.exists) { tx.delete(db.doc(`usuarios/${uid}/hogares/${id}`)); return { id }; }
      if (d.accion === 'cerrar' && snap.exists && snap.data().estado === 'cerrado' && snap.data().propietario === uid) return { id, cerrar: true };
      if (!snap.exists || snap.data().estado !== 'activo') error('not-found', 'El hogar no está disponible.');
      const h = snap.data();
      const ownerBlocked = await tx.get(db.doc(`eliminaciones/${h.propietario}`));
      if (ownerBlocked.exists) error('permission-denied', 'El hogar está en proceso de eliminación.');
      if (d.accion === 'entrar') {
        if (h.miembros.includes(uid)) return { id };
        if (h.inviteHasta.toMillis() < Date.now() || typeof h.inviteHash !== 'string' || h.inviteHash.length !== 64 || !timingSafeEqual(Buffer.from(h.inviteHash,'hex'),Buffer.from(hash(token),'hex'))) error('permission-denied', 'La invitación venció o fue renovada. Pide un código nuevo.');
        if (h.miembros.length >= 8) error('resource-exhausted', 'El hogar admite hasta 8 integrantes.');
        tx.update(ref, { miembros: [...h.miembros, uid], nombres: { ...h.nombres, [uid]: apodo } });
        tx.set(db.doc(`usuarios/${uid}/hogares/${id}`), { nombre: h.nombre, hogarId: id });
        return { id };
      }
      if (!h.miembros.includes(uid)) error('permission-denied', 'No perteneces a este hogar.');
      if (['renovar','quitar','cerrar'].includes(d.accion) && h.propietario !== uid) error('permission-denied', 'Solo el administrador puede hacer esto.');
      if (d.accion === 'renovar') { tx.update(ref, { inviteHash: invite.hash, inviteHasta: expires }); return { id, codigo: invite.codigo }; }
      if (d.accion === 'cerrar') return { id, cerrar: true };
      const quitar = d.accion === 'salir' ? uid : d.integrante;
      if (typeof quitar !== 'string' || !h.miembros.includes(quitar) || quitar === h.propietario) error('invalid-argument', 'El administrador debe cerrar el hogar para salir.');
      const nombres = { ...h.nombres }; delete nombres[quitar];
      tx.update(ref, { miembros: h.miembros.filter(u => u !== quitar), nombres, ...(d.accion === 'quitar' ? { inviteHash: newInvite(id).hash } : {}) });
      tx.delete(db.doc(`usuarios/${quitar}/hogares/${id}`));
      return { id };
    });
    if (respuesta.cerrar) { await cerrar(id, uid); return { id }; }
    return respuesta;
  }
  async function limpiarUsuario(uid) {
    const grupos = await db.collection('hogares').where('miembros','array-contains',uid).get();
    for (const grupo of grupos.docs) {
      if (grupo.data().propietario === uid) await cerrar(grupo.id, uid);
      else await db.runTransaction(async tx => {
        const snap = await tx.get(grupo.ref); if (!snap.exists) return;
        const h = snap.data(); const nombres = { ...h.nombres }; delete nombres[uid];
        tx.update(grupo.ref, { miembros: h.miembros.filter(u => u !== uid), nombres });
        tx.delete(db.doc(`usuarios/${uid}/hogares/${grupo.id}`));
      });
    }
    // Cierres parciales de un intento anterior también se terminan.
    const propios = await db.collection('hogares').where('propietario','==',uid).get();
    for (const grupo of propios.docs) await cerrar(grupo.id,uid);
  }
  return { gestionar, limpiarUsuario };
}
module.exports = { crearGestorHogares };
