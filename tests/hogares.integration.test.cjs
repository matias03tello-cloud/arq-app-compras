/** Backend real con Firestore emulado: sin datos ni cuentas de producción. */
const {test,before,beforeEach,after}=require('node:test');const assert=require('node:assert/strict');
const {createRequire}=require('node:module');const req=createRequire(require('node:path').resolve('functions/package.json'));
const {initializeApp,deleteApp}=req('firebase-admin/app');const {getFirestore,FieldValue,Timestamp}=req('firebase-admin/firestore');const {HttpsError}=req('firebase-functions/v2/https');
const {crearGestorHogares}=require('../functions/hogares');let app,db,gestor;
const request=(uid,accion,datos={})=>({auth:{uid,token:{name:uid,firebase:{sign_in_provider:'password'}}},data:{accion,...datos}});
before(()=>{if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Solo emulador');app=initializeApp({projectId:'demo-frescapp-security'},'hogares-tests');db=getFirestore(app);gestor=crearGestorHogares({db,FieldValue,Timestamp,HttpsError});});
beforeEach(async()=>{for(const c of await db.listCollections())await db.recursiveDelete(c);});after(()=>deleteApp(app));
test('autenticación, datos estrictos, invitación correcta y límite de un hogar propio',async()=>{
 for (const accion of ['__proto__','toString','otra']) await assert.rejects(gestor.gestionar(request('A',accion)));
 await assert.rejects(gestor.gestionar({data:{accion:'crear',nombre:'Casa'}}));await assert.rejects(gestor.gestionar(request('A','crear',{nombre:'Casa',uid:'B'})));
 const casa=await gestor.gestionar(request('A','crear',{nombre:'Casa'}));await assert.rejects(gestor.gestionar(request('A','crear',{nombre:'Otra'})));
 await assert.rejects(gestor.gestionar(request('B','entrar',{codigo:casa.id+'.'+'0'.repeat(64)})));
 await gestor.gestionar(request('B','entrar',{codigo:casa.codigo}));assert.deepEqual((await db.doc('hogares/'+casa.id).get()).data().miembros,['A','B']);
 await assert.rejects(gestor.gestionar(request('B','renovar',{id:casa.id})));await assert.rejects(gestor.gestionar(request('B','cerrar',{id:casa.id})));
});
test('renovar, quitar y vencer invalidan códigos; miembro sale sin borrar datos compartidos',async()=>{
 const c=await gestor.gestionar(request('A','crear',{nombre:'Casa'}));await gestor.gestionar(request('B','entrar',{codigo:c.codigo}));
 const n=await gestor.gestionar(request('A','renovar',{id:c.id}));await assert.rejects(gestor.gestionar(request('C','entrar',{codigo:c.codigo})));await gestor.gestionar(request('C','entrar',{codigo:n.codigo}));
 await gestor.gestionar(request('A','quitar',{id:c.id,integrante:'B'}));await assert.rejects(gestor.gestionar(request('B','entrar',{codigo:n.codigo})));assert.equal((await db.doc(`usuarios/B/hogares/${c.id}`).get()).exists,false);
 await gestor.gestionar(request('C','salir',{id:c.id}));assert.deepEqual((await db.doc('hogares/'+c.id).get()).data().miembros,['A']);
 const r=await gestor.gestionar(request('A','renovar',{id:c.id}));await db.doc('hogares/'+c.id).update({inviteHasta:Timestamp.fromMillis(1)});await assert.rejects(gestor.gestionar(request('D','entrar',{codigo:r.codigo})));
});
test('entradas concurrentes respetan ocho integrantes y sus referencias',async()=>{
 const c=await gestor.gestionar(request('A','crear',{nombre:'Casa'}));const entradas=await Promise.allSettled(Array.from({length:8},(_,i)=>gestor.gestionar(request('M'+i,'entrar',{codigo:c.codigo}))));assert.equal(entradas.filter(e=>e.status==='fulfilled').length,7);assert.equal((await db.doc('hogares/'+c.id).get()).data().miembros.length,8);
});
test('borrado de cuenta limpia nombres y membresías; borrar dueño elimina hogar completo',async()=>{
 const c=await gestor.gestionar(request('A','crear',{nombre:'Casa'}));await gestor.gestionar(request('B','entrar',{codigo:c.codigo}));await db.doc(`hogares/${c.id}/inventario/alimento`).set({nombre:'Tomate'});
 await gestor.limpiarUsuario('B');const h=(await db.doc('hogares/'+c.id).get()).data();assert.equal(h.nombres.B,undefined);assert.deepEqual(h.miembros,['A']);assert.equal((await db.doc(`hogares/${c.id}/inventario/alimento`).get()).exists,true);
 await gestor.limpiarUsuario('A');assert.equal((await db.doc('hogares/'+c.id).get()).exists,false);assert.equal((await db.doc(`hogares/${c.id}/inventario/alimento`).get()).exists,false);assert.equal((await db.doc(`usuarios/A/hogares/${c.id}`).get()).exists,false);
});
test('cierre parcial bloquea hogar y se puede reintentar sin borrar uno nuevo',async()=>{
 const c=await gestor.gestionar(request('A','crear',{nombre:'Casa'}));const original=db.recursiveDelete.bind(db);let fail=true;db.recursiveDelete=async(...args)=>{if(fail){fail=false;throw Error('fallo simulado');}return original(...args);};
 try{await assert.rejects(gestor.gestionar(request('A','cerrar',{id:c.id})));assert.equal((await db.doc('hogares/'+c.id).get()).data().estado,'cerrado');await gestor.gestionar(request('A','cerrar',{id:c.id}));const nueva=await gestor.gestionar(request('A','crear',{nombre:'Nueva'}));await gestor.gestionar(request('A','cerrar',{id:c.id}));assert.equal((await db.doc('hogares/'+nueva.id).get()).exists,true);}finally{db.recursiveDelete=original;}
});
