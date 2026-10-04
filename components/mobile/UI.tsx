import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTemaApp } from './TemaApp';
import { useInventarioApp } from './InventarioApp';
import type { ProductoInventario } from '../../services/productos';
import { obtenerEstadoVencimiento } from '../../services/fechas';
import { etiquetaCantidad } from '../../security/identidadProducto';

type Icono = ComponentProps<typeof Ionicons>['name'];
export function Pantalla({ children }: { children: ReactNode }) {
  const { colores } = useTemaApp();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colores.fondo }}>{children}</SafeAreaView>;
}
export function Encabezado({ titulo, detalle, etiqueta = 'FRESCAPP', accion }: { titulo: string; detalle: string; etiqueta?: string; accion?: ReactNode }) {
  const { colores } = useTemaApp();
  return <View style={ui.cabecera}><Text style={[ui.eyebrow, { color: colores.secundario }]}>{etiqueta}</Text><View style={ui.fila}><Text accessibilityRole="header" style={[ui.titulo, { color: colores.texto }]}>{titulo}</Text>{accion}</View><Text style={[ui.detalle, { color: colores.secundario }]}>{detalle}</Text></View>;
}
export function BotonApp({ texto, onPress, icono, secundario = false, ocupado = false, peligro = false, deshabilitado = false }: { texto: string; onPress: () => void; icono?: Icono; secundario?: boolean; ocupado?: boolean; peligro?: boolean; deshabilitado?: boolean }) {
  const { colores } = useTemaApp();
  const color = secundario ? (peligro ? colores.peligro : colores.verde) : '#FFFFFF';
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: ocupado || deshabilitado, busy: ocupado }} disabled={ocupado || deshabilitado} onPress={onPress}
    style={({ pressed }) => [ui.boton, { backgroundColor: secundario ? colores.tarjeta : peligro ? '#A23730' : '#245E47', borderColor: secundario ? colores.borde : 'transparent', opacity: pressed || ocupado || deshabilitado ? 0.6 : 1 }]}>
    {ocupado ? <ActivityIndicator color={color}/> : icono && <Ionicons name={icono} size={20} color={color}/>}<Text style={[ui.botonTexto, { color }]}>{texto}</Text>
  </Pressable>;
}
export function Chip({ texto, elegido, onPress }: { texto: string; elegido: boolean; onPress: () => void }) {
  const { colores } = useTemaApp();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: elegido }} onPress={onPress} style={({ pressed }) => [ui.chip, { backgroundColor: elegido ? '#245E47' : colores.tarjeta, borderColor: elegido ? '#245E47' : colores.borde, opacity: pressed ? .65 : 1 }]}><Text style={{ color: elegido ? '#FFFFFF' : colores.texto, fontWeight: elegido ? '700' : '500', fontSize: 13 }}>{texto}</Text></Pressable>;
}
export function Aviso({ texto, error = false }: { texto: string; error?: boolean }) {
  const { colores } = useTemaApp();
  return <View style={[ui.aviso, { backgroundColor: colores.suave, borderColor: colores.borde }]}><Ionicons name={error ? 'alert-circle-outline' : 'information-circle-outline'} size={21} color={error ? colores.peligro : colores.verde}/><Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={{ color: error ? colores.peligro : colores.texto, flex: 1, fontSize: 13, lineHeight: 20 }}>{texto}</Text></View>;
}
export function EstadoVacio({ titulo, detalle, accion, icono = 'basket-outline' }: { titulo: string; detalle: string; accion?: ReactNode; icono?: Icono }) {
  const { colores } = useTemaApp();
  return <View style={[ui.vacio, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}><Ionicons name={icono} size={40} color={colores.verde}/><Text accessibilityRole="header" style={[ui.vacioTitulo, { color: colores.texto }]}>{titulo}</Text><Text style={[ui.vacioDetalle, { color: colores.secundario }]}>{detalle}</Text>{accion}</View>;
}
export function EstadoInventario({ children }: { children: ReactNode }) {
  const { cargando, error, desdeCache, productos, reintentar } = useInventarioApp();
  const { colores } = useTemaApp();
  if (error) return <EstadoVacio titulo="No pudimos cargar tus productos" detalle={error} icono="cloud-offline-outline" accion={<BotonApp texto="Reintentar" onPress={reintentar}/>}/>;
  if (cargando || (desdeCache && !productos.length)) return <View style={ui.vacio}><ActivityIndicator size="large" color={colores.verde}/><Text accessibilityLiveRegion="polite" style={[ui.vacioTitulo, { color: colores.texto }]}>Conectando con tu despensa…</Text><Text style={[ui.vacioDetalle, { color: colores.secundario }]}>Esperamos los datos para mostrarte tus productos. Revisa tu conexión si la carga no termina.</Text><BotonApp texto="Volver a intentar" onPress={reintentar} secundario/></View>;
  return <>{desdeCache && <Aviso texto="Esperando confirmación del servidor. Los datos pueden estar desactualizados; revisa tu conexión."/>}{children}</>;
}
export function TarjetaProducto({ producto, accion }: { producto: ProductoInventario; accion?: ReactNode }) {
  const { colores, esOscuro } = useTemaApp();
  const estado = obtenerEstadoVencimiento(producto.vencimiento);
  const tono = estado.estado === 'vencido' ? (esOscuro ? '#FFB4AC' : '#A23730') : ['urgente', 'pronto'].includes(estado.estado) ? (esOscuro ? '#FFD393' : '#865100') : colores.verde;
  return <View style={[ui.producto, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}>
    <View style={ui.fila}><View style={[ui.productoIcono, { backgroundColor: colores.suave }]}><Ionicons name={producto.codigoBarras.startsWith('sin:') ? 'leaf-outline' : 'cube-outline'} size={22} color={colores.verde}/></View><View style={{ flex: 1, gap: 4 }}><Text style={[ui.nombreProducto, { color: colores.texto }]}>{producto.nombre}</Text><Text style={{ color: colores.secundario, fontSize: 13 }}>{producto.marca}{producto.formato ? ` · ${producto.formato}` : ''}</Text></View>{accion}</View>
    <View style={[ui.fila, { flexWrap: 'wrap', marginTop: 13 }]}><Text style={{ color: colores.texto, fontWeight: '700', fontSize: 13 }}>{etiquetaCantidad(producto)}</Text><Text style={{ color: colores.secundario, fontSize: 13 }}>· {producto.ubicacion || 'Sin ubicación'}</Text></View>
    <View style={[ui.fila, { marginTop: 12, flexWrap: 'wrap' }]}><Ionicons name="time-outline" size={16} color={tono}/><Text style={{ color: tono, fontSize: 13, fontWeight: '700' }}>{estado.etiqueta}</Text>{estado.estado !== 'sin-fecha' && <Text style={{ color: colores.secundario, fontSize: 12 }}>{producto.vencimiento}</Text>}</View>
  </View>;
}
export function Confirmacion({ visible, titulo, detalle, ocupado, error, confirmar, cerrar, textoConfirmar = 'Eliminar' }: { visible: boolean; titulo: string; detalle: string; ocupado: boolean; error: string; confirmar: () => void; cerrar: () => void; textoConfirmar?: string }) {
  const { colores } = useTemaApp();
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={() => { if (!ocupado) cerrar(); }}><SafeAreaView style={ui.overlay}><ScrollView contentContainerStyle={ui.modalScroll}>
    <View accessibilityViewIsModal style={[ui.dialogo, { backgroundColor: colores.tarjeta }]}><Text accessibilityRole="header" style={[ui.vacioTitulo, { color: colores.texto }]}>{titulo}</Text><Text style={[ui.detalle, { color: colores.secundario }]}>{detalle}</Text>{!!error && <Aviso texto={error} error/>}<BotonApp texto={textoConfirmar} onPress={confirmar} ocupado={ocupado} peligro/><BotonApp texto="Cancelar" onPress={cerrar} secundario deshabilitado={ocupado}/></View>
  </ScrollView></SafeAreaView></Modal>;
}
export const ui = StyleSheet.create({
  contenido: { padding: 20, paddingBottom: 30, gap: 18 }, cabecera: { paddingBottom: 4, gap: 7 }, eyebrow: { fontSize: 11, letterSpacing: 2, fontWeight: '700' }, titulo: { fontSize: 29, fontWeight: '800', flex: 1 }, detalle: { fontSize: 14, lineHeight: 21 }, fila: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  boton: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, botonTexto: { fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'center' }, chip: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderWidth: 1, borderRadius: 12 }, vacio: { padding: 24, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: 'transparent', borderRadius: 18 }, vacioTitulo: { fontSize: 20, fontWeight: '700', textAlign: 'center' }, vacioDetalle: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  producto: { padding: 17, borderRadius: 17, borderWidth: 1, marginBottom: 12 }, productoIcono: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, nombreProducto: { fontSize: 16, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: '#0009' }, modalScroll: { flexGrow: 1, justifyContent: 'center', padding: 24 }, dialogo: { padding: 24, gap: 18, borderRadius: 20, width: '100%', maxWidth: 500, alignSelf: 'center' },
});
