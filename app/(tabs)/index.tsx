import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';

const ASYNC_STORAGE_KEY = '@inventario_abuelitas_v4';

export default function PantallaInicio() {
  const [productosProximos, setProductosProximos] = useState<any[]>([]);
  const [totalProductos, setTotalProductos] = useState(0);
  
  // 1. ESCUCHAMOS EL TEMA GLOBAL
  const temaSistema = useColorScheme();
  const isDark = temaSistema === 'dark';

  // 2. DEFINIMOS LA PALETA DINÁMICA
  const colorFondo = isDark ? '#000000' : '#F8F9FA';
  const colorTarjeta = isDark ? '#1C1C1E' : '#FFFFFF';
  const colorTexto = isDark ? '#FFFFFF' : '#333333';
  const colorSubtexto = isDark ? '#8E8E93' : '#666666';

  const calcularDiasRestantes = (fechaStr: string) => {
    if (!fechaStr || fechaStr === 'No visible' || fechaStr === 'Sin fecha') return null;
    const partes = fechaStr.split('/');
    let fechaVencimiento;
    if (partes.length === 3) {
      fechaVencimiento = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    } else if (partes.length === 2) {
      fechaVencimiento = new Date(parseInt(partes[1]), parseInt(partes[0]) - 1, 1);
    } else { return null; }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaVencimiento.setHours(0, 0, 0, 0);
    return Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  useFocusEffect(
    useCallback(() => {
      const cargarResumen = async () => {
        try {
          const datos = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
          if (datos) {
            const inventario = JSON.parse(datos);
            setTotalProductos(inventario.length);
            const urgentes = inventario.filter((prod: any) => {
              const dias = calcularDiasRestantes(prod.vencimiento);
              return dias !== null && dias <= 5;
            });
            urgentes.sort((a: any, b: any) => calcularDiasRestantes(a.vencimiento)! - calcularDiasRestantes(b.vencimiento)!);
            setProductosProximos(urgentes);
          }
        } catch (e) { console.error(e); }
      };
      cargarResumen();
    }, [])
  );

  return (
    <View style={[styles.fondo, { backgroundColor: colorFondo }]}>
      <View style={styles.cabecera}>
        <Text style={styles.saludo}>Hola 👋</Text>
        <Text style={styles.titulo}>Resumen de tu Despensa</Text>
      </View>

      <ScrollView style={styles.contenido}>
        <View style={styles.tarjetaStats}>
          <View>
            <Text style={styles.statsNumero}>{totalProductos}</Text>
            <Text style={styles.statsTexto}>Productos guardados</Text>
          </View>
          <Ionicons name="cube" size={40} color="#E8F5E9" />
        </View>

        <View style={styles.seccionAlertas}>
          <Text style={[styles.tituloSeccion, { color: colorTexto }]}>⚠️ Atención: Vencen Pronto</Text>
          <Text style={[styles.subtituloSeccion, { color: colorSubtexto }]}>(5 días o menos)</Text>

          {productosProximos.length > 0 ? (
            productosProximos.map((prod, index) => {
              const dias = calcularDiasRestantes(prod.vencimiento)!;
              const esVencido = dias < 0;
              const esHoy = dias === 0;

              return (
                <View key={index} style={[styles.tarjetaAlerta, { backgroundColor: colorTarjeta }, esVencido ? styles.bordeRojo : styles.bordeNaranja]}>
                  <View style={styles.alertaInfo}>
                    <Text style={[styles.alertaNombre, { color: colorTexto }]}>{prod.nombre}</Text>
                    <Text style={[styles.alertaFecha, { color: colorSubtexto }]}>Vence: {prod.vencimiento}</Text>
                  </View>
                  <View style={[styles.badgeDias, esVencido ? styles.bgRojo : styles.bgNaranja]}>
                    <Text style={styles.textoBadge}>
                      {esVencido ? 'VENCIDO' : esHoy ? 'HOY' : `En ${dias} d`}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[styles.cajaTranquilidad, { backgroundColor: colorTarjeta }]}>
              <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
              <Text style={styles.textoTranquilidad}>¡Todo perfecto!</Text>
              <Text style={[styles.subtextoTranquilidad, { color: colorSubtexto }]}>No hay productos por vencer pronto.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  cabecera: { padding: 20, paddingTop: 60, backgroundColor: '#2E7D32', borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  saludo: { fontSize: 18, color: '#E8F5E9', marginBottom: 5 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  contenido: { flex: 1, padding: 20 },
  tarjetaStats: { backgroundColor: '#43A047', borderRadius: 15, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, elevation: 4 },
  statsNumero: { fontSize: 36, fontWeight: 'bold', color: '#FFF' },
  statsTexto: { fontSize: 16, color: '#E8F5E9' },
  seccionAlertas: { flex: 1 },
  tituloSeccion: { fontSize: 20, fontWeight: 'bold' },
  subtituloSeccion: { fontSize: 14, marginBottom: 15 },
  tarjetaAlerta: { padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 5, elevation: 2 },
  bordeNaranja: { borderLeftColor: '#FF9800' },
  bordeRojo: { borderLeftColor: '#F44336' },
  alertaInfo: { flex: 1 },
  alertaNombre: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  alertaFecha: { fontSize: 14 },
  badgeDias: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  bgNaranja: { backgroundColor: '#FFF3E0' },
  bgRojo: { backgroundColor: '#FFEBEE' },
  textoBadge: { fontWeight: 'bold', fontSize: 12, color: '#D84315' },
  cajaTranquilidad: { alignItems: 'center', padding: 30, borderRadius: 15, marginTop: 10 },
  textoTranquilidad: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginTop: 10 },
  subtextoTranquilidad: { fontSize: 15, marginTop: 5 }
});