/** Servicios reales compilados con sesión de prueba: solo Firestore emulado. */
import {test,before,beforeEach,after} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,symlinkSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,dirname,resolve} from 'node:path';import ts from 'typescript';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';import {doc,setDoc,getDoc,getDocs,collection,serverTimestamp} from 'firebase/firestore';
const temp=mkdtempSync(join(tmpdir(),'frescapp-movimientos-'));symlinkSync(resolve('node_modules'),join(temp,'node_modules'));
for(const f of ['services/movimientos.ts','services/movimientosModelo.ts','services/compraMultiple.ts','services/productos.ts','services/fechas.ts','security/identidadProducto.ts','security/validation.ts']){const out=join(temp,f.replace(/\.ts$/,'.js'));mkdirSync(dirname(out),{recursive:true});writeFileSync(out,ts.transpileModule(readFileSync(new URL('../'+f,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g, (_,q,r)=>`from ${q}${r}.js${q}`));}
writeFileSync(join(temp,'package.json'),' {"type":"module"} ');writeFileSync(join(temp,'firebase.js'),"export let db; export function testSetDb(d){db=d;}");writeFileSync(join(temp,'services/auth.js'),"export const auth={get currentUser(){return {uid:globalThis.__UID__}}};export const obtenerUidActual=()=>globalThis.__UID__;");
const {testSetDb}=await import(join(temp,'firebase.js'));const {registrarMovimiento}=await import(join(temp,'services/movimientos.js'));const {guardarCompraMultiple}=await import(join(temp,'services/compraMultiple.js'));const {calcularSalida}=await import(join(temp,'services/movimientosModelo.js'));let env;
const producto={codigoBarras:'7801234567890',nombre:'Arroz',marca:'Prueba',categoria:'Despensa',formato:'1 kg',unidad:'unidad',activo:true};const entrada=(id,campos={})=>({id,producto:{...producto,cantidad:2,vencimiento:'Sin fecha',ubicacion:'Despensa',...campos}});
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-frescapp-security',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});});
beforeEach(async()=>{await env.clearFirestore();globalThis.__UID__='A';globalThis.__DB__=env.authenticatedContext('A',{firebase:{sign_in_provider:'password'}}).firestore();testSetDb(globalThis.__DB__);await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'productos',producto.codigoBarras),producto));});
after(async()=>{await env.cleanup();rmSync(temp,{recursive:true,force:true});delete globalThis.__DB__;delete globalThis.__UID__;});
test('salida valida envases, peso, exceso y precisión sin negativos',()=>{assert.deepEqual(calcularSalida(0.3,'0,1','sin:tomate','kg'),{cantidad:0.1,restante:0.2});for(const n of ['0','-1','1.5','3','1e2'])assert.throws(()=>calcularSalida(2,n,producto.codigoBarras,'unidad'));});
test('compra se reintenta sin duplicar, incluso si un lote ya se consumió',async()=>{
 const rows=[entrada('uno'),entrada('dos')];await guardarCompraMultiple(rows,()=>{});await registrarMovimiento('v5:uno','consumo','2','Consumido',undefined,'salida-uno');assert.equal((await getDoc(doc(globalThis.__DB__,'usuarios/A/inventario/uno'))).exists(),false);
 await guardarCompraMultiple(rows,()=>{});assert.equal((await getDocs(collection(globalThis.__DB__,'usuarios/A/inventario'))).size,1);assert.equal((await getDoc(doc(globalThis.__DB__,'usuarios/A/inventario/uno'))).exists(),false);
 await registrarMovimiento('v5:uno','consumo','2','Consumido',undefined,'salida-uno');assert.equal((await getDocs(collection(globalThis.__DB__,'usuarios/A/historial'))).size,1);
});
test('fallo en segundo par conserva avance y reintento no repite el primero',async()=>{
 const code='7801234567891';const rows=[entrada('uno'),entrada('dos'),entrada('tres',{codigoBarras:code}),entrada('cuatro')];const ids=[];
 await assert.rejects(guardarCompraMultiple(rows,a=>ids.push(...a)));assert.deepEqual(ids,['uno','dos']);assert.equal((await getDocs(collection(globalThis.__DB__,'usuarios/A/inventario'))).size,2);
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'productos',code),{...producto,codigoBarras:code}));await guardarCompraMultiple(rows,()=>{});assert.equal((await getDocs(collection(globalThis.__DB__,'usuarios/A/inventario'))).size,4);
});
test('salidas concurrentes no consumen más que el stock; el historial queda exacto',async()=>{
 await guardarCompraMultiple([entrada('uno',{cantidad:3})],()=>{});const r=await Promise.allSettled([registrarMovimiento('v5:uno','consumo','2','Consumido',undefined,'evento-a'),registrarMovimiento('v5:uno','desperdicio','2','Deterioro',undefined,'evento-b')]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await getDoc(doc(globalThis.__DB__,'usuarios/A/inventario/uno'))).data().cantidad,1);assert.equal((await getDocs(collection(globalThis.__DB__,'usuarios/A/historial'))).size,1);
});
test('movimiento compartido descuenta solo el lote del hogar',async()=>{
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'hogares/casa'),{estado:'activo',propietario:'A',miembros:['A','B']});const {activo,...datos}=producto;await setDoc(doc(c.firestore(),'hogares/casa/inventario/arroz'),{...datos,cantidad:2,vencimiento:'Sin fecha',fechaRegistro:new Date().toISOString(),creadoEn:serverTimestamp(),ubicacion:'Despensa'});});
 await registrarMovimiento('arroz','desperdicio','1','Vencimiento','casa','salida-casa');assert.equal((await getDoc(doc(globalThis.__DB__,'hogares/casa/inventario/arroz'))).data().cantidad,1);assert.equal((await getDocs(collection(globalThis.__DB__,'hogares/casa/historial'))).size,1);assert.equal((await getDocs(collection(globalThis.__DB__,'usuarios/A/historial'))).size,0);
});
