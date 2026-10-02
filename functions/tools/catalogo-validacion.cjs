/** Validación sin conexión: no importa Firebase ni necesita credenciales. */
'use strict';
const CATEGORIAS = Object.freeze(['Lacteos', 'Carnes', 'Frutas', 'Verduras',
  'Despensa', 'Bebidas', 'Congelados', 'Snacks', 'Otros']);
const CAMPOS = Object.freeze(['codigoBarras', 'nombre', 'marca', 'categoria',
  'formato', 'unidad', 'activo']);
const PROCEDENCIA = Object.freeze(['fuente', 'evidencia', 'verificado']);
const MAX_PRODUCTOS = 10000;

function texto(valor, campo, minimo, maximo) {
  if (typeof valor !== 'string') throw Error(`${campo}: debe ser texto.`);
  const limpio = valor.trim();
  if (limpio.length < minimo || limpio.length > maximo || /[\u0000-\u001f\u007f]/u.test(limpio)) {
    throw Error(`${campo}: usa entre ${minimo} y ${maximo} caracteres sin controles ni saltos de línea.`);
  }
  return limpio;
}

/** GTIN-8/EAN-8, GTIN-12/UPC-A y GTIN-13/EAN-13. No interpreta UPC-E. */
function validarGtin(valor) {
  if (typeof valor !== 'string' || !/^(?:\d{8}|\d{12}|\d{13})$/u.test(valor)) {
    throw Error('codigoBarras: usa texto de 8, 12 o 13 dígitos, sin espacios ni notación científica.');
  }
  if (/^(\d)\1+$/u.test(valor)) throw Error('codigoBarras: no uses dígitos repetidos como relleno.');
  let suma = 0;
  for (let i = valor.length - 2, peso = 3; i >= 0; i--, peso = peso === 3 ? 1 : 3) {
    suma += Number(valor[i]) * peso;
  }
  if ((10 - suma % 10) % 10 !== Number(valor.at(-1))) {
    throw Error('codigoBarras: dígito de control incorrecto. Comprueba el envase; no lo corrijas inventándolo.');
  }
  return valor;
}

function validarFila(fila) {
  if (!fila || typeof fila !== 'object' || Array.isArray(fila)) throw Error('Se esperaba un objeto.');
  const permitidos = [...CAMPOS, ...PROCEDENCIA];
  if (Object.keys(fila).some(campo => !permitidos.includes(campo))) {
    throw Error('Hay campos desconocidos. Usa solamente los campos de la plantilla.');
  }
  if (permitidos.some(campo => !Object.hasOwn(fila, campo))) throw Error('Faltan campos de la plantilla.');
  if (fila.verificado !== true) throw Error('verificado: debe ser true tras comprobar código, nombre, marca y formato.');
  if (typeof fila.activo !== 'boolean') throw Error('activo: debe ser true o false, sin comillas.');
  if (!CATEGORIAS.includes(fila.categoria)) throw Error(`categoria: usa ${CATEGORIAS.join(', ')}.`);
  const producto = {
    codigoBarras: validarGtin(fila.codigoBarras),
    nombre: texto(fila.nombre, 'nombre', 1, 120),
    marca: texto(fila.marca, 'marca', 1, 80),
    categoria: fila.categoria,
    formato: texto(fila.formato, 'formato', 1, 80),
    unidad: texto(fila.unidad, 'unidad', 1, 30),
    activo: fila.activo,
  };
  return { producto, procedencia: {
    fuente: texto(fila.fuente, 'fuente', 1, 300),
    evidencia: texto(fila.evidencia, 'evidencia', 1, 500),
  } };
}

/** Solo compara el esquema público, rechazando como iguales documentos con otros campos. */
function mismoProducto(a, b) {
  return !!b && Object.keys(b).length === CAMPOS.length && CAMPOS.every(campo => a[campo] === b[campo]);
}

function validarCatalogo(filas) {
  if (!Array.isArray(filas) || filas.length < 1 || filas.length > MAX_PRODUCTOS) {
    throw Error(`El JSON debe ser una lista de 1 a ${MAX_PRODUCTOS} productos.`);
  }
  const registros = [], errores = [], avisos = [], porCodigo = new Map(), porGtin = new Map();
  filas.forEach((fila, indice) => {
    const numero = indice + 1;
    try {
      const registro = { fila: numero, ...validarFila(fila) };
      const codigo = registro.producto.codigoBarras;
      const previo = porCodigo.get(codigo);
      if (previo) {
        if (!mismoProducto(registro.producto, previo.producto)) {
          throw Error(`El código ${codigo} tiene datos distintos a los de la fila ${previo.fila}.`);
        }
        avisos.push({ fila: numero, mensaje: `Duplicado idéntico de la fila ${previo.fila}; se omite.` });
        return;
      }
      // Se informa el posible alias UPC/EAN sin cambiar el ID que utiliza el escáner actual.
      const equivalente = porGtin.get(codigo.padStart(14, '0'));
      if (equivalente) {
        if (!CAMPOS.filter(c => c !== 'codigoBarras').every(c => registro.producto[c] === equivalente.producto[c])) {
          throw Error(`GTIN equivalente al de la fila ${equivalente.fila}, pero con datos distintos.`);
        }
        avisos.push({ fila: numero, mensaje: `Código equivalente a ${equivalente.producto.codigoBarras}; se conserva como alias exacto.` });
      }
      porCodigo.set(codigo, registro);
      porGtin.set(codigo.padStart(14, '0'), registro);
      registros.push(registro);
    } catch (error) { errores.push({ fila: numero, mensaje: error.message }); }
  });
  return { filas: filas.length, registros, errores, avisos };
}

module.exports = { CATEGORIAS, CAMPOS, MAX_PRODUCTOS, validarGtin, validarCatalogo, mismoProducto };
