/** Comprueba permisos y aislamiento entre usuarios usando el emulador de Firestore. */
import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';

let env;
const projectId = 'demo-frescapp-security';
const product = { codigoBarras: '7801234567890', nombre: 'Leche', marca: 'Ejemplo', categoria: 'Lacteos', formato: '1 L', unidad: 'unidad', activo: true };
const item = () => { const { activo, ...fields } = product; return { ...fields, cantidad: 2, vencimiento: '20/09/2026', fechaRegistro: '2026-09-12T12:00:00.000Z', creadoEn: serverTimestamp() }; };
const context = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore();
before(async () => { env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await Promise.all([
      setDoc(doc(db, 'usuarios/A/inventario/a'), item()), setDoc(doc(db, 'usuarios/B/inventario/b'), item()),
      setDoc(doc(db, 'inventario/legacyA'), { ...item(), usuarioId: 'A' }),
      setDoc(doc(db, 'inventario/legacyB'), { ...item(), usuarioId: 'B' }),
      setDoc(doc(db, 'inventario/demo'), { ...item(), usuarioId: 'usuario_demo' }),
      setDoc(doc(db, 'productos/7801234567890'), product),
      setDoc(doc(db, 'usuarios/A'), { uid: 'A', nombre: 'Antiguo' }),
    ]);
  });
});

