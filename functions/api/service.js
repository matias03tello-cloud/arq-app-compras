'use strict';
const { FieldValue } = require('firebase-admin/firestore');
const { ApiError } = require('./errors');
const { crearRepositorio, crearRepositorioCuenta } = require('./repository');
const { validarAltaInventario, validarCambioInventario, validarCompra, validarCambioCompra } = require('./validators');

const CAMPOS_IDENTIDAD_PRODUCTO = ['codigoBarras','nombre','marca','categoria','formato','unidad'];

async function comprobarIdentidadProducto(repositorioCuenta, item) {
  if (item.codigoBarras.startsWith('sin:')) return;
  const producto = await repositorioCuenta.obtenerProductoCatalogo(item.codigoBarras);
  const coincide = producto && producto.activo === true
    && CAMPOS_IDENTIDAD_PRODUCTO.every(campo => producto[campo] === item[campo]);
  if (!coincide) {
    throw new ApiError(422, 'PRODUCT_IDENTITY_MISMATCH', 'El producto no coincide con el catálogo disponible para esta cuenta.');
  }
}

async function validarCuentaDisponible(db, decoded) {
  if (decoded.firebase?.sign_in_provider === 'anonymous') {
    throw new ApiError(403, 'ACCOUNT_REQUIRED', 'Inicia sesión con una cuenta registrada.');
  }
  const repositorioCuenta = crearRepositorioCuenta(db, decoded.uid);
  if (await repositorioCuenta.tieneEliminacionPendiente()) {
    throw new ApiError(403, 'ACCOUNT_DELETION_PENDING', 'La cuenta está en proceso de eliminación.');
  }
}

function crearServicio(db, uid, recurso) {
  const inventario = recurso === 'inventario';
  const repo = crearRepositorio(db, uid, inventario ? 'inventario' : 'listaCompras');
  const repositorioCuenta = crearRepositorioCuenta(db, uid);
  return {
    async listar(limit, cursor) {
      const resultado = await repo.listar({ limit, cursor });
      if (!resultado.cursorValido) {
        throw new ApiError(400, 'INVALID_CURSOR', 'El cursor no corresponde a un registro disponible.');
      }
      return { items:resultado.items, nextCursor:resultado.nextCursor };
    },
    async obtener(id) {
      const item = await repo.obtener(id);
      if (!item) throw new ApiError(404, 'NOT_FOUND', 'No se encontró el registro solicitado.');
      return item;
    },
    async crear(body) {
      const data = inventario ? validarAltaInventario(body) : {
        ...validarCompra(body), comprado:false, creadoEn:FieldValue.serverTimestamp(), actualizadoEn:FieldValue.serverTimestamp(),
      };
      if (inventario) {
        await comprobarIdentidadProducto(repositorioCuenta, data);
        data.creadoEn = FieldValue.serverTimestamp();
      }
      return repo.crear(data);
    },
    async actualizar(id, body) {
      const previo = await repo.obtener(id);
      if (!previo) throw new ApiError(404, 'NOT_FOUND', 'No se encontró el registro solicitado.');
      const changes = inventario ? validarCambioInventario(previo, body) : validarCambioCompra(previo, body);
      if (!inventario) changes.actualizadoEn = FieldValue.serverTimestamp();
      const actualizado = await repo.actualizar(id, changes);
      if (!actualizado) throw new ApiError(404, 'NOT_FOUND', 'No se encontró el registro solicitado.');
      return actualizado;
    },
    async borrar(id) {
      if (!await repo.borrar(id)) throw new ApiError(404, 'NOT_FOUND', 'No se encontró el registro solicitado.');
    },
  };
}

module.exports = { crearServicio, validarCuentaDisponible };
