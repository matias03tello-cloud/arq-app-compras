# Web y servicios vinculados

El código web y la APK utilizan la misma configuración Firebase de `super-ahorro-app`. La web requiere iniciar sesión y muestra solo los datos autorizados por sus reglas; el dataset precargado se consulta en Firestore, no en una API externa de productos. Los enlaces de atribución del catálogo abren las páginas de la fuente/licencia al pulsarlos.

## Probar la web local

Configura los contactos de privacidad reales en tu entorno local y ejecuta:

```powershell
cd C:\Users\matia\mi-app-local
npm run web
```

Entra con la misma cuenta de prueba que uses en la APK. Cambia un alimento desde cada dispositivo y comprueba la sincronización. La web no hace escaneo de cámara: ese flujo está en la APK; la política de permisos de Hosting mantiene la cámara web deshabilitada.

## Preparar archivos web

```powershell
npx expo export --platform web
```

La exportación genera `dist`, que ya está configurado como directorio público de Firebase Hosting. El proyecto usa salida SPA y la reescritura a index.html para rutas internas. No hace falta reemplazar firebase.json con un archivo generado por otro proyecto.

Antes de publicar verifica en Firebase Authentication los dominios autorizados que realmente vas a utilizar. Si activas App Check web/reCAPTCHA Enterprise, registra también el dominio y su clave pública correspondiente. Comprueba que la versión exportada muestre el contacto de privacidad y la atribución del catálogo.

## Comprobar los servicios reales, desde tu cuenta

Estos comandos consultan el estado y pueden pedir iniciar sesión:

```powershell
npx firebase projects:list
npx firebase functions:list --project super-ahorro-app
```

En la consola revisa los índices de Firestore, las reglas activas, la región de la base y los dominios de Authentication. Functions está configurado en el código para `southamerica-west1`; eso no demuestra la región de la base de datos existente.

Las funciones gestionan perfiles, hogares y eliminación de cuenta. Si no están desplegadas, esos flujos no se completarán por compilar una APK. Cloud Functions requiere el plan Blaze para su despliegue; este paquete no cambia facturación ni activa ese plan. Los emuladores permiten las pruebas locales sin desplegar servicios de pago.

## Publicación posterior

Una vez cerrados los pendientes de 03_PRUEBAS_Y_PENDIENTES.md y confirmado el destino, el comando para publicar únicamente la web es:

```powershell
npx firebase deploy --only hosting --project super-ahorro-app
```

Este comando escribe en tu Hosting real. No se ejecutó en esta entrega. Usa la URL que muestre el despliegue; no se certificó que exista una web pública actual.

Las reglas, índices y Functions tienen un despliegue separado. Revisa el destino y el plan del proyecto antes de ejecutarlo:

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes --project super-ahorro-app
npx firebase deploy --only functions:frescapp-privacidad --project super-ahorro-app
```

No habilites `ENFORCE_APP_CHECK=true` durante ese despliegue mientras Android siga sin la integración nativa necesaria.

Fuentes oficiales:
- https://firebase.google.com/docs/hosting/quickstart
- https://firebase.google.com/docs/functions/get-started
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
