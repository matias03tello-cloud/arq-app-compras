import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { agregarAlInventario, fechaTextoADate } from '../../services/inventarioFirestore';
import {
  buscarProductoPorCodigo,
  CategoriaProducto,
  guardarProductoCatalogo,
  ProductoCatalogo,
  ProductoInventario,
} from '../../services/productos';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PasoFlujo = 'INICIAL' | 'REGISTRO_MANUAL' | 'FOTO_FECHA' | 'EXITO';

const CATEGORIAS: CategoriaProducto[] = [
  'Lacteos',
  'Carnes',
  'Frutas',
  'Verduras',
  'Despensa',
  'Bebidas',
  'Congelados',
  'Snacks',
  'Otros',
];

function normalizarFecha(textoOCR: string): string | null {
  if (!textoOCR) return null;

  let texto = textoOCR.toUpperCase();
  texto = texto
    .replace(/\bO(?=\d)/g, '0')
    .replace(/(?<=\d)O\b/g, '0')
    .replace(/[.\s-]+/g, '/');

  const patronCompleto = /\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/(20\d{2}|\d{2})\b/g;
  const completa = patronCompleto.exec(texto);

  if (completa) {
    const dia = completa[1].padStart(2, '0');
    const mes = completa[2].padStart(2, '0');
    let anio = completa[3];
    if (anio.length === 2) anio = `20${anio}`;
    const fecha = `${dia}/${mes}/${anio}`;
    if (fechaTextoADate(fecha)) return fecha;
  }

  const patronMesAnio = /\b(0?[1-9]|1[0-2])\/(20\d{2}|\d{2})\b/g;
  const mesAnio = patronMesAnio.exec(texto);

  if (mesAnio) {
    const mes = mesAnio[1].padStart(2, '0');
    let anio = mesAnio[2];
    if (anio.length === 2) anio = `20${anio}`;
    const fecha = `${mes}/${anio}`;
    if (fechaTextoADate(fecha)) return fecha;
  }

  return null;
}

function formatearFechaManual(texto: string): string {
  const limpio = texto.replace(/[^0-9]/g, '').slice(0, 8);
  if (limpio.length <= 2) return limpio;
  if (limpio.length <= 4) return `${limpio.slice(0, 2)}/${limpio.slice(2)}`;
  return `${limpio.slice(0, 2)}/${limpio.slice(2, 4)}/${limpio.slice(4)}`;
}

