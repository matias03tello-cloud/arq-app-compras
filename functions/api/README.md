# API REST — organización por capas

La entrada pública se compone en `functions/api/index.js`; los módulos se separan por responsabilidad para que HTTP, reglas del dominio y Firestore no se mezclen.

| Módulo | Responsabilidad | Límite de la capa |
|---|---|---|
| `routes.js` | Resolver versión, recurso, ID, método y operación HTTP. | No consulta Firestore ni aplica reglas de negocio. |
| `controller.js` | Verificar el ID token, comprobar el tipo de contenido, leer parámetros HTTP y formar status, cuerpo y cabeceras. | No accede a Firestore. |
| `service.js` | Aplicar la política de cuenta y reglas de inventario/lista de compras; coordinar repositorios y validadores. | No recibe `req`/`res` ni construye respuestas HTTP. |
| `validators.js` | Validar forma, tipos, límites y campos permitidos de los cuerpos. | No hace I/O ni depende de Firebase Functions. |
| `repository.js` | Consultar y modificar Firestore: recursos privados, catálogos y estado de eliminación. | No decide identidad de dominio ni status HTTP. |
| `errors.js` | Definir errores de dominio con status y código. | No formatea respuestas del controlador. |
| `index.js` | Exportar el handler REST seguro que integra el controlador. | No implementa reglas ni consultas. |

## Recorrido

`routes.js` identifica la acción. `controller.js` autentica la solicitud y entrega sus datos al servicio. `service.js` valida el acceso de la cuenta y las reglas de dominio; cuando requiere datos, consulta el repositorio. `repository.js` realiza las operaciones de Firestore. El controlador traduce el resultado o `ApiError` a HTTP.

La regla de identidad de producto pertenece al servicio; el repositorio solo obtiene el producto de los catálogos. La política de cuenta también se valida en el servicio, que consulta al repositorio para saber si hay una eliminación pendiente.
