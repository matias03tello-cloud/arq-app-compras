'use strict';
const { ApiError } = require('./errors');

const CATEGORIAS = ['Lacteos','Carnes','Frutas','Verduras','Despensa','Bebidas','Congelados','Snacks','Otros'];
const UBICACIONES = ['Despensa','Refrigerador','Congelador'];
const UNIDADES = ['unidad','kg','g','L'];
const GENERICOS = {
  'sin:manzana':['Manzana','Frutas'],'sin:platano':['Plátano','Frutas'],
  'sin:naranja':['Naranja','Frutas'],'sin:mandarina':['Mandarina','Frutas'],
  'sin:limon':['Limón','Frutas'],'sin:pera':['Pera','Frutas'],
  'sin:durazno':['Durazno','Frutas'],'sin:ciruela':['Ciruela','Frutas'],
  'sin:frutilla':['Frutilla','Frutas'],'sin:uva':['Uva','Frutas'],
  'sin:kiwi':['Kiwi','Frutas'],'sin:sandia':['Sandía','Frutas'],
  'sin:melon':['Melón','Frutas'],'sin:pina':['Piña','Frutas'],
  'sin:arandano':['Arándano','Frutas'],'sin:palta':['Palta','Frutas'],
  'sin:tomate':['Tomate','Verduras'],'sin:papa':['Papa','Verduras'],
  'sin:cebolla':['Cebolla','Verduras'],'sin:zanahoria':['Zanahoria','Verduras'],
  'sin:lechuga':['Lechuga','Verduras'],'sin:pepino':['Pepino','Verduras'],
  'sin:zapallo':['Zapallo','Verduras'],'sin:zapallo-italiano':['Zapallo italiano','Verduras'],
  'sin:brocoli':['Brócoli','Verduras'],'sin:coliflor':['Coliflor','Verduras'],
  'sin:espinaca':['Espinaca','Verduras'],'sin:acelga':['Acelga','Verduras'],
  'sin:pimenton':['Pimentón','Verduras'],'sin:ajo':['Ajo','Verduras'],
  'sin:apio':['Apio','Verduras'],'sin:repollo':['Repollo','Verduras'],
};

function exigir(condicion, mensaje) {
  if (!condicion) throw new ApiError(400, 'VALIDATION_ERROR', mensaje);
}
function objeto(d) {
  exigir(d !== null && typeof d === 'object' && !Array.isArray(d), 'El cuerpo debe ser un objeto JSON.');
  return d;
}
function texto(value, nombre, min, max) {
  exigir(typeof value === 'string' && value.trim().length >= min && value.trim().length <= max
    && !/[\u0000-\u001f\u007f]/u.test(value), `${nombre} no es válido.`);
  return value.trim();
}
function fechaValida(value) {
  if (value === 'Sin fecha') return true;
  if (typeof value !== 'string') return false;
  const partes = value.split('/');
  if (partes.length === 2) {
    const [mes, anio] = partes.map(Number);
    return /^\d{2}\/\d{4}$/u.test(value) && mes >= 1 && mes <= 12 && anio >= 1900;
  }
  if (partes.length !== 3 || !/^\d{2}\/\d{2}\/\d{4}$/u.test(value)) return false;
  const [dia, mes, anio] = partes.map(Number);
  const date = new Date(Date.UTC(anio, mes - 1, dia));
  return anio >= 1900 && date.getUTCFullYear() === anio && date.getUTCMonth() === mes - 1 && date.getUTCDate() === dia;
}
function aperturaValida(value) {
  if (value === undefined || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value
    && value <= new Date().toISOString().slice(0,10);
}
function validarCantidad(value, barcode, unit) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 999
    && (Number.isInteger(value) || (barcode.startsWith('sin:') && ['kg','g'].includes(unit)));
}
function identidadProducto(d) {
  exigir(typeof d.codigoBarras === 'string' && (/^\d{8,14}$/u.test(d.codigoBarras) || d.codigoBarras.startsWith('sin:')),
    'El código de barras debe tener entre 8 y 14 dígitos, o ser un producto genérico válido.');
  exigir(texto(d.nombre,'Nombre',1,120) === d.nombre.trim(), 'Nombre no válido.');
  exigir(texto(d.marca,'Marca',1,80) === d.marca.trim(), 'Marca no válida.');
  exigir(CATEGORIAS.includes(d.categoria), 'Categoría no válida.');
  exigir(typeof d.formato === 'string' && d.formato.length <= 80 && !/[\u0000-\u001f\u007f]/u.test(d.formato), 'Formato no válido.');
  texto(d.unidad,'Unidad',1,30);
  if (d.codigoBarras.startsWith('sin:')) {
    const generico = GENERICOS[d.codigoBarras];
    exigir(!!generico && d.nombre === generico[0] && d.categoria === generico[1]
      && d.marca === 'Sin marca' && d.formato === 'A granel' && ['unidad','kg','g'].includes(d.unidad),
    'El producto genérico no coincide con el catálogo local.');
  }
}

