/** El adaptador recibe funciones locales: no descarga ni sube imágenes. */
export function validarUriFotoLocal(uri: unknown): string {
  // El módulo nativo también admite URLs; esta app limita expresamente el acceso a archivos locales.
  if (typeof uri !== 'string' || !/^file:\/\/\/[^\s]+$/i.test(uri) || /https?:\/\//i.test(uri)) {
    throw new Error('La lectura de fecha solo acepta fotos locales tomadas por la cámara.');
  }
  return uri;
}

type DependenciasOCR = {
  capturar: () => Promise<string | undefined>;
  reducir: (uri: string) => Promise<string>;
  reconocer: (uri: string) => Promise<string>;
  eliminar: (uri: string) => Promise<void>;
  vigente: () => boolean;
};

export async function ejecutarOCRLocal(deps: DependenciasOCR): Promise<{ texto: string; limpiezaPendiente: boolean } | null> {
  const temporales = new Set<string>();
  let resultado: { texto: string; limpiezaPendiente: boolean } | null = null;
  try {
    if (!deps.vigente()) return null;
    const original = validarUriFotoLocal(await deps.capturar());
    temporales.add(original);
    if (!deps.vigente()) return null;
    const reducida = validarUriFotoLocal(await deps.reducir(original));
    temporales.add(reducida);
    if (!deps.vigente()) return null;
    const texto = await deps.reconocer(reducida);
    if (!deps.vigente()) return null;
    resultado = { texto, limpiezaPendiente: false };
    return resultado;
  } finally {
    for (const uri of temporales) {
      try { await deps.eliminar(uri); }
      catch { if (resultado) resultado.limpiezaPendiente = true; }
    }
  }
}
