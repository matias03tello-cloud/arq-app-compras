# Auditoría Hito 2 y organización del repositorio

Fecha de revisión: 2026-11-03
Rama revisada: `orden-repositorio-hito2` (base: `revision-hito2-12-tareas`)
Base de evaluación: `INGT1003_Proyecto_Semestral_2026_2S.html` (Hito 2, ruta de trabajo, entregables y rúbrica).

> Esta auditoría es estática. No se ejecutaron compilación, emuladores ni pruebas HTTP. En esta rama se eliminaron únicamente cuatro archivos de respaldo versionados de los manifiestos raíz (`package.json.antes-audit`, `package.json.respaldo-raiz`, `package-lock.json.antes-audit`, `package-lock.json.respaldo-raiz`); los manifiestos activos no se modificaron. No se movió código de la aplicación. Los posibles duplicados se clasifican como candidatos que requieren comprobar todos sus consumidores antes de refactorizar.

## 1. Ruta oficial del Hito 2 y estado de FrescApp

### Paso 1 — Cerrar el contrato de la API (semana 1)
**La pauta pide:** tabla de recursos, rutas, verbos, parámetros, ejemplos de cuerpos y códigos HTTP de éxito/error.

**Estado observado:** parcial. Existe un borrador de API REST en `functions/api.js` y documentación en `docs/entrega/06_API_REST_HITO2.md`, pero aún no hay contrato validado con pruebas HTTP. La documentación debe incluir versionado y reflejar exactamente los campos y validadores reales.

### Paso 2 — Elegir motor y modelar datos (semana 1)
**La pauta pide:** entidades, claves, relaciones, tipos y script reproducible para crear la base.

**Estado observado:** parcial/por documentar. Firestore ya es persistencia real. El esquema está expresado mediante colecciones, servicios y reglas, pero no se encontró un script único de creación de toda la base. Firestore no se crea con un SQL; documentar colecciones, documentos, IDs, relaciones, tipos, índices y reglas, además de los datos semilla si corresponde. No inventar un script SQL.

### Paso 3 — Armar estructura de capas (semana 2)
**La pauta pide:** ruteo, negocio y datos separados; controlador sin lógica de negocio y consultas solo en datos.

**Estado observado:** parcial. El código existente separa algunas responsabilidades en `services/`, `security/` y `functions/`. La API nueva concentra en `functions/api.js` rutas, autenticación, validación, acceso a Firestore y respuestas HTTP en un solo archivo. No cumple aún separación real de capas para la API REST.

### Paso 4 — Implementar primer recurso CRUD completo (semana 2)
**La pauta pide:** un recurso con crear, leer, actualizar y borrar de extremo a extremo.

**Estado observado:** pendiente de validación. La API declara las cuatro operaciones para inventario, pero no hay pruebas HTTP que demuestren persistencia y reglas del dominio. La eliminación directa requiere revisar el vínculo con historial/movimientos.

### Paso 5 — Sacar credenciales del código (semana 2)
**La pauta pide:** variables de entorno, ejemplo sin secretos y exclusión en Git; si una credencial real se subió, rotarla.

**Estado observado:** parcial. Existen `.env.example`, `functions/.env.example` y `.gitignore`. `firebase.ts` contiene un Firebase client config con apiKey: en Firebase Web/Client esta clave identifica el proyecto y no es equivalente a una clave privada de servidor; la protección depende de Auth, reglas, App Check y restricciones pertinentes. Debe revisarse que no haya service-account JSON, tokens privados o credenciales administrativas comprometidas en archivos o historial. No se ha hecho una auditoría exhaustiva del historial Git.

### Paso 6 — Segundo recurso y manejo de errores (semana 3)
**La pauta pide:** segundo CRUD, validación de entrada, mensajes claros y códigos HTTP correctos.

**Estado observado:** parcial/no validado. Se han definido rutas CRUD de lista de compras, pero no hay pruebas HTTP. La API no puede declararse terminada hasta probar 200, 201, 204, 400, 401, 403, 404, 409, 405 y 500 según corresponda.

### Paso 7 — Documentar decisión de arquitectura (semana 3)
**La pauta pide:** monolito o distribuido, justificado por carga, equipo, operación y despliegue; escenario en que se revisaría.

**Estado observado:** pendiente de consolidación. La arquitectura actual se acerca a un backend modular con Firebase/Functions, no se debe describir como microservicios sin demostrar servicios desplegables independientes. Documentar la decisión y sus costos. No agregar APIs externas: la pauta exige API REST propia, no proveedores externos.

