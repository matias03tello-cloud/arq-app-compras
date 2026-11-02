# API REST propia — Hito 2

## Objetivo y alcance

FrescApp incorpora una API REST propia sobre Firebase Cloud Functions y Firestore. No consume APIs externas de terceros. La API comparte la persistencia Firebase del proyecto y mantiene los datos separados por UID autenticado.

**Estado:** primera implementación en rama de trabajo. No está desplegada ni probada contra emuladores o producción. No integrar desde la app hasta completar pruebas.

## Base y autenticación

- Función exportada: `api`
- Región configurada: `southamerica-west1`
- URL base después del despliegue: `https://southamerica-west1-super-ahorro-app.cloudfunctions.net/api`
- Encabezado requerido: `Authorization: Bearer <Firebase_ID_Token>`
- Se rechazan tokens ausentes/incorrectos, cuentas anónimas y cuentas con eliminación solicitada.
- El UID se obtiene exclusivamente del ID token verificado; nunca se recibe en el body.
- No se habilita CORS de forma general. Para un cliente web se deberá definir explícitamente el origen autorizado antes de integrarlo.

## Recursos y rutas

### Inventario

| Método | Ruta | Acción |
|---|---|---|
| GET | `/inventario` | Listar inventario del usuario |
| GET | `/inventario/{id}` | Obtener un producto |
| POST | `/inventario` | Crear registro de inventario |
| PATCH | `/inventario/{id}` | Modificar campos no identificatorios |
| DELETE | `/inventario/{id}` | Eliminar registro |

El alta exige que el código de barras exista y esté activo en `productos`, y que nombre, marca, categoría, formato y unidad coincidan exactamente con el catálogo. Los productos manuales `sin:...` se deben seguir creando desde la aplicación, donde existe la validación de identidad correspondiente.

Campos admitidos para alta: `codigoBarras`, `nombre`, `marca`, `categoria`, `formato`, `unidad`, `cantidad`, `vencimiento`, `fechaRegistro`, `ubicacion` opcional y `abiertoEn` opcional.

### Lista de compras

| Método | Ruta | Acción |
|---|---|---|
| GET | `/lista-compras` | Listar elementos |
| GET | `/lista-compras/{id}` | Obtener elemento |
| POST | `/lista-compras` | Crear elemento |
| PATCH | `/lista-compras/{id}` | Actualizar campos |
| DELETE | `/lista-compras/{id}` | Eliminar elemento |

Campos admitidos: `nombre`, `cantidad`, `unidad` y `comprado`. Unidades permitidas: `unidad`, `kg`, `g`, `L`.

## Códigos HTTP

- `200`: lectura o actualización correcta.
- `201`: recurso creado.
- `204`: eliminación correcta.
- `400`: body, identificador o validación incorrectos.
- `401`: token ausente/no válido o cuenta no autorizada.
- `404`: ruta o recurso inexistente.
- `405`: método no permitido.
- `409`: identidad de producto distinta al catálogo.
- `500`: error interno genérico, sin exponer datos privados.

## Ejemplos para cliente HTTP

En todos los ejemplos, reemplaza el token por uno obtenido mediante Firebase Authentication.

### Listar compras

```http
GET /lista-compras
Authorization: Bearer <Firebase_ID_Token>
```

### Crear compra

```http
POST /lista-compras
Authorization: Bearer <Firebase_ID_Token>
Content-Type: application/json

{
  "nombre": "Leche",
  "cantidad": 2,
  "unidad": "unidad",
  "comprado": false
}
```

### Marcar compra

```http
PATCH /lista-compras/ID_DEL_DOCUMENTO
Authorization: Bearer <Firebase_ID_Token>
Content-Type: application/json

{ "comprado": true }
```

### Eliminar compra

```http
DELETE /lista-compras/ID_DEL_DOCUMENTO
Authorization: Bearer <Firebase_ID_Token>
```

## Decisiones de seguridad

- Las consultas y escrituras usan exclusivamente subcolecciones del usuario autenticado.
- Se usa Firebase Admin SDK dentro de Functions; por ello las reglas de Firestore no sustituyen la validación de esta API. Cada ruta valida el body y resuelve su colección a partir del UID verificado.
- No se aceptan campos adicionales en los bodies.
- La identidad del producto de inventario no se puede modificar por PATCH.
- La API no altera ni reemplaza los servicios cliente existentes.

## Pendientes antes de declarar Hito 2 terminado

1. Ejecutar typecheck, lint y pruebas unitarias existentes.
2. Añadir pruebas automatizadas HTTP con Firebase Emulator Suite: sin token, token inválido, aislamiento entre dos usuarios, CRUD de ambos recursos, validaciones y códigos HTTP.
3. Endurecer y contrastar todas las validaciones de inventario con las reglas y validadores actuales, incluidos formatos de fecha, producto manual y movimientos asociados.
4. Revisar si la eliminación directa de inventario debe generar historial o impedirse para preservar invariantes del dominio.
5. Definir CORS con dominios concretos si la web consumirá esta API; no usar comodín con autenticación.
6. Preparar cuatro solicitudes de demostración en un cliente HTTP y guardar evidencias de respuestas y persistencia.
7. Verificar el proyecto Firebase y el plan de facturación antes de cualquier despliegue. No se ha desplegado nada.

## Compatibilidad

La API agrega una entrada HTTP adicional a las Cloud Functions existentes. No cambia las reglas de Firestore, la aplicación móvil, la web ni los datos existentes. La integración desde la app queda pendiente hasta cerrar los puntos de prueba anteriores.
