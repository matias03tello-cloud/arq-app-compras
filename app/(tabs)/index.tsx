import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PantallaInicio() {
  const productosGuardados = [
    { id: '1', nombre: 'Banana', diasParaVencer: 2, tipo: 'Fruta' },
    { id: '2', nombre: 'Leche Descremada', diasParaVencer: 1, tipo: 'Lácteo' },
    { id: '3', nombre: 'Melatonina 3mg', diasParaVencer: -5, tipo: 'Medicamento' },
  ];

  const productosPorVencer = productosGuardados.filter(prod => prod.diasParaVencer <= 3);

  return (
    <ScrollView style={styles.fondo}>
      <View style={styles.contenedor}>
        
        <Text style={styles.tituloSecundario}>Resumen de tu Despensa</Text>
        <Text style={styles.textoNormal}>
          Tienes un total de <Text style={styles.textoResaltado}>{productosGuardados.length}</Text> productos guardados.
        </Text>

        <View style={styles.tarjetaAlerta}>
          <Text style={styles.tituloAlerta}>⚠️ ¡Atención!</Text>
          <Text style={styles.subtituloAlerta}>
            {productosPorVencer.length} productos están por vencer o ya vencieron:
          </Text>
          
          {productosPorVencer.map((producto) => (
            <View key={producto.id} style={styles.itemAlerta}>
              <Text style={styles.textoItemAlerta}>• {producto.nombre}</Text>
              <Text style={styles.textoItemVencimiento}>
                {producto.diasParaVencer < 0 
                  ? 'Ya venció' 
                  : `Vence en ${producto.diasParaVencer} día(s)`}
              </Text>
            </View>
          ))}
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#F5F5F5' },
  contenedor: { padding: 20, paddingTop: 40 },
  tituloSecundario: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  textoNormal: { fontSize: 18, color: '#555', marginBottom: 30 },
  textoResaltado: { fontWeight: 'bold', color: '#2E7D32', fontSize: 22 },
  tarjetaAlerta: { backgroundColor: '#FFF3E0', borderColor: '#FF9800', borderWidth: 2, borderRadius: 15, padding: 20, marginBottom: 40 },
  tituloAlerta: { fontSize: 26, fontWeight: 'bold', color: '#D84315', marginBottom: 5 },
  subtituloAlerta: { fontSize: 18, color: '#D84315', marginBottom: 15 },
  itemAlerta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#FFE0B2', paddingBottom: 5 },
  textoItemAlerta: { fontSize: 18, fontWeight: '600', color: '#333' },
  textoItemVencimiento: { fontSize: 18, fontWeight: 'bold', color: '#D32F2F' }
});