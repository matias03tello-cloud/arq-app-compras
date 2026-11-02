'use strict';

/**
 * API REST propia de FrescApp.
 * Autenticación: Firebase ID token en Authorization: Bearer <token>.
 * Cada operación queda limitada a usuarios/{uid}; el UID nunca se acepta desde el body.
 */
const { onRequest } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();
const auth = getAuth();
const REGION = 'southamerica-west1';
const OPTIONS = { region: REGION, maxInstances: 3, cors: false };

function send(res, status, payload) {
  if (status === 204) return res.status(204).end();
  return res.status(status).json(payload);
}
function fail(res, status, code, message) {
  return send(res, status, { error: { code, message } });
}
function parseBody(req) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return null;
  return req.body;
}
async function userFromRequest(req) {
  const header = req.get('authorization') || '';
  const match = /^Bearer (\S+)$/.exec(header);
  if (!match) return null;
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    if (decoded.firebase?.sign_in_provider === 'anonymous') return null;
    const deletion = await db.doc(`eliminaciones/${decoded.uid}`).get();
    if (deletion.exists) return null;
    return decoded.uid;
  } catch {
    return null;
  }
}
function validId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
}
function validShopping(body, partial = false) {
  const allowed = new Set(['nombre', 'cantidad', 'unidad', 'comprado']);
  if (Object.keys(body).some(k => !allowed.has(k))) return false;
  if (!partial || 'nombre' in body) {
    if (typeof body.nombre !== 'string' || body.nombre.trim().length < 2
      || body.nombre.trim().length > 120 || /[<>\n\r\u0000-\u001f]/.test(body.nombre)) return false;
  }
  if (!partial || 'cantidad' in body) {
    if (typeof body.cantidad !== 'number' || !Number.isFinite(body.cantidad)
      || body.cantidad <= 0 || body.cantidad > 999) return false;
  }
  if (!partial || 'unidad' in body) {
    if (!['unidad', 'kg', 'g', 'L'].includes(body.unidad)) return false;
  }
  if (!partial || 'comprado' in body) {
    if (typeof body.comprado !== 'boolean') return false;
  }
  const unidad = body.unidad;
  const cantidad = body.cantidad;
  if (unidad === 'unidad' && typeof cantidad === 'number' && !Number.isInteger(cantidad)) return false;
  return true;
}
function validInventory(body, partial = false) {
  const allowed = new Set([
    'codigoBarras','nombre','marca','categoria','formato','unidad',
    'cantidad','vencimiento','fechaRegistro','ubicacion','abiertoEn'
  ]);
  if (Object.keys(body).some(k => !allowed.has(k))) return false;
  const required = ['codigoBarras','nombre','marca','categoria','formato','unidad','cantidad','vencimiento','fechaRegistro'];
  if (!partial && required.some(k => !(k in body))) return false;
  const strings = ['codigoBarras','nombre','marca','categoria','formato','unidad','vencimiento','fechaRegistro','ubicacion','abiertoEn'];
  for (const key of strings) {
    if (key in body && (typeof body[key] !== 'string' || body[key].length > 200)) return false;
  }
  if ('cantidad' in body && (typeof body.cantidad !== 'number' || !Number.isFinite(body.cantidad)
    || body.cantidad <= 0 || body.cantidad > 999)) return false;
  if ('ubicacion' in body && !['Despensa','Refrigerador','Congelador'].includes(body.ubicacion)) return false;
  if ('unidad' in body && !['unidad','kg','g','L','ml'].includes(body.unidad)) return false;
  if ('nombre' in body && (!body.nombre.trim() || body.nombre.length > 120)) return false;
  if ('marca' in body && (!body.marca.trim() || body.marca.length > 80)) return false;
  if ('categoria' in body && !['Lacteos','Carnes','Frutas','Verduras','Despensa','Bebidas','Congelados','Snacks','Otros'].includes(body.categoria)) return false;
  if ('vencimiento' in body && body.vencimiento !== 'Sin fecha'
    && !/^([0-9]{2}\/)?[0-9]{2}\/[0-9]{4}$/.test(body.vencimiento)) return false;
  if ('fechaRegistro' in body && !body.fechaRegistro.trim()) return false;
  if ('codigoBarras' in body && !/^(\d{8,14}|sin:[a-z0-9-]+)$/.test(body.codigoBarras)) return false;
  return true;
}
async function collectionFor(uid, resource) {
  return db.collection('usuarios').doc(uid).collection(resource);
}
async function handleResource(req, res, uid, resource) {
  const parts = req.path.split('/').filter(Boolean);
  const id = parts[1];
  const ref = await collectionFor(uid, resource);
  const isShopping = resource === 'listaCompras';
  const validate = isShopping ? validShopping : validInventory;

  if (parts.length > 2 || (id && !validId(id))) return fail(res, 400, 'INVALID_ID', 'Identificador inválido.');
  if (req.method === 'GET' && !id) {
    const snapshot = await ref.get();
    return send(res, 200, { data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) });
  }
  if (req.method === 'POST' && !id) {
    const body = parseBody(req);
    if (!body || !validate(body)) return fail(res, 400, 'VALIDATION_ERROR', 'Los datos enviados no son válidos.');
    if (!isShopping && body.codigoBarras.startsWith('sin:')) {
      return fail(res, 400, 'CATALOG_REQUIRED', 'Los productos sin código deben agregarse desde la aplicación para validar su identidad.');
    }
    if (!isShopping) {
      const product = await db.collection('productos').doc(body.codigoBarras).get();
      if (!product.exists || product.data().activo !== true) return fail(res, 400, 'PRODUCT_NOT_FOUND', 'El producto no existe o está inactivo en el catálogo.');
      const p = product.data();
      for (const key of ['nombre','marca','categoria','formato','unidad']) {
        if (body[key] !== p[key]) return fail(res, 409, 'PRODUCT_IDENTITY_MISMATCH', 'La identidad del producto no coincide con el catálogo.');
      }
    }
    const now = FieldValue.serverTimestamp();
    const data = isShopping
      ? { nombre: body.nombre.trim(), cantidad: body.cantidad, unidad: body.unidad, comprado: body.comprado, creadoEn: now, actualizadoEn: now }
      : { ...body, ubicacion: body.ubicacion || 'Despensa', creadoEn: now };
    const created = await ref.add(data);
    return send(res, 201, { data: { id: created.id } });
  }
  if (id && req.method === 'GET') {
    const snap = await ref.doc(id).get();
    return snap.exists ? send(res, 200, { data: { id: snap.id, ...snap.data() } })
      : fail(res, 404, 'NOT_FOUND', 'No se encontró el registro.');
  }
  if (id && req.method === 'PATCH') {
    const body = parseBody(req);
    if (!body || !Object.keys(body).length || !validate(body, true)) return fail(res, 400, 'VALIDATION_ERROR', 'Los datos enviados no son válidos.');
    const item = ref.doc(id);
    const snap = await item.get();
    if (!snap.exists) return fail(res, 404, 'NOT_FOUND', 'No se encontró el registro.');
    if (!isShopping && ['codigoBarras','nombre','marca','categoria','formato','unidad'].some(k => k in body)) {
      return fail(res, 400, 'IDENTITY_IMMUTABLE', 'La identidad del producto no se puede cambiar; elimina el registro y agrégalo nuevamente.');
    }
    await item.update({ ...body, ...(isShopping ? { actualizadoEn: FieldValue.serverTimestamp() } : {}) });
    return send(res, 200, { data: { id } });
  }
  if (id && req.method === 'DELETE') {
    const item = ref.doc(id);
    const snap = await item.get();
    if (!snap.exists) return fail(res, 404, 'NOT_FOUND', 'No se encontró el registro.');
    await item.delete();
    return send(res, 204);
  }
  res.set('Allow', 'GET, POST, PATCH, DELETE');
  return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
}

exports.api = onRequest(OPTIONS, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    if (req.method === 'OPTIONS') {
      res.set('Allow', 'GET, POST, PATCH, DELETE, OPTIONS');
      return send(res, 204);
    }
    const uid = await userFromRequest(req);
    if (!uid) return fail(res, 401, 'UNAUTHENTICATED', 'Debes iniciar sesión con una cuenta válida.');
    const resource = req.path.split('/').filter(Boolean)[0];
    if (!['inventario','lista-compras'].includes(resource)) return fail(res, 404, 'NOT_FOUND', 'Ruta no encontrada.');
    return await handleResource(req, res, uid, resource === 'inventario' ? 'inventario' : 'listaCompras');
  } catch (error) {
    console.error('FRESCAPP_API_ERROR', error?.code || 'unknown');
    return fail(res, 500, 'INTERNAL_ERROR', 'No se pudo completar la solicitud.');
  }
});
