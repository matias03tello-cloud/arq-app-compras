#!/usr/bin/env node
/** Convierte exclusivamente archivos locales de Open Food Facts. No utiliza red ni Firebase. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createGunzip } = require('node:zlib');
const { createHash } = require('node:crypto');
const { leerFilas } = require('./dataset-csv.cjs');
const { validarGtin, validarCatalogo, mismoProducto } = require('./catalogo-validacion.cjs');

const limpiar = valor => String(valor || '').replace(/[\u0000-\u0020\u007f]+/gu, ' ').trim();
const etiquetas = valor => String(valor || '').split(',').map(s => s.trim().toLowerCase());

function categoria(tags) {
  // Es una sugerencia para revisar; jamás se deduce duración ni vencimiento del alimento.
  const grupos = [
    ['Congelados', ['en:frozen-foods']],
    ['Lacteos', ['en:dairies', 'en:milks', 'en:cheeses', 'en:yogurts']],
    ['Bebidas', ['en:beverages']],
    ['Carnes', ['en:meats', 'en:poultries']],
    ['Snacks', ['en:snacks']],
    ['Frutas', ['en:fresh-fruits']],
    ['Verduras', ['en:fresh-vegetables']],
    ['Despensa', ['en:cereals-and-their-products', 'en:canned-foods', 'en:condiments', 'en:pulses']],
  ];
  return grupos.find(([, lista]) => lista.some(tag => tags.includes(tag)))?.[0] || 'Otros';
}

function transformar(datos, registro, nombreArchivo) {
  const codigo = limpiar(datos.code);
  validarGtin(codigo);
  // OFF asigna códigos 200 a productos sin código. Se excluye conservadoramente 20–29.
  if (/^2\d{12}$/u.test(codigo)) throw Error('Código local o de peso variable: revisar por separado.');
  if (limpiar(datos.data_quality_errors_tags)) throw Error('La fuente declara errores de calidad.');
  const producto = {
    codigoBarras: codigo, nombre: limpiar(datos.product_name_es) || limpiar(datos.product_name),
    marca: limpiar(datos.brands), categoria: categoria(etiquetas(datos.categories_tags)),
    formato: limpiar(datos.quantity), unidad: 'unidad', activo: true,
    fuente: 'Open Food Facts; https://world.openfoodfacts.org; ODbL 1.0',
    evidencia: `Dataset ${nombreArchivo}; registro de datos ${registro}; código ${codigo}. Ver SHA-256 en informe-dataset.json.`,
    verificado: false,
  };
  // Solo comprobación técnica del esquema; el archivo conserva verificado:false.
  const comprobacion = validarCatalogo([{ ...producto, verificado: true }]);
  if (comprobacion.errores.length) throw Error(comprobacion.errores[0].mensaje);
  return producto;
}

function argumentos(args) {
  const o = { max: 1000, separador: '\t' }, vistas = new Set();
  for (let i = 0; i < args.length; i++) {
    const clave = args[i];
    if (clave === '--ayuda') return { ayuda: true };
    if (!['--entrada', '--salida', '--max', '--separador'].includes(clave) || vistas.has(clave)) {
      throw Error(`Opción desconocida o repetida: ${clave}`);
    }
    vistas.add(clave);
    const valor = args[++i];
    if (!valor || valor.startsWith('--')) throw Error(`Falta valor para ${clave}`);
    if (clave === '--separador') {
      o.separador = { tab: '\t', coma: ',', puntoycoma: ';' }[valor];
      if (!o.separador) throw Error('Usa tab, coma o puntoycoma como separador.');
    } else if (clave === '--max') {
      if (!/^\d+$/u.test(valor)) throw Error('--max debe ser un entero.');
      o.max = Number(valor);
    } else o[clave.slice(2)] = valor;
  }
  if (!o.entrada || !o.salida) throw Error('Faltan --entrada y --salida.');
  if (o.max < 1 || o.max > 10000) throw Error('--max debe estar entre 1 y 10000.');
  if (/^https?:/iu.test(o.entrada)) throw Error('Descarga el dataset primero: --entrada debe ser un archivo local.');
  return o;
}

async function convertir(o) {
  const entrada = path.resolve(o.entrada), salida = path.resolve(o.salida);
  if (fs.existsSync(salida)) throw Error('La carpeta de salida ya existe. Elige otra para conservar tus revisiones.');
  const info = fs.statSync(entrada);
  if (!info.isFile()) throw Error('La entrada debe ser un archivo.');
  const hash = createHash('sha256');
  const original = fs.createReadStream(entrada);
  original.on('data', bloque => hash.update(bloque));
  const flujo = /\.gz$/iu.test(entrada) ? original.pipe(createGunzip()) : original;
  if (flujo !== original) original.on('error', error => flujo.destroy(error));
  flujo.setEncoding('utf8');
  const seleccion = new Map(), conflictos = new Set();
  const informe = { version: 1, fecha: new Date().toISOString(), archivo: path.basename(entrada),
    bytesArchivo: info.size, pais: 'en:chile', maximoSolicitado: o.max, filasLeidas: 0,
    filasChile: 0, excluidosPorMotivo: {}, ejemplosExcluidos: [], fueraDeSeleccion: 0,
    duplicadosIdenticos: 0, conflictos: [], candidatos: 0, estado: 'pendiente_revision',
    licencia: 'ODbL 1.0', fuente: 'https://world.openfoodfacts.org/data' };
  let cabecera;
  try {
    for await (const fila of leerFilas(flujo, o.separador)) {
      if (fila.length === 1 && !fila[0]) continue;
      if (!cabecera) {
        cabecera = fila.map(s => s.trim());
        const necesarias = ['code', 'brands', 'quantity', 'countries_tags'];
        if (new Set(cabecera).size !== cabecera.length || necesarias.some(c => !cabecera.includes(c)) ||
          !cabecera.some(c => c === 'product_name' || c === 'product_name_es')) {
          throw Error('Cabecera incompatible: requiere code, brands, quantity, countries_tags y product_name/product_name_es. Comprueba --separador.');
        }
        continue;
      }
      informe.filasLeidas++;
      // No se recupera una fila desplazada: sería peligroso asociar un código con otro nombre.
      if (fila.length !== cabecera.length) throw Error(`Registro ${informe.filasLeidas}: número incorrecto de columnas.`);
      const datos = Object.fromEntries(cabecera.map((c, i) => [c, fila[i]]));
      if (!etiquetas(datos.countries_tags).includes('en:chile')) continue;
      informe.filasChile++;
      try {
        const p = transformar(datos, informe.filasLeidas, path.basename(entrada));
        const llave = p.codigoBarras.padStart(14, '0');
        const anterior = seleccion.get(llave);
        if (anterior) {
          // Conserva un solo UPC/EAN equivalente; no crea alias en el catálogo.
          const a = validarCatalogo([{ ...anterior, verificado: true }]).registros[0].producto;
          const b = validarCatalogo([{ ...p, verificado: true }]).registros[0].producto;
          if (mismoProducto({ ...a, codigoBarras: b.codigoBarras }, b)) informe.duplicadosIdenticos++;
          else conflictos.add(llave);
        } else if (seleccion.size < o.max) seleccion.set(llave, p);
        else informe.fueraDeSeleccion++;
      } catch (error) {
        const motivo = error.message;
        informe.excluidosPorMotivo[motivo] = (informe.excluidosPorMotivo[motivo] || 0) + 1;
        if (informe.ejemplosExcluidos.length < 100) {
          informe.ejemplosExcluidos.push({ registro: informe.filasLeidas, codigo: limpiar(datos.code).slice(0, 20), motivo });
        }
      }
    }
    if (!cabecera) throw Error('Dataset vacío.');
    informe.sha256Archivo = hash.digest('hex');
  } finally {
    flujo.destroy(); if (flujo !== original) original.destroy();
  }
  informe.conflictos = [...conflictos].map(k => seleccion.get(k).codigoBarras);
  const productos = [...seleccion].filter(([k]) => !conflictos.has(k)).map(([, p]) => p);
  informe.candidatos = productos.length;
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.mkdirSync(salida); // Sin sobrescribir archivos de una conversión anterior.
  fs.writeFileSync(path.join(salida, 'productos-para-revisar.json'), JSON.stringify(productos, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync(path.join(salida, 'informe-dataset.json'), JSON.stringify(informe, null, 2) + '\n', { flag: 'wx' });
  return informe;
}

async function main(args) {
  const o = argumentos(args);
  if (o.ayuda) { console.log('node functions/tools/convertir-dataset.cjs --entrada ARCHIVO.csv[.gz] --salida CARPETA_NUEVA [--max 1000] [--separador tab|coma|puntoycoma]'); return; }
  const r = await convertir(o);
  console.log(`Leídas: ${r.filasLeidas}. Chile: ${r.filasChile}. Candidatos para revisar: ${r.candidatos}. Conflictos excluidos: ${r.conflictos.length}.`);
  console.log(`Resultado: ${path.resolve(o.salida)}. No se ha consultado ni escrito Firebase.`);
}
if (require.main === module) main(process.argv.slice(2)).catch(error => {
  console.error(`ERROR: ${error.message}`); process.exitCode = 1;
});
module.exports = { argumentos, transformar, convertir, categoria };
