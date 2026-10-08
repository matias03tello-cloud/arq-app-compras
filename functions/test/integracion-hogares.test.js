/* global __dirname */
'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const {readFileSync}=require('node:fs');const {join}=require('node:path');
function cargar(fallo=false){const pasos=[];const db={doc:p=>({path:p}),recursiveDelete:async ref=>{pasos.push(ref.path)}};const gestor={gestionar:async r=>({uid:r.auth.uid}),limpiarUsuario:async uid=>{pasos.push('limpiar:'+uid);if(fallo)throw new Error('fallo de limpieza')}};const exports={};const modules={
 'firebase-admin/app':{initializeApp:()=>{}},'firebase-admin/auth':{getAuth:()=>({})},'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{},Timestamp:{}},
 'firebase-functions/v2/https':{onCall:(o,f)=>f,HttpsError:Error},'firebase-functions/v2/firestore':{onDocumentCreated:(o,f)=>f},'firebase-functions/v2/scheduler':{onSchedule:(o,f)=>f},'firebase-functions/params':{defineBoolean:()=>false},
 './hogares':{crearGestorHogares:()=>gestor},'./deletion':{assertRecentAuthentication:()=>{},deleteAccountData:async(uid,deps)=>deps.deletePrivateTree(uid)},
 };vm.runInNewContext(readFileSync(join(__dirname,'../index.js'),'utf8'),{exports,require:id=>{if(!modules[id])throw new Error(id);return modules[id];},Date,Error},{filename:'index.js'});return {exports,pasos};}
const evento={params:{uid:'A'},data:{ref:{get:async()=>({exists:true,data:()=>({estado:'pendiente'})})}}};
test('el entrypoint exporta gestionarHogar y delega con el request autenticado',async()=>{const {exports}=cargar();assert.deepEqual(await exports.gestionarHogar({auth:{uid:'A'}}),{uid:'A'});});
test('borrar una cuenta limpia hogares antes del árbol privado',async()=>{const {exports,pasos}=cargar();await exports.procesarEliminacionCuenta(evento);assert.deepEqual(pasos,['limpiar:A','usuarios/A']);});
test('fallo de limpieza del hogar conserva árbol privado y pide reintento',async()=>{const {exports,pasos}=cargar(true);await assert.rejects(exports.procesarEliminacionCuenta(evento),/ACCOUNT_DELETION_RETRY/);assert.deepEqual(pasos,['limpiar:A']);});
