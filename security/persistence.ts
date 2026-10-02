/** Persistencia web en memoria: evita conservar la sesión al recargar el navegador. */
import { inMemoryPersistence } from 'firebase/auth';
// Navegador: ningún token persiste en localStorage/IndexedDB. Recargar exige login.
export const sessionPersistence = inMemoryPersistence;