function validarAltaInventario(body) {
  const d = objeto(body);
  const permitidas = ['codigoBarras','nombre','marca','categoria','formato','unidad','cantidad','vencimiento','ubicacion','abiertoEn'];
  exigir(Object.keys(d).every(k => permitidas.includes(k)), 'El cuerpo contiene campos no permitidos.');
  identidadProducto(d);
  exigir(validarCantidad(d.cantidad,d.codigoBarras,d.unidad), 'Cantidad no válida.');
  exigir(fechaValida(d.vencimiento), 'Vencimiento no válido. Usa DD/MM/AAAA, MM/AAAA o “Sin fecha”.');
  const ubicacion = d.ubicacion === undefined ? 'Despensa' : d.ubicacion;
  exigir(UBICACIONES.includes(ubicacion), 'Ubicación no válida.');
  exigir(aperturaValida(d.abiertoEn), 'La fecha de apertura no es válida o es futura.');
  return { codigoBarras:d.codigoBarras, nombre:d.nombre.trim(), marca:d.marca.trim(), categoria:d.categoria,
    formato:d.formato, unidad:d.unidad, cantidad:d.cantidad, vencimiento:d.vencimiento,
    fechaRegistro:new Date().toISOString(), ubicacion,
    ...(d.abiertoEn ? { abiertoEn:d.abiertoEn } : {}) };
}
function validarCambioInventario(actual, body) {
  const d = objeto(body);
  const permitidas = ['cantidad','vencimiento','ubicacion','abiertoEn'];
  exigir(Object.keys(d).length > 0 && Object.keys(d).every(k => permitidas.includes(k)),
    'Solo se pueden modificar cantidad, vencimiento, ubicación y fecha de apertura.');
  const actualizado = { ...actual, ...d };
  exigir(validarCantidad(actualizado.cantidad,actualizado.codigoBarras,actualizado.unidad), 'Cantidad no válida.');
  exigir(fechaValida(actualizado.vencimiento), 'Vencimiento no válido.');
  exigir(UBICACIONES.includes(actualizado.ubicacion || 'Despensa'), 'Ubicación no válida.');
  exigir(aperturaValida(actualizado.abiertoEn), 'La fecha de apertura no es válida o es futura.');
  return d;
}
function validarCompra(body) {
  const d = objeto(body);
  exigir(Object.keys(d).every(k => ['nombre','cantidad','unidad'].includes(k)), 'El cuerpo contiene campos no permitidos.');
  const nombre = texto(d.nombre,'Nombre',2,120);
  exigir(!/[<>\n\r]/u.test(nombre), 'El nombre contiene caracteres no permitidos.');
  exigir(typeof d.cantidad === 'number' && Number.isFinite(d.cantidad) && d.cantidad > 0 && d.cantidad <= 999,
    'Cantidad debe ser un número entre 0 y 999.');
  exigir(Number(d.cantidad.toFixed(3)) === d.cantidad,
    'La cantidad admite hasta tres decimales.');
  exigir(UNIDADES.includes(d.unidad) && (d.unidad !== 'unidad' || Number.isInteger(d.cantidad)), 'Unidad o cantidad no válida.');
  return { nombre, cantidad:d.cantidad, unidad:d.unidad };
}
function validarCambioCompra(actual, body) {
  const d = objeto(body);
  exigir(Object.keys(d).length > 0 && Object.keys(d).every(k => ['nombre','cantidad','unidad','comprado'].includes(k)),
    'Solo se pueden modificar nombre, cantidad, unidad y estado de compra.');
  const actualizado = { ...actual, ...d };
  validarCompra({ nombre:actualizado.nombre, cantidad:actualizado.cantidad, unidad:actualizado.unidad });
  exigir(typeof actualizado.comprado === 'boolean', 'El estado comprado debe ser verdadero o falso.');
  return d;
}

module.exports = { ApiError, validarAltaInventario, validarCambioInventario, validarCompra, validarCambioCompra };