### Paso 8 — Escribir sección de cambios desde Hito 1 (semana 3)
**La pauta pide:** qué cambió, por qué y qué impacto tuvo.

**Estado observado:** pendiente. Hay documentos de arquitectura y pendientes, pero falta consolidar una sección de trazabilidad explícita, con decisiones fechadas.

### Paso 9 — Preparar demo en vivo (semana 4)
**La pauta pide:** cuatro peticiones reales guardadas en un cliente HTTP, ordenadas y con datos listos; ensayar en otro equipo.

**Estado observado:** pendiente. La simulación anterior fue lógica, no solicitudes HTTP reales. La colección exportable no está acreditada.

### Paso 10 — Ensayar los 7 minutos
**La pauta pide:** demo primero, justificación tecnológica después, decisión de arquitectura al final; todos explican código propio.

**Estado observado:** pendiente de preparación del equipo.

## 2. Entregables oficiales que deben quedar en GitHub

- Código de servicio en rama principal, ejecutable siguiendo README.
- Documento técnico PDF dentro de `docs/`, máximo 30 páginas sin anexos.
- Tabla API dentro del documento y en el repositorio.
- Modelo de datos/diagrama y script de creación reproducible dentro de `db/` (para Firestore, documentar estructura y aprovisionamiento realista, no SQL ficticio).
- Colección exportada del cliente de pruebas.
- Archivo de configuración de ejemplo en raíz, sin valores reales.
- Presentación en vivo de 7 minutos; grabación no sustituye ejecución.

Puntaje: presentación 50 puntos (API en vivo 15, tecnologías 12, monolito/distribuido 8, claridad/tiempo 5, defensa individual 10); documento 50 puntos (trazabilidad Hito 1 8, API REST 14, capas 12, persistencia/credenciales 10, referencias 6).

## 3. Hallazgos de organización

### Estructura que ya existe y conviene conservar
- `app/`: rutas/pantallas Expo.
- `components/`: componentes visuales.
- `services/`: servicios cliente y casos de uso.
- `security/`: validación e identidad de dominio.
- `functions/`: Cloud Functions y herramientas administrativas.
- `tests/`: pruebas.
- `docs/`: documentación, datos de catálogo y entregables.
- Raíz: configuración Expo/Firebase/TypeScript y scripts.

No conviene reubicar masivamente estos directorios durante el Hito 2: los imports y scripts pueden romperse. Ordenar primero la documentación y los entregables, después modularizar backend con pruebas.

### Documentación faltante o inconsistente
- `docs/entrega/01_ARQUITECTURA_BACKEND.md` y `02_API_Y_DATOS.md` no existen en la rama inspeccionada (404).
- Sí existen `03_PRUEBAS_Y_PENDIENTES.md`, `04_WEB_Y_SERVICIOS.md`, `05_REVISION_12_TAREAS_HITO2.md` y `06_API_REST_HITO2.md`.
- `README.md` se actualizó con estructura, instalación, comandos de verificación, enlaces a entregables y advertencia sobre el estado aún no validado de la API REST.
- Se añadió `db/README.md` para documentar el modelo Firestore sin inventar un script SQL.
- `package.json` mantiene el nombre `mi-app-local`; no se cambió porque no es necesario para ordenar carpetas y debe revisarse aparte.

## 4. Duplicaciones o solapamientos candidatos

No borrar todavía: algunos casos son intencionales por cliente, servidor, hogar o pruebas.

1. **Inventario en vivo vs consulta puntual:** `services/inventarioFirestore.ts` y `services/suscripcionInventario.ts` ambos leen inventario. Probable distinción: carga puntual vs listener en tiempo real. Mantener si ambos casos de uso existen; extraer normalizador/consulta compartida solo si el código repetido es idéntico.
2. **Lista de compras personal vs hogar:** `services/compras.ts` usa `usuarios/{uid}/listaCompras`; `services/hogares.ts` observa `hogares/{id}/listaCompras`. No son duplicados eliminables: representan ámbitos y permisos distintos. Se puede compartir ordenamiento/validación de datos sin mezclar persistencia.
3. **Validación de identidad/producto:** `services/productos.ts`, `security/identidadProducto.ts`, `services/inventarioFirestore.ts`, reglas Firestore y validación de catálogo en `functions/tools/catalogo-validacion.cjs` contienen validaciones relacionadas. Este es el principal candidato a divergencia. Separar reglas de dominio reutilizables donde sea posible, pero las reglas de Firestore deben seguir validando en servidor y no pueden importar TypeScript del cliente.
4. **Movimientos y hogar:** `services/movimientos.ts`, `services/movimientosModelo.ts` y `services/hogares.ts` gestionan movimientos en contextos distintos. Revisar invariantes e historial antes de crear/eliminar inventario por REST.
5. **Firebase Admin inicialización:** `functions/index.js`, scripts `functions/tools/*` y pruebas inicializan Admin para tareas diferentes. No consolidar automáticamente: cada script/test debe poder ejecutarse aislado y contra emulador.
6. **Funciones de privacidad:** `functions/index.js` delega eliminación en `functions/deletion.js` y hogares en `functions/hogares.js`; esta separación parece deliberada, no duplicación.

