/** Pruebas del filtrado y calendario, sin Firebase ni acceso a datos reales. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Compila solo módulos puros a un directorio temporal para resolver imports de TS en Node.
const temp = mkdtempSync(join(tmpdir(), 'frescapp-experiencia-'));
for (const archivo of ['services/apertura.ts', 'services/fechas.ts']) {
  const salida = join(temp, archivo.replace(/\.ts$/, '.js'));
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, ts.transpileModule(readFileSync(new URL('../' + archivo, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
}
after(() => rmSync(temp, { recursive: true, force: true }));
const { validarApertura, mostrarApertura } = createRequire(import.meta.url)(join(temp,'services/apertura.js'));
test('apertura valida día civil, año bisiesto, futuro y no admite solo mes',()=>{
 const hoy=new Date(2026,9,4);assert.equal(validarApertura('4/10/2026',hoy),'2026-10-04');assert.equal(validarApertura('',hoy),'');assert.equal(mostrarApertura('2026-10-04'),'04/10/2026');
 for(const fecha of ['05/10/2026','29/02/2025','31/04/2026','10/2026','01/01/1899']) assert.throws(()=>validarApertura(fecha,hoy));assert.equal(validarApertura('29/02/2024',hoy),'2024-02-29');
});
