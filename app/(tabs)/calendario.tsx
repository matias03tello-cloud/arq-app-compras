import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { fechaTextoADate } from '../../services/fechas';
import { claveFecha, crearMes, productosDelMes } from '../../services/vistaInventario';
import { useInventarioApp } from '../../components/mobile/InventarioApp';
import { useTemaApp } from '../../components/mobile/TemaApp';
import { Aviso, BotonApp, Encabezado, EstadoInventario, EstadoVacio, Pantalla, TarjetaProducto, ui } from '../../components/mobile/UI';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export default function PantallaCalendario() {
  const { productos, cargando, error, desdeCache } = useInventarioApp();
  const { colores } = useTemaApp();
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [elegido, setElegido] = useState<string | null>(null);
  const dias = crearMes(mes.getFullYear(), mes.getMonth());
  const delMes = productosDelMes(productos, mes);
  const visibles = elegido ? delMes.filter(p => claveFecha(fechaTextoADate(p.vencimiento)!) === elegido) : delMes;
  const conteos = new Map<string, number>();
  for (const p of delMes) { const k = claveFecha(fechaTextoADate(p.vencimiento)!); conteos.set(k, (conteos.get(k) || 0) + 1); }
  const sinFecha = productos.filter(p => !fechaTextoADate(p.vencimiento)).length;
  const mover = (delta: number) => { setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1)); setElegido(null); };
  const listo = !cargando && !error && (!desdeCache || !!productos.length);
  return <Pantalla><FlatList data={listo ? visibles : []} keyExtractor={p => p.id} contentContainerStyle={ui.contenido}
    ListHeaderComponent={<View style={{ gap: 18 }}><Encabezado titulo="Calendario" detalle="Toca un día para ver sus vencimientos."/>
      <EstadoInventario><View style={[styles.calendario, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}>
        <View style={[ui.fila, { justifyContent: 'space-between' }]}><Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => mover(-1)} style={styles.flecha}><Ionicons name="chevron-back" size={22} color={colores.verde}/></Pressable><Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[styles.mes, { color: colores.texto }]}>{MESES[mes.getMonth()]} {mes.getFullYear()}</Text><Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => mover(1)} style={styles.flecha}><Ionicons name="chevron-forward" size={22} color={colores.verde}/></Pressable></View>
        <View style={styles.grid}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => <View key={i} style={styles.celda}><Text style={{ color: colores.secundario, fontSize: 12, textAlign: 'center' }}>{d}</Text></View>)}
          {Array.from({ length: (mes.getDay() + 6) % 7 }, (_, i) => <View key={`espacio-${i}`} style={styles.celda}/>)}
          {dias.map(d => { const n = conteos.get(d.clave) || 0; const activo = elegido === d.clave; return <View key={d.clave} style={styles.celda}><Pressable accessibilityRole="button" accessibilityState={{ selected: activo }} accessibilityLabel={`${d.dia} de ${MESES[mes.getMonth()]} de ${mes.getFullYear()}, ${n} productos`} onPress={() => setElegido(activo ? null : d.clave)} style={[styles.dia, { backgroundColor: activo ? '#245E47' : n ? colores.suave : colores.tarjeta, borderColor: d.clave === claveFecha(new Date()) ? colores.verde : 'transparent' }]}><Text style={{ color: activo ? '#FFFFFF' : colores.texto, fontSize: 14, fontWeight: n || activo ? '700' : '400' }}>{d.dia}</Text>{n > 0 && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: activo ? '#FFFFFF' : colores.verde }}/>}</Pressable></View>; })}
        </View><Text style={{ color: colores.secundario, fontSize: 12, lineHeight: 18 }}>El punto indica que hay productos. Las fechas mes/año se muestran el último día del mes.</Text>
        <View style={{ gap: 9 }}><BotonApp texto="Ir al mes actual" secundario onPress={() => { const hoy = new Date(); setMes(new Date(hoy.getFullYear(), hoy.getMonth(), 1)); setElegido(null); }}/>{elegido && <BotonApp texto="Ver todo el mes" secundario onPress={() => setElegido(null)}/>}</View>
      </View></EstadoInventario>
      {listo && <><Text accessibilityRole="header" style={{ color: colores.texto, fontSize: 19, fontWeight: '700' }}>{elegido ? `Vencen el ${Number(elegido.slice(-2))} de ${MESES[mes.getMonth()].toLowerCase()}` : 'Vencimientos del mes'}</Text><Text accessibilityLiveRegion="polite" style={{ color: colores.secundario, fontSize: 13 }}>{visibles.length} {visibles.length === 1 ? 'registro' : 'registros'}</Text>{sinFecha > 0 && <Aviso texto={`${sinFecha} ${sinFecha === 1 ? 'registro sin fecha no aparece' : 'registros sin fecha no aparecen'} en el calendario.`}/>}</>}
    </View>}
    ListEmptyComponent={listo ? <EstadoVacio titulo="Sin vencimientos en esta selección" detalle="Elige otro día o cambia de mes. Los productos sin fecha están en la despensa." icono="calendar-outline"/> : null}
    renderItem={({ item }) => <TarjetaProducto producto={item}/>}
  /></Pantalla>;
}
const styles = StyleSheet.create({ calendario: { borderRadius: 18, borderWidth: 1, padding: 12, gap: 15 }, mes: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' }, flecha: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, celda: { width: '14.285714%', padding: 1 }, dia: { minHeight: 48, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 9, borderWidth: 1 } });
