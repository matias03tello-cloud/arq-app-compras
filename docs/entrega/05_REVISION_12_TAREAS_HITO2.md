# Revisión de las 12 tareas en progreso — Hito 2

**Fecha de revisión:** 2026-11-02  
**Rama de esta revisión:** `revision-hito2-12-tareas`  
**Alcance:** inspección estática del repositorio desde GitHub. No se ejecutaron pruebas, no se consultó el proyecto Firebase real y no se hizo despliegue.

> Esta lista reconstruye las 12 tareas del resumen de trabajo anterior; no debe confundirse con una copia literal de un checklist previo. Los estados se basan en los archivos visibles y deben actualizarse al ejecutar pruebas o revisar la consola Firebase.

## Resultado ejecutivo

El repositorio ya cuenta con una base de backend basada en Firebase: acceso a Firestore desde servicios TypeScript, reglas de seguridad, Cloud Functions callable, configuración de emuladores y pruebas automatizadas documentadas.

**Bloqueo principal para el requisito académico de Hito 2:** en los archivos revisados, las funciones del backend usan `onCall` y el inventario consulta Firestore mediante el SDK cliente. La búsqueda de código no encontró rutas convencionales REST con `onRequest`, Express o controladores HTTP equivalentes. Por tanto, no hay evidencia suficiente de una API REST propia con dos recursos y CRUD completo. Las operaciones directas de Firestore no deben presentarse como endpoints REST.

Esto no obliga a consumir APIs de terceros. Una API REST propia puede cumplir la pauta sin depender de APIs externas de recetas, supermercados o catálogos. Antes de añadirla, hay que decidir su integración con Firebase y evitar mantener dos caminos de escritura incompatibles.

## Revisión de las 12 tareas

| # | Tarea | Estado tras inspección de GitHub | Evidencia / siguiente acción |
|---|---|---|---|
| 1 | Separación por capas | **Parcial** | Existen servicios como `services/inventarioFirestore.ts`, validadores y funciones backend. Documentar el flujo real de UI → servicio → Firestore/Functions y distinguir validación cliente de seguridad de servidor. |
| 2 | Diseño de API REST propia | **Bloqueante / sin evidencia de implementación** | `functions/index.js` exporta funciones `onCall`; no se encontró `onRequest` ni router REST en la búsqueda. Definir recursos, rutas, esquema JSON, autenticación y estrategia de despliegue antes de programar. |
| 3 | CRUD del primer recurso | **Parcial** | `services/inventarioFirestore.ts` muestra alta, lectura y eliminación de inventario; no se observó una operación de actualización en el fragmento revisado. Confirmar actualización en otros módulos y, de todas formas, exponer las operaciones requeridas por HTTP si la pauta exige REST. |
| 4 | Segundo recurso de dominio | **Existe modelo de datos; REST no acreditado** | Las reglas contienen validaciones para lista de compras y movimientos/historial. Esto no demuestra que existan endpoints REST CRUD. Elegir dos recursos de dominio coherentes y documentar sus operaciones. |
| 5 | Códigos de estado HTTP y errores | **Pendiente para REST** | Las callable functions usan `HttpsError`, pero no se identificó una capa HTTP REST que devuelva códigos HTTP explícitos. Definir respuestas 200/201/204 y errores 400/401/403/404/409/500 según cada caso. |
| 6 | Validación de datos | **Parcial / base existente** | Hay validaciones en servicios y reglas de Firestore, por ejemplo cantidad, ubicación, identidad de producto y datos de compra. Añadir validación en el servidor REST; nunca confiar solo en la app cliente. |
| 7 | Autenticación y autorización | **Base existente; API REST por verificar** | Las reglas usan propiedad del usuario y excluyen cuentas anónimas en operaciones protegidas; las callable functions derivan UID de la autenticación. Verificar que cualquier endpoint REST valide token y propiedad de los datos. |
| 8 | Secretos y variables de entorno | **Configuración base presente; auditoría completa pendiente** | Existen `.env.example`, `functions/.env.example` y exclusiones de credenciales en `.gitignore`. Aún se debe revisar el historial y los archivos rastreados para confirmar que nunca se subieron secretos reales. Las claves `EXPO_PUBLIC_*` son públicas por diseño. |
| 9 | Instalación en otro equipo | **Parcial** | Hay lockfiles, scripts en `package.json` y documentación de Windows en `docs/entrega/03_PRUEBAS_Y_PENDIENTES.md`. Falta seguir las instrucciones desde un entorno limpio y confirmar que todos los pasos estén completos, incluida configuración de Firebase. |
| 10 | Integración web y móvil | **Diseñada/documentada; prueba real pendiente** | `docs/entrega/04_WEB_Y_SERVICIOS.md` indica que web y APK usan Firebase compartido. Falta probar cambios de ida y vuelta con la misma cuenta en web y dispositivo. |
| 11 | Pruebas de integración | **Evidencia documentada; ejecución actual pendiente** | El documento registra 108 pruebas unitarias, 28 de reglas y pruebas de integración en emulador. No se ejecutaron de nuevo durante esta revisión. Repetir los scripts indicados y guardar salidas actuales. |
| 12 | Despliegue y configuración real | **No verificado** | La documentación indica que el estado de Functions, índices, reglas y Hosting de producción no se consultó. Verificar el proyecto correcto y los servicios desplegados antes de afirmar que están operativos. No desplegar ni cambiar facturación sin revisar destino y plan. |

## Decisiones y trabajo recomendado

1. **No agregar APIs externas de terceros** para resolver el requisito REST.
2. Revisar la pauta exacta y decidir la implementación mínima de una API propia compatible con Firebase.
3. Elegir dos recursos de dominio. Inventario y lista de compras son candidatos naturales, pero el diseño debe confirmar las operaciones reales y su seguridad.
4. Implementar autenticación, autorización, validación, persistencia y códigos HTTP en la capa REST.
5. Probar CRUD y errores con cuatro solicitudes preparadas en un cliente HTTP; verificar que los datos persisten.
6. Completar el documento técnico solo después de que la implementación exista y haya sido probada.
7. Ejecutar las pruebas locales y verificar producción cuando el usuario recupere acceso a su equipo y consola.

## Pruebas locales disponibles (no ejecutadas en esta revisión)

Desde la raíz del repositorio, con las versiones indicadas en la documentación:

```powershell
node --version
java -version
npm run typecheck
npm run lint
npm run test:unit
npm run test:rules
npm run test:flujos
npm run test:integration
```

Los emuladores son pruebas locales y no certifican el despliegue de producción. No ejecutar comandos de despliegue hasta comprobar el proyecto y el destino.

## Referencias del repositorio

- `services/inventarioFirestore.ts`
- `functions/index.js`
- `firestore.rules`
- `firebase.json`
- `package.json`
- `functions/package.json`
- `docs/entrega/03_PRUEBAS_Y_PENDIENTES.md`
- `docs/entrega/04_WEB_Y_SERVICIOS.md`
