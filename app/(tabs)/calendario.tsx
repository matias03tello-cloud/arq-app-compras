/** Cronograma de vencimientos. Pendiente: virtualizar esta vista y paginar su carga. */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import {
  obtenerEstadoVencimiento,
  obtenerInventario,
  ordenarPorVencimiento,
} from '../../services/inventarioFirestore';
import { ProductoInventario } from '../../services/productos';

const COLOR_PUNTO = {
  vencido: '#212121',
  urgente: '#F44336',
  pronto: '#FF9800',
  atencion: '#FBC02D',
  bien: '#4CAF50',
  'sin-fecha': '#90A4AE',
};

export default function PantallaCalendario() {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [errorCarga, setErrorCarga] = useState(false);
  const isDark = useColorScheme() === 'dark';
  const colorFondo = isDark ? '#000' : '#F2F2F7';
  const colorTarjeta = isDark ? '#1C1C1E' : '#FFF';
  const colorTexto = isDark ? '#FFF' : '#000';
  const colorSubtexto = '#8E8E93';
  const colorLinea = isDark ? '#38383A' : '#D1D1D6';

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        setErrorCarga(false);
        try {
          setProductos(ordenarPorVencimiento(await obtenerInventario()));
        } catch {
          setProductos([]); setErrorCarga(true);
        }
      };
      cargar();
    }, [])
  );

  return (
    <View style={[styles.fondo, { backgroundColor: colorFondo }]}>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: colorTexto }]}>Cronograma</Text>
        <Text style={{ color: colorSubtexto }}>Vencimientos ordenados por prioridad</Text>
      </View>

      {errorCarga && <Text style={{ color: '#B3261E', padding: 16 }}>No se pudo cargar tu despensa. Revisa la conexión y vuelve a abrir esta pestaña.</Text>}
      <ScrollView contentContainerStyle={styles.scroll}>
        {productos.length === 0 ? (
          <View style={styles.vacioContainer}>
            <Ionicons name="calendar-outline" size={54} color={colorSubtexto} />
            <Text style={[styles.textoVacio, { color: colorSubtexto }]}>No hay fechas registradas.</Text>
          </View>
        ) : productos.map((item, index) => {
          const estado = obtenerEstadoVencimiento(item.vencimiento);
          const color = COLOR_PUNTO[estado.estado];

          return (
            <View key={item.id} style={styles.itemTimeline}>
              <View style={styles.columnaLinea}>
                <View style={[styles.punto, { backgroundColor: color }]} />
                {index !== productos.length - 1 && <View style={[styles.lineaVertical, { backgroundColor: colorLinea }]} />}
              </View>

              <View style={[styles.tarjeta, { backgroundColor: colorTarjeta, borderLeftColor: color }]}>
                <View style={styles.filaSuperior}>
                  <Text style={[styles.fecha, { color: colorTexto }]}>{item.vencimiento}</Text>
                  <Text style={[styles.estado, { color }]}>{estado.etiqueta}</Text>
                </View>
                <Text style={[styles.nombre, { color: colorTexto }]}>{item.nombre}</Text>
                <Text style={[styles.detalle, { color: colorSubtexto }]}>{item.marca} • x{item.cantidad || 1} • {item.categoria}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  cabecera: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  titulo: { fontSize: 34, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 110 },
  itemTimeline: { flexDirection: 'row', minHeight: 100 },
  columnaLinea: { width: 28, alignItems: 'center' },
  punto: { width: 16, height: 16, borderRadius: 8, marginTop: 23, zIndex: 10 },
  lineaVertical: { width: 2, flex: 1, marginTop: -2, marginBottom: -22 },
  tarjeta: { flex: 1, padding: 15, borderRadius: 12, marginLeft: 12, marginBottom: 15, justifyContent: 'center', borderLeftWidth: 4 },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  fecha: { fontSize: 17, fontWeight: 'bold' },
  estado: { fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
  nombre: { fontSize: 16, fontWeight: '700', marginTop: 7 },
  detalle: { fontSize: 13, marginTop: 3 },
  vacioContainer: { alignItems: 'center', marginTop: 70 },
  textoVacio: { textAlign: 'center', marginTop: 12, fontSize: 16 },
});
