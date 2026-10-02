/** Adaptador de almacenamiento: serializa operaciones y cambia el manifiesto después de escribir los bloques. */
type SecureIO = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
type Manifest = { generation: string; count: number };

// Fragmentos <= 500 unidades UTF-16: <= 2000 bytes UTF-8, también con nombres
// no ASCII. El manifiesto se cambia solo después de escribir todos los bloques.
export function createChunkedStorage(io: SecureIO, newId: () => string): SecureIO {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const job = queue.then(fn, fn);
    queue = job.catch(() => undefined);
    return job;
  };
  const base = (key: string) => 'fa5_' + Array.from(key).map(c => c.codePointAt(0)!.toString(16)).join('_');
  const readManifest = async (key: string): Promise<Manifest | null> => {
    const raw = await io.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Manifest;
    if (!/^[a-zA-Z0-9-]+$/.test(value.generation) || !Number.isInteger(value.count) || value.count < 0 || value.count > 128) {
      throw new Error('Invalid secure storage manifest');
    }
    return value;
  };
  const cleanup = async (key: string, manifest: Manifest | null) => {
    if (manifest) await Promise.all(Array.from({ length: manifest.count }, (_, i) => io.removeItem(`${key}_${manifest.generation}_${i}`)));
  };
  return {
    getItem: key => serial(async () => {
      const b = base(key);
      const manifest = await readManifest(b);
      if (!manifest) return null;
      const parts = await Promise.all(Array.from({ length: manifest.count }, (_, i) => io.getItem(`${b}_${manifest.generation}_${i}`)));
      if (parts.some(p => p === null)) throw new Error('Incomplete secure session');
      return parts.join('');
    }),
    setItem: (key, value) => serial(async () => {
      if (value.length > 64000) throw new Error('Secure session too large');
      const b = base(key);
      const previous = await readManifest(b);
      // Dos registros de generaciones permiten limpiar un intento interrumpido.
      const stale = await readManifest(b + '_pending');
      if (stale && stale.generation !== previous?.generation) await cleanup(b, stale);
      const characters = Array.from(value);
      const next = { generation: newId(), count: Math.ceil(characters.length / 500) };
      await io.setItem(b + '_pending', JSON.stringify(next));
      try {
        for (let i = 0; i < next.count; i++) {
          await io.setItem(`${b}_${next.generation}_${i}`, characters.slice(i * 500, (i + 1) * 500).join(''));
        }
        await io.setItem(b, JSON.stringify(next));
      } catch (error) {
        await cleanup(b, next);
        await io.removeItem(b + '_pending');
        throw error;
      }
      // Registrar la generación anterior antes de borrar para recuperar tras cierre abrupto.
      if (previous) await io.setItem(b + '_pending', JSON.stringify(previous));
      await cleanup(b, previous);
      await io.removeItem(b + '_pending');
    }),
    removeItem: key => serial(async () => {
      const b = base(key);
      const manifest = await readManifest(b);
      const pending = await readManifest(b + '_pending');
      // Borrar el contenido antes del índice: si falla se puede reintentar.
      await cleanup(b, manifest);
      if (pending?.generation !== manifest?.generation) await cleanup(b, pending);
      await io.removeItem(b);
      await io.removeItem(b + '_pending');
    }),
  };
}
