# Auditoría de dependencias — 7 de octubre de 2026

La base de la etapa 10 reproducía 26 alertas: 5 moderadas, 21 altas, 0 críticas. Después de la corrección de herramientas: **24 alertas en la raíz (3 moderadas, 21 altas, 0 críticas), 0 en Functions**. Los conteos incluyen paquetes afectados a través de otros paquetes: no son 24 fallos independientes en tu código.

## Corrección aplicada

Firebase CLI 15.32.1 dependía de @google-cloud/pubsub 5.3.1, que utilizaba @opentelemetry/core 1.30.1. Se sustituye el paquete padre de esa cadena, solo dentro de firebase-tools, por @google-cloud/pubsub 6.2.0. Esa versión utiliza @opentelemetry/core ^2.8.0 y sus dependencias compatibles. No se fuerza una versión mayor de OpenTelemetry dentro de un SDK antiguo.

La actualización requiere Node >=22 para esas herramientas. Se verificó la API usada por el CLI en un emulador local: tema, suscripción, publicación, entrega y confirmación del mensaje. La aplicación sigue sin usar Pub/Sub como servicio ni añadir APIs de productos o recetas.

Functions conserva la corrección que ya habías aplicado: uuid 11.1.1 para gaxios 6.7.1. Se incluyen package.json y lockfile coherentes para poder reproducir el resultado de cero alertas. No se cambiaron las versiones principales de Expo, React Native ni Firebase.

## Alertas restantes

| Origen | Estado | Acción pendiente |
| --- | --- | --- |
| braces 3.0.3 | El aviso oficial no identifica versión corregida | Esperar una corrección oficial y actualizar su cadena de Metro/herramientas; mantener trazabilidad del riesgo. |
| node-forge 1.4.0 | El aviso oficial no identifica versión corregida | Actualizar las herramientas de certificados cuando exista corrección; no declarar corregida la verificación RSA vulnerable. |
| decode-uri-component 0.4.1 | Existe 0.5.0, pero cambia la interoperabilidad de módulos | Actualizar la cadena de query-string/Expo Router con compatibilidad probada. Sustituir directamente 0.5.0 rompe el consumidor CommonJS actual. |

En los mapas de fuentes de las exportaciones Android y web se encontró decode-uri-component. No se encontraron los otros dos paquetes ni OpenTelemetry en esos bundles. Esto delimita esas compilaciones concretas; no elimina el riesgo durante desarrollo, compilación o administración, ni prueba ausencia en cualquier futura configuración. `npm audit --omit=dev` tampoco certifica el contenido de la APK.

No se ejecutó `npm audit fix --force`, no se bajó Expo a 44, no se ocultaron avisos y no se creó un paquete que aparentara una versión corregida. La corrección de Pub/Sub es una sustitución mayor de una herramienta: si incorporas funciones que dependan de Pub/Sub, vuelve a verificar esos usos específicos.

## Repetir el control

```powershell
npm run verificar:entrega
```

Ejecuta TypeScript, ESLint sin advertencias, pruebas unitarias y auditorías de raíz y Functions. Guarda evidencias en `docs/entrega/evidencia-local`. Debe terminar con código 1 mientras existan alertas: eso es un pendiente real de entrega, no un error de la interfaz.

Solo auditorías, sin repetir las pruebas:

```powershell
npm run verificar:entrega -- --solo-auditoria
```

Un fallo de red, un reporte incompleto o una salida incoherente nunca se consideran una auditoría aprobada. Pasar este control tampoco acredita el funcionamiento físico de la APK ni cumplimiento legal.

## Decisión de entrega

Puedes seguir haciendo pruebas internas con el grupo. La entrega pública sigue pendiente de resolver las alertas o documentar una evaluación concreta de alcance y mitigación aceptada por el equipo responsable. No se aprueba automáticamente ese riesgo en este paquete.

Referencias revisadas:
- https://github.com/advisories/GHSA-8988-4f7v-96qf
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-86w9-cpqp-85rv
- https://github.com/advisories/GHSA-vcc3-ghjq-m6fr
