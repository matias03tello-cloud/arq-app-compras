import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, Appearance, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

const THEME_KEY = '@preferencia_tema';
const ASYNC_STORAGE_KEY = '@inventario_abuelitas_v4';

export default function PantallaAjustes() {
  // Detecta el tema actual del celular
  const esquemaSistema = useColorScheme();
  const [temaSeleccionado, setTemaSeleccionado] = useState<'light' | 'dark' | 'system'>('system');
  const [notificaciones, setNotificaciones] = useState(true);

  // Calcula si visualmente estamos en modo oscuro
  const isDark = temaSeleccionado === 'system' ? esquemaSistema === 'dark' : temaSeleccionado === 'dark';

  // Cargar la preferencia del tema al entrar
  useEffect(() => {
    const cargarTema = async () => {
      try {
        const temaGuardado = await AsyncStorage.getItem(THEME_KEY);
        if (temaGuardado === 'light' || temaGuardado === 'dark' || temaGuardado === 'system') {
          setTemaSeleccionado(temaGuardado);
          // Forzar el tema en la app
          Appearance.setColorScheme(temaGuardado === 'system' ? null : temaGuardado);
        }
      } catch (e) {
        console.error("Error cargando tema", e);
      }
    };
    cargarTema();
  }, []);

  // Función para cambiar y guardar el tema
  const cambiarTema = async (nuevoTema: 'light' | 'dark' | 'system') => {
    setTemaSeleccionado(nuevoTema);
    Appearance.setColorScheme(nuevoTema === 'system' ? null : nuevoTema);
    await AsyncStorage.setItem(THEME_KEY, nuevoTema);
  };

  // Función crítica para vaciar la despensa (Muy útil para testing)
  const vaciarBaseDeDatos = () => {
    Alert.alert(
      "⚠️ Vaciar Despensa",
      "¿Estás seguro de que quieres borrar todos los productos escaneados? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, Borrar todo", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
            Alert.alert("Éxito", "La despensa ha sido vaciada.");
          }
        }
      ]
    );
  };

  // COLORES DINÁMICOS (Cambian según el modo)
  const colorFondo = isDark ? '#000000' : '#F2F2F7';
  const colorTarjeta = isDark ? '#1C1C1E' : '#FFFFFF';
  const colorTexto = isDark ? '#FFFFFF' : '#000000';
  const colorSubtexto = isDark ? '#8E8E93' : '#8E8E93';
  const colorBorde = isDark ? '#38383A' : '#E5E5EA';

  return (
    <View style={[styles.fondo, { backgroundColor: colorFondo }]}>
      <View style={styles.cabecera}>
        <Text style={[styles.tituloCabecera, { color: colorTexto }]}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* SECCIÓN 1: PERFIL (Estético) */}
        <View style={[styles.tarjeta, { backgroundColor: colorTarjeta }]}>
          <View style={styles.perfilFila}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>AR</Text>
            </View>
            <View style={styles.perfilInfo}>
              <Text style={[styles.perfilNombre, { color: colorTexto }]}>Arquitecto de Software</Text>
              <Text style={styles.perfilRol}>Proyecto Semestral I+D</Text>
            </View>
          </View>
        </View>

        <Text style={styles.tituloSeccion}>APARIENCIA</Text>
        <View style={[styles.tarjeta, { backgroundColor: colorTarjeta, paddingVertical: 5 }]}>
          
          {/* Opción Sistema */}
          <TouchableOpacity style={[styles.filaOpcion, { borderBottomColor: colorBorde }]} onPress={() => cambiarTema('system')}>
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#8E8E93' }]}>
                <Ionicons name="phone-portrait-outline" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: colorTexto }]}>Usar ajuste del sistema</Text>
            </View>
            {temaSeleccionado === 'system' && <Ionicons name="checkmark" size={24} color="#34C759" />}
          </TouchableOpacity>

          {/* Opción Claro */}
          <TouchableOpacity style={[styles.filaOpcion, { borderBottomColor: colorBorde }]} onPress={() => cambiarTema('light')}>
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#FF9500' }]}>
                <Ionicons name="sunny" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: colorTexto }]}>Modo Claro</Text>
            </View>
            {temaSeleccionado === 'light' && <Ionicons name="checkmark" size={24} color="#34C759" />}
          </TouchableOpacity>

          {/* Opción Oscuro */}
          <TouchableOpacity style={[styles.filaOpcion, { borderBottomWidth: 0 }]} onPress={() => cambiarTema('dark')}>
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#5856D6' }]}>
                <Ionicons name="moon" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: colorTexto }]}>Modo Oscuro</Text>
            </View>
            {temaSeleccionado === 'dark' && <Ionicons name="checkmark" size={24} color="#34C759" />}
          </TouchableOpacity>
        </View>

        <Text style={styles.tituloSeccion}>PREFERENCIAS</Text>
        <View style={[styles.tarjeta, { backgroundColor: colorTarjeta, paddingVertical: 5 }]}>
          <View style={[styles.filaOpcion, { borderBottomWidth: 0 }]}>
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#FF2D55' }]}>
                <Ionicons name="notifications" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: colorTexto }]}>Alertas de Vencimiento</Text>
            </View>
            <Switch 
              value={notificaciones} 
              onValueChange={setNotificaciones} 
              trackColor={{ false: "#767577", true: "#34C759" }}
            />
          </View>
        </View>

        <Text style={styles.tituloSeccion}>SISTEMA Y DATOS</Text>
        <View style={[styles.tarjeta, { backgroundColor: colorTarjeta, paddingVertical: 5 }]}>
          <TouchableOpacity style={[styles.filaOpcion, { borderBottomWidth: 0 }]} onPress={vaciarBaseDeDatos}>
            <View style={styles.filaIzquierda}>
              <View style={[styles.iconoCaja, { backgroundColor: '#FF3B30' }]}>
                <Ionicons name="trash" size={18} color="white" />
              </View>
              <Text style={[styles.textoOpcion, { color: '#FF3B30', fontWeight: '600' }]}>Vaciar Despensa (Borrar todo)</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.versionTexto, { color: colorSubtexto }]}>Startup App - Versión 1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  cabecera: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  tituloCabecera: { fontSize: 34, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 15 },
  tituloSeccion: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginTop: 25, marginBottom: 8, marginLeft: 15, letterSpacing: 0.5 },
  tarjeta: { borderRadius: 12, overflow: 'hidden' },
  
  // Estilos del perfil
  perfilFila: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarTexto: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  perfilInfo: { flex: 1 },
  perfilNombre: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  perfilRol: { fontSize: 15, color: '#8E8E93' },

  // Estilos de las opciones
  filaOpcion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 0.5 },
  filaIzquierda: { flexDirection: 'row', alignItems: 'center' },
  iconoCaja: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textoOpcion: { fontSize: 17 },
  
  versionTexto: { textAlign: 'center', marginTop: 30, fontSize: 13 },
});