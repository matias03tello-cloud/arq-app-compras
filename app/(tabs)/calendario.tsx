import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

const ASYNC_STORAGE_KEY = '@inventario_abuelitas_v4';

// Función para traducir "25/04/2027" a "2027-04-25" para el calendario
const formatearParaCalendario = (fechaChile: string) => {
  if (!fechaChile || fechaChile === 'No visible' || fechaChile === 'Sin fecha') return null;
  const partes = fechaChile.split('/');
  if (partes.length === 3) {
    return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
  }
  return null; // Ignora fechas mal escritas
};

export default function PantallaCalendario() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [productos, setProductos] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const cargarInventario = async () => {
        try {
          const datos = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
          if (datos) {
            // Le agregamos un campo extra temporal a cada producto con la fecha en formato calendario
            const datosParseados = JSON.parse(datos).map((p: any) => ({
              ...p,
              fechaCalendario: formatearParaCalendario(p.vencimiento)
            }));
            setProductos(datosParseados);
          }
        } catch (e) {
          console.error(e);
        }
      };
      cargarInventario();
    }, [])
  );

  const productosDelDia = productos.filter(p => p.fechaCalendario === fechaSeleccionada);

  const diasMarcados: any = {};
  productos.forEach(prod => {
    if (prod.fechaCalendario) {
      diasMarcados[prod.fechaCalendario] = { marked: true, dotColor: '#D32F2F', activeOpacity: 0.9 };
    }
  });

  if (fechaSeleccionada) {
    diasMarcados[fechaSeleccionada] = { 
      ...diasMarcados[fechaSeleccionada], selected: true, selectedColor: '#2E7D32' 
    };
  }

  return (
    <View style={styles.fondo}>
      <View style={styles.cabecera}>
        <Text style={styles.tituloCabecera}>Calendario</Text>
      </View>

      <ScrollView>
        <Calendar
          style={styles.calendario}
          theme={{
            backgroundColor: '#ffffff', calendarBackground: '#ffffff',
            textSectionTitleColor: '#2E7D32', selectedDayBackgroundColor: '#2E7D32',
            selectedDayTextColor: '#ffffff', todayTextColor: '#2E7D32',
            dayTextColor: '#2d4150', arrowColor: '#2E7D32',
            textDayFontSize: 18, textMonthFontSize: 22,
          }}
          onDayPress={(day: any) => setFechaSeleccionada(day.dateString)}
          markedDates={diasMarcados}
        />

        <View style={styles.contenedorDetalles}>
          <Text style={styles.tituloDetalles}>
            {fechaSeleccionada ? `Vencimientos:` : 'Selecciona un día'}
          </Text>

          {productosDelDia.length > 0 ? (
            productosDelDia.map(prod => (
              <View key={prod.id} style={styles.tarjetaProducto}>
                <Text style={styles.nombreProducto}>📦 {prod.nombre} ({prod.marca})</Text>
              </View>
            ))
          ) : (
            fechaSeleccionada !== '' && (
              <Text style={styles.textoVacio}>No hay productos por vencer este día. ✅</Text>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#F5F5F5' },
  cabecera: { padding: 20, paddingTop: 50, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  tituloCabecera: { fontSize: 30, fontWeight: 'bold', color: '#000' },
  calendario: { marginBottom: 10, paddingBottom: 10, elevation: 4 },
  contenedorDetalles: { padding: 20 },
  tituloDetalles: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  tarjetaProducto: { backgroundColor: '#FFF3E0', padding: 18, borderRadius: 12, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#FF9800' },
  nombreProducto: { fontSize: 20, fontWeight: '600', color: '#D84315' },
  textoVacio: { fontSize: 16, color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: 20 }
});