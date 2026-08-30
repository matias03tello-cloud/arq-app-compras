import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function PantallaConfiguracion() {
  // Estados funcionales de configuración
  const [vibracion, setVibracion] = useState(true);
  const [letrasGrandes, setLetrasGrandes] = useState(false);
  const [notificaciones, setNotificaciones] = useState(true);

  // Función funcional (muestra una alerta real de borrado)
  const borrarDatos = () => {
    Alert.alert(
      "Borrar Memoria",
      "¿Estás seguro de que quieres borrar todos los productos guardados en tu despensa?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, borrar todo", style: "destructive" }
      ]
    );
  };

  return (
    <View style={styles.fondo}>
      <Text style={styles.tituloCabecera}>Ajustes</Text>
      
      {/* SECCIÓN: Accesibilidad */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Accesibilidad</Text>
        
        <View style={styles.fila}>
          <Text style={styles.textoFila}>Vibrar al leer producto</Text>
          <Switch value={vibracion} onValueChange={setVibracion} trackColor={{ true: '#2E7D32' }} />
        </View>

        <View style={styles.fila}>
          <Text style={styles.textoFila}>Usar texto extra grande</Text>
          <Switch value={letrasGrandes} onValueChange={setLetrasGrandes} trackColor={{ true: '#2E7D32' }} />
        </View>
      </View>

      {/* SECCIÓN: Alertas */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Alertas de Vencimiento</Text>
        <View style={styles.fila}>
          <Text style={styles.textoFila}>Notificar en el celular</Text>
          <Switch value={notificaciones} onValueChange={setNotificaciones} trackColor={{ true: '#2E7D32' }} />
        </View>
      </View>

      {/* SECCIÓN: Gestión de Datos */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Memoria</Text>
        <TouchableOpacity style={styles.botonBorrar} onPress={borrarDatos}>
          <Ionicons name="trash-outline" size={24} color="white" />
          <Text style={styles.textoBorrar}>Vaciar Despensa Completa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#F5F5F5', padding: 20, paddingTop: 50 },
  tituloCabecera: { fontSize: 34, fontWeight: 'bold', color: '#000', marginBottom: 30 },
  seccion: { marginBottom: 30 },
  tituloSeccion: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10, textTransform: 'uppercase' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 18, borderRadius: 12, marginBottom: 10, elevation: 1 },
  textoFila: { fontSize: 18, color: '#333', fontWeight: '500' },
  botonBorrar: { flexDirection: 'row', backgroundColor: '#D32F2F', padding: 18, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  textoBorrar: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 }
});