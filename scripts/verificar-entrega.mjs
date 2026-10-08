/** Control reproducible de entrega. No despliega, compila en EAS ni modifica datos. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { resumirAuditoria } from './auditoria-entrega.mjs';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const destino = join(raiz, 'docs', 'entrega', 'evidencia-local');
const soloAuditoria = process.argv.slice(2).includes('--solo-auditoria');
if (process.argv.slice(2).some(a => a !== '--solo-auditoria')) throw new Error('Opción desconocida. Solo se admite --solo-auditoria.');
const npmCLI = process.env.npm_execpath;
if (!npmCLI) throw new Error('Ejecuta mediante npm run verificar:entrega.');
mkdirSync(destino, { recursive: true });
const informe = { generadoEn: new Date().toISOString(), alcance: 'Comprobaciones locales; no valida APK instalada, producción ni cumplimiento legal.', comprobaciones: [], auditorias: {}, auditoriasAprobadas: false, aprobado: false };
function guardar() { writeFileSync(join(destino, 'resultado.json'), JSON.stringify(informe, null, 2) + '\n'); }
function ejecutar(nombre, argumentos, cwd = raiz) {
  const resultado = spawnSync(process.execPath, [npmCLI, ...argumentos], { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  writeFileSync(join(destino, `${nombre}.log`), `${resultado.stdout || ''}${resultado.stderr || ''}${resultado.error ? String(resultado.error) : ''}`);
  const correcto = !resultado.error && resultado.status === 0;
  informe.comprobaciones.push({ nombre, correcto, codigo: resultado.status });
  console.log(`${correcto ? 'OK' : 'PENDIENTE'}: ${nombre}`);
  guardar();
  if (!correcto) throw new Error(`Falló ${nombre}. Revisa docs/entrega/evidencia-local/${nombre}.log`);
}
try {
  if (!soloAuditoria) {
    ejecutar('typescript', ['run', 'typecheck']);
    ejecutar('eslint', ['run', 'lint', '--', '--max-warnings=0']);
    ejecutar('unitarias', ['run', 'test:unit']);
  }
  for (const [nombre, cwd] of [['raiz', raiz], ['functions', join(raiz, 'functions')]]) {
    const resultado = spawnSync(process.execPath, [npmCLI, 'audit', '--json'], { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    writeFileSync(join(destino, `auditoria-${nombre}.json`), resultado.stdout || '');
    writeFileSync(join(destino, `auditoria-${nombre}.log`), resultado.stderr || String(resultado.error || ''));
    if (resultado.error || ![0, 1].includes(resultado.status)) throw new Error(`No se pudo consultar la auditoría de ${nombre}.`);
    const resumen = resumirAuditoria(JSON.parse(resultado.stdout));
    if ((resultado.status === 0) !== resumen.aprobado) throw new Error(`Auditoría de ${nombre} inconsistente con su código de salida.`);
    informe.auditorias[nombre] = resumen;
    console.log(`${nombre}: ${resumen.conteos.total} alertas, ${resumen.avisos.length} avisos de origen.`);
    guardar();
  }
  informe.auditoriasAprobadas = Object.values(informe.auditorias).every(a => a.aprobado);
  informe.aprobado = !soloAuditoria && informe.auditoriasAprobadas;
  guardar();
  if (!informe.auditoriasAprobadas) {
    console.error('Entrega pendiente: siguen existiendo alertas de dependencias. El informe no las omite.');
    process.exitCode = 1;
  } else {
    console.log(soloAuditoria ? 'Auditorías sin alertas; faltan las demás comprobaciones de entrega.' : 'Comprobaciones locales aprobadas. Completa las pruebas de APK y servicios de docs/entrega.');
  }
} catch (error) {
  informe.error = error.message;
  guardar();
  console.error(error.message);
  process.exitCode = 1;
}
