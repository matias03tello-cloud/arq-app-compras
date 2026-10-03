/** Lista virtualizada del inventario y acciones de borrado confirmadas por el usuario. */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, TextInput, useColorScheme, View } from 'react-native';
import {
  eliminarProductoInventario,
  obtenerEstadoVencimiento,
  obtenerInventario,
  ordenarPorVencimiento,
} from '../../services/inventarioFirestore';
import { ProductoInventario } from '../../services/productos';

import { etiquetaCantidad, resumenCantidades, normalizarBusqueda, UBICACIONES } from '../../security/identidadProducto';

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
  const [busqueda, setBusqueda] = useState('');
  const [ubicacion, setUbicacion] = useState('Todos');
  const filtrado = inventario.filter(p => normalizarBusqueda(p.nombre + ' ' + p.marca).includes(normalizarBusqueda(busqueda)) && (ubicacion === 'Todos' || (p.ubicacion ?? 'Sin ubicación') === ubicacion));
  const isDark = useColorScheme() === 'dark';
  const colorFondo = isDark ? '#000' : '#F2F2F7';
  const colorTarjeta = isDark ? '#1C1C1E' : '#FFF';
  const colorTexto = isDark ? '#FFF' : '#000';
  const colorSubtexto = '#8E8E93';
  const colorBorde = isDark ? '#38383A' : '#E5E5EA';

  const cargar = useCallback(async () => {
    try {
      const lista = await obtenerInventario();
      setInventario(ordenarPorVencimiento(lista));
    } catch {
      
      Alert.alert('Error', 'No se pudo cargar la despensa desde Firestore.');
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const totalUnidades = useMemo(
    () => resumenCantidades(inventario),
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
          } catch {
            
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
        <Text style={{ color: colorSubtexto }}>{inventario.length} productos • {totalUnidades}</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <TextInput accessibilityLabel="Buscar en mi despensa" placeholder="Buscar alimento o marca" placeholderTextColor={colorSubtexto}
          value={busqueda} onChangeText={setBusqueda} style={{ color: colorTexto, borderColor: colorBorde, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {['Todos', ...UBICACIONES, 'Sin ubicación'].map(u => <TouchableOpacity key={u} accessibilityRole="button" accessibilityState={{ selected: ubicacion === u }} onPress={() => setUbicacion(u)}
            style={{ backgroundColor: ubicacion === u ? '#236640' : colorTarjeta, padding: 12, borderRadius: 22, minHeight: 44 }}>
            <Text style={{ color: ubicacion === u ? '#FFF' : colorTexto }}>{u}</Text></TouchableOpacity>)}
        </View>
      </View>
      <FlatList
        data={filtrado}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <View style={styles.vacioContainer}>
            <Ionicons name="basket-outline" size={60} color={colorSubtexto} />
            <Text style={[styles.textoVacio, { color: colorSubtexto }]}>{inventario.length ? 'No hay coincidencias.' : 'Tu despensa está vacía.'}</Text>
            <Text style={[styles.textoVacioSecundario, { color: colorSubtexto }]}>{inventario.length ? 'Prueba otro nombre o filtro.' : 'Agrega un alimento para comenzar.'}</Text>
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
                    <Text style={[styles.textoCantidad, { color: colorTexto }]}>{etiquetaCantidad(item)}</Text>
                  </View>
                </View>

                <Text style={[styles.marca, { color: colorSubtexto }]}>{item.marca} • {item.categoria} • {item.ubicacion ?? 'Sin ubicación'}</Text>
                {!!item.formato && <Text style={[styles.formato, { color: colorSubtexto }]}>{item.formato}</Text>}

                <View style={[styles.etiquetaFecha, { backgroundColor: colores.fondo }]}>
                  <Ionicons name="time-outline" size={14} color={colores.texto} />
                  <Text style={[styles.textoFecha, { color: colores.texto }]}> {estado.etiqueta} • {item.vencimiento}</Text>
                </View>

                {estado.estado === 'urgente' && (
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