test('dueño crea, lee, lista, modifica y borra su propio inventario', async () => {
  const db = context('A'); const ref = doc(db, 'usuarios/A/inventario/nuevo');
  await assertSucceeds(setDoc(ref, item()));
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(getDocs(collection(db, 'usuarios/A/inventario')));
  await assertSucceeds(updateDoc(ref, { cantidad: 3 }));
  await assertSucceeds(deleteDoc(ref));
});
test('A no lee/lista/crea/modifica/borra inventario de B', async () => {
  const db = context('A'); const ref = doc(db, 'usuarios/B/inventario/b');
  await assertFails(getDoc(ref)); await assertFails(getDocs(collection(db, 'usuarios/B/inventario')));
  await assertFails(setDoc(doc(db, 'usuarios/B/inventario/nuevo'), item()));
  await assertFails(updateDoc(ref, { cantidad: 20 })); await assertFails(deleteDoc(ref));
});
test('sesión ausente y autenticación anónima se rechazan', async () => {
  for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('A', { firebase: { sign_in_provider: 'anonymous' } }).firestore()]) {
    await assertFails(getDoc(doc(db, 'usuarios/A/inventario/a')));
    await assertFails(setDoc(doc(db, 'usuarios/A/inventario/nuevo'), item()));
    await assertFails(getDoc(doc(db, 'productos/7801234567890')));
  }
});
test('no acepta usuarioId falso ni campos administrativos ni contraseñas', async () => {
  const db = context('A');
  for (const extra of [{ usuarioId: 'B' }, { admin: true }, { password: 'x' }]) {
    await assertFails(setDoc(doc(db, 'usuarios/A/inventario/nuevo'), { ...item(), ...extra }));
  }
  await assertFails(updateDoc(doc(db, 'usuarios/A'), { admin: true }));
  await assertFails(setDoc(doc(db, 'usuarios/A/roles/admin'), { admin: true }));
});
test('valida campos requeridos, tipos, límites, categorías y códigos', async () => {
  const db = context('A');
  for (const override of [{ cantidad: 0 }, { cantidad: 1000 }, { cantidad: 1.5 }, { cantidad: '2' }, { nombre: '' }, { nombre: 'x'.repeat(121) }, { categoria: 'desconocido' }, { codigoBarras: '../12345678' }, { vencimiento: 'mañana' }, { creadoEn: Timestamp.fromMillis(0) }]) {
    await assertFails(setDoc(doc(db, 'usuarios/A/inventario/nuevo'), { ...item(), ...override }));
  }
  const missing = item(); delete missing.nombre;
  await assertFails(setDoc(doc(db, 'usuarios/A/inventario/nuevo'), missing));
  await assertFails(updateDoc(doc(db, 'usuarios/A/inventario/a'), { creadoEn: Timestamp.fromMillis(0) }));
});
test('catálogo común solo lectura; alta manual privada aislada', async () => {
  const a = context('A'); const b = context('B');
  await assertSucceeds(getDoc(doc(a, 'productos/7801234567890')));
  await assertFails(setDoc(doc(a, 'productos/7801234567890'), { ...product, nombre: 'ataque' }));
  await assertFails(setDoc(doc(a, 'usuarios/A/productosPrivados/7801234567890'), product));
  await assertSucceeds(setDoc(doc(a, 'usuarios/A/productosPrivados/88888888'), { ...product, codigoBarras: '88888888' }));
  await assertFails(getDoc(doc(b, 'usuarios/A/productosPrivados/7801234567890')));
  await assertFails(setDoc(doc(a, 'usuarios/A/productosPrivados/88888888'), product));
});
test('datos anteriores solo se consultan filtrados por el UID original', async () => {
  const db = context('A');
  await assertSucceeds(getDocs(query(collection(db, 'inventario'), where('usuarioId', '==', 'A'))));
  await assertFails(getDocs(collection(db, 'inventario')));
  await assertFails(getDocs(query(collection(db, 'inventario'), where('usuarioId', '==', 'usuario_demo'))));
  await assertFails(getDoc(doc(db, 'inventario/legacyB')));
  await assertFails(updateDoc(doc(db, 'inventario/demo'), { usuarioId: 'A' }));
  await assertFails(updateDoc(doc(db, 'inventario/legacyA'), { usuarioId: 'B' }));
  await assertFails(deleteDoc(doc(db, 'inventario/legacyB')));
  await assertSucceeds(deleteDoc(doc(db, 'inventario/legacyA')));
});
test('solicitar eliminación bloquea inmediatamente datos nuevos y anteriores, incluso con token previo', async () => {
  const db = context('A');
  await assertSucceeds(getDoc(doc(db, 'usuarios/A/inventario/a')));
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'eliminaciones/A'), { estado: 'pendiente' }));
  await assertFails(getDoc(doc(db, 'usuarios/A/inventario/a')));
  await assertFails(setDoc(doc(db, 'usuarios/A/inventario/nuevo'), item()));
  await assertFails(deleteDoc(doc(db, 'inventario/legacyA')));
  await assertFails(setDoc(doc(db, 'usuarios/A/productosPrivados/7801234567890'), product));
  await assertSucceeds(getDoc(doc(db, 'eliminaciones/A')));
  await assertFails(deleteDoc(doc(db, 'eliminaciones/A')));
  await assertFails(getDoc(doc(context('B'), 'eliminaciones/A')));
  await assertSucceeds(getDoc(doc(context('B'), 'usuarios/B/inventario/b')));
});
test('constancia de lectura controlada no permite inventar permisos', async () => {
  const db = context('A');
  const ref = doc(db, 'usuarios/A/privacidad/aviso');
  await assertSucceeds(setDoc(ref, { version: '2026-09-12-borrador', leidoEn: serverTimestamp() }));
  await assertFails(updateDoc(ref, { consentimientoTodo: true }));
  await assertFails(getDoc(doc(context('B'), 'usuarios/A/privacidad/aviso')));
});
test('no se permiten escrituras en colecciones sin autorización expresa', async () => {
  const db = context('A');
  await assertFails(setDoc(doc(db, 'eliminaciones/A'), { estado: 'pendiente' }));
  await assertFails(setDoc(doc(db, 'secretos/test'), { x: 1 }));
  await assertFails(getDocs(collection(db, 'usuarios')));
});
test('un lote mixto no borra ni siquiera el dato propio si incluye datos ajenos', async () => {
  const db = context('A'); const batch = writeBatch(db);
  batch.delete(doc(db, 'usuarios/A/inventario/a')); batch.delete(doc(db, 'usuarios/B/inventario/b'));
  await assertFails(batch.commit());
  const snap = await assertSucceeds(getDoc(doc(db, 'usuarios/A/inventario/a')));
  if (!snap.exists()) throw new Error('El lote fallido borró datos.');
});



