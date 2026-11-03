# Modelo de datos — Firestore

Este proyecto utiliza Cloud Firestore. No corresponde crear un script SQL ni afirmar que existe un esquema relacional. El modelo se define por colecciones/documentos, validaciones de los servicios y reglas de seguridad.

## Colecciones conocidas

> Esta lista es una primera documentación basada en los servicios y reglas inspeccionados. Antes de considerarla un inventario exhaustivo, contrastar con todo el código y el proyecto Firebase de desarrollo.

| Ruta / colección | Propósito | Observaciones |
|---|---|---|
| `usuarios/{uid}` | Perfil y raíz de datos del usuario | El UID procede de Firebase Authentication |
| `usuarios/{uid}/inventario/{id}` | Productos registrados en inventario personal | Validar identidad con catálogo; revisar movimientos al modificar o eliminar |
| `usuarios/{uid}/listaCompras/{id}` | Elementos de la lista personal | Campos observados: nombre, cantidad, unidad, comprado y marcas de tiempo |
| `productos/{codigoBarras}` | Catálogo de productos | El código funciona como identificador de producto; comprobar estado activo y atributos |
| `hogares/{hogarId}` | Hogares compartidos | Tiene reglas de membresía y permisos distintos de los datos personales |
| Subcolecciones de hogares | Inventario, lista de compras y movimientos compartidos | No deben fusionarse con colecciones personales sin preservar permisos |
| `eliminaciones/{uid}` | Solicitudes/proceso de eliminación de cuenta | Usado por funciones de privacidad |

## Relaciones y claves

- `uid` es el identificador de Firebase Authentication y determina el espacio personal de cada usuario.
- El catálogo usa el código de barras como identidad del producto.
- Los documentos de inventario son registros de productos del usuario y deben conservar las referencias de identidad que exige el dominio.
- Hogares y miembros representan un ámbito compartido con autorización independiente.
- Los movimientos/historial deben conservar la trazabilidad de las acciones que cambian inventario. Antes de permitir borrados por API, determinar la política de auditoría y las dependencias existentes.

## Persistencia, validación y seguridad

- La persistencia es Firestore; no se utiliza almacenamiento temporal como base principal.
- Las reglas se encuentran en `firestore.rules`; las de Storage en `storage.rules`.
- Las Cloud Functions que usan Firebase Admin SDK no quedan protegidas por las reglas de Firestore: deben validar autenticación, autorización y contenido en el propio backend.
- Las credenciales administrativas no deben estar en el repositorio.
- Los archivos `.env.example` son plantillas. Los valores `EXPO_PUBLIC_*` se publican en el cliente y no son secretos de servidor.

## Aprovisionamiento y entorno de desarrollo

No hay un script SQL de creación porque Firestore es NoSQL y los documentos se crean a través de operaciones de aplicación/importación. Para reproducir el entorno:

1. Configurar un proyecto Firebase de desarrollo separado de producción.
2. Revisar `firebase.json`, `firestore.rules`, `firestore.indexes.json` y `storage.rules`.
3. Instalar dependencias con `npm ci` y `npm --prefix functions ci`.
4. Usar Firebase Emulator Suite para pruebas automatizadas.
5. Cargar datos semilla únicamente mediante los scripts de catálogo documentados y contra el proyecto/emulador correcto.
6. Describir cualquier índice requerido y mantener `firestore.indexes.json` actualizado.

Esta documentación no acredita que se haya consultado el proyecto Firebase de producción ni que los emuladores se hayan ejecutado en esta revisión.
