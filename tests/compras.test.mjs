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
for (const archivo of ['services/comprasModelo.ts', 'security/identidadProducto.ts']) {
  const salida = join(temp, archivo.replace(/\.ts$/, '.js'));
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, ts.transpileModule(readFileSync(new URL('../' + archivo, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
}
after(() => rmSync(temp, { recursive: true, force: true }));
const { validarCompra, avisoDuplicado } = createRequire(import.meta.url)(join(temp, 'services/comprasModelo.js'));
test('cantidades por unidad y por peso con coma decimal', () => {
 assert.deepEqual(validarCompra(' Arroz ', '2', 'unidad'), {nombre:'Arroz',cantidad:2,unidad:'unidad'});
 assert.equal(validarCompra('Tomate','0,125','kg').cantidad,0.125);
});
test('rechaza entradas incoherentes y descripciones ajenas', () => {
 for (const c of ['0','1000','1.5','NaN','-1','1e2']) assert.throws(()=>validarCompra('Arroz',c,'unidad'));
 assert.throws(()=>validarCompra('Visita https://ejemplo.cl','1','unidad'));
 assert.throws(()=>validarCompra('Arroz','0.1234','kg'));
});
test('duplicados coinciden por código exacto, sin confundir marcas ni formatos', () => {
 const items=[{codigoBarras:'12345678'},{codigoBarras:'87654321'},{codigoBarras:'12345678'}];
 assert.match(avisoDuplicado('12345678',items),/2 registros/);
 assert.equal(avisoDuplicado('99999999',items),'');
 assert.match(avisoDuplicado('sin:tomate',[{codigoBarras:'sin:tomate'}]),/1 registro/);
 assert.equal(avisoDuplicado('sin:papa',[{codigoBarras:'sin:tomate'}]),'');
});
