# Validación de entrega

## Resultado comprobado en el entorno de desarrollo

| Comprobación | Resultado |
| --- | --- |
| Instalación reproducible con lockfiles | Verificada en raíz y Functions; los scripts de instalación se omitieron en el entorno aislado |
| TypeScript y ESLint | Sin errores ni advertencias de ESLint |
| Unitarias | 108 aprobadas, incluidas 29 del backend |
| Permisos y validaciones de Firestore | 28 pruebas aprobadas en emulador |
| Compra, historial, recetas y hogares | 14 pruebas aprobadas en emulador |
| Privacidad con Auth y Firestore | 1 integración aprobada: identidad, perfiles y borrado de más de 400 registros |
| Compatibilidad de herramientas Pub/Sub | 1 integración aprobada, solo en emulador local |
| Bundles web y Android | Exportados; esto no es una APK instalada ni un build nativo completo |
| Auditoría de raíz | 24 alertas: 3 moderadas y 21 altas; 0 críticas |
| Auditoría de Functions | 0 alertas |
| Cámara, OCR y avisos en nueva APK | Pendiente de probar en tu teléfono |
| Servicios de producción y facturación | No consultados ni modificados en tu cuenta |

Los emuladores usan exclusivamente `demo-frescapp-security`. No se escribieron ni borraron productos, hogares o cuentas de `super-ahorro-app`. Las pruebas no son una prueba de carga del backend real ni un simulacro de penetración de producción.

## Ejecutar comprobaciones en Windows

Desde la raíz, con Node 22 y Java 21 para Firebase CLI 15:

```powershell
node --version
java -version
npm run typecheck
npm run lint
npm run test:unit
npm run test:rules
npm run test:flujos
npm run test:integration
npm run test:cli
```

Ejecuta los comandos de emuladores uno por uno. Usan puertos locales 8080, 9099 y 8085; si están ocupados, detén los emuladores anteriores antes de repetir. La primera ejecución puede descargar los emuladores. Si falta Java 21, instala una distribución oficial y abre una terminal nueva; no bajes la versión de Firebase CLI para ocultar el requisito.

## Registro para la APK física

Completa con una cuenta y productos de prueba; no marques aprobado sin ejecutarlo:

| Caso | Resultado / evidencia |
| --- | --- |
| La APK abre con Metro apagado | Pendiente |
| Instalación sobre la APK anterior conserva cuenta y preferencias | Pendiente |
| Cámara permite, deniega y vuelve a solicitar cuando corresponde | Pendiente |
| Escaneo de código conocido: mantiene identidad del catálogo | Pendiente |
| Código desconocido y producto sin código: ingreso manual válido | Pendiente |
| OCR local propone fecha; usuario confirma o corrige | Pendiente |
| Búsqueda, filtros, limpieza y desplazamiento | Etapa 10 confirmada por usuario; repetir en nueva APK |
| Notificación local con permiso concedido y denegado | Pendiente |
| Apertura, salida parcial, salida total y compra | Pendiente |
| Hogar con dos cuentas, roles y salida del grupo | Pendiente |
| Cuenta A no ve inventario privado de B al cambiar sesión | Pendiente |
| Web y APK muestran los mismos cambios al conectar | Pendiente |
| Exportación de datos incluye inventario y preferencias | Pendiente |
| Borrar cuenta de prueba limpia datos y evita reutilizar sesión | Pendiente |
| Fuente y licencia del catálogo visibles en Ajustes/Mi cuenta | Pendiente |

## Pendientes concretos para una entrega pública

- Resolver o evaluar formalmente las 24 alertas restantes; conservar las evidencias y volver a consultar los avisos oficiales.
- Completar la prueba física de la nueva APK y verificar firma/versionCode.
- Configurar responsable y contacto reales y revisar el aviso de privacidad, actualmente en borrador. Este paquete no certifica cumplimiento legal.
- Verificar en la cuenta Firebase que las Functions y los índices estén desplegados y operativos. Las pruebas con emuladores no lo acreditan.
- Definir la configuración final de App Check: la integración nativa está pendiente. No activar exigencia en el servidor antes de probar todas las plataformas.
- Mantener fuente, selección, modificaciones y licencia del catálogo derivado; los datos de usuarios no forman parte del dataset público.

Fuentes de herramientas:
- https://firebase.google.com/docs/emulator-suite/install_and_configure
- https://docs.expo.dev/build-reference/apk/
