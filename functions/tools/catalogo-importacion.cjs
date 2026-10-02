/** Importación administrativa: solo crea productos nuevos; nunca sustituye ni borra. */
'use strict';
const { mismoProducto } = require('./catalogo-validacion.cjs');

async function prepararCarga(db, registros) {
  const acciones = [];
  // Consultas de 100 documentos, sin descargar el catálogo completo.
  for (let inicio = 0; inicio < registros.length; inicio += 100) {
    const grupo = registros.slice(inicio, inicio + 100);
    const refs = grupo.map(r => db.collection('productos').doc(r.producto.codigoBarras));
    const existentes = await db.getAll(...refs);
    grupo.forEach((registro, i) => {
      const documento = existentes[i];
      acciones.push({ ...registro, estado: !documento.exists ? 'nuevo'
        : mismoProducto(registro.producto, documento.data()) ? 'ya_existe' : 'conflicto' });
    });
  }
  return acciones;
}

async function aplicarCarga(db, acciones, guardarAvance = () => {}) {
  if (acciones.some(r => r.estado === 'conflicto')) {
    throw Error('Hay conflictos con el catálogo existente. No se escribió ningún producto.');
  }
  const pendientes = acciones.filter(r => r.estado === 'nuevo');
  // Diez escrituras simultáneas como máximo; ante un fallo se detienen los grupos siguientes.
  for (let inicio = 0; inicio < pendientes.length; inicio += 10) {
    const grupo = pendientes.slice(inicio, inicio + 10);
    await Promise.all(grupo.map(async registro => {
      const ref = db.collection('productos').doc(registro.producto.codigoBarras);
      try {
        // create es atómico: tampoco sobrescribe si otro administrador se adelantó.
        await ref.create(registro.producto);
        registro.estado = 'creado';
      } catch (error) {
        registro.estado = 'error';
        registro.error = `Operación no confirmada (código ${String(error.code ?? 'desconocido')}). Repite la comparación.`;
        if (error.code === 6 || error.code === 'already-exists') {
          try {
            const actual = await ref.get();
            if (actual.exists && mismoProducto(registro.producto, actual.data())) {
              registro.estado = 'ya_existe'; delete registro.error;
            } else { registro.estado = 'conflicto'; }
          } catch { /* Se conserva el estado de error si tampoco se pudo comprobar el documento. */ }
        }
      }
    }));
    await guardarAvance();
    if (grupo.some(r => r.estado === 'error' || r.estado === 'conflicto')) {
      throw Error('Carga detenida. Puede haber productos creados; consulta el informe antes de reintentar.');
    }
  }
}

module.exports = { prepararCarga, aplicarCarga };
