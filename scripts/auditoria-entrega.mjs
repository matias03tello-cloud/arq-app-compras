/** Lee npm audit sin ocultar dependencias transitivas ni errores de red. */
export function resumirAuditoria(datos) {
  if (!datos || datos.error) throw new Error('npm audit no produjo una auditoría válida. Revisa la conexión y el registro.');
  const conteos = datos.metadata?.vulnerabilities;
  const niveles = ['info', 'low', 'moderate', 'high', 'critical'];
  if (!conteos || !niveles.concat('total').every(n => Number.isSafeInteger(conteos[n]) && conteos[n] >= 0)
      || niveles.reduce((s, n) => s + conteos[n], 0) !== conteos.total
      || !datos.vulnerabilities || typeof datos.vulnerabilities !== 'object' || Array.isArray(datos.vulnerabilities)
      || Object.keys(datos.vulnerabilities).length !== conteos.total) {
    throw new Error('Formato incompleto o inconsistente de npm audit; no se considera aprobado.');
  }
  const avisos = new Map();
  for (const [paquete, detalle] of Object.entries(datos.vulnerabilities)) {
    if (!detalle || !Array.isArray(detalle.via)) throw new Error('Falta la procedencia de una alerta de auditoría.');
    for (const via of detalle.via) {
      if (via && typeof via === 'object') {
        if (typeof via.url !== 'string' || !via.url.startsWith('https://')) throw new Error('Aviso de auditoría sin referencia válida.');
        const aviso = avisos.get(via.url) || { paquete: via.name || paquete, titulo: via.title, gravedad: via.severity, rango: via.range, url: via.url, dependencias: [] };
        if (!aviso.dependencias.includes(paquete)) aviso.dependencias.push(paquete);
        avisos.set(via.url, aviso);
      }
    }
  }
  return { aprobado: conteos.total === 0, conteos: { ...conteos }, avisos: [...avisos.values()] };
}
