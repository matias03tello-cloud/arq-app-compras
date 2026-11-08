'use strict';
const { ApiError } = require('./errors');
const { crearServicio, validarCuentaDisponible } = require('./service');
const { resolverRuta } = require('./routes');
const LIMITE_MAXIMO = 100;

function serializar(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializar);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,serializar(v)]));
  return value;
}
function parsearLimite(value) {
  if (value === undefined) return 50;
  if (!/^\d{1,3}$/u.test(value) || Number(value) < 1 || Number(value) > LIMITE_MAXIMO) {
    throw new ApiError(400, 'INVALID_LIMIT', `limit debe ser un entero entre 1 y ${LIMITE_MAXIMO}.`);
  }
  return Number(value);
}
function parsearCursor(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/u.test(value)) {
    throw new ApiError(400,'INVALID_CURSOR','El cursor no es válido.');
  }
  return value;
}
function enviar(res, status, body) {
  if (status === 204) return res.status(204).end();
  return res.status(status).json(body);
}

function crearControlador({ db, adminAuth }) {
  return async (req, res) => {
    res.set('Cache-Control','no-store');
    res.set('X-Content-Type-Options','nosniff');
    const auth = req.get('authorization') || '';
    const token = /^Bearer\s+(.+)$/iu.exec(auth)?.[1];
    if (!token) throw new ApiError(401,'UNAUTHENTICATED','Envía un token de Firebase en Authorization: Bearer <token>.');
    let decoded;
    try { decoded = await adminAuth.verifyIdToken(token,true); }
    catch { throw new ApiError(401,'INVALID_TOKEN','El token no es válido o venció.'); }
    await validarCuentaDisponible(db, decoded);

    const route = resolverRuta(req);
    if (!route) throw new ApiError(404,'ROUTE_NOT_FOUND','La ruta solicitada no existe.');
    const { recurso, id, action } = route;
    const service = crearServicio(db, decoded.uid, recurso);
    const method = req.method.toUpperCase();
    const hasBody = ['POST','PATCH'].includes(method);
    if (hasBody && !/^application\/json(?:\s*;|$)/iu.test(req.get('content-type') || '')) {
      throw new ApiError(415,'UNSUPPORTED_MEDIA_TYPE','Envía el cuerpo como application/json.');
    }
    if (action === 'list') {
      const limit = parsearLimite(req.query.limit);
      const result = await service.listar(limit, parsearCursor(req.query.cursor));
      return enviar(res,200,{ data:serializar(result.items), pagination:{ limit, nextCursor:result.nextCursor } });
    }
    if (action === 'get') return enviar(res,200,{ data:serializar(await service.obtener(id)) });
    if (action === 'create') {
      const item = await service.crear(req.body);
      res.set('Location',`/api/v1/${recurso}/${item.id}`);
      return enviar(res,201,{ data:serializar(item) });
    }
    if (action === 'update') return enviar(res,200,{ data:serializar(await service.actualizar(id,req.body)) });
    if (action === 'delete') { await service.borrar(id); return enviar(res,204); }
  };
}

function crearControladorSeguro(deps) {
  const controller = crearControlador(deps);
  return (req,res) => controller(req,res).catch(error => {
    const status = error instanceof ApiError ? error.status : 500;
    const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
    const message = error instanceof ApiError ? error.message : 'Ocurrió un error interno al procesar la solicitud.';
    if (error.allow) res.set('Allow',error.allow);
    if (status >= 500) console.error('api_rest_failure', { method:req.method, path:req.path, code });
    return res.status(status).json({ error:{ code, message } });
  });
}

module.exports = { crearControladorSeguro };
