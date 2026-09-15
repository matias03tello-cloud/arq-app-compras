export const AVISO_VERSION = '2026-09-12-borrador';
export const RESPONSABLE = process.env.EXPO_PUBLIC_PRIVACY_RESPONSABLE?.trim() || '';
export const CONTACTO_PRIVACIDAD = process.env.EXPO_PUBLIC_PRIVACY_EMAIL?.trim() || '';
export const AVISO_LISTO = Boolean(RESPONSABLE && CONTACTO_PRIVACIDAD);
export const AVISO_PARRAFOS = [
  'FrescApp utiliza tu correo y un nombre o apodo para administrar tu cuenta. Guarda los productos que registras y sus fechas de vencimiento para mostrar tu despensa y calendario.',
  'Firebase (Google) proporciona autenticación y almacenamiento. Las contraseñas se gestionan en Firebase Authentication y no se guardan en los documentos de tu despensa.',
  'La cámara se usa cuando tú eliges escanear un producto o leer una fecha. La lectura de texto se procesa en el dispositivo. Esta versión no envía las fotografías a un servidor y elimina las copias temporales al terminar la lectura.',
  'Los productos que agregas manualmente se guardan en tu catálogo privado. El catálogo común contiene datos de productos administrados por FrescApp. No debes incluir información de salud ni de otras personas en los nombres de productos.',
  'En Privacidad y datos puedes consultar y exportar tus datos, corregir tu nombre, verificar un nuevo correo y solicitar el borrado de tu cuenta. La exportación contiene información personal: tú eliges dónde guardarla o compartirla.',
  'Al solicitar la eliminación, se bloquea el acceso a los datos y el servidor procesa el borrado de tu cuenta, despensa y catálogo privado. Si ocurre un fallo, vuelve a intentar automáticamente. La solicitud técnica se conserva al menos 24 horas después de completar el borrado para impedir accesos con sesiones antiguas y luego se elimina.',
  'La constancia de lectura de este aviso no es una autorización para publicidad ni para otros usos. Esta versión no integra publicidad ni analítica. La elección del tema se guarda solo en el dispositivo.',
];
