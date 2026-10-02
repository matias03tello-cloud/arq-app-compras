# Dataset descargado → catálogo de FrescApp

Entrega: 30/09/2026. Las herramientas convierten archivos locales; no llaman APIs externas de productos. Solo los comandos administrativos `--comparar` y `--aplicar` del importador se conectan a tu Firebase.

**Este paquete contiene herramientas, no una colección de 1.000 productos reales.** El dataset debe descargarse. El total de registros aprovechables depende de los campos disponibles y de la revisión; `--max 1000` es un tope, no una garantía.

## 1. Instalación

Copia el contenido de `AGREGAR` en la raíz de `mi-app-local`, junto a `package.json`, conservando las subcarpetas. No copies `AGREGAR` como carpeta interna. Crea `functions/tools`, `functions/test` o `docs/catalogo` si faltan.

Si instalaste `FrescApp_Carga_Catalogo.zip`, sus seis archivos se incluyen sin modificaciones: conserva tus copias si las personalizaste, sobre todo la plantilla JSON. Añade los cinco archivos nuevos que aparecen en `00_EMPIEZA_AQUI.md`.

No es necesario modificar `package.json`, pantallas, `firebase.ts` ni reglas. El conversor utiliza módulos incorporados de Node; no necesita instalar paquetes. Está probado con Node 24.19.0; se recomienda usar la versión de Node compatible con tu proyecto (20 o posterior para estos scripts).

Desde PowerShell, en la raíz de tu proyecto:

```powershell
node --test .\functions\test\catalogo.test.js .\functions\test\dataset.test.js
```

## 2. Descargar el dataset

Fuente oficial: https://world.openfoodfacts.org/data

Opción recomendada para comenzar: búsqueda avanzada en Open Food Facts, filtrar país de venta Chile y descargar resultados como CSV. Instrucciones oficiales:
https://support.openfoodfacts.org/help/es-es/12-api-y-reutilizacion-de-datos/88-como-puedo-acceder-a-los-datos-para-mis-proyectos

Si la exportación filtrada no está disponible, la página de datos ofrece el CSV global comprimido. Es considerablemente más grande. Descarga el archivo desde esa página; el conversor acepta `.csv`, `.tsv`, `.csv.gz` y `.tsv.gz` sin descomprimir previamente. No acepta JSONL, Excel, archivos ZIP ni páginas HTML guardadas con extensión CSV.

Guarda el dataset **fuera de la carpeta del proyecto**, por ejemplo:

`C:\FrescApp_Datos\productos-chile.csv`

Crea esa carpeta y utiliza el nombre real de tu descarga. Evita abrir y volver a guardar los códigos con Excel: podría convertirlos a números y eliminar sus ceros iniciales. Conserva intacto el archivo original.

El CSV oficial usa UTF-8 y tabulaciones. El conversor exige columnas `code`, `brands`, `quantity`, `countries_tags` y al menos `product_name` o `product_name_es`. Si faltan, detiene el proceso; no las inventa. `categories_tags` permite sugerir categorías. `data_quality_errors_tags`, cuando existe, permite apartar registros que declaran errores de calidad.

## 3. Convertir y filtrar Chile

Desde la raíz de `mi-app-local`, ejecuta:

```powershell
node .\functions\tools\convertir-dataset.cjs --entrada "C:\FrescApp_Datos\productos-chile.csv" --salida .\docs\catalogo\lote-chile-01 --max 1000
```

Si descargaste el CSV global comprimido, cambia únicamente la ruta de entrada por la del archivo `.csv.gz`. Se filtra por la etiqueta exacta `en:chile`, no por el prefijo del código ni por el origen del fabricante. Es el país declarado en la fuente; no garantiza que el producto se venda actualmente en todos los supermercados chilenos.

Para un CSV separado por comas, agrega `--separador coma`; para punto y coma, `--separador puntoycoma`. Por defecto se usa tabulación.

Se crean:

- `docs/catalogo/lote-chile-01/productos-para-revisar.json`
- `docs/catalogo/lote-chile-01/informe-dataset.json`

El informe registra filas leídas, filas de Chile, motivos de exclusión, hasta 100 ejemplos, conflictos y SHA-256 del archivo original. Conserva el informe con ese dataset.

La carpeta de salida debe ser nueva. Para repetir el proceso usa `lote-chile-02`; no se sobrescriben revisiones anteriores. Si el resultado tiene cero candidatos, revisa el informe y los campos originales. Un JSON vacío no se puede importar.

### Qué hace la selección

- Conserva códigos de 8, 12 o 13 dígitos con checksum válido. Eso no prueba autenticidad comercial.
- Aparta conservadoramente códigos de 13 dígitos que empiezan por 2, usados en identificaciones locales/peso variable. No transforma códigos internos en códigos globales.
- Exige nombre, marca y formato completos según los límites del importador. No inventa datos faltantes.
- Sugiere una de las categorías actuales; usa `Otros` cuando no reconoce las etiquetas. Revisa también las categorías sugeridas.
- Cuenta UPC/EAN equivalentes como un solo candidato y conserva el primer código exacto. Si dos registros equivalentes contradicen sus datos, excluye el candidato.
- Usa `unidad` para contar envases; el tamaño del envase permanece en `formato`.
- No incluye fotos, datos personales, ingredientes, precios ni fechas de vencimiento.
- Todos los candidatos quedan con `verificado: false`.

