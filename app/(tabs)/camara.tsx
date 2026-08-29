import AsyncStorage from '@react-native-async-storage/async-storage';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GEMINI_API_KEY = "AQ.Ab8RN6LWApTODRrtRME3OKQu5_9ZCD3LBh-ZsxgJPJCQ5NnJjg";
const GEMINI_MODEL = "gemini-3.1-flash-lite";
const ASYNC_STORAGE_KEY = '@inventario_abuelitas_v4';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const extraerFechaLocal = (textoOCR: string) => {
  if (!textoOCR) return null;
  let texto = textoOCR.toUpperCase().replace(/\bO(?=\d)/g, '0').replace(/(?<=\d)O\b/g, '0').replace(/\bOS[/\.-]/g, '05/').replace(/[\.\s-]+/g, '/');
  const patronDiaMesAnio = /\b(0?[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(2[4-9]|[3-4][0-9]|202[4-9]|203[0-9])\b/g;
  let match = patronDiaMesAnio.exec(texto);
  if (match) return `${match[1].padStart(2, '0')}/${match[2]}/${match[3].length === 2 ? '20'+match[3] : match[3]}`;
  const patronMesAnio = /\b(0[1-9]|1[0-2])\/(2[4-9]|[3-4][0-9]|202[4-9]|203[0-9])\b/g;
  match = patronMesAnio.exec(texto);
  if (match) return `${match[1]}/${match[2].length === 2 ? '20'+match[2] : match[2]}`;
  return null;
};

export default function CamaraScreen() {
  const router = useRouter(); 
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [procesando, setProcesando] = useState(false);
  const [buscandoAuto, setBuscandoAuto] = useState(false);
  const [flashEncendido, setFlashEncendido] = useState(false);
  const [paso, setPaso] = useState('INICIAL');
  const [codigoLeido, setCodigoLeido] = useState<string | null>(null);
  const [datosTemporales, setDatosTemporales] = useState<any>(null);
  const cameraRef = useRef<any>(null);
  const bloqueadoAutoScan = useRef(false);

  useEffect(() => {
    let intervalo: any;
    if (paso === 'FOTO_FECHA') {
      intervalo = setInterval(async () => {
        if (!bloqueadoAutoScan.current && !procesando) await autoEscanearMLKit();
      }, 2500);
    }
    return () => { if (intervalo) clearInterval(intervalo); };
  }, [paso, procesando, datosTemporales]);

  const guardarYRedirigir = async (nuevoProducto: any) => {
    try {
      const productoCompleto = { ...nuevoProducto, id: Date.now().toString(), fechaRegistro: new Date().toLocaleDateString('es-ES') };
      const datosPrevios = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      const inventario = datosPrevios ? JSON.parse(datosPrevios) : [];
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify([productoCompleto, ...inventario]));
      
      setPaso('INICIAL');
      setDatosTemporales(null);
      router.push('/'); 
    } catch (e) {
      console.error("Error al guardar", e);
    }
  };

  const buscarPorCodigoBarras = async (codigo: string) => {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) return { nombre: data.product.product_name_es || data.product.product_name || "Producto Empacado", marca: data.product.brands || "Marca General" };
      return null;
    } catch (e) { return null; }
  };

  const manejarCodigoEscaneado = async ({ data }: { data: string }) => {
    if (codigoLeido === data || procesando || paso !== 'INICIAL') return;
    setCodigoLeido(data);
    setProcesando(true);
    const info = await buscarPorCodigoBarras(data);
    if (info) { setDatosTemporales(info); setPaso('FOTO_FECHA'); } 
    else { setDatosTemporales(null); setPaso('FOTO_PRODUCTO'); }
    setProcesando(false);
  };

  const obtenerFotoRecortada = async (soloCentro = false) => {
    if (!cameraRef.current) return null;
    try {
      const fotoOriginal = await cameraRef.current.takePictureAsync({ quality: 0.6, skipProcessing: true });
      if (!fotoOriginal?.uri) return null;
      let acciones: any[] = [{ resize: { width: 800 } }];
      if (soloCentro) acciones.push({ crop: { originX: 100, originY: 250, width: 600, height: 350 } });
      return await manipulateAsync(fotoOriginal.uri, acciones, { compress: 0.7, format: SaveFormat.JPEG, base64: true });
    } catch (err) { return null; }
  };

  const autoEscanearMLKit = async () => {
    if (!datosTemporales || bloqueadoAutoScan.current) return;
    try {
      bloqueadoAutoScan.current = true;
      setBuscandoAuto(true);
      const foto = await obtenerFotoRecortada(true);
      if (foto?.uri) {
        const resultadoOCR = await TextRecognition.recognize(foto.uri);
        const fechaValida = extraerFechaLocal(resultadoOCR.text);
        if (fechaValida) await guardarYRedirigir({ nombre: datosTemporales.nombre, marca: datosTemporales.marca, categoria: "Empacado", vencimiento: fechaValida });
      }
    } catch (e) {
    } finally {
      setBuscandoAuto(false);
      bloqueadoAutoScan.current = false;
    }
  };

  const consultarGemini = async (prompt: string, base64Image: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: base64Image } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
      }),
    });
    const resData = await response.json();
    const textoRaw = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    const jsonMatch = textoRaw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  };

  const capturarIdentidadProducto = async () => {
    try {
      setProcesando(true);
      const foto = await obtenerFotoRecortada(false);
      if (!foto || !foto.base64) {
        alert("No se pudo capturar la imagen. Inténtalo de nuevo.");
        return;
      }
      const prompt = `Analiza la etiqueta. Responde ÚNICAMENTE este JSON: {"nombre": "Nombre", "marca": "Marca"}`;
      const resultado = await consultarGemini(prompt, foto.base64);
      setDatosTemporales({ nombre: resultado.nombre || "Producto Detectado", marca: resultado.marca || "Sin Marca" });
      setPaso('FOTO_FECHA');
    } catch (e) { alert("Error"); } finally { setProcesando(false); }
  };

  const capturarFechaManualGemini = async () => {
    if (!datosTemporales) return;
    try {
      setProcesando(true);
      bloqueadoAutoScan.current = true;
      const foto = await obtenerFotoRecortada(true);
      if (!foto || !foto.base64) {
        alert("No se pudo capturar la imagen. Inténtalo de nuevo.");
        return;
      }
      const prompt = `Analiza la FECHA DE VENCIMIENTO. Responde ÚNICAMENTE este JSON: {"vencimiento": "Fecha formateada"}`;
      const resultado = await consultarGemini(prompt, foto.base64);
      await guardarYRedirigir({ nombre: datosTemporales.nombre, marca: datosTemporales.marca, categoria: "Empacado", vencimiento: resultado.vencimiento || "No visible" });
    } catch (e) { alert("Error"); } finally { setProcesando(false); bloqueadoAutoScan.current = false; }
  };

  const capturarFrutaOProductoDirecto = async () => {
    try {
      setProcesando(true);
      const foto = await obtenerFotoRecortada(false);
      if (!foto || !foto.base64) {
        alert("No se pudo capturar la imagen. Inténtalo de nuevo.");
        return;
      }
      const prompt = `Analiza esta fruta. Responde ÚNICAMENTE este JSON: {"nombre": "Nombre", "marca": "Sin Marca", "categoria": "Fruta/Verdura", "vencimiento": "Consumir en X días"}`;
      const resultado = await consultarGemini(prompt, foto.base64);
      await guardarYRedirigir({ nombre: resultado.nombre || "Fruta", marca: resultado.marca || "Sin Marca", categoria: resultado.categoria || "Fruta/Verdura", vencimiento: resultado.vencimiento || "Sin fecha" });
    } catch (e) { alert("Error"); } finally { setProcesando(false); }
  };

  if (!permiso) return <View style={styles.center}><ActivityIndicator size="large" color="#1b5e20" /></View>;
  if (!permiso.granted) return <View style={styles.center}><Text>Necesitamos acceso a la cámara</Text><TouchableOpacity onPress={pedirPermiso}><Text>DAR PERMISO</Text></TouchableOpacity></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.camaraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camara}
          facing="back"
          enableTorch={flashEncendido}
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
          onBarcodeScanned={paso === 'INICIAL' ? manejarCodigoEscaneado : undefined}
        >
          <TouchableOpacity style={styles.botonFlash} onPress={() => setFlashEncendido(!flashEncendido)}>
            <Text style={styles.textoFlash}>{flashEncendido ? "💡 LUZ ON" : "🔦 LUZ OFF"}</Text>
          </TouchableOpacity>
          {paso === 'FOTO_FECHA' && (
            <View style={styles.overlayEnfoqueContainer}>
              <View style={[styles.recuadroEnfoque, buscandoAuto && styles.recuadroEscaneando]}>
                <Text style={styles.textoGuiaCuadro}>{buscandoAuto ? "⚡ ESCANEANDO..." : "CENTRA LA FECHA"}</Text>
              </View>
            </View>
          )}
        </CameraView>

        <View style={styles.panelAcciones}>
          {procesando ? (
            <View style={styles.cargandoBox}>
              <ActivityIndicator size="large" color="#2e7d32" />
              <Text style={styles.textoCargando}>Analizando con IA...</Text>
            </View>
          ) : (
            <View style={styles.grupoBotones}>
              {paso === 'FOTO_PRODUCTO' && (
                <TouchableOpacity style={styles.botonGiganteVerde} onPress={capturarIdentidadProducto}>
                  <Text style={styles.textoBotonGigante}>📸 FOTO AL PRODUCTO (PASO 1)</Text>
                </TouchableOpacity>
              )}
              {paso === 'FOTO_FECHA' && (
                <TouchableOpacity style={styles.botonGiganteVerde} onPress={capturarFechaManualGemini}>
                  <Text style={styles.textoBotonGigante}>🤖 LEER FECHA (GEMINI)</Text>
                </TouchableOpacity>
              )}
              {paso === 'FRUTA_DIRECTA' && (
                <TouchableOpacity style={styles.botonGiganteVerde} onPress={capturarFrutaOProductoDirecto}>
                  <Text style={styles.textoBotonGigante}>📸 CAPTURAR FRUTA</Text>
                </TouchableOpacity>
              )}
              {paso === 'INICIAL' && (
                <TouchableOpacity style={[styles.botonGiganteVerde, { backgroundColor: '#388e3c' }]} onPress={() => setPaso('FRUTA_DIRECTA')}>
                  <Text style={styles.textoBotonGigante}>🍎 FRUTA, VERDURA O SIN CÓDIGO</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camaraContainer: { flex: 1 },
  camara: { flex: 1, padding: 10 },
  botonFlash: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 15, zIndex: 10 },
  textoFlash: { color: '#fff', fontWeight: 'bold' },
  overlayEnfoqueContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  recuadroEnfoque: { width: SCREEN_WIDTH * 0.75, height: 120, borderWidth: 3, borderColor: '#ff1744', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  recuadroEscaneando: { borderColor: '#00e676', backgroundColor: 'rgba(0, 230, 118, 0.15)' },
  textoGuiaCuadro: { color: '#ffffff', fontWeight: 'bold', fontSize: 12, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  panelAcciones: { backgroundColor: '#fff', padding: 15, paddingBottom: 30 },
  grupoBotones: { gap: 8 },
  botonGiganteVerde: { backgroundColor: '#2e7d32', paddingVertical: 16, borderRadius: 15, alignItems: 'center' },
  textoBotonGigante: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  cargandoBox: { paddingVertical: 15, alignItems: 'center' },
  textoCargando: { color: '#2e7d32', fontSize: 15, fontWeight: 'bold', marginTop: 8 },
});