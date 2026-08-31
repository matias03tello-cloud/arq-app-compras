import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

const ASYNC_STORAGE_KEY = '@inventario_abuelitas_v4';

export default function PantallaDespensa() {
  const [inventario, setInventario] = useState<any[]>([]);
  
  // 1. ESCUCHAMOS EL TEMA GLOBAL
  const temaSistema = useColorScheme();
  const isDark = temaSistema === 'dark';

  // 2. PALETA DE COLORES DINÁMICA
  const colorFondo = isDark ? '#000000' : '#F2F2F7';
  const colorTarjeta = isDark ? '#1C1C1E' : '#FFFFFF';
  const colorTexto = isDark ? '#FFFFFF' : '#000000';
  const colorSubtexto = isDark ? '#8E8E93' : '#8E8E93';
  const colorBorde = isDark ? '#38383A' : '#E5E5EA';

  useFocusEffect(
    useCallback(() => {
      const cargarDatos = async () => {
        try {
          const datos = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
          if (datos) setInventario(JSON.parse(datos));
        } catch (e) { console.error(e); }
      };
      cargarDatos();
    }, [])
  );

  const eliminarProducto = (id: string, nombre: string) => {
    Alert.alert("Eliminar", `¿Ya consumiste o deseas borrar "${nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Eliminar", 
        style: "destructive",
        onPress: async () => {
          const nuevaLista = inventario.filter(item => item.id !== id);
          setInventario(nuevaLista);
          await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(nuevaLista));
        }
      }
    ]);
  };

  return (
    <View style={[styles.fondo, { backgroundColor: colorFondo }]}>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: colorTexto }]}>Mi Despensa</Text>
        <Text style={{ color: colorSubtexto }}>{inventario.length} productos registrados</Text>
      </View>

      <FlatList
        data={inventario}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <View style={styles.vacioContainer}>
            <Ionicons name="basket-outline" size={60} color={colorSubtexto} />
            <Text style={[styles.textoVacio, { color: colorSubtexto }]}>Tu despensa está vacía.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.tarjeta, { backgroundColor: colorTarjeta, borderColor: colorBorde }]}>
            <View style={styles.infoPrincipal}>
              <Text style={[styles.nombre, { color: colorTexto }]}>{item.nombre}</Text>
              <Text style={[styles.marca, { color: colorSubtexto }]}>{item.marca} • {item.categoria}</Text>
              <View style={styles.etiquetaFecha}>
                <Ionicons name="calendar-outline" size={14} color="#E65100" />
                <Text style={styles.textoFecha}> Vence: {item.vencimiento}</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.botonBorrar} onPress={() => eliminarProducto(item.id, item.nombre)}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  cabecera: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  titulo: { fontSize: 34, fontWeight: 'bold', marginBottom: 5 },
  lista: { paddingHorizontal: 15, paddingBottom: 100 },
  tarjeta: { flexDirection: 'row', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, alignItems: 'center' },
  infoPrincipal: { flex: 1 },
  nombre: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  marca: { fontSize: 14, marginBottom: 8 },
  etiquetaFecha: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  textoFecha: { fontSize: 13, color: '#E65100', fontWeight: 'bold' },
  botonBorrar: { padding: 10 },
  vacioContainer: { alignItems: 'center', marginTop: 100 },
  textoVacio: { fontSize: 16, marginTop: 15 }
});