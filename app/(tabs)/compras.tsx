import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useCompras, type Compra } from '../../services/compras';
import { UNIDADES_COMPRA, type UnidadCompra } from '../../services/comprasModelo';
import { useTemaApp } from '../../components/mobile/TemaApp';
import { Aviso, BotonApp, Chip, Confirmacion, Encabezado, Pantalla, ui } from '../../components/mobile/UI';
export default function Compras() {
  const lista = useCompras(); const { colores } = useTemaApp();
  const [nombre, setNombre] = useState(''); const [cantidad, setCantidad] = useState('1'); const [unidad, setUnidad] = useState<UnidadCompra>('unidad'); const [borrar, setBorrar] = useState<Compra | null>(null);
  const bloqueado = lista.ocupado || lista.cargando || lista.cache || !!lista.error;
  const campo = { backgroundColor: colores.tarjeta, color: colores.texto, borderColor: colores.borde, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 48 };
  return <Pantalla><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.contenido}>
    <Encabezado titulo="Lista de compras" detalle="Planifica aquí y consulta la misma lista en la web."/>
    <Aviso texto="Marcar como comprado no agrega el alimento a la despensa. Regístralo después con su fecha desde Agregar."/>
    {(lista.cargando || lista.cache) && <Aviso texto="Esperando confirmación del servidor. Los datos pueden estar desactualizados."/>}
    {(lista.error || lista.errorAccion) && <Aviso texto={lista.error || lista.errorAccion} error/>}
    {(lista.error || lista.cache) && <BotonApp texto="Reintentar conexión" secundario onPress={lista.reintentar}/>}
    <TextInput accessibilityLabel="Producto para comprar" placeholder="Ej. Arroz, marca y formato" placeholderTextColor={colores.secundario} maxLength={120} value={nombre} onChangeText={setNombre} style={campo}/>
    <TextInput accessibilityLabel="Cantidad para comprar" keyboardType="decimal-pad" value={cantidad} onChangeText={setCantidad} maxLength={7} style={campo}/>
    <View style={[ui.fila, { flexWrap: 'wrap' }]}>{UNIDADES_COMPRA.map(u => <Chip key={u} texto={u} elegido={unidad === u} onPress={() => setUnidad(u)}/>)}</View>
    <BotonApp texto="Añadir a la lista" deshabilitado={bloqueado} onPress={() => { void lista.agregar(nombre, cantidad, unidad).then(ok => { if (ok) { setNombre(''); setCantidad('1'); } }); }}/>
    <Text style={{ color: colores.texto, fontSize: 18, fontWeight: '700' }}>{lista.items.filter(i => !i.comprado).length} pendientes · {lista.items.filter(i => i.comprado).length} comprados</Text>
    {!lista.cargando && !lista.cache && !lista.error && !lista.items.length && <Text style={{ color: colores.secundario }}>Tu lista está vacía. Añade lo que necesitas para tu próxima compra.</Text>}
    {lista.items.map(i => <View key={i.id} style={{ backgroundColor: colores.tarjeta, borderColor: colores.borde, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 }}><Text style={{ color: colores.texto, fontSize: 18, fontWeight: '700', textDecorationLine: i.comprado ? 'line-through' : 'none' }}>{i.nombre}</Text><Text style={{ color: colores.secundario }}>{i.cantidad} {i.unidad} · {i.comprado ? 'Comprado' : 'Pendiente'}</Text><BotonApp texto={i.comprado ? `Volver a pendiente: ${i.nombre}` : `Marcar comprado: ${i.nombre}`} secundario deshabilitado={bloqueado} onPress={() => { void lista.marcar(i); }}/><BotonApp texto={`Eliminar: ${i.nombre}`} secundario peligro deshabilitado={bloqueado} onPress={() => setBorrar(i)}/></View>)}
    <Confirmacion visible={!!borrar} titulo="¿Eliminar de la lista?" detalle={borrar?.nombre || ''} ocupado={lista.ocupado} error={lista.errorAccion} cerrar={() => setBorrar(null)} confirmar={() => { if (borrar) void lista.eliminar(borrar).then(ok => { if (ok) setBorrar(null); }); }}/>
  </ScrollView></Pantalla>;
}
