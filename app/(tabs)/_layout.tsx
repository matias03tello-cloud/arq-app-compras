import { Ionicons } from '@expo/vector-icons'; // Librería de íconos que ya viene con Expo
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        tabBarShowLabel: false, // Oculta el texto para que quede como tu dibujo
        tabBarStyle: styles.barraInferior,
        headerShown: false // Oculta el título superior por defecto
      }}
    >
      {/* 1. Pestaña de Inicio (Home) */}
      <Tabs.Screen 
        name="index" 
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} />,
        }} 
      />

      {/* 2. Pestaña de Búsqueda (Search) */}
      <Tabs.Screen 
        name="buscar" 
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <Ionicons name="search" size={28} color={color} />,
        }} 
      />

      {/* 3. EL BOTÓN FLOTANTE DE LA CÁMARA (El centro de tu diseño) */}
      <Tabs.Screen 
        name="camara" 
        options={{
          title: 'Cámara',
          tabBarIcon: () => (
            <View style={styles.botonFlotante}>
              <Ionicons name="camera" size={35} color="white" />
            </View>
          ),
        }} 
      />

      {/* 4. Pestaña de Lista (List) */}
      <Tabs.Screen 
        name="lista" 
        options={{
          title: 'Lista',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={28} color={color} />,
        }} 
      />

      {/* 5. Pestaña de Configuración (Settings) */}
      <Tabs.Screen 
        name="configuracion" 
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={28} color={color} />,
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barraInferior: {
    height: 70, // Barra un poco más alta y cómoda para tocar
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  botonFlotante: {
    top: -20, // ¡Esto es lo que hace que sobresalga hacia arriba!
    width: 70,
    height: 70,
    borderRadius: 35, // Lo hace un círculo perfecto
    backgroundColor: '#2E7D32', // El verde de la captura de tu compañero
    justifyContent: 'center',
    alignItems: 'center',
    // Sombra para darle relieve
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8, // Sombra en Android
  }
});