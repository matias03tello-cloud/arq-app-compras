import { StyleSheet, Text, View } from 'react-native';

export default function PantallaPrincipal() {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>¡Hola Arquitectura de Computadores!</Text>
      <Text style={styles.subtitulo}>Nuestra app está funcionando.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  }
});