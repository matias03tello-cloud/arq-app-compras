import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { usuarioActual } from '../../services/auth';
import {
  obtenerEstadoVencimiento,
  obtenerInventario,
  ordenarPorVencimiento,
} from '../../services/inventarioFirestore';
import { ProductoInventario } from '../../services/productos';

export default function PantallaInicio() {
  const [inventario, setInventario] = useState<ProductoInventario[]>([]);
  const [errorCarga, setErrorCarga] = useState(false);
  const isDark = useColorScheme() === 'dark';
  const colorFondo = isDark ? '#000' : '#F8F9FA';
  const colorTarjeta = isDark ? '#1C1C1E' : '#FFF';
  const colorTexto = isDark ? '#FFF' : '#333';
  const colorSubtexto = isDark ? '#8E8E93' : '#666';

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        setErrorCarga(false);
        if (!usuarioActual()) {
          setInventario([]);
          return;
        }

        try {
          setInventario(ordenarPorVencimiento(await obtenerInventario()));
        } catch {
          setInventario([]); setErrorCarga(true);
        }
      };
      cargar();
    }, [])
  );

  const resumen = useMemo(() => {
    let vencidos = 0;
    let urgentes = 0;
    let proximos = 0;
    let atencion = 0;
    let bien = 0;

    inventario.forEach((producto) => {
      const estado = obtenerEstadoVencimiento(producto.vencimiento).estado;
      if (estado === 'vencido') vencidos++;
      else if (estado === 'urgente') urgentes++;
      else if (estado === 'pronto') proximos++;
      else if (estado === 'atencion') atencion++;
      else if (estado === 'bien') bien++;
    });

    return { vencidos, urgentes, proximos, atencion, bien };
  }, [inventario]);

  const consumirPrimero = useMemo(
    () => inventario.filter((p) => {
      const estado = obtenerEstadoVencimiento(p.vencimiento).estado;
      return estado === 'vencido' || estado === 'urgente' || estado === 'pronto';
    }).slice(0, 5),
    [inventario]
  );

  const totalUnidades = useMemo(
    () => inventario.reduce((sum, p) => sum + (p.cantidad || 1), 0),
    [inventario]
  );

  return (
    <View style={[styles.fondo, { backgroundColor: colorFondo }]}>
      <View style={styles.cabecera}>
        <Text style={styles.saludo}>Hola 👋</Text>
        <Text style={styles.titulo}>Tu despensa bajo control</Text>
      </View>

      {errorCarga && <Text style={{ color: '#B3261E', padding: 16 }}>No se pudo cargar tu despensa. Revisa la conexión y vuelve a abrir esta pestaña.</Text>}
      <ScrollView style={styles.contenido} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.tarjetaStats}>
          <View>
            <Text style={styles.statsNumero}>{inventario.length}</Text>
            <Text style={styles.statsTexto}>productos • {totalUnidades} unidades</Text>
          </View>
          <Ionicons name="basket" size={42} color="#E8F5E9" />
        </View>

        <Text style={[styles.tituloSeccion, { color: colorTexto }]}>⚡ Consumir primero</Text>
        <Text style={[styles.subtituloSeccion, { color: colorSubtexto }]}>Prioridad según la fecha de vencimiento</Text>

        {consumirPrimero.length > 0 ? consumirPrimero.map((prod) => {
          const estado = obtenerEstadoVencimiento(prod.vencimiento);
          const esVencido = estado.estado === 'vencido';
          const esUrgente = estado.estado === 'urgente';

          return (
            <View key={prod.id} style={[styles.tarjetaAlerta, { backgroundColor: colorTarjeta, borderLeftColor: esVencido || esUrgente ? '#F44336' : '#FF9800' }]}>
              <View style={styles.alertaInfo}>
                <Text style={[styles.alertaNombre, { color: colorTexto }]}>{prod.nombre}</Text>
                <Text style={[styles.alertaFecha, { color: colorSubtexto }]}>x{prod.cantidad || 1} • Vence: {prod.vencimiento}</Text>
              </View>
              <View style={[styles.badgeDias, { backgroundColor: esVencido || esUrgente ? '#FFEBEE' : '#FFF3E0' }]}>
                <Text style={[styles.textoBadge, { color: esVencido || esUrgente ? '#C62828' : '#D84315' }]}>{estado.etiqueta}</Text>
              </View>
            </View>
          );
        }) : (
          <View style={[styles.cajaTranquilidad, { backgroundColor: colorTarjeta }]}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.textoTranquilidad}>¡Todo bien!</Text>
            <Text style={[styles.subtextoTranquilidad, { color: colorSubtexto }]}>No tienes productos urgentes por consumir.</Text>
          </View>
        )}

        <Text style={[styles.tituloSeccion, { color: colorTexto, marginTop: 24 }]}>Estado de tu despensa</Text>
        <View style={styles.gridEstados}>
          <View style={[styles.estadoCard, { backgroundColor: colorTarjeta }]}><Text style={styles.estadoEmoji}>⚫</Text><Text style={[styles.estadoNumero, { color: colorTexto }]}>{resumen.vencidos}</Text><Text style={[styles.estadoLabel, { color: colorSubtexto }]}>Vencidos</Text></View>
          <View style={[styles.estadoCard, { backgroundColor: colorTarjeta }]}><Text style={styles.estadoEmoji}>🔴</Text><Text style={[styles.estadoNumero, { color: colorTexto }]}>{resumen.urgentes}</Text><Text style={[styles.estadoLabel, { color: colorSubtexto }]}>0–3 días</Text></View>
          <View style={[styles.estadoCard, { backgroundColor: colorTarjeta }]}><Text style={styles.estadoEmoji}>🟠</Text><Text style={[styles.estadoNumero, { color: colorTexto }]}>{resumen.proximos}</Text><Text style={[styles.estadoLabel, { color: colorSubtexto }]}>4–7 días</Text></View>
          <View style={[styles.estadoCard, { backgroundColor: colorTarjeta }]}><Text style={styles.estadoEmoji}>🟡</Text><Text style={[styles.estadoNumero, { color: colorTexto }]}>{resumen.atencion}</Text><Text style={[styles.estadoLabel, { color: colorSubtexto }]}>8–15 días</Text></View>
          <View style={[styles.estadoCard, { backgroundColor: colorTarjeta }]}><Text style={styles.estadoEmoji}>🟢</Text><Text style={[styles.estadoNumero, { color: colorTexto }]}>{resumen.bien}</Text><Text style={[styles.estadoLabel, { color: colorSubtexto }]}>+15 días</Text></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  cabecera: { padding: 20, paddingTop: 60, backgroundColor: '#2E7D32', borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  saludo: { fontSize: 18, color: '#E8F5E9', marginBottom: 5 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  contenido: { flex: 1, padding: 20 },
  tarjetaStats: { backgroundColor: '#43A047', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, elevation: 4 },
  statsNumero: { fontSize: 38, fontWeight: 'bold', color: '#FFF' },
  statsTexto: { fontSize: 15, color: '#E8F5E9' },
  tituloSeccion: { fontSize: 20, fontWeight: 'bold' },
  subtituloSeccion: { fontSize: 14, marginTop: 2, marginBottom: 15 },
  tarjetaAlerta: { padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 5, elevation: 2 },
  alertaInfo: { flex: 1, paddingRight: 8 },
  alertaNombre: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  alertaFecha: { fontSize: 13 },
  badgeDias: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, maxWidth: 120 },
  textoBadge: { fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  cajaTranquilidad: { alignItems: 'center', padding: 26, borderRadius: 15, marginTop: 4 },
  textoTranquilidad: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginTop: 8 },
  subtextoTranquilidad: { fontSize: 14, marginTop: 5, textAlign: 'center' },
  gridEstados: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  estadoCard: { width: '30%', minWidth: 95, flexGrow: 1, borderRadius: 14, padding: 13, alignItems: 'center' },
  estadoEmoji: { fontSize: 20 },
  estadoNumero: { fontSize: 24, fontWeight: 'bold', marginTop: 2 },
  estadoLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
});
