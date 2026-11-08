'use strict';
const { FieldPath } = require('firebase-admin/firestore');

function crearRepositorio(db, uid, nombre) {
  const collection = db.collection(`usuarios/${uid}/${nombre}`);
  return {
    async listar({ limit, cursor }) {
      let query = collection.orderBy(FieldPath.documentId()).limit(limit + 1);
      if (cursor) {
        const previous = await collection.doc(cursor).get();
        if (!previous.exists) return { items:[], nextCursor:null, cursorValido:false };
        query = collection.orderBy(FieldPath.documentId()).startAfter(previous).limit(limit + 1);
      }
      const snapshot = await query.get();
      const docs = snapshot.docs.slice(0, limit);
      return {
        items:docs.map(d => ({ id:d.id, ...d.data() })),
        nextCursor:snapshot.docs.length > limit ? docs.at(-1).id : null,
        cursorValido:true,
      };
    },
    async obtener(id) {
      const snapshot = await collection.doc(id).get();
      return snapshot.exists ? { id:snapshot.id, ...snapshot.data() } : null;
    },
    async crear(data) {
      const ref = await collection.add(data);
      const snapshot = await ref.get();
      return { id:ref.id, ...snapshot.data() };
    },
    async actualizar(id, data) {
      const ref = collection.doc(id);
      const snapshot = await ref.get();
      if (!snapshot.exists) return null;
      await ref.update(data);
      const updated = await ref.get();
      return { id:updated.id, ...updated.data() };
    },
    async borrar(id) {
      const ref = collection.doc(id);
      const snapshot = await ref.get();
      if (!snapshot.exists) return false;
      await ref.delete();
      return true;
    },
  };
}

function crearRepositorioCuenta(db, uid) {
  return {
    async tieneEliminacionPendiente() {
      return (await db.doc(`eliminaciones/${uid}`).get()).exists;
    },
    async obtenerProductoCatalogo(codigoBarras) {
      const comun = await db.doc(`productos/${codigoBarras}`).get();
      if (comun.exists) return comun.data();
      const privado = await db.doc(`usuarios/${uid}/productosPrivados/${codigoBarras}`).get();
      return privado.exists ? privado.data() : null;
    },
  };
}

module.exports = { crearRepositorio, crearRepositorioCuenta };
