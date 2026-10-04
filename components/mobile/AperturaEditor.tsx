import { useRef, useState } from 'react';
import { Modal, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { obtenerUidActual } from '../../services/auth';
import { mostrarApertura, validarApertura } from '../../services/apertura';
import type { ProductoInventario } from '../../services/productos';
import { useTemaApp } from './TemaApp';
import { Aviso, BotonApp, Encabezado, ui } from './UI';
export function AperturaEditor({ producto, hogar, cerrar }: { producto: ProductoInventario; hogar?: string; cerrar: () => void }) {
  const { colores } = useTemaApp(); const [fecha, setFecha] = useState(mostrarApertura(producto.abiertoEn)); const [ocupado, setOcupado] = useState(false); const [error, setError] = useState(''); const bloqueo = useRef(false);
  async function guardar() {
    if (bloqueo.current) return;
    bloqueo.current = true; setOcupado(true); setError('');
    try {
      const uid = obtenerUidActual(); const abiertoEn = validarApertura(fecha);
      if (!hogar && !producto.id.startsWith('v5:')) throw new Error('Este registro antiguo debe volver a registrarse para guardar su apertura.');
      const ref = hogar ? doc(db,'hogares',hogar,'inventario',producto.id) : doc(db,'usuarios',uid,'inventario',producto.id.slice(3));
      await updateDoc(ref,{ abiertoEn }); if (obtenerUidActual() === uid) cerrar();
    } catch (e) { setError(e instanceof Error && !('code' in e) ? e.message : 'No pudimos guardar la apertura. Revisa la conexión y tus permisos.'); }
    finally { bloqueo.current = false; setOcupado(false); }
  }
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!bloqueo.current) cerrar(); }}><SafeAreaView style={ui.overlay}><ScrollView contentContainerStyle={ui.modalScroll}><View style={[ui.dialogo, { backgroundColor: colores.tarjeta }]}><Encabezado titulo="Fecha de apertura" detalle={producto.nombre}/><Aviso texto="Registra cuándo abriste este lote. Revisa las instrucciones del envase: esta fecha no modifica el vencimiento ni calcula días de consumo."/><TextInput accessibilityLabel="Fecha de apertura" placeholder="DD/MM/AAAA; vacío para quitar" placeholderTextColor={colores.secundario} value={fecha} maxLength={10} onChangeText={setFecha} style={{ color: colores.texto, minHeight: 48, padding: 12, borderWidth: 1, borderColor: colores.borde, borderRadius: 12 }}/>{!!error && <Aviso texto={error} error/>}<BotonApp texto="Guardar apertura" onPress={() => { void guardar(); }} ocupado={ocupado}/><BotonApp texto="Cancelar" secundario deshabilitado={ocupado} onPress={cerrar}/></View></ScrollView></SafeAreaView></Modal>;
}
