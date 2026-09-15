// Antes de observar Auth, borrar solo las claves antiguas de esta app.
export async function limpiarPersistenciaWebAnterior(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const owned = (key: string) => key.startsWith('firebase:') && key.includes(apiKey);
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k): k is string => !!k && owned(k));
    keys.forEach(k => storage.removeItem(k));
  }
  if (!window.indexedDB) return;
  await new Promise<void>((resolve, reject) => {
    const open = window.indexedDB.open('firebaseLocalStorageDb');
    let created = false;
    open.onupgradeneeded = () => { created = true; open.transaction?.abort(); };
    open.onerror = () => created ? resolve() : reject(new Error('No se pudo limpiar la sesión anterior.'));
    open.onblocked = () => reject(new Error('Cierra otras pestañas de FrescApp e intenta de nuevo.'));
    open.onsuccess = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains('firebaseLocalStorage')) { database.close(); resolve(); return; }
      const tx = database.transaction('firebaseLocalStorage', 'readwrite');
      const cursor = tx.objectStore('firebaseLocalStorage').openKeyCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c) return;
        if (typeof c.key === 'string' && owned(c.key)) tx.objectStore('firebaseLocalStorage').delete(c.key);
        c.continue();
      };
      tx.oncomplete = () => { database.close(); resolve(); };
      tx.onerror = tx.onabort = () => { database.close(); reject(new Error('No se pudo limpiar la sesión anterior.')); };
    };
  });
}
