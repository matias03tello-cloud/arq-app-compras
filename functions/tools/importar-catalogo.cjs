#!/usr/bin/env node
/** Ejecutar desde la raíz del proyecto. Sin --comparar/--aplicar, solo valida localmente. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { validarCatalogo } = require('./catalogo-validacion.cjs');
const { prepararCarga, aplicarCarga } = require('./catalogo-importacion.cjs');

function argumentos(args) {
  const opciones = {};
  const flags = ['--comparar', '--aplicar', '--emulador', '--ayuda'];
  const valores = ['--archivo', '--proyecto', '--confirmar-proyecto'];
  for (let i = 0; i < args.length; i++) {
    const clave = args[i];
    if (Object.hasOwn(opciones, clave)) throw Error(`Opción repetida: ${clave}.`);
    if (flags.includes(clave)) opciones[clave] = true;
    else if (valores.includes(clave) && args[i + 1] && !args[i + 1].startsWith('--')) opciones[clave] = args[++i];
    else throw Error(`Opción desconocida o incompleta: ${clave}.`);
  }
  if (opciones['--ayuda']) return opciones;
  if (!opciones['--archivo']) throw Error('Falta --archivo con la ruta del JSON.');
  if (opciones['--comparar'] && opciones['--aplicar']) throw Error('Elige --comparar o --aplicar.');
  const online = opciones['--comparar'] || opciones['--aplicar'];
  const proyecto = opciones['--proyecto'];
  if (online && (!proyecto || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u.test(proyecto))) {
    throw Error('Indica --proyecto con el ID de Firebase. No se toma de la configuración de tu app.');
  }
  if (!online && (proyecto || opciones['--emulador'] || opciones['--confirmar-proyecto'])) {
    throw Error('Para usar Firebase indica --comparar o --aplicar. Sin ellos la validación es local.');
  }
  if (opciones['--aplicar'] && opciones['--confirmar-proyecto'] !== proyecto) {
    throw Error('Para escribir, añade --confirmar-proyecto con el mismo ID que --proyecto.');
  }
  if (online) {
    const host = process.env.FIRESTORE_EMULATOR_HOST;
    if (opciones['--emulador']) {
      const coincidencia = /^(?:127\.0\.0\.1|localhost):(\d{1,5})$/u.exec(host || '');
      if (!proyecto.startsWith('demo-') || !coincidencia || Number(coincidencia[1]) < 1 || Number(coincidencia[1]) > 65535) {
        throw Error('El emulador requiere proyecto demo- y FIRESTORE_EMULATOR_HOST=127.0.0.1:PUERTO.');
      }
    } else if (host || proyecto.startsWith('demo-')) {
      throw Error('Entorno de emulador detectado: usa --emulador con un proyecto demo-.');
    }
  }
  return opciones;
}

function resumen(registros) {
  return registros.reduce((total, r) => { total[r.estado || 'validado'] = (total[r.estado || 'validado'] || 0) + 1; return total; }, {});
}

async function main(args) {
  const opciones = argumentos(args);
  if (opciones['--ayuda']) {
    console.log('node functions/tools/importar-catalogo.cjs --archivo RUTA.json [--comparar | --aplicar] [--proyecto ID] [--confirmar-proyecto ID] [--emulador]');
    return;
  }
  const archivo = path.resolve(opciones['--archivo']);
  if (path.extname(archivo).toLowerCase() !== '.json') throw Error('Esta versión recibe archivos .json UTF-8.');
  if (fs.statSync(archivo).size > 20 * 1024 * 1024) throw Error('Máximo 20 MiB por archivo; divide la carga.');
  const contenido = fs.readFileSync(archivo, 'utf8');
  let filas;
  try { filas = JSON.parse(contenido.replace(/^\uFEFF/u, '')); }
  catch { throw Error('JSON inválido. Comprueba comas, comillas dobles y corchetes.'); }
  const validacion = validarCatalogo(filas);
  const informe = { version: 1, fecha: new Date().toISOString(),
    modo: opciones['--aplicar'] ? 'aplicar' : opciones['--comparar'] ? 'comparar' : 'validar',
    proyecto: opciones['--proyecto'] || null, emulador: !!opciones['--emulador'],
    sha256Archivo: createHash('sha256').update(contenido).digest('hex'),
    ...validacion, estado: 'validado' };
  const carpeta = path.resolve('docs', 'catalogo', 'informes');
  fs.mkdirSync(carpeta, { recursive: true });
  const destino = path.join(carpeta, `catalogo-${Date.now()}-${randomUUID()}.json`);
  // Reserva un nombre nuevo y comprueba que se puede guardar el informe antes de escribir en Firebase.
  fs.writeFileSync(destino, '', { flag: 'wx' });
  const guardar = () => fs.writeFileSync(destino, JSON.stringify(informe, null, 2) + '\n');
  guardar();
  console.log(`Informe: ${destino}`);
  console.log(`Filas: ${validacion.filas}. Productos únicos: ${validacion.registros.length}. Avisos: ${validacion.avisos.length}. Errores: ${validacion.errores.length}.`);
  if (validacion.errores.length) {
    informe.estado = 'rechazado'; guardar();
    validacion.errores.slice(0, 10).forEach(e => console.error(`Fila ${e.fila}: ${e.mensaje}`));
    throw Error('Corrige el archivo completo. No se ha consultado ni escrito Firebase.');
  }
  if (!opciones['--comparar'] && !opciones['--aplicar']) {
    console.log('Validación local terminada. Esto no certifica que los productos sean reales ni los publica.'); return;
  }
  let app;
  try {
    // El SDK se carga solo en operaciones administrativas; nunca se incluye en la aplicación móvil.
    const { initializeApp, applicationDefault } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    const configuracion = { projectId: opciones['--proyecto'] };
    if (!opciones['--emulador']) configuracion.credential = applicationDefault();
    app = initializeApp(configuracion, `catalogo-${randomUUID()}`);
    const db = getFirestore(app);
    console.log(`Destino: ${opciones['--emulador'] ? 'emulador local' : 'Firebase real'} / ${opciones['--proyecto']} / productos`);
    informe.registros = await prepararCarga(db, validacion.registros);
    informe.estado = 'comparado'; guardar();
    console.log(JSON.stringify(resumen(informe.registros)));
    if (informe.registros.some(r => r.estado === 'conflicto')) throw Error('Hay productos existentes con datos distintos. Revísalos; no se sobrescriben.');
    if (opciones['--aplicar']) {
      informe.estado = 'aplicando'; guardar();
      await aplicarCarga(db, informe.registros, guardar);
      informe.estado = 'completado'; guardar();
      console.log(`Carga terminada: ${JSON.stringify(resumen(informe.registros))}`);
    } else console.log('Vista previa terminada: no se ha escrito en Firebase.');
  } catch (error) {
    informe.estado = 'detenido'; guardar();
    if (error.code === 'MODULE_NOT_FOUND') throw Error('Falta firebase-admin. Desde la raíz ejecuta npm ci --prefix functions.');
    throw error;
  } finally {
    if (app) await app.delete();
  }
}

if (require.main === module) main(process.argv.slice(2)).catch(error => {
  console.error(`ERROR: ${error.message}`); process.exitCode = 1;
});
module.exports = { argumentos, main };
