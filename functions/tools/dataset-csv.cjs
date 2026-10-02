/** Lector CSV/TSV incremental: admite comillas, saltos internos y bloques UTF-8. */
'use strict';

async function* leerFilas(flujo, separador = '\t') {
  if (!['\t', ',', ';'].includes(separador)) throw Error('Separador no admitido.');
  let fila = [], campo = '', estado = 'inicio', omitirLF = false, primero = true, longitud = 0;
  for await (const bloque of flujo) {
    for (const caracter of bloque) {
      if (primero) { primero = false; if (caracter === '\uFEFF') continue; }
      if (omitirLF) { omitirLF = false; if (caracter === '\n') continue; }
      // Rechaza registros anómalos antes de que puedan consumir memoria sin límite.
      if (++longitud > 4 * 1024 * 1024) throw Error('Registro CSV mayor de 4 Mi caracteres.');
      if (estado === 'comillas') {
        if (caracter === '"') estado = 'cerrado';
        else campo += caracter;
        continue;
      }
      if (estado === 'cerrado' && caracter === '"') { campo += '"'; estado = 'comillas'; continue; }
      if (caracter === separador || caracter === '\r' || caracter === '\n') {
        fila.push(campo); campo = ''; estado = 'inicio';
        if (fila.length > 4096) throw Error('Demasiadas columnas en el CSV.');
        if (caracter !== separador) {
          yield fila; fila = []; longitud = 0; omitirLF = caracter === '\r';
        }
        continue;
      }
      if (estado === 'cerrado') throw Error('Hay texto después de cerrar comillas.');
      if (caracter === '"') {
        if (estado !== 'inicio') throw Error('Comillas inesperadas dentro de un campo.');
        estado = 'comillas';
      } else { campo += caracter; estado = 'texto'; }
    }
  }
  if (estado === 'comillas') throw Error('CSV incompleto: faltan comillas de cierre.');
  if (fila.length || campo || estado !== 'inicio') { fila.push(campo); yield fila; }
}

module.exports = { leerFilas };
