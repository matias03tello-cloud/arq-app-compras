/** Decisiones de cámara comprobables sin hardware ni servicios externos. */
export function accionPermisoCamara(permiso: { granted: boolean; canAskAgain: boolean } | null) {
  if (!permiso) return 'consultando';
  if (permiso.granted) return 'concedido';
  return permiso.canAskAgain ? 'solicitar' : 'ajustes';
}

export function motivoCamaraWeb(capacidad: { contextoSeguro: boolean; capturaDisponible: boolean; lectorIntegrado: boolean }): string | null {
  if (!capacidad.contextoSeguro) return 'La cámara del navegador necesita HTTPS o localhost. Puedes escribir el código.';
  if (!capacidad.capturaDisponible) return 'Este navegador no permite acceder a la cámara. Puedes escribir el código.';
  if (!capacidad.lectorIntegrado) return 'Este navegador no tiene un lector de códigos integrado. Usa la app del teléfono o escribe el código.';
  return null;
}

/** Un montaje nuevo requiere onCameraReady nuevo. Cerrar invalida trabajos en vuelo. */
export function crearControlCamara() {
  let generacion = 0;
  let activa = false;
  let lista = false;
  let estado: { id: number | null; lista: boolean } = { id: null, lista: false };
  const suscriptores = new Set<() => void>();
  const publicar = () => {
    estado = { id: activa ? generacion : null, lista };
    suscriptores.forEach(fn => fn());
  };
  return {
    estado: () => estado,
    suscribir(fn: () => void) { suscriptores.add(fn); return () => { suscriptores.delete(fn); }; },
    abrir() { generacion++; activa = true; lista = false; publicar(); return generacion; },
    lista(id: number) { if (activa && id === generacion) { lista = true; publicar(); } },
    cerrar() { generacion++; activa = false; lista = false; publicar(); },
    iniciar() { if (!activa || !lista) throw new Error('Espera a que la cámara esté lista.'); return generacion; },
    vigente(id: number) { return activa && lista && id === generacion; },
  };
}
