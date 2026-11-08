'use strict';
const { ApiError } = require('./errors');

const RECURSOS = new Set(['inventario','lista-compras']);

function resolverRuta(req) {
  const parts = req.path.replace(/\/+$/u,'').split('/').filter(Boolean);
  if (parts.shift() !== 'v1' || !RECURSOS.has(parts[0]) || parts.length > 2) return null;
  const recurso = parts[0];
  let id = parts[1];
  if (id) {
    try { id = decodeURIComponent(id); } catch { throw new ApiError(400,'INVALID_ID','El identificador no es válido.'); }
    if (!/^[A-Za-z0-9_-]{1,150}$/u.test(id)) throw new ApiError(400,'INVALID_ID','El identificador no es válido.');
  }
  const method = req.method.toUpperCase();
  const actions = {
    'GET:collection':'list', 'GET:item':'get', 'POST:collection':'create',
    'PATCH:item':'update', 'DELETE:item':'delete',
  };
  const kind = id ? 'item' : 'collection';
  const action = actions[`${method}:${kind}`];
  if (!action) {
    const error = new ApiError(405,'METHOD_NOT_ALLOWED','El método no está permitido para esta ruta.');
    error.allow = id ? 'GET, PATCH, DELETE' : 'GET, POST';
    throw error;
  }
  return { recurso, id, action };
}

module.exports = { resolverRuta };
