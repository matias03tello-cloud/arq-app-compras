import {useRouter} from 'expo-router';
import {MovimientoEditor} from './MovimientoEditor';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { auth } from '../../services/auth';
import { useHogar } from '../../services/hogares';
import type { ProductoInventario } from '../../services/productos';
import { UNIDADES_COMPRA, type UnidadCompra } from '../../services/comprasModelo';
import { useTemaApp } from './TemaApp';
import { AperturaEditor } from './AperturaEditor';
import { Aviso, BotonApp, Chip, Confirmacion, Encabezado, TarjetaProducto, ui } from './UI';
export function HogarPantalla({ personales, personalesListos }: { personales: ProductoInventario[]; personalesListos: boolean }) {
  const router=useRouter();const [salida,setSalida]=useState<{producto:ProductoInventario;hogar:string}|null>(null);
 const h=useHogar();const {colores}=useTemaApp();
  const [nombreHogar,setNombreHogar]=useState('');const [invitacion,setInvitacion]=useState('');const [nombre,setNombre]=useState('');const [cantidad,setCantidad]=useState('1');const [unidad,setUnidad]=useState<UnidadCompra>('unidad');
  const [busqueda,setBusqueda]=useState('');const [apertura,setApertura]=useState<{producto:ProductoInventario;hogar:string}|null>(null);
  const [confirmacion,setConfirmacion]=useState<{titulo:string;detalle:string;accion:()=>Promise<boolean>;id:string}|null>(null);
  const administrador=h.hogar?.propietario===auth.currentUser?.uid;
  const bloqueado=h.ocupado || h.cache || !h.hogar || !!h.error;
  const campo={borderWidth:1,borderColor:colores.borde,backgroundColor:colores.tarjeta,color:colores.texto,minHeight:48,padding:13,borderRadius:12};
  function confirmar(titulo:string,detalle:string,accion:()=>Promise<boolean>) {setConfirmacion({titulo,detalle,accion,id:h.id});}
  const error=h.errorReferencias || h.error || h.errorAccion;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.contenido}>
    <Encabezado titulo="Mi hogar" detalle="La despensa y las compras de este espacio son visibles para sus integrantes."/>
    <Aviso texto="Tu despensa y lista personales siguen separadas. Comparte únicamente los alimentos que quieras mostrar al hogar; no se moverán ni eliminarán de tu espacio personal."/>
    {!!error && <Aviso texto={error} error/>}
    {(h.referenciasCache || (!!h.id && h.cache)) && <Aviso texto="Esperando confirmación del servidor. Revisa la conexión antes de hacer cambios."/>}
    {!!h.error && !!h.id && <BotonApp texto="Reintentar cierre del hogar (administrador)" secundario peligro deshabilitado={h.ocupado || h.referenciasCache} onPress={()=>confirmar('¿Completar el cierre?','Se eliminarán los datos compartidos pendientes de este hogar. Solo el administrador puede hacerlo.',()=>h.gestionar('cerrar'))}/> }
    {!!error && <BotonApp texto="Volver a consultar hogares" secundario onPress={h.reintentar}/>}
    <TextInput accessibilityLabel="Nombre del nuevo hogar" placeholder="Ej. Casa familiar" placeholderTextColor={colores.secundario} value={nombreHogar} maxLength={60} onChangeText={setNombreHogar} style={campo}/>
    <BotonApp texto="Crear hogar" ocupado={h.ocupado} deshabilitado={h.referenciasCache} onPress={()=>{void h.gestionar('crear',{nombre:nombreHogar});}}/>
    <Aviso texto="Al aceptar una invitación, los integrantes verán tu nombre o apodo y podrás consultar y gestionar los alimentos y compras del hogar."/>
    <TextInput accessibilityLabel="Código de invitación" placeholder="Pega el código completo" placeholderTextColor={colores.secundario} value={invitacion} onChangeText={setInvitacion} autoCapitalize="none" autoCorrect={false} maxLength={193} style={campo}/>
    <BotonApp texto="Aceptar invitación y entrar" secundario ocupado={h.ocupado} deshabilitado={h.referenciasCache} onPress={()=>{void h.gestionar('entrar',{codigo:invitacion}).then(ok=>{if(ok)setInvitacion('');});}}/>
    <View style={[ui.fila,{flexWrap:'wrap'}]}>{h.grupos.map(g=><Chip key={g.id} texto={g.nombre} elegido={g.id===h.id} onPress={()=>{if(!h.ocupado){h.elegir(g.id);setConfirmacion(null);setApertura(null);}}}/>)}</View>
    {!!h.codigo && <View style={{gap:12}}><Aviso texto="Comparte este código solo con las personas que quieras invitar. Vence en 7 días; renovarlo invalida el anterior."/><Text selectable accessibilityLabel="Invitación creada" style={{color:colores.texto,fontSize:13}}>{h.codigo}</Text></View>}
    {h.hogar && <>
      <Encabezado titulo={h.hogar.nombre} etiqueta="HOGAR COMPARTIDO" detalle={`${h.hogar.miembros.length} de 8 integrantes · ${administrador?'Administras este hogar':'Eres integrante'}`}/>
      {h.hogar.miembros.map(uid=><View key={uid} style={{gap:8}}><Text style={{color:colores.texto}}>{h.hogar?.nombres[uid] || 'Integrante'}{uid===auth.currentUser?.uid?' (tú)':''}{uid===h.hogar?.propietario?' · administrador':''}</Text>{administrador && uid!==auth.currentUser?.uid && <BotonApp texto={`Quitar integrante ${h.hogar?.nombres[uid] || ''}`} secundario peligro deshabilitado={bloqueado} onPress={()=>confirmar('¿Quitar integrante?','Perderá el acceso al hogar y se invalidará la invitación anterior.',()=>h.gestionar('quitar',{integrante:uid}))}/>}</View>)}
      {administrador ? <><BotonApp texto="Generar nueva invitación" secundario deshabilitado={bloqueado} onPress={()=>{void h.gestionar('renovar');}}/><BotonApp texto="Cerrar hogar" secundario peligro deshabilitado={h.ocupado} onPress={()=>confirmar('¿Cerrar el hogar?','Se eliminarán la despensa y la lista compartidas para todos sus integrantes. Tus datos personales se conservan.',()=>h.gestionar('cerrar'))}/></> : <BotonApp texto="Salir del hogar" secundario peligro deshabilitado={bloqueado} onPress={()=>confirmar('¿Salir del hogar?','Perderás el acceso a los datos compartidos. Los datos del hogar permanecen para los otros integrantes.',()=>h.gestionar('salir'))}/>}
      <BotonApp texto="Historial del hogar" secundario deshabilitado={bloqueado} onPress={()=>router.push({pathname:'/historial',params:{hogar:h.id}})}/>
      <Text accessibilityRole="header" style={{color:colores.texto,fontSize:22,fontWeight:'700'}}>Despensa compartida</Text>
      {!h.cache && !h.productos.length && <Text style={{color:colores.secundario}}>Aún no hay alimentos compartidos.</Text>}
      {h.productos.map(item=><View key={item.id}><TarjetaProducto producto={item}/><BotonApp texto={`Salida de ${item.nombre}`} secundario deshabilitado={bloqueado} onPress={()=>setSalida({producto:item,hogar:h.id})}/><BotonApp texto={`Apertura de ${item.nombre}`} secundario deshabilitado={bloqueado} onPress={()=>setApertura({producto:item,hogar:h.id})}/><BotonApp texto={`Quitar alimento ${item.nombre}`} secundario peligro deshabilitado={bloqueado} onPress={()=>confirmar('¿Quitar alimento compartido?',item.nombre,()=>h.borrarProducto(item))}/></View>)}
      <Text style={{color:colores.texto,fontWeight:'700'}}>Compartir desde mi despensa</Text><Aviso texto="Se crea una copia visible para el hogar, con su cantidad y fecha actuales. Los cambios posteriores en una copia no actualizan la otra."/>
      <TextInput accessibilityLabel="Buscar alimento personal para compartir" placeholder="Busca un alimento de tu despensa" placeholderTextColor={colores.secundario} value={busqueda} maxLength={120} onChangeText={setBusqueda} style={campo}/>
      {!personalesListos && <Aviso texto="Espera a que tu despensa personal se actualice antes de compartir."/>}
      {!!busqueda.trim() && personales.filter(p=>`${p.nombre} ${p.marca}`.toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'))).slice(0,10).map(item=><BotonApp key={item.id} texto={`Compartir ${item.nombre} · ${item.marca}`} secundario deshabilitado={bloqueado || !personalesListos} onPress={()=>confirmar('¿Compartir este alimento?',`${item.nombre}: será visible para todos los integrantes de ${h.hogar?.nombre}.${h.productos.some(p=>p.codigoBarras===item.codigoBarras) ? ' Ya existe este producto en el hogar; comprueba que sea otro lote antes de crear otra copia.' : ''}`,()=>h.compartir(item))}/>)}
      <Text accessibilityRole="header" style={{color:colores.texto,fontSize:22,fontWeight:'700'}}>Compras del hogar</Text><Aviso texto="Marcar comprado no añade el alimento a ninguna despensa."/>
      <TextInput accessibilityLabel="Producto para el hogar" placeholder="Producto, marca y formato" placeholderTextColor={colores.secundario} value={nombre} maxLength={120} onChangeText={setNombre} style={campo}/>
      <TextInput accessibilityLabel="Cantidad para el hogar" keyboardType="decimal-pad" value={cantidad} maxLength={7} onChangeText={setCantidad} style={campo}/>
      <View style={[ui.fila,{flexWrap:'wrap'}]}>{UNIDADES_COMPRA.map(u=><Chip key={u} texto={u} elegido={unidad===u} onPress={()=>setUnidad(u)}/>)}</View>
      <BotonApp texto="Añadir compra del hogar" deshabilitado={bloqueado} onPress={()=>{void h.agregarCompra(nombre,cantidad,unidad).then(ok=>{if(ok){setNombre('');setCantidad('1');}});}}/>
      {h.compras.map(item=><View key={item.id} style={{gap:8,padding:16,borderWidth:1,borderColor:colores.borde,borderRadius:14,backgroundColor:colores.tarjeta}}><Text style={{color:colores.texto,fontSize:18,fontWeight:'700'}}>{item.nombre} · {item.cantidad} {item.unidad}</Text><BotonApp texto={item.comprado?`Comprado: ${item.nombre}; volver a pendiente`:`Marcar comprado: ${item.nombre}`} secundario deshabilitado={bloqueado} onPress={()=>{void h.marcar(item);}}/><BotonApp texto={`Eliminar compra ${item.nombre}`} secundario peligro deshabilitado={bloqueado} onPress={()=>confirmar('¿Eliminar compra compartida?',item.nombre,()=>h.borrarCompra(item))}/></View>)}
    </>}
    {salida && salida.hogar===h.id && h.hogar && <MovimientoEditor producto={salida.producto} hogar={salida.hogar} cerrar={()=>setSalida(null)}/>}
    {apertura && apertura.hogar===h.id && h.hogar && <AperturaEditor producto={apertura.producto} hogar={apertura.hogar} cerrar={()=>setApertura(null)}/>}
    <Confirmacion visible={!!confirmacion && confirmacion.id===h.id} titulo={confirmacion?.titulo || ''} detalle={confirmacion?.detalle || ''} textoConfirmar="Confirmar" ocupado={h.ocupado} error={h.errorAccion} cerrar={()=>setConfirmacion(null)} confirmar={()=>{if(confirmacion)void confirmacion.accion().then(ok=>{if(ok)setConfirmacion(null);});}}/>
  </ScrollView>;
}
