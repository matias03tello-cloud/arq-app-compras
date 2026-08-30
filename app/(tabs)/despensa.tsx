import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ASYNC_STORAGE_KEY = '@inventario_abuelitas_v4';

export default function PantallaDespensa() {
  const [productos, setProductos] = useState<any[]>([]);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [productoActivo, setProductoActivo] = useState<any>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');

  // Magia de React: Cada vez que entras a esta pestaña, recarga los datos de la memoria
  useFocusEffect(
    useCallback(() => {
      const cargarInventario = async () => {
        try {
          const datos = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
          if (datos) setProductos(JSON.parse(datos));
        } catch (e) {
          console.error("Error cargando despensa", e);
        }
      };
      cargarInventario();
    }, [])
  );

  const productosFiltrados = productos.filter((prod) =>
    prod.nombre.toLowerCase().includes(textoBusqueda.toLowerCase()) || 
    prod.marca.toLowerCase().includes(textoBusqueda.toLowerCase())
  );

  const abrirOpciones = (producto: any) => {
    setProductoActivo(producto);
    setNuevaFecha(producto.vencimiento);
    setModalVisible(true);
  };

  const guardarNuevaFecha = async () => {
    try {
      const nuevaLista = productos.map(p => 
        p.id === productoActivo.id ? { ...p, vencimiento: nuevaFecha } : p
      );
      setProductos(nuevaLista);
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(nuevaLista)); // Guarda el cambio para todos
      setModalVisible(false);
    } catch (e) {
      console.error("Error al guardar nueva fecha", e);
    }
  };

  return (
    <View style={styles.fondo}>
      <View style={styles.cabecera}>
        <Text style={styles.tituloCabecera}>Mi Despensa</Text>
        <View style={styles.contenedorBuscador}>
          <Text style={styles.iconoLupa}>🔍</Text>
          <TextInput
            style={styles.buscadorInput}
            placeholder="Buscar por nombre o marca..."
            placeholderTextColor="#888"
            value={textoBusqueda}
            onChangeText={setTextoBusqueda}
          />
        </View>
      </View>

      <ScrollView style={styles.lista}>
        {productosFiltrados.map((producto) => (
          <TouchableOpacity 
            key={producto.id} style={styles.filaProducto} activeOpacity={0.6}
            onPress={() => abrirOpciones(producto)}
          >
            <View style={styles.infoPrincipal}>
              <Text style={styles.nombreProducto}>{producto.nombre}</Text>
              <Text style={styles.marcaProducto}>{producto.marca}</Text>
              <Text style={styles.ayudaToque}>Vence: {producto.vencimiento} ✏️</Text>
            </View>
            <View style={[styles.etiquetaEstado, producto.vencimiento === 'No visible' ? styles.fondoRojo : styles.fondoVerde]}>
              <Text style={styles.textoEstado}>{producto.vencimiento === 'No visible' ? 'Sin fecha' : 'OK'}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} /> 
      </ScrollView>

      {/* MODAL DE EDICIÓN */}
      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Editar {productoActivo?.nombre}</Text>
            <Text style={styles.modalInstruccion}>Ingresa la nueva fecha (DD/MM/AAAA):</Text>
            
            <TextInput
              style={styles.inputFecha}
              value={nuevaFecha}
              onChangeText={setNuevaFecha}
              placeholder="DD/MM/AAAA"
              keyboardType="numbers-and-punctuation"
            />
            
            <TouchableOpacity style={styles.botonModalPrimario} onPress={guardarNuevaFecha}>
              <Text style={styles.textoBotonBlanco}>💾 Guardar Fecha</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botonModalSecundario} onPress={() => setModalVisible(false)}>
              <Text style={styles.textoBotonGris}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#FFFFFF' },
  cabecera: { padding: 20, paddingTop: 50, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  tituloCabecera: { fontSize: 34, fontWeight: 'bold', color: '#000', marginBottom: 15 },
  contenedorBuscador: { flexDirection: 'row', backgroundColor: '#F0F0F5', borderRadius: 12, paddingHorizontal: 15, alignItems: 'center', height: 50 },
  iconoLupa: { fontSize: 20, marginRight: 10 },
  buscadorInput: { flex: 1, fontSize: 18, color: '#000' },
  lista: { flex: 1 },
  filaProducto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoPrincipal: { flex: 1 },
  nombreProducto: { fontSize: 22, fontWeight: '600', color: '#000' },
  marcaProducto: { fontSize: 14, color: '#666', marginBottom: 4 },
  ayudaToque: { fontSize: 16, color: '#2E7D32', fontWeight: 'bold' },
  etiquetaEstado: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  fondoVerde: { backgroundColor: '#E8F5E9' },
  fondoRojo: { backgroundColor: '#FFEBEE' },
  textoEstado: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  modalFondo: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCaja: { backgroundColor: 'white', margin: 20, padding: 25, borderRadius: 20 },
  modalTitulo: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  modalInstruccion: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  inputFecha: { backgroundColor: '#F0F0F5', padding: 15, borderRadius: 10, fontSize: 20, textAlign: 'center', marginBottom: 20 },
  botonModalPrimario: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  textoBotonBlanco: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  botonModalSecundario: { backgroundColor: '#F2F2F7', padding: 18, borderRadius: 12, alignItems: 'center' },
  textoBotonGris: { color: '#333', fontSize: 18, fontWeight: 'bold' }
});