import { MovimientoEditor } from '../../components/mobile/MovimientoEditor';
import { AperturaEditor } from '../../components/mobile/AperturaEditor';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { eliminarProductoInventario } from '../../services/inventarioFirestore';
import type { ProductoInventario } from '../../services/productos';
import { filtrarInventario, filtroValido } from '../../services/vistaInventario';
import { UBICACIONES } from '../../security/identidadProducto';
import { mensajeSeguro } from '../../security/errors';
import { useInventarioApp } from '../../components/mobile/InventarioApp';
import { useTemaApp } from '../../components/mobile/TemaApp';
import { Aviso, BotonApp, Chip, Confirmacion, Encabezado, EstadoInventario, EstadoVacio, Pantalla, TarjetaProducto, ui } from '../../components/mobile/UI';

const ESTADOS = [{ valor: 'todos', texto: 'Todos' }, { valor: 'semana', texto: 'En 7 días' }, { valor: 'vencido', texto: 'Vencidos' }, { valor: 'sin-fecha', texto: 'Sin fecha' }] as const;
export default function PantallaDespensa() {
  const { productos, cargando, error, desdeCache } = useInventarioApp();
  const { colores } = useTemaApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ estado?: string }>();
  const estado = filtroValido(params.estado);
  const [busqueda, setBusqueda] = useState('');
  const [ubicacion, setUbicacion] = useState('Todos');
  const [orden, setOrden] = useState<'fecha' | 'nombre'>('fecha');
  const [salida,setSalida]=useState<ProductoInventario|null>(null);
  const [apertura, setApertura] = useState<ProductoInventario | null>(null);
  const [seleccion, setSeleccion] = useState<ProductoInventario | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState('');
  const [aviso, setAviso] = useState('');
  const bloqueo = useRef(false);
  const filtrados = filtrarInventario(productos, { busqueda, ubicacion, estado, orden });
  const hayFiltros = !!busqueda || ubicacion !== 'Todos' || estado !== 'todos';
  function limpiar() { setBusqueda(''); setUbicacion('Todos'); router.setParams({ estado: 'todos' }); }
  async function eliminar() {
    if (!seleccion || bloqueo.current) return;
    bloqueo.current = true; setEliminando(true); setErrorBorrado('');
    try { await eliminarProductoInventario(seleccion.id); setAviso(`${seleccion.nombre} se eliminó de tu despensa.`); setSeleccion(null); }
    catch (e) { setErrorBorrado(mensajeSeguro(e)); }
    finally { bloqueo.current = false; setEliminando(false); }
  }
  return <Pantalla><FlatList data={cargando || error ? [] : filtrados} keyExtractor={p => p.id} contentContainerStyle={ui.contenido} keyboardShouldPersistTaps="handled"
    ListHeaderComponent={<View style={{ gap: 16 }}>
      <Encabezado titulo="Mi despensa" detalle="Encuentra lo que tienes y revisa sus fechas."/>
      <BotonApp texto="Agregar alimento" icono="add" onPress={() => router.push({pathname:'/camara',params:{compra:'0'}})}/>
      <View style={[styles.buscador, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}><Ionicons name="search-outline" size={20} color={colores.secundario}/><TextInput accessibilityLabel="Buscar en mi despensa" placeholder="Alimento, marca o código" placeholderTextColor={colores.secundario} value={busqueda} onChangeText={setBusqueda} style={[styles.input, { color: colores.texto }]}/>{!!busqueda && <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => setBusqueda('')} style={styles.iconButton}><Ionicons name="close" size={20} color={colores.secundario}/></Pressable>}</View>
      <Text style={[styles.label, { color: colores.secundario }]}>Vencimiento</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{ESTADOS.map(e => <Chip key={e.valor} texto={e.texto} elegido={estado === e.valor} onPress={() => router.setParams({ estado: e.valor })}/>)}</ScrollView>
      <Text style={[styles.label, { color: colores.secundario }]}>Ubicación</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{['Todos', ...UBICACIONES, 'Sin ubicación'].map(u => <Chip key={u} texto={u} elegido={ubicacion === u} onPress={() => setUbicacion(u)}/>)}</ScrollView>
      <View style={[ui.fila, { flexWrap: 'wrap' }]}><Chip texto="Por fecha" elegido={orden === 'fecha'} onPress={() => setOrden('fecha')}/><Chip texto="Por nombre" elegido={orden === 'nombre'} onPress={() => setOrden('nombre')}/>{hayFiltros && <Pressable accessibilityRole="button" onPress={limpiar} style={styles.limpiar}><Text style={{ color: colores.verde, fontWeight: '700' }}>Limpiar filtros</Text></Pressable>}</View>
      {!cargando && !error && (!desdeCache || !!productos.length) && <Text accessibilityLiveRegion="polite" style={{ color: colores.secundario, fontSize: 13 }}>{filtrados.length} de {productos.length} registros</Text>}
      {!cargando && !error && desdeCache && !!productos.length && <Aviso texto="Esperando al servidor. La eliminación se habilitará al confirmar la conexión."/>}
      {!!aviso && <Aviso texto={aviso}/>}
      <View style={{ height: 2 }}/>
    </View>}
    ListEmptyComponent={<EstadoInventario><EstadoVacio titulo={productos.length ? 'No hay coincidencias' : 'Tu despensa empieza aquí'} detalle={productos.length ? 'Prueba otro nombre o cambia los filtros.' : 'Agrega tu primer alimento desde el botón de arriba.'} accion={hayFiltros ? <BotonApp texto="Limpiar filtros" onPress={limpiar} secundario/> : undefined}/></EstadoInventario>}
    renderItem={({ item }) => <TarjetaProducto producto={item} accion={<View><Pressable accessibilityRole="button" accessibilityLabel={`Registrar salida de ${item.nombre}`} disabled={desdeCache || !item.id.startsWith('v5:')} style={styles.iconButton} onPress={()=>setSalida(item)}><Ionicons name="restaurant-outline" size={20} color={colores.verde}/><Text style={{color:colores.verde,fontSize:10}}>Salida</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Registrar apertura de ${item.nombre}`} disabled={desdeCache || !item.id.startsWith('v5:')} style={styles.iconButton} onPress={() => setApertura(item)}><Ionicons name="calendar-outline" size={20} color={colores.verde}/><Text style={{color:colores.verde,fontSize:10}}>Apertura</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${item.nombre}`} accessibilityState={{ disabled: desdeCache }} disabled={desdeCache} style={[styles.iconButton, { opacity: desdeCache ? .4 : 1 }]} onPress={() => { setErrorBorrado(''); setSeleccion(item); }}><Ionicons name="trash-outline" size={20} color={colores.peligro}/></Pressable></View>}/>}
  />{salida && <MovimientoEditor producto={salida} cerrar={()=>setSalida(null)}/>} {apertura && <AperturaEditor producto={apertura} cerrar={() => setApertura(null)}/>}<Confirmacion visible={!!seleccion} titulo="¿Eliminar este registro?" detalle={`${seleccion?.nombre || ''}. Se quitará este registro de tu despensa. Esta acción no se puede deshacer.`} ocupado={eliminando} error={errorBorrado} confirmar={eliminar} cerrar={() => { if (!bloqueo.current) setSeleccion(null); }}/></Pantalla>;
}
const styles = StyleSheet.create({ buscador: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 14, paddingLeft: 14 }, input: { flex: 1, minWidth: 0, minHeight: 50, paddingVertical: 12, fontSize: 15 }, iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, label: { fontSize: 12, fontWeight: '700', marginBottom: -8 }, chips: { gap: 8, paddingVertical: 2 }, limpiar: { minHeight: 44, paddingHorizontal: 5, justifyContent: 'center' } });
