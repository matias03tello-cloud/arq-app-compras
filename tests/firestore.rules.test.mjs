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