## 5. Problemas concretos detectados en la API REST añadida

La primera versión de `functions/api.js` requiere correcciones antes de cualquier demo:

- Validador de `abiertoEn`: la expresión regular está escapada de forma que no valida correctamente una fecha ISO `YYYY-MM-DD`.
- La validación de categorías/unidades/ubicaciones no está demostrada como idéntica a los validadores del dominio existentes.
- Alta de inventario usa ID aleatorio (`add`) mientras el servicio actual y la identidad del producto pueden depender del código de barras/documento; revisar el esquema y duplicados antes de aceptar.
- La eliminación REST borra solo el documento de inventario, sin invocar `registrarMovimiento` ni preservar el historial; no debe habilitarse hasta definir la semántica de dominio.
- La ruta REST combina autenticación, validación, reglas de negocio, Firestore y respuestas HTTP; separar router/controlador, casos de uso y repositorios.
- La API usa Firebase Admin y por ello omite las reglas de Firestore. Debe replicar explícitamente autorización y validación de dominio. La comprobación de propiedad por UID sí está en el diseño, pero no se ha probado.
- El inventario puede tener rutas/campos compartidos con hogares y legacy; el contrato debe decidir expresamente qué recurso CRUD se expone, sin saltarse la lógica de movimientos, identidad o propiedad.
- El URL de ejemplo de la documentación debe confirmarse desde configuración real; no asumir proyecto/URL de producción.

## 6. Plan de orden seguro

### Fase A — inventario y clasificación
1. Se consultó el árbol recursivo completo de la rama (211 entradas; respuesta no truncada).
2. Se clasificaron carpetas y archivos principales: runtime, configuración, tests, datos, documentación y herramientas.
3. Se detectaron cuatro manifiestos de respaldo que duplicaban versiones de los archivos activos; solo se eliminaron esos respaldos.
4. La auditoría de referencias/consumidores de todos los archivos todavía no es exhaustiva; no se declaró código de aplicación como muerto.
5. Las duplicaciones funcionales siguen siendo candidatos para revisión por comportamiento.

### Fase B — orden documental
1. README actualizado con instalación, estructura y comandos.
2. Creado `db/README.md` con las colecciones observadas y el enfoque de aprovisionamiento Firestore.
3. Pendiente: `docs/entrega/01_ARQUITECTURA_BACKEND.md` y `02_API_Y_DATOS.md` finales.
4. Pendiente: colección Postman/Thunder Client exportada y cuatro solicitudes reproducibles.

### Fase C — refactor de código
1. No borrar servicios cliente existentes por duplicación aparente.
2. Extraer validadores compartidos solo tras tests de equivalencia.
3. Dividir API en router/controlador, servicios/casos de uso y repositorios Firestore.
4. Reusar lógica del dominio para movimientos, identidad y permisos.
5. Mantener los mismos contratos y datos persistidos.

### Fase D — limpieza final
Eliminar únicamente archivos demostrablemente sin imports, sin scripts, sin referencias documentales, sin generación automática y sin uso operativo. Revisar lockfiles, builds y tests después de cada grupo de cambios.

## 7. Restricciones de esta auditoría

No se modificó `main`, no se desplegó Firebase y no se ejecutaron pruebas. Se eliminaron únicamente cuatro archivos de respaldo de manifiestos en esta rama; no se eliminó código de la aplicación ni se movieron archivos funcionales. La búsqueda de duplicados es preliminar: para declarar código muerto hacen falta referencias/imports y scripts de ejecución completos. Esta auditoría no certifica que no existan secretos en el historial Git.
