/** Declara las cinco pestañas activas y sus iconos de navegación. */
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function LayoutPestanas() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#2E7D32',
      tabBarInactiveTintColor: '#888',
      tabBarStyle: { height: 80, paddingBottom: 25, paddingTop: 5 },
      headerShown: false,
    }}>
      
      <Tabs.Screen name="index" options={{
        title: 'Inicio',
        tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} />
      }} />

      <Tabs.Screen name="despensa" options={{
        title: 'Despensa',
        tabBarIcon: ({ color }) => <Ionicons name="list" size={28} color={color} />
      }} />

      <Tabs.Screen name="camara" options={{
        title: 'Escanear',
        tabBarLabel: () => null,
        tabBarIcon: () => (
          <View style={styles.botonCamaraCentral}>
            <Ionicons name="camera" size={32} color="white" />
          </View>
        )
      }} />

      {/* NUEVO: Calendario insertado antes de Ajustes */}
      <Tabs.Screen name="calendario" options={{
        title: 'Calendario',
        tabBarIcon: ({ color }) => <Ionicons name="calendar" size={28} color={color} />
      }} />

      <Tabs.Screen name="configuracion" options={{
        title: 'Ajustes',
        tabBarIcon: ({ color }) => <Ionicons name="settings" size={28} color={color} />
      }} />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  botonCamaraCentral: {
    backgroundColor: '#2E7D32', width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  }
});