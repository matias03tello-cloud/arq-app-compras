# FrescApp — Gestor de Despensa Inteligente

FrescApp ayuda a gestionar alimentos del hogar, registrar productos y revisar sus fechas de vencimiento para reducir el desperdicio.

## Funcionalidades

- Registro e inicio de sesión.
- Escaneo de códigos de barras y búsqueda en el catálogo.
- Lectura local de fechas mediante OCR y confirmación manual.
- Inventario personal, vencimientos y calendario.
- Lista de compras y funciones compartidas para hogares.
- Persistencia mediante Firebase Authentication y Cloud Firestore.

## Tecnologías

- React Native, Expo y TypeScript.
- Firebase Authentication y Cloud Firestore.
- Firebase Cloud Functions para tareas de backend.
- ML Kit Text Recognition para OCR local.

## Estructura del repositorio

| Ruta | Responsabilidad |
|---|---|
| `app/` | Pantallas y rutas de Expo Router |
| `components/` | Componentes de interfaz |
| `services/` | Servicios y casos de uso del cliente |
| `security/` | Validación, identidad de dominio y persistencia segura |
| `functions/` | Cloud Functions, lógica de backend, pruebas y herramientas de catálogo |
| `tests/` | Pruebas de la aplicación, reglas y flujos |
| `docs/` | Arquitectura, catálogo y entregables |
| `db/` | Documentación del modelo de datos de Firestore |
| `firebase.ts`, `firebase.json`, `firestore.rules` | Configuración de Firebase y reglas |

## Requisitos

- Node.js compatible con Expo SDK configurado en `package.json`.
- npm.
- Para pruebas con emuladores: Firebase CLI (incluido como dependencia de desarrollo) y Java cuando lo requiera Firestore Emulator.
- Para ejecutar Functions localmente, instalar también las dependencias de `functions/`.

## Instalación local

```bash
npm ci
npm --prefix functions ci
cp .env.example .env
```

En Windows PowerShell, la copia del archivo de ejemplo puede hacerse con:

```powershell
Copy-Item .env.example .env
```

Completa `.env` con la configuración de Firebase de desarrollo. No pegues credenciales privadas ni archivos de service account en Git. Los valores `EXPO_PUBLIC_*` son visibles en el cliente y no deben contener secretos de servidor.

## Comandos de desarrollo y verificación

```bash
npm run start
npm run web
npm run typecheck
npm run lint
npm run test:unit
npm run test:rules
npm run test:integration
npm run test:flujos
```

Los comandos de emuladores requieren configuración local válida. No apuntes pruebas de desarrollo a datos de producción. Revisa `firebase.json` antes de iniciar emuladores o desplegar.

## Backend y API REST

Las Cloud Functions existentes se registran desde `functions/index.js`. La API REST propia que se está desarrollando se encuentra en una rama de trabajo y no debe considerarse lista para producción hasta que compile, pase pruebas HTTP en emuladores y tenga sus rutas, autorización y persistencia documentadas.

- [Revisión del Hito 2](./docs/entrega/05_REVISION_12_TAREAS_HITO2.md)
- [Borrador de API REST](./docs/entrega/06_API_REST_HITO2.md)
- [Auditoría y plan de organización](./docs/entrega/07_AUDITORIA_HITO2_Y_ORDEN_REPOSITORIO.md)
- [Modelo de datos Firestore](./db/README.md)

## Documentos del proyecto

- [Documento de propuesta](./docs/FrescAPP.pdf)
- [Mapa del producto](./docs/Mapa_Producto.png)
- [Diagrama de arquitectura existente](./docs/Diagrama_Arquitectura.png)
- [Pruebas y pendientes](./docs/entrega/03_PRUEBAS_Y_PENDIENTES.md)
- [Web y servicios](./docs/entrega/04_WEB_Y_SERVICIOS.md)

## Estado

Proyecto universitario en desarrollo. Antes de una entrega o despliegue, ejecutar las pruebas indicadas y verificar el entorno Firebase objetivo. No se deben eliminar o fusionar servicios del cliente sin revisar sus consumidores y los casos personales/compartidos.