export default function PantallaCamara() {
  const isFocused = useIsFocused();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [paso, setPaso] = useState<PasoFlujo>('INICIAL');
  const [procesando, setProcesando] = useState(false);
  const [flashEncendido, setFlashEncendido] = useState(false);
  const [codigoLeido, setCodigoLeido] = useState<string | null>(null);
  const [productoActual, setProductoActual] = useState<ProductoCatalogo | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState<ProductoInventario | null>(null);

  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProducto>('Otros');
  const [formato, setFormato] = useState('');
  const [unidad, setUnidad] = useState('unidad');

  const [fechaManual, setFechaManual] = useState('');
  const [cantidadTexto, setCantidadTexto] = useState('1');

  const cameraRef = useRef<any>(null);
  const bloqueado = useRef(false);

  const isDark = useColorScheme() === 'dark';
  const colorFondo = isDark ? '#000' : '#F4F6F8';
  const colorTarjeta = isDark ? '#1C1C1E' : '#FFF';
  const colorTexto = isDark ? '#FFF' : '#222';
  const colorSubtexto = isDark ? '#A0A0A5' : '#666';

  const manejarCodigoEscaneado = async ({ data }: { data: string }) => {
    if (!isFocused || bloqueado.current || procesando || paso !== 'INICIAL') return;

    bloqueado.current = true;
    setProcesando(true);
    setCodigoLeido(data);

    try {
      const producto = await buscarProductoPorCodigo(data);

      if (producto) {
        setProductoActual(producto);
        setPaso('FOTO_FECHA');
      } else {
        setNombre('');
        setMarca('');
        setCategoria('Otros');
        setFormato('');
        setUnidad('unidad');
        setPaso('REGISTRO_MANUAL');
      }
    } catch {
      
      Alert.alert('Error', 'No se pudo consultar tu catálogo de Firestore.');
      bloqueado.current = false;
      setCodigoLeido(null);
    } finally {
      setProcesando(false);
    }
  };

  const registrarProductoNuevo = async () => {
    if (procesando) return;
    if (!codigoLeido) return;
    if (!nombre.trim()) {
      Alert.alert('Falta información', 'Debes escribir el nombre del producto.');
      return;
    }

    const nuevoProducto: ProductoCatalogo = {
      codigoBarras: codigoLeido,
      nombre: nombre.trim(),
      marca: marca.trim() || 'Sin marca',
      categoria,
      formato: formato.trim() || 'Sin formato',
      unidad: unidad.trim() || 'unidad',
      activo: true,
    };

    try {
      setProcesando(true);
      await guardarProductoCatalogo(nuevoProducto);
      setProductoActual(nuevoProducto);
      setPaso('FOTO_FECHA');
    } catch {
      
      Alert.alert('Error', 'No se pudo guardar el producto en Firestore.');
    } finally {
      setProcesando(false);
    }
  };

  const tomarFoto = async () => {
    if (!cameraRef.current) return null;

    const foto = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
    if (!foto?.uri) return null;

    try {
      return await manipulateAsync(foto.uri, [{ resize: { width: 1200 } }], { compress: 0.8, format: SaveFormat.JPEG });
    } finally {
      await FileSystem.deleteAsync(foto.uri, { idempotent: true });
    }
  };

  const leerFechaConMLKit = async () => {
    if (!productoActual || procesando) return;
    if (Platform.OS === 'web') {
      Alert.alert('Lectura de fecha', 'En el navegador, escribe la fecha manualmente.');
      return;
    }
    let uri: string | undefined;
    try {
      setProcesando(true);
      // La carga diferida permite abrir las demás funciones también en Expo Go.
      const TextRecognition = (await import('@react-native-ml-kit/text-recognition')).default;
      const foto = await tomarFoto();
      uri = foto?.uri;
      if (!uri) throw new Error('No se pudo capturar la imagen.');
      const resultado = await TextRecognition.recognize(uri);
      const fecha = normalizarFecha(resultado.text);
      if (!fecha) {
        Alert.alert('Fecha no detectada', 'Puedes volver a intentar o escribirla manualmente abajo.');
        return;
      }
      setFechaManual(fecha);
      Alert.alert('Fecha detectada', fecha);
    } catch {
      Alert.alert('No se pudo leer la fecha', 'Puedes escribirla manualmente. La lectura automática necesita la versión instalada con los módulos nativos.');
    } finally {
      try { if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }); }
      finally { setProcesando(false); }
    }
  };

  const guardarProductoEnDespensa = async () => {
    if (procesando) return;
    if (!productoActual) return;

    const cantidad = Number(cantidadTexto);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) {
      Alert.alert('Cantidad inválida', 'Ingresa una cantidad entre 1 y 999.');
      return;
    }

    const fecha = fechaManual.trim();
    if (!fechaTextoADate(fecha)) {
      Alert.alert('Fecha inválida', 'Usa DD/MM/AAAA. Ejemplo: 25/09/2026.');
      return;
    }

    const nuevoProducto: ProductoInventario = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      codigoBarras: productoActual.codigoBarras,
      nombre: productoActual.nombre,
      marca: productoActual.marca,
      categoria: productoActual.categoria,
      formato: productoActual.formato,
      unidad: productoActual.unidad,
      cantidad,
      vencimiento: fecha,
      fechaRegistro: new Date().toLocaleDateString('es-CL'),
    };

    try {
      setProcesando(true);
      const productoGuardado = await agregarAlInventario(nuevoProducto);
      setUltimoResultado(productoGuardado);
      setPaso('EXITO');
    } catch {
      
      Alert.alert('Error', 'No se pudo guardar el producto en la despensa.');
    } finally {
      setProcesando(false);
    }
  };

  const reiniciar = () => {
    setPaso('INICIAL');
    setProcesando(false);
    setCodigoLeido(null);
    setProductoActual(null);
    setUltimoResultado(null);
    setNombre('');
    setMarca('');
    setCategoria('Otros');
    setFormato('');
    setUnidad('unidad');
    setFechaManual('');
    setCantidadTexto('1');
    bloqueado.current = false;
  };

  if (!permiso) {
    return (
      <View style={[styles.center, { backgroundColor: colorFondo }]}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (!permiso.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colorFondo }]}>
        <Text style={[styles.textoPermiso, { color: colorTexto }]}>FrescApp necesita acceso a la cámara.</Text>
        <TouchableOpacity style={styles.botonPrincipal} onPress={pedirPermiso}>
          <Text style={styles.textoBoton}>DAR PERMISO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (paso === 'EXITO' && ultimoResultado) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colorFondo }]}>
        <View style={styles.header}>
          <Text style={styles.tituloHeader}>FrescApp</Text>
        </View>
        <View style={styles.resultadoContainer}>
          <View style={styles.tarjetaExito}>
            <Text style={styles.exito}>✓ PRODUCTO REGISTRADO</Text>
            <Text style={styles.nombreResultado}>{ultimoResultado.nombre}</Text>
            <Text style={styles.detalleResultado}>{ultimoResultado.marca}</Text>
            <Text style={styles.detalleResultado}>Cantidad: {ultimoResultado.cantidad}</Text>
            <Text style={styles.fechaResultado}>Vence: {ultimoResultado.vencimiento}</Text>
          </View>
          <TouchableOpacity style={styles.botonPrincipal} onPress={reiniciar}>
            <Text style={styles.textoBoton}>📷 ESCANEAR OTRO PRODUCTO</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorFondo }]}>
      <View style={styles.header}>
        <Text style={styles.tituloHeader}>FrescApp</Text>
        <Text style={styles.subtituloHeader}>Escáner de productos</Text>
      </View>

      {paso === 'REGISTRO_MANUAL' ? (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={[styles.formTitulo, { color: colorTexto }]}>Producto nuevo</Text>
          <Text style={[styles.formSubtitulo, { color: colorSubtexto }]}>Código: {codigoLeido}</Text>

          <Text style={[styles.label, { color: colorTexto }]}>Nombre *</Text>
          <TextInput value={nombre} onChangeText={setNombre} placeholder="Ej: Leche Entera" placeholderTextColor="#999" style={[styles.input, { backgroundColor: colorTarjeta, color: colorTexto }]} />

          <Text style={[styles.label, { color: colorTexto }]}>Marca</Text>
          <TextInput value={marca} onChangeText={setMarca} placeholder="Ej: Colun" placeholderTextColor="#999" style={[styles.input, { backgroundColor: colorTarjeta, color: colorTexto }]} />

          <Text style={[styles.label, { color: colorTexto }]}>Categoría</Text>
          <View style={styles.categoriasWrap}>
            {CATEGORIAS.map((item) => (
              <TouchableOpacity key={item} style={[styles.categoriaChip, categoria === item && styles.categoriaChipActiva]} onPress={() => setCategoria(item)}>
                <Text style={categoria === item ? styles.categoriaTextoActivo : styles.categoriaTexto}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colorTexto }]}>Formato</Text>
          <TextInput value={formato} onChangeText={setFormato} placeholder="Ej: 1 litro" placeholderTextColor="#999" style={[styles.input, { backgroundColor: colorTarjeta, color: colorTexto }]} />

          <Text style={[styles.label, { color: colorTexto }]}>Unidad</Text>
          <TextInput value={unidad} onChangeText={setUnidad} placeholder="Ej: L, kg, g, unidad" placeholderTextColor="#999" style={[styles.input, { backgroundColor: colorTarjeta, color: colorTexto }]} />

          {procesando ? <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 20 }} /> : (
            <TouchableOpacity style={styles.botonPrincipal} onPress={registrarProductoNuevo}>
              <Text style={styles.textoBoton}>GUARDAR Y CONTINUAR</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.botonCancelar} onPress={reiniciar}>
            <Text style={styles.textoCancelar}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.camaraContainer}>
          <CameraView active={isFocused}
            ref={cameraRef}
            style={styles.camara}
            facing="back"
            enableTorch={flashEncendido}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={paso === 'INICIAL' ? manejarCodigoEscaneado : undefined}
          >
            <TouchableOpacity style={styles.botonFlash} onPress={() => setFlashEncendido(!flashEncendido)}>
              <Text style={styles.textoFlash}>{flashEncendido ? '💡 LUZ ON' : '🔦 LUZ OFF'}</Text>
            </TouchableOpacity>
            <View style={styles.overlay}>
              <View style={paso === 'INICIAL' ? styles.cajaCodigo : styles.cajaFecha} />
              <Text style={styles.textoOverlay}>{paso === 'INICIAL' ? 'Apunta al código de barras' : 'Centra la fecha de vencimiento'}</Text>
            </View>
          </CameraView>

          <ScrollView style={[styles.panel, { backgroundColor: colorTarjeta }]} contentContainerStyle={{ paddingBottom: 22 }}>
            {paso === 'INICIAL' ? (
              <>
                <Text style={[styles.panelTitulo, { color: colorTexto }]}>Escanea un producto</Text>
                <Text style={[styles.panelSubtitulo, { color: colorSubtexto }]}>Se buscará en tu catálogo propio de Firestore.</Text>
                {procesando && <ActivityIndicator size="small" color="#2E7D32" />}
              </>
            ) : (
              <>
                <Text style={[styles.panelTitulo, { color: colorTexto }]}>✓ {productoActual?.nombre}</Text>
                <Text style={[styles.panelSubtitulo, { color: colorSubtexto }]}>{productoActual?.marca} • {productoActual?.formato}</Text>

                <TouchableOpacity style={styles.botonSecundario} onPress={leerFechaConMLKit} disabled={procesando}>
                  <Text style={styles.textoBotonSecundario}>{procesando ? 'LEYENDO...' : '📸 DETECTAR FECHA CON CÁMARA'}</Text>
                </TouchableOpacity>

                <Text style={[styles.label, { color: colorTexto }]}>Fecha de vencimiento</Text>
                <TextInput
                  value={fechaManual}
                  onChangeText={(texto) => setFechaManual(formatearFechaManual(texto))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={[styles.input, { color: colorTexto, backgroundColor: isDark ? '#2C2C2E' : '#F7F7F7' }]}
                />
                <Text style={[styles.ayuda, { color: colorSubtexto }]}>Puedes corregir la fecha detectada o escribirla manualmente.</Text>

                <Text style={[styles.label, { color: colorTexto }]}>Cantidad</Text>
                <View style={styles.cantidadRow}>
                  <TouchableOpacity style={styles.botonCantidad} onPress={() => setCantidadTexto(String(Math.max(1, Number(cantidadTexto || 1) - 1)))}>
                    <Text style={styles.textoCantidad}>−</Text>
                  </TouchableOpacity>
                  <TextInput value={cantidadTexto} onChangeText={(t) => setCantidadTexto(t.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad" style={[styles.inputCantidad, { color: colorTexto }]} />
                  <TouchableOpacity style={styles.botonCantidad} onPress={() => setCantidadTexto(String(Math.min(999, Number(cantidadTexto || 0) + 1)))}>
                    <Text style={styles.textoCantidad}>+</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.botonPrincipal} onPress={guardarProductoEnDespensa} disabled={procesando}>
                  <Text style={styles.textoBoton}>GUARDAR EN DESPENSA</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botonCancelar} onPress={reiniciar}>
                  <Text style={styles.textoCancelar}>Cancelar / volver a escanear</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { backgroundColor: '#1B5E20', paddingVertical: 14, alignItems: 'center' },
  tituloHeader: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  subtituloHeader: { color: '#C8E6C9', fontSize: 13, marginTop: 2 },
  textoPermiso: { fontSize: 17, textAlign: 'center', marginBottom: 20 },
  camaraContainer: { flex: 1, margin: 10, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  camara: { flex: 1, minHeight: 330 },
  botonFlash: { position: 'absolute', right: 15, top: 15, zIndex: 5, backgroundColor: 'rgba(0,0,0,0.65)', padding: 10, borderRadius: 14 },
  textoFlash: { color: '#FFF', fontWeight: 'bold' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cajaCodigo: { width: 260, height: 150, borderWidth: 3, borderColor: '#00E676', borderRadius: 14 },
  cajaFecha: { width: SCREEN_WIDTH * 0.78, height: 120, borderWidth: 3, borderColor: '#FF5252', borderRadius: 14 },
  textoOverlay: { color: '#FFF', backgroundColor: 'rgba(0,0,0,0.65)', marginTop: 18, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, fontWeight: 'bold' },
  panel: { maxHeight: 360, padding: 16 },
  panelTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  panelSubtitulo: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  botonPrincipal: { backgroundColor: '#2E7D32', paddingVertical: 15, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  textoBoton: { color: '#FFF', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  botonSecundario: { borderWidth: 1.5, borderColor: '#2E7D32', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  textoBotonSecundario: { color: '#2E7D32', fontWeight: 'bold' },
  botonCancelar: { paddingVertical: 13, alignItems: 'center' },
  textoCancelar: { color: '#C62828', fontWeight: 'bold' },
  formContainer: { padding: 20, paddingBottom: 120 },
  formTitulo: { fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  formSubtitulo: { fontSize: 14, marginTop: 6, marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  ayuda: { fontSize: 12, marginTop: 5 },
  categoriasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoriaChip: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF' },
  categoriaChipActiva: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  categoriaTexto: { color: '#444', fontSize: 13 },
  categoriaTextoActivo: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  cantidadRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 12 },
  botonCantidad: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  textoCantidad: { color: '#1B5E20', fontSize: 24, fontWeight: 'bold' },
  inputCantidad: { width: 70, textAlign: 'center', fontSize: 20, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#AAA', paddingVertical: 6 },
  resultadoContainer: { flex: 1, padding: 18 },
  tarjetaExito: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7', borderWidth: 1, borderRadius: 16, padding: 18 },
  exito: { color: '#2E7D32', fontWeight: 'bold', fontSize: 13 },
  nombreResultado: { color: '#1B5E20', fontWeight: 'bold', fontSize: 26, marginTop: 5 },
  detalleResultado: { color: '#555', fontSize: 15, marginTop: 3 },
  fechaResultado: { color: '#C62828', fontWeight: 'bold', fontSize: 16, marginTop: 8 },
});