test('margarina conocida no se renombra a fideos ni por alta ni por actualización', async () => {
  const db = context('A');
  await assertFails(setDoc(doc(db, 'usuarios/A/inventario/falso'), { ...item(), nombre: 'Fideos instantáneos' }));
  await assertFails(updateDoc(doc(db, 'usuarios/A/inventario/a'), { nombre: 'Fideos instantáneos' }));
  await assertFails(updateDoc(doc(db, 'usuarios/A/inventario/a'), { codigoBarras: '88888888' }));
  await assertSucceeds(updateDoc(doc(db, 'usuarios/A/inventario/a'), { ubicacion: 'Refrigerador' }));
});
test('producto privado conocido antiguo no reemplaza el catálogo común', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'usuarios/A/productosPrivados/7801234567890'), { ...product, nombre: 'Fideos falsos' }));
  const db = context('A');
  await assertFails(setDoc(doc(db, 'usuarios/A/inventario/falso'), { ...item(), nombre: 'Fideos falsos' }));
  await assertSucceeds(setDoc(doc(db, 'usuarios/A/inventario/correcto'), item()));
});
test('alta desconocida debe coincidir con registro personal y no puede usar el de otra cuenta', async () => {
  const db = context('A'); const privado = { ...product, codigoBarras: '88888888', nombre: 'Arroz' };
  await assertSucceeds(setDoc(doc(db, 'usuarios/A/productosPrivados/88888888'), privado));
  await assertSucceeds(setDoc(doc(db, 'usuarios/A/inventario/propio'), { ...item(), codigoBarras: '88888888', nombre: 'Arroz' }));
  await assertFails(setDoc(doc(db, 'usuarios/A/inventario/falso'), { ...item(), codigoBarras: '88888888', nombre: 'Fideos' }));
  await assertFails(setDoc(doc(context('B'), 'usuarios/B/inventario/falso'), { ...item(), codigoBarras: '88888888', nombre: 'Arroz' }));
});
test('sin código acepta tomates por peso y sin fecha; rechaza identidad inventada', async () => {
  const db = context('A'); const tomate = { ...item(), codigoBarras: 'sin:tomate', nombre: 'Tomate', marca: 'Sin marca', categoria: 'Verduras', formato: 'A granel', unidad: 'kg', cantidad: 1.5, vencimiento: 'Sin fecha', ubicacion: 'Refrigerador' };
  await assertSucceeds(setDoc(doc(db, 'usuarios/A/inventario/tomate'), tomate));
  for (const cambio of [{ nombre: 'Fideos' }, { categoria: 'Carnes' }, { codigoBarras: 'sin:inventado' }, { unidad: 'litros' }, { unidad: 'unidad', cantidad: 1.5 }, { ubicacion: 'Inventada' }]) {
    await assertFails(setDoc(doc(db, 'usuarios/A/inventario/falso'), { ...tomate, ...cambio }));
  }
  await assertFails(setDoc(doc(context('B'), 'usuarios/A/inventario/ajeno'), tomate));
});
test('reportes son privados, solo de productos del catálogo y no cambian datos comunes', async () => {
  const db = context('A'); const ref = doc(db, 'usuarios/A/reportesCatalogo/7801234567890');
  const reporte = { codigoBarras: '7801234567890', detalle: 'La marca del envase es distinta', creadoEn: serverTimestamp() };
  await assertSucceeds(setDoc(ref, reporte));
  await assertSucceeds(getDoc(ref));
  await assertFails(getDoc(doc(context('B'), 'usuarios/A/reportesCatalogo/7801234567890')));
  await assertFails(setDoc(ref, { ...reporte, aprobado: true }));
  await assertFails(setDoc(doc(db, 'usuarios/A/reportesCatalogo/88888888'), { ...reporte, codigoBarras: '88888888' }));
});

