import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { auth } from '../../services/auth';
import { filtrarInventario, type FiltroVencimiento } from '../../services/vistaInventario';
import { resumenCantidades } from '../../security/identidadProducto';
import { useInventarioApp } from '../../components/mobile/InventarioApp';
import { useTemaApp } from '../../components/mobile/TemaApp';
import { BotonApp, Encabezado, EstadoInventario, EstadoVacio, Pantalla, TarjetaProducto, ui } from '../../components/mobile/UI';

export default function PantallaInicio() {
  const { productos } = useInventarioApp();
  const { colores } = useTemaApp();
  const router = useRouter();
  const nombre = auth.currentUser?.displayName?.trim().split(/\s+/)[0];
  const semana = filtrarInventario(productos, { estado: 'semana' });
  const vencidos = filtrarInventario(productos, { estado: 'vencido' }).length;
  const sinFecha = filtrarInventario(productos, { estado: 'sin-fecha' }).length;
  const abrir = (estado: FiltroVencimiento) => router.push({ pathname: '/despensa', params: { estado } });
  const estadisticas: { titulo: string; cantidad: number; filtro: FiltroVencimiento; ayuda: string }[] = [
    { titulo: 'En tu despensa', cantidad: productos.length, filtro: 'todos', ayuda: 'Ver todos los registros' },
    { titulo: 'Vencen en 7 días', cantidad: semana.length, filtro: 'semana', ayuda: 'Incluye hoy' },
    { titulo: 'Vencidos', cantidad: vencidos, filtro: 'vencido', ayuda: 'Revisar por separado' },
    { titulo: 'Sin fecha', cantidad: sinFecha, filtro: 'sin-fecha', ayuda: 'Fecha no registrada' },
  ];
  return <Pantalla><ScrollView contentContainerStyle={ui.contenido}>
    <Encabezado titulo={nombre ? `Hola, ${nombre}` : 'Tu hogar, organizado'} detalle="Revisa lo que tienes antes de comprar."/>
    <View style={[styles.hero, { backgroundColor: colores.suave, borderColor: colores.borde }]}><View style={ui.fila}><Ionicons name="leaf-outline" size={26} color={colores.verde}/><Text style={[styles.heroTitulo, { color: colores.texto }]}>Menos olvido. Más aprovechamiento.</Text></View><Text style={[ui.detalle, { color: colores.secundario }]}>Guarda tus compras y ten sus fechas a la vista.</Text><BotonApp texto="Agregar alimento" icono="add" onPress={() => router.push({pathname:'/camara',params:{compra:'0'}})}/></View>
    <BotonApp texto="Ideas para cocinar" icono="restaurant-outline" secundario onPress={()=>router.push('/recetas')}/>
    <BotonApp texto="Mi lista de compras" icono="cart-outline" secundario onPress={() => router.push('/compras')}/>
    <BotonApp texto="Mi hogar compartido" icono="people-outline" secundario onPress={() => router.push('/hogar')}/>
    <BotonApp texto="Registrar una compra" icono="bag-add-outline" secundario onPress={()=>router.push('/registro-compras')}/><BotonApp texto="Mi historial" icono="time-outline" secundario onPress={()=>router.push('/historial')}/>
    <EstadoInventario>
      <View style={styles.grid}>{estadisticas.map(e => <Pressable key={e.filtro} accessibilityRole="button" accessibilityLabel={`${e.titulo}: ${e.cantidad}. ${e.ayuda}`} onPress={() => abrir(e.filtro)} style={({ pressed }) => [styles.stat, { backgroundColor: colores.tarjeta, borderColor: colores.borde, opacity: pressed ? .65 : 1 }]}><Text style={{ color: colores.secundario, fontSize: 13 }}>{e.titulo}</Text><Text style={[styles.numero, { color: e.filtro === 'vencido' ? colores.peligro : colores.texto }]}>{e.cantidad}</Text><Text style={{ color: colores.secundario, fontSize: 11 }}>{e.ayuda}</Text></Pressable>)}</View>
      <View style={[ui.fila, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><Text accessibilityRole="header" style={[styles.seccion, { color: colores.texto }]}>Tenlos presentes esta semana</Text><Pressable accessibilityRole="button" onPress={() => abrir('semana')} style={styles.verTodos}><Text style={{ color: colores.verde, fontWeight: '700' }}>Ver todos →</Text></Pressable></View>
      {!productos.length ? <EstadoVacio titulo="Tu despensa empieza aquí" detalle="Agrega tu primer alimento con código de barras o elige una fruta o verdura."/> : !semana.length ? <EstadoVacio titulo="Sin vencimientos para esta semana" detalle="Puedes revisar los vencidos y los productos sin fecha en sus tarjetas de arriba." icono="calendar-outline"/> : <View>{semana.slice(0, 4).map(p => <TarjetaProducto key={p.id} producto={p}/>)}</View>}
      {!!productos.length && <Text style={{ color: colores.secundario, fontSize: 12, lineHeight: 19 }}>Cantidades: {resumenCantidades(productos)}. Cada registro puede tener su propia fecha.</Text>}
    </EstadoInventario>
  </ScrollView></Pantalla>;
}
const styles = StyleSheet.create({
  hero: { padding: 20, borderRadius: 20, borderWidth: 1, gap: 15 }, heroTitulo: { flex: 1, fontSize: 20, fontWeight: '700', lineHeight: 27 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stat: { flexGrow: 1, flexBasis: '44%', borderWidth: 1, borderRadius: 17, padding: 16, gap: 6 }, numero: { fontSize: 32, fontWeight: '800' }, seccion: { fontSize: 19, fontWeight: '700', flexShrink: 1 }, verTodos: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 3 },
});
