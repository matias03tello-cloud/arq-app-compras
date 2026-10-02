/** Punto de integración nativa pendiente. Nunca simula tokens de atestación. */
import type { FirebaseApp } from 'firebase/app';

// Integración nativa pendiente de registrar Android/iOS y elegir proveedor.
// No se emiten tokens ficticios, tokens debug ni se simula atestación.
export function configureAppCheck(_app: FirebaseApp): void {
  if (process.env.EXPO_PUBLIC_REQUIRE_NATIVE_APP_CHECK === 'true') {
    throw new Error('Falta integrar App Check nativo. Consulta docs/CONFIGURACION_V5.md.');
  }
}