const shopping = () => ({ nombre: 'Arroz 1 kg', cantidad: 2, unidad: 'unidad', comprado: false, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() });
test('lista de compras: dueño crea, marca, lee y elimina; conserva identidad', async () => {
 const ref = doc(context('A'), 'usuarios/A/listaCompras/arroz');
 await assertSucceeds(setDoc(ref, shopping()));
 await assertSucceeds(updateDoc(ref, { comprado: true, actualizadoEn: serverTimestamp() }));
 await assertSucceeds(getDoc(ref));
 await assertFails(updateDoc(ref, { nombre: 'Otro', actualizadoEn: serverTimestamp() }));
 await assertSucceeds(deleteDoc(ref));
});
test('lista de compras: aislamiento de otra cuenta y anónimos', async () => {
 await assertSucceeds(setDoc(doc(context('A'), 'usuarios/A/listaCompras/arroz'), shopping()));
 for (const db of [context('B'), env.unauthenticatedContext().firestore()]) {
  const ref = doc(db, 'usuarios/A/listaCompras/arroz');
  await assertFails(getDoc(ref)); await assertFails(getDocs(collection(db, 'usuarios/A/listaCompras')));
  await assertFails(setDoc(ref, shopping())); await assertFails(updateDoc(ref, { comprado: true, actualizadoEn: serverTimestamp() })); await assertFails(deleteDoc(ref));
 }
});
test('lista de compras: rechaza cantidades, campos y timestamps falsos', async () => {
 const ref = doc(context('A'), 'usuarios/A/listaCompras/arroz');
 for (const cambios of [{cantidad:0},{cantidad:1000},{cantidad:1.5},{unidad:'cajas'},{extra:'x'},{comprado:true},{creadoEn:Timestamp.fromMillis(1)},{actualizadoEn:Timestamp.fromMillis(1)}]) await assertFails(setDoc(ref,{...shopping(),...cambios}));
 await assertSucceeds(setDoc(ref,{...shopping(),unidad:'kg',cantidad:0.25}));
});