Procesa el archivo por partes y retiene hasta el máximo de candidatos indicado (1–10.000). Recorre el archivo completo para encontrar contradicciones posteriores entre los candidatos retenidos; con el dataset global puede tardar. El límite no selecciona productos populares: conserva los primeros elegibles en el orden del archivo. Si luego se excluyen por conflicto, el total puede ser inferior al máximo. No se promete memoria o tiempo constantes para cualquier archivo; los registros individuales mayores de 4 Mi caracteres se rechazan.

Los alias UPC/EAN no se agregan automáticamente a Firebase. Si tu cámara emite la otra representación, hay que revisar su normalización antes de ampliar el piloto. Este paquete no modifica el escáner.

## 4. Revisar y aprobar los registros

Duplica `productos-para-revisar.json` como `productos-revisados.json` en la misma carpeta.

Por cada producto que decidas publicar:

1. Contrasta código, nombre, marca y formato con la fuente y, cuando sea posible, foto o envase.
2. Revisa la categoría. No deduzcas el vencimiento a partir del catálogo.
3. Mantén `fuente` y la referencia a la fila; añade en `evidencia` la referencia adicional que utilizaste (máximo 500 caracteres).
4. Cambia `verificado` a `true` únicamente para ese producto después de la revisión.
5. Retira del archivo de aprobados los registros dudosos o pendientes. Consérvalos en el archivo original para revisarlos más adelante.

No reemplaces masivamente todos los `false` por `true` sin revisar. Primero prueba un lote de 20–50 productos conocidos. Un archivo con registros pendientes bloquea la carga completa por diseño.

Valida sin conexión:

```powershell
node .\functions\tools\importar-catalogo.cjs --archivo .\docs\catalogo\lote-chile-01\productos-revisados.json
```

La validación no consulta Firebase. Si muestra errores, revisa el informe que indica la terminal.

## 5. Comparar y cargar al Firebase del proyecto

El importador incluido es el mismo del paquete anterior. La guía completa está en `01_GUIA_IMPORTADOR_ORIGINAL.md`, fuera de `AGREGAR`.

Para operaciones administrativas necesita `firebase-admin`, ya declarado en `functions/package.json` del proyecto que revisamos. Si falta su instalación, ejecuta desde la raíz:

```powershell
npm ci --prefix functions
```

Usa tus credenciales administrativas configuradas. Si aún no las tienes, instala Google Cloud CLI mediante su documentación oficial y ejecuta `gcloud auth application-default login`. No copies credenciales al repositorio ni al celular. Documentación: https://cloud.google.com/docs/authentication/provide-credentials-adc

Comprueba el ID real en Firebase Console. Sustituye el marcador siguiente antes de ejecutar:

```powershell
$frescappProjectId = "REEMPLAZA_POR_TU_ID_FIREBASE"
node .\functions\tools\importar-catalogo.cjs --archivo .\docs\catalogo\lote-chile-01\productos-revisados.json --comparar --proyecto $frescappProjectId
```

Revisa el informe: `nuevo`, `ya_existe` o `conflicto`. Solo si la comparación corresponde al proyecto correcto y no hay conflictos:

```powershell
node .\functions\tools\importar-catalogo.cjs --archivo .\docs\catalogo\lote-chile-01\productos-revisados.json --aplicar --proyecto $frescappProjectId --confirmar-proyecto $frescappProjectId
```

Esto crea productos compartidos en `productos/{codigoBarras}`. No sustituye los existentes. Una carga interrumpida puede quedar parcialmente aplicada; conserva el informe y repite primero la comparación. Las operaciones reales consumen la cuota de tu Firebase.

## 6. Comprobar en Android

Escanea los envases del lote y comprueba nombre, marca y formato. Usa una cuenta sin una versión privada de esos códigos: el catálogo privado tiene prioridad en el código revisado. La fecha y cantidad siguen correspondiendo a cada compra.

Mide la cobertura con productos que realmente compra tu grupo piloto: reconocidos / envases probados. Tener 1.000 filas no garantiza reconocer todos los productos de Chile.

## 7. Atribución y alcance

Lee `ATRIBUCION_DATASET.md`. El archivo de atribución dentro del proyecto no hace que aparezca automáticamente en la aplicación. Incorpora el reconocimiento visible al mostrar datos del catálogo antes de distribuirlo y conserva la licencia de la base derivada. Este paquete no añade una pantalla ni cambia la licencia de tu aplicación.

No se integra una API externa de productos. No se corrigen aquí paginación del inventario, App Check, caché de sesión, firma Android ni otros pendientes de seguridad.

## Referencias

- Exportación y campos: https://github.com/openfoodfacts/openfoodfacts-server/blob/main/html/data-fields.txt
- Descargas: https://world.openfoodfacts.org/data
- Condiciones: https://world.openfoodfacts.org/terms-of-use
- Licencia: https://opendatacommons.org/licenses/odbl/1-0/
