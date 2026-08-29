import { StyleSheet, Text, View } from 'react-native';

export default function PantallaVacia() {
  return (
    <View style={styles.centro}>
      <Text style={styles.texto}>Pantalla en construcción 🚧</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  texto: { fontSize: 18, fontWeight: 'bold' }
});