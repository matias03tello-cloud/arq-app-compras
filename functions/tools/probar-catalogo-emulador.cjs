/** Genera 1.000 productos SINTÉTICOS únicamente en un proyecto demo local. */
/* global __dirname */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const proyecto = 'demo-frescapp-catalogo';

function codigoDePrueba(numero) {
  const base = `29${String(numero).padStart(10, '0')}`;
  const suma = [...base].reduce((total, digito, i) => total + Number(digito) * (i % 2 ? 3 : 1), 0);
  return base + (10 - suma % 10) % 10;
}

async function main() {
  assert.equal(process.env.GCLOUD_PROJECT, proyecto, 'Solo se permite demo-frescapp-catalogo.');
  assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^(?:127\.0\.0\.1|localhost):\d+$/u);
  const { initializeApp } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = initializeApp({ projectId: proyecto });
  const db = getFirestore(app);
  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'frescapp-catalogo-test-'));
  try {
    const filas = Array.from({ length: 1000 }, (_, i) => ({
      codigoBarras: codigoDePrueba(i + 1), nombre: `SOLO PRUEBA ${i + 1}`, marca: 'Ficticia',
      categoria: 'Despensa', formato: '100 g', unidad: 'unidad', activo: true,
      fuente: 'Generador de laboratorio', evidencia: 'No es un producto real', verificado: true,
    }));
    const archivo = path.join(temporal, 'sinteticos.json');
    fs.writeFileSync(archivo, JSON.stringify(filas));
    const programa = path.join(__dirname, 'importar-catalogo.cjs');
    function ejecutar(extras) {
      const resultado = spawnSync(process.execPath, [programa, '--archivo', archivo, ...extras],
        { cwd: temporal, encoding: 'utf8', timeout: 180000 });
      assert.equal(resultado.status, 0, resultado.stdout + resultado.stderr);
      return resultado.stdout;
    }
    const destino = ['--proyecto', proyecto, '--emulador'];
    ejecutar(['--comparar', ...destino]);
    assert.equal((await db.collection('productos').count().get()).data().count, 0);
    const inicio = Date.now();
    const primera = ejecutar(['--aplicar', ...destino, '--confirmar-proyecto', proyecto]);
    const duracionMs = Date.now() - inicio;
    assert.match(primera, /"creado":1000/u);
    assert.equal((await db.collection('productos').count().get()).data().count, 1000);
    const segunda = ejecutar(['--aplicar', ...destino, '--confirmar-proyecto', proyecto]);
    assert.match(segunda, /"ya_existe":1000/u);
    assert.equal((await db.collection('productos').count().get()).data().count, 1000);
    const primero = await db.doc(`productos/${filas[0].codigoBarras}`).get();
    assert.equal(primero.data().nombre, filas[0].nombre);
    assert.equal(Object.keys(primero.data()).length, 7);
    filas[0].nombre = 'CAMBIO QUE NO SE DEBE PUBLICAR';
    fs.writeFileSync(archivo, JSON.stringify(filas));
    const conflicto = spawnSync(process.execPath, [programa, '--archivo', archivo,
      '--aplicar', ...destino, '--confirmar-proyecto', proyecto], { cwd: temporal, encoding: 'utf8', timeout: 60000 });
    assert.equal(conflicto.status, 1);
    assert.equal((await db.doc(`productos/${filas[0].codigoBarras}`).get()).data().nombre, primero.data().nombre);
    console.log(JSON.stringify({ resultado: 'OK', productosSinteticos: 1000,
      duracionPrimeraCargaMs: duracionMs, vistaPreviaSinEscrituras: true,
      segundaCargaSinDuplicados: true, conflictoSinSobrescritura: true,
      entorno: proyecto, nota: 'No mide velocidad Android ni Firebase real.' }, null, 2));
  } finally { await app.delete(); fs.rmSync(temporal, { recursive: true, force: true }); }
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
