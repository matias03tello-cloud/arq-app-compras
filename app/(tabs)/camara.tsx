import AsyncStorage from '@react-native-async-storage/async-storage';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';

const GEMINI_API_KEY: string = "AQ.Ab8RN6LWApTODRrtRME3OKQu5_9ZCD3LBh-ZsxgJPJCQ5NnJjg";
const GEMINI_MODEL: string = "gemini-3.1-flash-lite";
const ASYNC_STORAGE_KEY = '@inventario_abuelitas_v4';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface Producto {
  id: string;
  nombre: string;
  marca: string;
  vencimiento: string;
  categoria: string;
  fechaRegistro: string;
}

type PasoFlujo = 'INICIAL' | 'FOTO_PRODUCTO' | 'FOTO_FECHA' | 'FRUTA_DIRECTA';

const extraerFechaLocal = (textoOCR: string): string | null => {
  if (!textoOCR) return null;

  let texto = textoOCR.toUpperCase();
  texto = texto
    .replace(/\bO(?=\d)/g, '0')
    .replace(/(?<=\d)O\b/g, '0')
    .replace(/\bOS[/\.-]/g, '05/')
    .replace(/[\.\s-]+/g, '/');

  const patronDiaMesAnio = /\b(0?[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(2[4-9]|[3-4][0-9]|202[4-9]|203[0-9])\b/g;
  let match = patronDiaMesAnio.exec(texto);
  if (match) {
    const dia = match[1].padStart(2, '0');
    const mes = match[2];
    let anio = match[3];
    if (anio.length === 2) anio = `20${anio}`;
    return `${dia}/${mes}/${anio}`;
  }

  const patronMesAnio = /\b(0[1-9]|1[0-2])\/(2[4-9]|[3-4][0-9]|202[4-9]|203[0-9])\b/g;
  match = patronMesAnio.exec(texto);
  if (match) {
    const mes = match[1];
    let anio = match[2];
    if (anio.length === 2) anio = `20${anio}`;
    return `${mes}/${anio}`;
  }

  return null;
};

export default function AppHibrida() {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [procesando, setProcesando] = useState(false);
  const [buscandoAuto, setBuscandoAuto] = useState(false);
  const [flashEncendido, setFlashEncendido] = useState<boolean>(false);
  const [inventario, setInventario] = useState<Producto[]>([]);
  const [ultimoResultado, setUltimoResultado] = useState<Producto | null>(null);

  const [paso, setPaso] = useState<PasoFlujo>('INICIAL');
  const [codigoLeido, setCodigoLeido] = useState<string | null>(null);
  const [datosTemporales, setDatosTemporales] = useState<{ nombre: string; marca: string } | null>(null);

  const cameraRef = useRef<any>(null);
  const bloqueadoAutoScan = useRef<boolean>(false);

  // --- PALETA DINÁMICA DE COLORES ---
  const temaSistema = useColorScheme();
  const isDark = temaSistema === 'dark';
  const colorFondo = isDark ? '#000000' : '#f4f6f8';
  const colorTarjeta = isDark ? '#1C1C1E' : '#ffffff';
  const colorTexto = isDark ? '#FFFFFF' : '#333333';
  const colorSubtexto = isDark ? '#8E8E93' : '#555555';
  const colorBorde = isDark ? '#38383A' : '#e0e0e0';

  useEffect(() => {
    cargarInventarioLocal();
  }, []);

  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval>;

    if (paso === 'FOTO_FECHA') {
      intervalo = setInterval(async () => {
        if (!bloqueadoAutoScan.current && !procesando) {
          await autoEscanearMLKit();
        }
      }, 1200);
    }

    return () => {
      if (intervalo) clearInterval(intervalo);
    };
  }, [paso, procesando, datosTemporales]);

  const cargarInventarioLocal = async () => {
    try {
      const datos = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (datos) setInventario(JSON.parse(datos));
    } catch (e) {
      console.error("Error al cargar memoria local", e);
    }
  };

  const guardarEnMemoriaLocal = async (nuevoProducto: Omit<Producto, 'id' | 'fechaRegistro'>) => {
    try {
      const productoCompleto: Producto = {
        ...nuevoProducto,
        id: Date.now().toString(),
        fechaRegistro: new Date().toLocaleDateString('es-ES'),
      };
      const nuevaLista = [productoCompleto, ...inventario];
      setInventario(nuevaLista);
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(nuevaLista));
      return productoCompleto;
    } catch (e) {
      console.error("Error al guardar en memoria local", e);
      return null;
    }
  };

  const buscarPorCodigoBarras = async (codigo: string) => {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json`);
      const data = await res.json();

      if (data.status === 1 && data.product) {
        return {
          nombre: data.product.product_name_es || data.product.product_name || "Producto Empacado",
          marca: data.product.brands || "Marca General",
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const manejarCodigoEscaneado = async ({ data }: { data: string }) => {
    if (codigoLeido === data || procesando || paso !== 'INICIAL') return;
    setCodigoLeido(data);
    setProcesando(true);

    const info = await buscarPorCodigoBarras(data);

    if (info) {
      setDatosTemporales(info);
      setPaso('FOTO_FECHA');
    } else {
      setDatosTemporales(null);
      setPaso('FOTO_PRODUCTO');
    }
    setProcesando(false);
  };

  const obtenerFotoRecortada = async (soloCentro = false) => {
    if (!cameraRef.current) return null;
    try {
      const fotoOriginal = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
      });

      if (!fotoOriginal?.uri) return null;

      let acciones: any[] = [{ resize: { width: 800 } }];

      if (soloCentro) {
        acciones.push({
          crop: {
            originX: 100,
            originY: 250,
            width: 600,
            height: 350,
          },
        });
      }

      return await manipulateAsync(
        fotoOriginal.uri,
        acciones,
        { compress: 0.3, format: SaveFormat.JPEG, base64: true }
      );
    } catch (err) {
      return null;
    }
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

        if (fechaValida) {
          const productoGuardado = await guardarEnMemoriaLocal({
            nombre: datosTemporales.nombre,
            marca: datosTemporales.marca,
            categoria: "Empacado",
            vencimiento: fechaValida,
          });
          setUltimoResultado(productoGuardado);
        }
      }
    } catch (e) {
      // Ignorar errores
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
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
      }),
    });

    const resData = await response.json();
    if (!response.ok) throw new Error(resData?.error?.message || 'Error en Gemini API');

    const textoRaw = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textoRaw) throw new Error('Respuesta vacía de IA');

    const jsonMatch = textoRaw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Formato JSON no válido');

    return JSON.parse(jsonMatch[0]);
  };

  const capturarIdentidadProducto = async () => {
    try {
      setProcesando(true);
      const foto = await obtenerFotoRecortada(false);
      if (!foto?.base64) return alert("Error al tomar la foto.");

      const prompt = `Analiza la etiqueta o frente de este producto. Identifica su NOMBRE y MARCA exactos. Responde ÚNICAMENTE este JSON: {"nombre": "Nombre del producto", "marca": "Marca o Sin Marca"}`;
      const resultado = await consultarGemini(prompt, foto.base64);

      setDatosTemporales({
        nombre: resultado.nombre || "Producto Detectado",
        marca: resultado.marca || "Sin Marca",
      });
      setPaso('FOTO_FECHA');
    } catch (e: any) {
      alert("No se pudo identificar el producto: " + e.message);
    } finally {
      setProcesando(false);
    }
  };

  const capturarFechaManualGemini = async () => {
    if (!datosTemporales) return;
    try {
      setProcesando(true);
      bloqueadoAutoScan.current = true;

      const foto = await obtenerFotoRecortada(true);
      if (!foto?.base64) return alert("Error al tomar la foto.");

      const prompt = `Analiza la FECHA DE VENCIMIENTO en esta foto. SI INCLUYE DÍA (ej: "27/02/2027"), CONSERVA EL DÍA EXACTO. Ignora lote. Responde ÚNICAMENTE este JSON: {"vencimiento": "Fecha formateada (DD/MM/AAAA o MM/AAAA) o 'No visible'"}`;
      const resultado = await consultarGemini(prompt, foto.base64);

      const productoGuardado = await guardarEnMemoriaLocal({
        nombre: datosTemporales.nombre,
        marca: datosTemporales.marca,
        categoria: "Empacado",
        vencimiento: resultado.vencimiento || "No visible",
      });

      setUltimoResultado(productoGuardado);
    } catch (e: any) {
      alert("Error al leer la fecha: " + e.message);
    } finally {
      setProcesando(false);
      bloqueadoAutoScan.current = false;
    }
  };

  const capturarFrutaOProductoDirecto = async () => {
    try {
      setProcesando(true);
      const foto = await obtenerFotoRecortada(false);
      if (!foto?.base64) return alert("Error al tomar la foto.");

      const prompt = `Analiza esta foto de una fruta, verdura o producto sin código. Responde ÚNICAMENTE este JSON: {"nombre": "Nombre", "marca": "Marca o Sin Marca", "categoria": "Fruta/Verdura", "vencimiento": "Consumir en X días o fecha visible"}`;
      const resultado = await consultarGemini(prompt, foto.base64);

      const productoGuardado = await guardarEnMemoriaLocal({
        nombre: resultado.nombre || "Fruta/Verdura",
        marca: resultado.marca || "Sin Marca",
        categoria: resultado.categoria || "Fruta/Verdura",
        vencimiento: resultado.vencimiento || "Sin fecha",
      });

      setUltimoResultado(productoGuardado);
    } catch (e: any) {
      alert("Error al analizar la imagen: " + e.message);
    } finally {
      setProcesando(false);
    }
  };

  const reiniciarFormulario = () => {
    setUltimoResultado(null);
    setCodigoLeido(null);
    setDatosTemporales(null);
    bloqueadoAutoScan.current = false;
    setPaso('INICIAL');
  };

  if (!permiso) return <View style={[styles.center, { backgroundColor: colorFondo }]}><ActivityIndicator size="large" color="#1b5e20" /></View>;
  if (!permiso.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colorFondo }]}>
        <Text style={[styles.textoGeneral, { color: colorTexto }]}>Necesitamos acceso a la cámara 📷</Text>
        <TouchableOpacity style={styles.botonGiganteVerde} onPress={pedirPermiso}>
          <Text style={styles.textoBotonGigante}>DAR PERMISO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorFondo }]}>
      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Lector Inteligente de Productos</Text>
      </View>

      {!ultimoResultado ? (
        <View style={styles.camaraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camara}
            facing="back"
            enableTorch={flashEncendido}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
            }}
            onBarcodeScanned={paso === 'INICIAL' ? manejarCodigoEscaneado : undefined}
          >
            <TouchableOpacity style={styles.botonFlash} onPress={() => setFlashEncendido(!flashEncendido)}>
              <Text style={styles.textoFlash}>{flashEncendido ? "💡 LUZ ON" : "🔦 LUZ OFF"}</Text>
            </TouchableOpacity>

            {/* MÁSCARA DE ESCANEO DE CÓDIGO DE BARRAS */}
            {paso === 'INICIAL' && !procesando && (
              <View style={styles.overlayEnfoqueContainer}>
                <View style={styles.mascaraEscaneoBox}>
                  <View style={[styles.esquina, styles.esquinaTL]} />
                  <View style={[styles.esquina, styles.esquinaTR]} />
                  <View style={[styles.esquina, styles.esquinaBL]} />
                  <View style={[styles.esquina, styles.esquinaBR]} />
                </View>
                <Text style={styles.textoMascara}>Apunta el código de barras aquí</Text>
              </View>
            )}

            {/* MÁSCARA DE FECHA DE VENCIMIENTO */}
            {paso === 'FOTO_FECHA' && (
              <View style={styles.overlayEnfoqueContainer}>
                <View style={[styles.recuadroEnfoque, buscandoAuto && styles.recuadroEscaneando]}>
                  <Text style={styles.textoGuiaCuadro}>
                    {buscandoAuto ? "⚡ ESCANEANDO FECHA..." : "CENTRA AQUÍ LA FECHA DE VENCIMIENTO"}
                  </Text>
                </View>
              </View>
            )}
          </CameraView>

          {/* APLICANDO COLOR DE TARJETA DINÁMICA AQUÍ */}
          <View style={[styles.panelAcciones, { backgroundColor: colorTarjeta }]}>
            {paso === 'INICIAL' && (
              <View style={styles.bannerInfo}>
                <Text style={styles.textoBannerTitulo}>🔍 Apunta a un Código de Barras</Text>
                <Text style={styles.textoBannerSub}>O selecciona fruta/verdura en el botón inferior</Text>
              </View>
            )}

            {paso === 'FOTO_PRODUCTO' && (
              <View style={[styles.bannerInfo, { backgroundColor: '#fff3e0', borderColor: '#ffe0b2' }]}>
                <Text style={[styles.textoBannerTitulo, { color: '#e65100' }]}>⚠️ Código no registrado</Text>
                <Text style={styles.textoBannerSub}>Paso 1: Toma foto al frente del producto</Text>
              </View>
            )}

            {paso === 'FOTO_FECHA' && datosTemporales && (
              <View style={styles.bannerInfo}>
                <Text style={styles.textoBannerTitulo}>✓ {datosTemporales.nombre} ({datosTemporales.marca})</Text>
                <Text style={styles.textoBannerSub}>Buscando fecha automática...</Text>
              </View>
            )}

            {paso === 'FRUTA_DIRECTA' && (
              <View style={[styles.bannerInfo, { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' }]}>
                <Text style={[styles.textoBannerTitulo, { color: '#2e7d32' }]}>🍎 Fruta / Verdura / Sin Código</Text>
                <Text style={styles.textoBannerSub}>Encuadra el alimento en la cámara</Text>
              </View>
            )}

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
                    <Text style={styles.textoBotonGigante}>🤖 LEER FECHA CON IA (GEMINI)</Text>
                  </TouchableOpacity>
                )}

                {paso === 'FRUTA_DIRECTA' && (
                  <TouchableOpacity style={styles.botonGiganteVerde} onPress={capturarFrutaOProductoDirecto}>
                    <Text style={styles.textoBotonGigante}>📸 CAPTURAR FRUTA / PRODUCTO</Text>
                  </TouchableOpacity>
                )}

                {paso === 'INICIAL' && (
                  <TouchableOpacity
                    style={[styles.botonGiganteVerde, { backgroundColor: '#388e3c' }]}
                    onPress={() => setPaso('FRUTA_DIRECTA')}
                  >
                    <Text style={styles.textoBotonGigante}>🍎 / 🥦 FRUTA, VERDURA O SIN CÓDIGO</Text>
                  </TouchableOpacity>
                )}

                {paso !== 'INICIAL' && (
                  <TouchableOpacity style={styles.botonCancelar} onPress={reiniciarFormulario}>
                    <Text style={styles.textoBotonCancelar}>↩ Cancelar / Volver a empezar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.inventarioContainer}>
          <View style={styles.tarjetaConfirmacion}>
            <Text style={styles.badgeExito}>✓ REGISTRADO EN MEMORIA</Text>
            <Text style={styles.nombreRegistrado}>{ultimoResultado.nombre}</Text>
            <Text style={styles.detalleRegistrado}>
              Marca: {ultimoResultado.marca} | Vence: {ultimoResultado.vencimiento}
            </Text>
          </View>

          <TouchableOpacity style={styles.botonGiganteVerde} onPress={reiniciarFormulario}>
            <Text style={styles.textoBotonGigante}>📸 ESCANEAR OTRO PRODUCTO</Text>
          </TouchableOpacity>

          <Text style={[styles.subtituloLista, { color: colorTexto }]}>Productos Guardados ({inventario.length}):</Text>

          <FlatList
            data={inventario}
            keyExtractor={(item) => item.id}
            style={styles.lista}
            renderItem={({ item }) => (
              <View style={[styles.itemTarjeta, { backgroundColor: colorTarjeta, borderColor: colorBorde, borderWidth: 1 }]}>
                <View style={styles.itemFila}>
                  <Text style={[styles.itemNombre, { color: colorTexto }]}>{item.nombre}</Text>
                  <Text style={styles.itemFechaReg}>{item.fechaRegistro}</Text>
                </View>
                <Text style={[styles.itemDetalle, { color: colorSubtexto }]}>Marca: {item.marca} | Tipo: {item.categoria}</Text>
                <Text style={styles.itemVencimiento}>Vence: {item.vencimiento}</Text>
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { backgroundColor: '#1b5e20', paddingVertical: 15, alignItems: 'center' },
  tituloHeader: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  textoGeneral: { fontSize: 18, marginBottom: 20, textAlign: 'center' },
  camaraContainer: { flex: 1, margin: 10, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  camara: { flex: 1, padding: 10 },
  botonFlash: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 15, zIndex: 10 },
  textoFlash: { color: '#fff', fontWeight: 'bold' },
  overlayEnfoqueContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recuadroEnfoque: {
    width: SCREEN_WIDTH * 0.75,
    height: 120,
    borderWidth: 3,
    borderColor: '#ff1744',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  recuadroEscaneando: {
    borderColor: '#00e676',
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  textoGuiaCuadro: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  panelAcciones: { padding: 15, paddingBottom: 35 },
  bannerInfo: { backgroundColor: '#e8f5e9', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#a5d6a7' },
  textoBannerTitulo: { color: '#1b5e20', fontWeight: 'bold', fontSize: 16 },
  textoBannerSub: { color: '#555', fontSize: 13, marginTop: 2 },
  grupoBotones: { gap: 8 },
  botonGiganteVerde: { backgroundColor: '#2e7d32', paddingVertical: 16, borderRadius: 15, alignItems: 'center', elevation: 3 },
  textoBotonGigante: { color: '#fff', fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  botonCancelar: { paddingVertical: 10, alignItems: 'center' },
  textoBotonCancelar: { color: '#c62828', fontSize: 14, fontWeight: 'bold' },
  cargandoBox: { paddingVertical: 15, alignItems: 'center' },
  textoCargando: { color: '#2e7d32', fontSize: 15, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  inventarioContainer: { flex: 1, padding: 15 },
  tarjetaConfirmacion: { backgroundColor: '#e8f5e9', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#a5d6a7', marginBottom: 15 },
  badgeExito: { color: '#2e7d32', fontWeight: 'bold', fontSize: 14 },
  nombreRegistrado: { fontSize: 24, fontWeight: 'bold', color: '#1b5e20', marginVertical: 4 },
  detalleRegistrado: { fontSize: 15, color: '#444' },
  subtituloLista: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
  lista: { flex: 1 },
  itemTarjeta: { padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  itemFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNombre: { fontSize: 18, fontWeight: 'bold' },
  itemFechaReg: { fontSize: 12, color: '#888' },
  itemDetalle: { fontSize: 14, marginTop: 4 },
  itemVencimiento: { fontSize: 15, color: '#c62828', fontWeight: 'bold', marginTop: 2 },
  
  mascaraEscaneoBox: {
    width: 250,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  textoMascara: {
    color: '#FFF',
    marginTop: 20,
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden'
  },
  esquina: { position: 'absolute', width: 30, height: 30, borderColor: '#00E676' },
  esquinaTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  esquinaTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  esquinaBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  esquinaBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
});