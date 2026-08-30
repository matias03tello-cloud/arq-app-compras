import { CameraView, useCameraPermissions } from 'expo-camera';
import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

// El componente recibe "estadoIA" y TypeScript ahora sabe que es un texto (string)
export default function VisorCamara({ estadoIA }: { estadoIA: string }) {
  const [permiso, pedirPermiso] = useCameraPermissions();

  if (!permiso) {
    return <View style={styles.fondoNegro} />;
  }

  if (!permiso.granted) {
    return (
      <View style={styles.contenedorPermiso}>
        <Text style={styles.textoAyuda}>
          Necesitamos acceso a tu cámara para poder leer los productos.
        </Text>
        <Button onPress={pedirPermiso} title="Otorgar Permiso" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <CameraView style={styles.camara} facing="back">
        <View style={styles.capaSuperpuesta}>
          <View style={styles.cajaResultado}>
            <Text style={styles.textoDeteccion}>
              {estadoIA}
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'center', backgroundColor: 'black' },
  fondoNegro: { flex: 1, backgroundColor: 'black' },
  camara: { flex: 1 },
  capaSuperpuesta: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', paddingBottom: 50, paddingHorizontal: 20 },
  cajaResultado: { backgroundColor: 'rgba(0, 0, 0, 0.85)', padding: 25, borderRadius: 20, alignItems: 'center' },
  textoDeteccion: { fontSize: 28, color: '#4CAF50', fontWeight: 'bold', textAlign: 'center' },
  contenedorPermiso: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#F5F5F5' },
  textoAyuda: { fontSize: 22, textAlign: 'center', marginBottom: 30, color: '#333', fontWeight: '500' }
});