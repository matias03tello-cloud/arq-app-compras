# APK Android de prueba — FrescApp 5.0.1

Este procedimiento crea una APK autónoma para probar con tu grupo: puede abrirse sin mantener Expo/Metro encendido. El código está preparado, pero la compilación en EAS y la instalación requieren tu cuenta y tu teléfono. Esta entrega no contiene una APK generada ni una publicación en Google Play.

## Antes de compilar

1. Aplica todos los archivos de la etapa 11 sobre la etapa 10 que ya probaste.
2. Usa Node 22 para alinear el entorno con Functions. Comprueba `node --version` y `npm --version`. Las pruebas de esta entrega se ejecutaron con Node 24.19.0; Functions declara Node 22 y puede advertir si usas Node 24.
3. Desde la raíz del proyecto:

```powershell
cd C:\Users\matia\mi-app-local
npm ci
cd functions
npm ci
cd ..
npm run typecheck
npm run lint
npm run test:unit
```

Las pruebas unitarias deben mostrar 108 aprobadas sobre esta base. Si npm informa scripts de instalación pendientes, revisa los paquetes concretos antes de aprobarlos; no habilites todos indiscriminadamente. Las alertas de auditoría no se resuelven aprobando scripts.

El perfil `development` conserva el cliente de desarrollo. El nuevo perfil `preview` genera una APK interna sin ese cliente. Se conserva el identificador Android `com.k1ng03.arqappcompras` y el proyecto EAS existente. La versión visible pasa a 5.0.1.

## Configuración para mostrar el aviso de privacidad

En el entorno `preview` del proyecto EAS configura valores reales para:

```text
EXPO_PUBLIC_PRIVACY_RESPONSABLE
EXPO_PUBLIC_PRIVACY_EMAIL
```

Son datos de contacto públicos: no pongas contraseñas, claves privadas ni cuentas de servicio en variables EXPO_PUBLIC. Los valores se incorporan al compilar; cambiarlos después exige otra compilación. El aviso legal sigue siendo un borrador que debe revisar el equipo responsable.

App Check nativo todavía no está integrado. No actives `EXPO_PUBLIC_REQUIRE_NATIVE_APP_CHECK=true` ni `ENFORCE_APP_CHECK=true` para esta APK: el cliente nativo no puede emitir la atestación requerida. Una configuración estricta requiere implementar y probar primero esa integración, no simular tokens.

## Compilar en tu cuenta de Expo

```powershell
npx eas-cli@latest whoami
```

Si no hay sesión, inicia sesión con la cuenta que ya administra este proyecto:

```powershell
npx eas-cli@latest login
```

Se usa el contador remoto de versiones y `autoIncrement`. Antes de actualizar una APK instalada, comprueba que el contador remoto no sea inferior al `versionCode` ya instalado. Puedes consultar el estado remoto y, si corresponde, inicializarlo con el número actual mediante los comandos interactivos:

```powershell
npx eas-cli@latest build:version:get --platform android --profile preview
npx eas-cli@latest build:version:set --platform android --profile preview
```

Al inicializar el contador, indica el versionCode actualmente instalado. Si tienes Android Platform Tools y el teléfono conectado, puedes leer el número instalado:

```powershell
adb shell dumpsys package com.k1ng03.arqappcompras | Select-String 'versionCode|versionName'
```

Luego compila:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

La compilación requiere conexión y está sujeta a la disponibilidad/cuotas de tu cuenta EAS. No hace falta abrir Expo Go para ejecutar la APK resultante. Descárgala desde el enlace que entrega EAS.

## Actualizar conservando los datos

Instala sobre la app actual, usando el mismo identificador y la misma clave de firma de Android. Reutiliza las credenciales existentes de EAS. No generes otra clave para sustituir una instalación firmada con la anterior.

Con ADB, si guardaste el archivo como `FrescApp-5.0.1.apk` en la carpeta actual:

```powershell
adb install -r .\FrescApp-5.0.1.apk
```

Si Android muestra conflicto de firma, no desinstales como primera solución: revisa que la clave y el perfil sean los correctos. Desinstalar elimina datos locales, preferencias y avisos programados; los registros sincronizados permanecen en Firebase. Si informa una versión inferior, corrige el contador y vuelve a compilar.

## Prueba física indispensable

Apaga Metro y abre la APK. Comprueba inicio de sesión, cámara permitida/denegada, OCR en dispositivo, códigos conocidos y desconocidos, frutas sin código, permisos de notificaciones y aviso local, sincronización con web, cierre de sesión y aislamiento entre dos cuentas. Usa productos y cuentas de prueba. Registra el resultado con 03_PRUEBAS_Y_PENDIENTES.md.

Fuentes oficiales:
- https://docs.expo.dev/build-reference/apk/
- https://docs.expo.dev/build-reference/app-versions/
- https://docs.expo.dev/eas/environment-variables/
