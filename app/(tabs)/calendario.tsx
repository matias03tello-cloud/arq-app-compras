import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';

const ASYNC_STORAGE_KEY = '@inventario_abuelitas_v4';

export default function PantallaCalendario() {
  const [productosOrdenados, setProductosOrdenados] = useState<any[]>([]);
  
  // 1. TEMA GLOBAL
  const temaSistema = useColorScheme();
  const isDark = temaSistema === 'dark';

  // 2. COLORES DINÁMICOS
  const colorFondo = isDark ? '#000000' : '#F2F2F7';
  const colorTarjeta = isDark ? '#1C1C1E' : '#FFFFFF';
  const colorTexto = isDark ? '#FFFFFF' : '#000000';
  const colorSubtexto = isDark ? '#8E8E93' : '#8E8E93';
  const colorLinea = isDark ? '#38383A' : '#D1D1D6';

  const convertirAFecha = (fechaStr: string) => {
    if (!fechaStr || fechaStr === 'No visible' || fechaStr === 'Sin fecha') return new Date(2100, 0, 1);
    const partes = fechaStr.split('/');
    if (partes.length === 3) return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    if (partes.length === 2) return new Date(parseInt(partes[1]), parseInt(partes[0]) - 1, 1);
    return new Date(2100, 0, 1);
  };

  useFocusEffect(
    useCallback(() => {
      const cargarYOrdenar = async () => {
        try {
          const datos = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
          if (datos) {
            const inventario = JSON.parse(datos);
            // Ordenar cronológicamente
            inventario.sort((a: any, b: any) => convertirAFecha(a.vencimiento).getTime() - convertirAFecha(b.vencimiento).getTime());
            setProductosOrdenados(inventario);
          }
        } catch (e) { console.error(e); }
      };
      cargarYOrdenar();
    }, [])
  );

  return (
    <View style={[styles.fondo, { backgroundColor: colorFondo }]}>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: colorTexto }]}>Cronograma</Text>
        <Text style={{ color: colorSubtexto }}>Próximos vencimientos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {productosOrdenados.length === 0 ? (
          <Text style={[styles.textoVacio, { color: colorSubtexto }]}>No hay fechas registradas.</Text>
        ) : (
          productosOrdenados.map((item, index) => (
            <View key={item.id} style={styles.itemTimeline}>
              {/* Línea y Punto */}
              <View style={styles.columnaLinea}>
                <View style={[styles.punto, { backgroundColor: index === 0 ? '#FF3B30' : '#34C759' }]} />
                {index !== productosOrdenados.length - 1 && <View style={[styles.lineaVertical, { backgroundColor: colorLinea }]} />}
              </View>
              
              {/* Tarjeta de Información */}
              <View style={[styles.tarjeta, { backgroundColor: colorTarjeta }]}>
                <Text style={[styles.fecha, { color: colorTexto }]}>{item.vencimiento}</Text>
                <Text style={[styles.nombre, { color: colorSubtexto }]}>{item.nombre} ({item.marca})</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  cabecera: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  titulo: { fontSize: 34, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  itemTimeline: { flexDirection: 'row', minHeight: 80 },
  columnaLinea: { width: 30, alignItems: 'center' },
  punto: { width: 14, height: 14, borderRadius: 7, marginTop: 20, zIndex: 10 },
  lineaVertical: { width: 2, flex: 1, marginTop: -5, marginBottom: -20 },
  tarjeta: { flex: 1, padding: 15, borderRadius: 12, marginLeft: 15, marginBottom: 15, justifyContent: 'center' },
  fecha: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  nombre: { fontSize: 15 },
  textoVacio: { textAlign: 'center', marginTop: 50, fontSize: 16 }
});