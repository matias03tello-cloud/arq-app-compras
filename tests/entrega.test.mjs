import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumirAuditoria } from '../scripts/auditoria-entrega.mjs';
const limpio = () => ({ metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } }, vulnerabilities: {} });
test('auditoría completa sin alertas aprueba el control de dependencias', () => {
  assert.equal(resumirAuditoria(limpio()).aprobado, true);
});
test('alertas transitivas se cuentan sin confundirlas con avisos independientes', () => {
  const datos = limpio(); Object.assign(datos.metadata.vulnerabilities, { high: 2, total: 2 });
  const aviso = { name: 'braces', title: 'Profundidad', severity: 'high', range: '<=3.0.3', url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm' };
  datos.vulnerabilities = { braces: { via: [aviso, aviso] }, micromatch: { via: ['braces'] } };
  const resultado = resumirAuditoria(datos);
  assert.equal(resultado.aprobado, false); assert.equal(resultado.conteos.total, 2); assert.equal(resultado.avisos.length, 1);
});
test('red fallida, salida incompleta o conteos inconsistentes no aprueban', () => {
  for (const datos of [null, {}, { error: { code: 'ENETUNREACH' } }, { ...limpio(), vulnerabilities: [] }]) assert.throws(() => resumirAuditoria(datos));
  const datos = limpio(); datos.metadata.vulnerabilities.total = 1;
  assert.throws(() => resumirAuditoria(datos));
});
test('un paquete sin procedencia no puede convertirse en una auditoría aprobada', () => {
  const datos = limpio(); Object.assign(datos.metadata.vulnerabilities, { moderate: 1, total: 1 });
  datos.vulnerabilities = { dependencia: {} }; assert.throws(() => resumirAuditoria(datos));
  datos.vulnerabilities.dependencia = { via: [{ name: 'x' }] }; assert.throws(() => resumirAuditoria(datos));
});
