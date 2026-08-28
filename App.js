import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function App() {
  // 1. Estado de permisos del hardware
  const [permiso, pedirPermiso] = useCameraPermissions();
  
  // 2. Estado de la IA (Aquí es donde tu compañero inyectará los datos luego)
  const [etiquetaIA, setEtiquetaIA] = useState("Buscando producto...");

  // Cargando permisos...
  if (!permiso) {
    return <View />;
  }

  // Si la abuelita aún no ha dado permiso para usar la cámara
  if (!permiso.granted) {
    return (
      <View style={styles.contenedorPermiso}>
        <Text style={styles.textoAyuda}>Necesitamos acceso a tu cámara para leer los productos.</Text>
        <Button onPress={pedirPermiso} title="Otorgar Permiso" color="#2196F3" />
      </View>
    );
  }

  // Interfaz Principal de la Cámara
  return (
    <View style={styles.contenedor}>
      {/* Componente del hardware de la cámara */}
      <CameraView style={styles.camara} facing="back">
        
        {/* Capa visual sobre la cámara (UI Overlay) */}
        <View style={styles.capaSuperpuesta}>
          
          {/* Recuadro de detección con alto contraste */}
          <View style={styles.cajaResultado}>
            <Text style={styles.textoDeteccion}>
              {etiquetaIA}
            </Text>
          </View>

        </View>
      </CameraView>
    </View>
  );
}

// 3. Hoja de Estilos (Arquitectura CSS para Accesibilidad)
const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'center',
  },
  camara: {
    flex: 1,
  },
  capaSuperpuesta: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end', // Empuja la caja hacia abajo
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  cajaResultado: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Fondo oscuro semitransparente para alto contraste
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    // Sombra para que resalte
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
  },
  textoDeteccion: {
    fontSize: 28, // Letra gigante ideal para abuelitas
    color: '#4CAF50', // Verde brillante
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contenedorPermiso: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  textoAyuda: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 20,
  }
});