import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import {
  eliminarProductoInventario,
  migrarInventarioLocalAFirestore,
  obtenerEstadoVencimiento,
  obtenerInventario,
  ordenarPorVencimiento,
} from '../../services/inventarioFirestore';
import { ProductoInventario } from '../../services/productos';

const COLORES_ESTADO = {
  vencido: { fondo: '#FFEBEE', texto: '#C62828', borde: '#E53935' },
  urgente: { fondo: '#FFEBEE', texto: '#C62828', borde: '#E53935' },
  pronto: { fondo: '#FFF3E0', texto: '#E65100', borde: '#FB8C00' },
  atencion: { fondo: '#FFFDE7', texto: '#8D6E00', borde: '#FBC02D' },
  bien: { fondo: '#E8F5E9', texto: '#2E7D32', borde: '#43A047' },
  'sin-fecha': { fondo: '#ECEFF1', texto: '#546E7A', borde: '#90A4AE' },
};

export default function PantallaDespensa() {
  const [inventario, setInventario] = useState<ProductoInventario[]>([]);
  const isDark = useColorScheme() === 'dark';
  const colorFondo = isDark ? '#000' : '#F2F2F7';
  const colorTarjeta = isDark ? '#1C1C1E' : '#FFF';
  const colorTexto = isDark ? '#FFF' : '#000';
  const colorSubtexto = '#8E8E93';
  const colorBorde = isDark ? '#38383A' : '#E5E5EA';

  const cargar = useCallback(async () => {
    try {
      await migrarInventarioLocalAFirestore();
      const lista = await obtenerInventario();
      setInventario(ordenarPorVencimiento(lista));
    } catch (error) {
      console.error('Error cargando despensa:', error);
      Alert.alert('Error', 'No se pudo cargar la despensa desde Firestore.');
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const totalUnidades = useMemo(
    () => inventario.reduce((total, item) => total + (item.cantidad || 1), 0),
    [inventario]
  );

  const eliminarProducto = (id: string, nombre: string) => {
    Alert.alert('Eliminar producto', `¿Deseas eliminar "${nombre}" de tu despensa?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarProductoInventario(id);
            setInventario((actual) => actual.filter((item) => item.id !== id));
          } catch (error) {
            console.error('Error eliminando producto:', error);
            Alert.alert('Error', 'No se pudo eliminar el producto de Firestore.');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.fondo, { backgroundColor: colorFondo }]}>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: colorTexto }]}>Mi Despensa</Text>
        <Text style={{ color: colorSubtexto }}>{inventario.length} productos • {totalUnidades} unidades</Text>
      </View>

      <FlatList
        data={inventario}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <View style={styles.vacioContainer}>
            <Ionicons name="basket-outline" size={60} color={colorSubtexto} />
            <Text style={[styles.textoVacio, { color: colorSubtexto }]}>Tu despensa está vacía.</Text>
            <Text style={[styles.textoVacioSecundario, { color: colorSubtexto }]}>Escanea un producto para comenzar.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const estado = obtenerEstadoVencimiento(item.vencimiento);
          const colores = COLORES_ESTADO[estado.estado];

          return (
            <View style={[styles.tarjeta, { backgroundColor: colorTarjeta, borderColor: colorBorde, borderLeftColor: colores.borde }]}>
              <View style={styles.infoPrincipal}>
                <View style={styles.filaTitulo}>
                  <Text style={[styles.nombre, { color: colorTexto }]} numberOfLines={1}>{item.nombre}</Text>
                  <View style={[styles.badgeCantidad, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                    <Text style={[styles.textoCantidad, { color: colorTexto }]}>x{item.cantidad || 1}</Text>
                  </View>
                </View>

                <Text style={[styles.marca, { color: colorSubtexto }]}>{item.marca} • {item.categoria}</Text>
                {!!item.formato && <Text style={[styles.formato, { color: colorSubtexto }]}>{item.formato}</Text>}

                <View style={[styles.etiquetaFecha, { backgroundColor: colores.fondo }]}>
                  <Ionicons name="time-outline" size={14} color={colores.texto} />
                  <Text style={[styles.textoFecha, { color: colores.texto }]}> {estado.etiqueta} • {item.vencimiento}</Text>
                </View>

                {(estado.estado === 'urgente' || estado.estado === 'vencido') && (
                  <Text style={styles.consumirPrimero}>⚡ Consumir primero</Text>
                )}
              </View>

              <TouchableOpacity style={styles.botonBorrar} onPress={() => eliminarProducto(item.id, item.nombre)}>
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  cabecera: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  titulo: { fontSize: 34, fontWeight: 'bold', marginBottom: 5 },
  lista: { paddingHorizontal: 15, paddingBottom: 110 },
  tarjeta: { flexDirection: 'row', padding: 15, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderLeftWidth: 5, alignItems: 'center' },
  infoPrincipal: { flex: 1 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombre: { flex: 1, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  marca: { fontSize: 14, marginBottom: 2 },
  formato: { fontSize: 12, marginBottom: 8 },
  badgeCantidad: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  textoCantidad: { fontSize: 13, fontWeight: 'bold' },
  etiquetaFecha: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, marginTop: 6 },
  textoFecha: { fontSize: 13, fontWeight: 'bold' },
  consumirPrimero: { color: '#C62828', fontSize: 13, fontWeight: '800', marginTop: 7 },
  botonBorrar: { padding: 10 },
  vacioContainer: { alignItems: 'center', marginTop: 100 },
  textoVacio: { fontSize: 17, marginTop: 15, fontWeight: '600' },
  textoVacioSecundario: { fontSize: 14, marginTop: 5 },
});
