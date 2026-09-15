export function codigoError(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
}

// No exponer mensajes internos del SDK, tokens, correos ni documentos en logs/alertas.
export function mensajeSeguro(error: unknown): string {
  switch (codigoError(error)) {
    case 'auth/invalid-email': return 'El correo electrónico no es válido.';
    case 'auth/email-already-in-use':
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password': return 'No se pudo completar la operación. Revisa tus datos o recupera tu contraseña.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements': return 'La contraseña no cumple los requisitos de seguridad.';
    case 'auth/requires-recent-login':
    case 'functions/unauthenticated': return 'Vuelve a iniciar sesión e intenta nuevamente.';
    case 'auth/too-many-requests':
    case 'functions/resource-exhausted': return 'Espera unos minutos antes de volver a intentar.';
    case 'auth/network-request-failed':
    case 'unavailable': return 'No se pudo conectar. Revisa tu conexión a internet.';
    case 'permission-denied': return 'No tienes acceso a estos datos o tu cuenta está en proceso de eliminación.';
    case 'functions/not-found': return 'El servicio de privacidad aún no está disponible.';
    default: return 'No se pudo completar la operación. Intenta nuevamente.';
  }
}