test('apertura: dueño registra y quita; rechaza futuro, fechas imposibles y terceros', async()=>{
 const ref=doc(context('A'),'usuarios/A/inventario/apertura');await assertSucceeds(setDoc(ref,item()));
 await assertSucceeds(updateDoc(ref,{abiertoEn:'2024-02-29'}));
 for(const abiertoEn of ['2999-01-01','2025-02-29','2024-04-31','2024-13-01','texto']) await assertFails(updateDoc(ref,{abiertoEn}));
 await assertFails(updateDoc(doc(context('B'),'usuarios/A/inventario/apertura'),{abiertoEn:'2024-02-29'}));
 await assertSucceeds(updateDoc(ref,{abiertoEn:''}));
});
async function seedHogar(){await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();await setDoc(doc(db,'hogares/casa'),{nombre:'Casa',propietario:'A',miembros:['A','B'],nombres:{A:'A',B:'B'},estado:'activo'});await setDoc(doc(db,'hogares/casa/inventario/leche'),item());});}
test('hogar: integrantes leen y gestionan alimentos; ajenos no leen ni enumeran',async()=>{
 await seedHogar();const db=context('B');const ref=doc(db,'hogares/casa/inventario/leche');
 await assertSucceeds(getDoc(doc(db,'hogares/casa')));await assertSucceeds(getDocs(collection(db,'hogares/casa/inventario')));await assertSucceeds(updateDoc(ref,{abiertoEn:'2024-02-29'}));await assertSucceeds(setDoc(doc(db,'hogares/casa/inventario/otro'),item()));
 await assertFails(getDoc(doc(context('C'),'hogares/casa')));await assertFails(getDocs(collection(context('C'),'hogares/casa/inventario')));await assertFails(getDocs(collection(db,'hogares')));
 await assertFails(updateDoc(ref,{nombre:'Fideos'}));await assertFails(deleteDoc(doc(context('C'),'hogares/casa/inventario/leche')));
});
test('hogar: cliente no se otorga membresía ni cambia invitaciones ni índices',async()=>{
 await seedHogar();for(const uid of ['A','B','C']){const db=context(uid);await assertFails(updateDoc(doc(db,'hogares/casa'),{miembros:['A','B','C']}));await assertFails(setDoc(doc(db,`usuarios/${uid}/hogares/casa`),{nombre:'Casa'}));}
});
test('hogar: quitar miembro o cerrar bloquea datos; eliminación de dueño también',async()=>{
 await seedHogar();await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'hogares/casa'),{miembros:['A']}));await assertFails(getDocs(collection(context('B'),'hogares/casa/inventario')));
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'eliminaciones/A'),{estado:'pendiente'}));await assertFails(getDocs(collection(context('A'),'hogares/casa/inventario')));
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'hogares/casa'),{miembros:['A','B']}));await assertFails(getDocs(collection(context('B'),'hogares/casa/inventario')));
 await env.withSecurityRulesDisabled(async c=>{await deleteDoc(doc(c.firestore(),'eliminaciones/A'));await updateDoc(doc(c.firestore(),'hogares/casa'),{estado:'cerrado'});});await assertFails(getDocs(collection(context('B'),'hogares/casa/inventario')));
});
test('hogar: lista compartida conserva permisos y esquema; cuentas privadas siguen privadas',async()=>{
 await seedHogar();const ref=doc(context('B'),'hogares/casa/listaCompras/arroz');await assertSucceeds(setDoc(ref,shopping()));await assertSucceeds(updateDoc(ref,{comprado:true,actualizadoEn:serverTimestamp()}));await assertFails(getDoc(doc(context('C'),'hogares/casa/listaCompras/arroz')));await assertFails(getDocs(collection(context('B'),'usuarios/A/inventario')));
});
const movimiento=(cantidad=1,restante=1)=>({productoId:'a',codigoBarras:product.codigoBarras,nombre:product.nombre,marca:product.marca,formato:product.formato,unidad:product.unidad,vencimiento:'20/09/2026',tipo:'consumo',motivo:'Consumido',cantidad,restante,creadoEn:serverTimestamp()});
function loteSalida(db,evento='salida',datos=movimiento(),quitar=false){const b=writeBatch(db);b.set(doc(db,`usuarios/A/historial/${evento}`),datos);b.set(doc(db,'usuarios/A/salidasConfirmadas/a'),{eventoId:evento});if(quitar)b.delete(doc(db,'usuarios/A/inventario/a'));else b.update(doc(db,'usuarios/A/inventario/a'),{cantidad:datos.restante});return b;}
test('historial solo registra junto con descuento exacto; completo retira lote',async()=>{
 const db=context('A');await assertFails(setDoc(doc(db,'usuarios/A/historial/falso'),movimiento()));await assertSucceeds(loteSalida(db).commit());await assertSucceeds(loteSalida(db,'final',movimiento(1,0),true).commit());await assertFails(updateDoc(doc(db,'usuarios/A/historial/final'),{cantidad:99}));await assertFails(deleteDoc(doc(db,'usuarios/A/historial/final')));
});
test('historial rechaza falsificación, excesos, datos ajenos y doble evento por descuento',async()=>{
 const db=context('A');for(const campos of [{nombre:'Fideos'},{cantidad:3,restante:0},{restante:-1},{motivo:'texto ajeno'}])await assertFails(loteSalida(db,'error',{...movimiento(),...campos}).commit());await assertFails(loteSalida(context('B')).commit());await assertFails(getDocs(collection(context('B'),'usuarios/A/historial')));
 const b=loteSalida(db,'uno');b.set(doc(db,'usuarios/A/historial/dos'),movimiento());await assertFails(b.commit());assertSucceeds(getDoc(doc(db,'usuarios/A/inventario/a')));
});
test('registro de compra exige alimento nuevo y testigo privado inmutable',async()=>{
 const db=context('A');await assertFails(setDoc(doc(db,'usuarios/A/comprasRegistradas/a'),{codigoBarras:product.codigoBarras,creadoEn:serverTimestamp()}));const b=writeBatch(db);b.set(doc(db,'usuarios/A/inventario/nueva'),item());b.set(doc(db,'usuarios/A/comprasRegistradas/nueva'),{codigoBarras:product.codigoBarras,creadoEn:serverTimestamp()});await assertSucceeds(b.commit());await assertFails(deleteDoc(doc(db,'usuarios/A/comprasRegistradas/nueva')));await assertFails(getDocs(collection(context('B'),'usuarios/A/comprasRegistradas')));
});
test('historial del hogar exige miembro y descuento enlazado; no expone lo personal',async()=>{
 await seedHogar();const db=context('B');const b=writeBatch(db);b.set(doc(db,'hogares/casa/historial/salida'),{...movimiento(),productoId:'leche'});b.set(doc(db,'hogares/casa/salidasConfirmadas/leche'),{eventoId:'salida'});b.update(doc(db,'hogares/casa/inventario/leche'),{cantidad:1});await assertSucceeds(b.commit());await assertFails(getDocs(collection(context('C'),'hogares/casa/historial')));await assertFails(getDocs(collection(db,'usuarios/A/historial')));
});
