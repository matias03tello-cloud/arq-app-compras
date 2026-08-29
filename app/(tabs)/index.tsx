import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

// 1. Le enseñamos a TypeScript cómo es un "Producto"
interface Producto {
  id: string;
  nombre: string;
  marca: string;
  vencimiento: string;
  categoria: string;
  fechaRegistro: string;
}

const ASYNC_STORAGE_KEY = '@inventario_abuelitas_v4';

export default function InicioScreen() {
  // 2. Le decimos que el inventario será una lista de Productos (esto quita el error "never")
  const [inventario, setInventario] = useState<Producto[]>([]);

  useFocusEffect(
    useCallback(() => {
      cargarInventarioLocal();
    }, [])
  );

  const cargarInventarioLocal = async () => {
    try {
      const datos = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (datos) setInventario(JSON.parse(datos));
    } catch (e) {
      console.error("Error al cargar memoria", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Mi Despensa</Text>
      </View>
      
      <View style={styles.inventarioContainer}>
        <Text style={styles.subtituloLista}>Productos Guardados ({inventario.length}):</Text>
        
        {inventario.length === 0 ? (
          <Text style={styles.textoVacio}>Aún no hay productos. Toca la cámara para escanear.</Text>
        ) : (
          <FlatList
            data={inventario}
            keyExtractor={(item) => item.id}
            style={styles.lista}
            renderItem={({ item }) => (
              <View style={styles.itemTarjeta}>
                <View style={styles.itemFila}>
                  <Text style={styles.itemNombre}>{item.nombre}</Text>
                  <Text style={styles.itemFechaReg}>{item.fechaRegistro}</Text>
                </View>
                <Text style={styles.itemDetalle}>Marca: {item.marca} | Tipo: {item.categoria}</Text>
                <Text style={styles.itemVencimiento}>Vence: {item.vencimiento}</Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { backgroundColor: '#1b5e20', paddingVertical: 15, alignItems: 'center' },
  tituloHeader: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  inventarioContainer: { flex: 1, padding: 15 },
  subtituloLista: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  textoVacio: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 50 },
  lista: { flex: 1 },
  itemTarjeta: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  itemFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNombre: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  itemFechaReg: { fontSize: 12, color: '#888' },
  itemDetalle: { fontSize: 14, color: '#555', marginTop: 4 },
  itemVencimiento: { fontSize: 15, color: '#c62828', fontWeight: 'bold', marginTop: 2 },
});