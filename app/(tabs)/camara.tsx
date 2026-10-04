import { useCompraMultiple } from '../../components/mobile/CompraMultiple';
import { useInventarioApp } from '../../components/mobile/InventarioApp';
import { avisoDuplicado } from '../../services/comprasModelo';
/** Ingreso protegido, código manual y dataset propio de alimentos sin código. */
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTemaApp } from '../../components/mobile/TemaApp';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { agregarAlInventario, fechaTextoADate } from '../../services/inventarioFirestore';
import { buscarProductoPorCodigo, guardarProductoCatalogo, reportarErrorProducto } from '../../services/productos';
import type { CategoriaProducto, ProductoCatalogo, ProductoInventario } from '../../services/productos';
import { CATEGORIAS, codigoValido } from '../../security/validation';
import { accionPermisoCamara, crearControlCamara, motivoCamaraWeb } from '../../security/camara';
import { ejecutarOCRLocal } from '../../services/ocrLocal';
import { extraerFechasOCR } from '../../services/fechas';
import { ALIMENTOS_SIN_CODIGO, UBICACIONES, UNIDADES_GRANEL, alimentoGenerico, cantidadValida, validarNombreManual, normalizarBusqueda } from '../../security/identidadProducto';

function Boton({ titulo, onPress, secundario, ocupado, colores }: {
  titulo: string; onPress: () => void; secundario: boolean; ocupado: boolean;
  colores: { tarjeta: string; borde: string; texto: string };
}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: ocupado }} disabled={ocupado}
    style={[styles.boton, secundario ? { backgroundColor: colores.tarjeta, borderColor: colores.borde } : styles.primario, ocupado && { opacity: 0.5 }]}
    onPress={onPress}><Text style={[styles.botonTexto, { color: secundario ? colores.texto : '#FFFFFF' }]}>{titulo}</Text></TouchableOpacity>;
}

type Paso = 'inicio' | 'escaner' | 'codigo' | 'manual' | 'genericos' | 'detalle' | 'exito';
function mensajeError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) return 'No se pudo completar la operación. Revisa la conexión, tu sesión y que las reglas de Firebase estén actualizadas.';
  return error instanceof Error ? error.message : 'No se pudo completar la operación. Intenta otra vez.';
}

export default function PantallaCamara() {
  const compra = useCompraMultiple();
  const compraMultiple = useLocalSearchParams<{compra?:string}>().compra === '1';
  const inventarioDuplicados = useInventarioApp();

  const [permiso, pedirPermiso, consultarPermiso] = useCameraPermissions();
  const [paso, setPaso] = useState<Paso>('inicio');
  const [producto, setProducto] = useState<ProductoCatalogo | null>(null);
  const [resultado, setResultado] = useState<ProductoInventario | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [formato, setFormato] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProducto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [fecha, setFecha] = useState('');
  const [sinFecha, setSinFecha] = useState(false);
  const [ubicacion, setUbicacion] = useState<typeof UBICACIONES[number]>('Despensa');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [verCamaraFecha, setVerCamaraFecha] = useState(false);
  const [reporte, setReporte] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [enFoco, setEnFoco] = useState(false);
  const [estadoApp, setEstadoApp] = useState(AppState.currentState);
  const [revisandoPermiso, setRevisandoPermiso] = useState(false);
  const [solicitandoPermiso, setSolicitandoPermiso] = useState(false);
  const [errorPermiso, setErrorPermiso] = useState('');
  const [errorCamara, setErrorCamara] = useState('');
  const [escaneoArmado, setEscaneoArmado] = useState(true);
  const [candidatasFecha, setCandidatasFecha] = useState<string[]>([]);
  const [controlCamara] = useState(crearControlCamara);
  const { id: sesionCamara, lista: camaraLista } = useSyncExternalStore(controlCamara.suscribir, controlCamara.estado, controlCamara.estado);
  const camara = useRef<CameraView>(null);
  const operacion = useRef(0);
  const bloqueado = useRef(false);
  const { colores } = useTemaApp();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (error || mensaje) scroll.current?.scrollToEnd({ animated: true });
      else scroll.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [paso, error, mensaje]);

  useFocusEffect(useCallback(() => {
    setEnFoco(true);
    return () => { controlCamara.cerrar(); operacion.current++; bloqueado.current = false; setOcupado(false); setEnFoco(false); setFlash(false); };
  }, [controlCamara]));

  const refrescarPermiso = useCallback(async () => {
    setRevisandoPermiso(true); setErrorPermiso('');
    try { await consultarPermiso(); }
    catch { setErrorPermiso('No se pudo consultar el permiso. Puedes continuar con el ingreso manual.'); }
    finally { setRevisandoPermiso(false); }
  }, [consultarPermiso]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', estado => {
      setEstadoApp(estado);
      if (estado !== 'active') {
        controlCamara.cerrar(); setFlash(false);
      } else {
        // Al volver de Ajustes se verifica si el permiso cambió antes de reabrir la cámara.
        void refrescarPermiso();
      }
    });
    return () => sub.remove();
  }, [controlCamara, refrescarPermiso]);

  const bloqueoWeb = Platform.OS === 'web' ? motivoCamaraWeb({
    contextoSeguro: typeof window !== 'undefined' && window.isSecureContext,
    capturaDisponible: typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function',
    // Impide ejecutar la alternativa de expo-camera que descarga WASM desde un CDN.
    lectorIntegrado: typeof (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector === 'function',
  }) : null;
  const mostrarVisor = paso === 'escaner' || (paso === 'detalle' && verCamaraFecha);
  const habilitarCamara = enFoco && estadoApp === 'active' && permiso?.granted === true
    && mostrarVisor && !revisandoPermiso && !errorPermiso && !errorCamara && !bloqueoWeb;

  useEffect(() => {
    if (!habilitarCamara) { controlCamara.cerrar(); return; }
    controlCamara.abrir();
    return () => controlCamara.cerrar();
  }, [habilitarCamara, controlCamara]);

  const gestionarPermiso = async () => {
    if (solicitandoPermiso) return;
    setSolicitandoPermiso(true); setErrorPermiso('');
    try {
      if (accionPermisoCamara(permiso) === 'ajustes') {
        if (Platform.OS === 'web') setErrorPermiso('Habilita la cámara en los permisos de este sitio y vuelve a comprobar el permiso.');
        else await Linking.openSettings();
      } else {
        const respuesta = await pedirPermiso();
        if (!respuesta.granted) setMensaje('Puedes seguir usando el ingreso manual sin permitir la cámara.');
      }
    } catch { setErrorPermiso('No se pudo abrir el permiso. Puedes habilitar la cámara en Ajustes o continuar manualmente.'); }
    finally { setSolicitandoPermiso(false); }
  };


  const ejecutar = async (trabajo: (vigente: () => boolean) => Promise<void>) => {
    if (bloqueado.current) return;
    bloqueado.current = true; setOcupado(true); setError(''); setMensaje('');
    const id = ++operacion.current;
    const vigente = () => id === operacion.current;
    try { await trabajo(vigente); }
    catch (e) { if (vigente()) setError(mensajeError(e)); }
    finally { if (vigente()) { bloqueado.current = false; setOcupado(false); } }
  };

  const volverInicio = () => {
    if (bloqueado.current) return;
    setPaso('inicio'); setProducto(null); setResultado(null); setCodigo('');
    setNombre(''); setMarca(''); setFormato(''); setCategoria(null); setBusqueda('');
    setCantidad('1'); setFecha(''); setSinFecha(false); setReporte(null);
    setUbicacion('Despensa'); setVerCamaraFecha(false); setError(''); setMensaje(''); setFlash(false);
    setErrorCamara(''); setEscaneoArmado(true); setCandidatasFecha([]); controlCamara.cerrar();
  };
  const elegir = (p: ProductoCatalogo) => {
    setProducto(p); setPaso('detalle'); setCantidad('1'); setFecha(''); setCandidatasFecha([]); setFlash(false); controlCamara.cerrar();
    setSinFecha(p.origen === 'generico'); setReporte(null); setVerCamaraFecha(false);
    setUbicacion(p.origen === 'generico' ? 'Refrigerador' : 'Despensa');
  };
  const buscarCodigo = (valor: string) => ejecutar(async vigente => {
    const limpio = codigoValido(valor.trim());
    const encontrado = await buscarProductoPorCodigo(limpio);
    if (!vigente()) return;
    setCodigo(limpio);
    if (encontrado) elegir(encontrado);
    else { setNombre(''); setMarca(''); setFormato(''); setCategoria(null); setPaso('manual'); }
  });
  const guardarManual = () => ejecutar(async vigente => {
    if (!categoria) throw new Error('Selecciona la categoría del alimento.');
    const nuevo: ProductoCatalogo = { codigoBarras: codigo, nombre: validarNombreManual(nombre),
      marca: marca.trim() || 'Sin marca', categoria, formato: formato.trim() || 'Formato no informado', unidad: 'unidad', activo: true };
    await guardarProductoCatalogo(nuevo);
    if (vigente()) elegir({ ...nuevo, origen: 'personal' });
  });
  const guardar = () => ejecutar(async vigente => {
    if (!producto) return;
    const numero = Number(cantidad.replace(',', '.'));
    if (!/^\d+(?:[.,]\d{1,3})?$/.test(cantidad) || !cantidadValida(numero, producto.codigoBarras, producto.unidad)) {
      throw new Error(producto.origen === 'generico' && producto.unidad !== 'unidad'
        ? 'Ingresa una cantidad mayor que 0 y hasta 999, con un máximo de 3 decimales.' : 'Ingresa una cantidad entera entre 1 y 999.');
    }
    if (!sinFecha && !fechaTextoADate(fecha)) throw new Error('Revisa la fecha. Usa DD/MM/AAAA o MM/AAAA.');
    const datos = { codigoBarras: producto.codigoBarras, nombre: producto.nombre,
      marca: producto.marca, categoria: producto.categoria, formato: producto.formato, unidad: producto.unidad,
      cantidad: numero, vencimiento: sinFecha ? 'Sin fecha' : fecha, ubicacion };
    if (compraMultiple) { compra.agregar(datos); if (vigente()) { volverInicio(); router.setParams({compra:'0'}); router.push('/registro-compras'); } return; }
    const nuevo = await agregarAlInventario(datos);
    if (vigente()) { setResultado(nuevo); setPaso('exito'); setVerCamaraFecha(false); }
  });
  const leerFecha = () => ejecutar(async vigente => {
    if (Platform.OS === 'web') throw new Error('Escribe la fecha del envase en el navegador.');
    const sesion = controlCamara.iniciar();
    const valida = () => vigente() && controlCamara.vigente(sesion);
    const vista = camara.current;
    if (!vista) throw new Error('Activa la cámara para leer la fecha.');
    let reconocer: (uri: string) => Promise<{ text: string }>;
    try {
      const modulo = (await import('@react-native-ml-kit/text-recognition')).default;
      reconocer = uri => modulo.recognize(uri);
    } catch {
      throw new Error('La lectura de fecha necesita la versión instalada de FrescApp con OCR. Mientras tanto, escribe la fecha.');
    }
    if (!valida()) return;
    const lectura = await ejecutarOCRLocal({
      vigente: valida,
      capturar: async () => (await vista.takePictureAsync({ quality: 0.8 }))?.uri,
      reducir: async uri => (await manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.8, format: SaveFormat.JPEG })).uri,
      reconocer: async uri => (await reconocer(uri)).text,
      eliminar: uri => FileSystem.deleteAsync(uri, { idempotent: true }),
    }).catch(() => { throw new Error('No se pudo leer la foto en el dispositivo. Vuelve a intentar o escribe la fecha.'); });
    if (!lectura || !valida()) return;
    const fechas = extraerFechasOCR(lectura.texto);
    if (!fechas.length) throw new Error('No encontramos una fecha válida. Acerca el envase, mejora la luz o escríbela manualmente.');
    setCandidatasFecha(fechas); setSinFecha(false); setVerCamaraFecha(false); setFlash(false);
    // Con varias fechas no se elige entre elaboración y vencimiento por su posición en la foto.
    setFecha(fechas.length === 1 ? fechas[0] : '');
    setMensaje((fechas.length === 1 ? 'Compara la fecha detectada con el vencimiento del envase.'
      : 'Encontramos varias fechas. Selecciona la que el envase indica como vencimiento.')
      + (lectura.limpiezaPendiente ? ' No se pudo borrar alguna copia temporal de la foto.' : ''));
  });

  const campo = (titulo: string, valor: string, cambiar: (v: string) => void, ejemplo: string, max = 120, teclado: 'default' | 'number-pad' | 'decimal-pad' = 'default') => (
    <View><Text style={[styles.label, { color: colores.texto }]}>{titulo}</Text>
      <TextInput accessibilityLabel={titulo} editable={!ocupado} value={valor} onChangeText={cambiar} placeholder={ejemplo}
        maxLength={max} keyboardType={teclado} placeholderTextColor={colores.secundario}
        style={[styles.input, { color: colores.texto, backgroundColor: colores.tarjeta, borderColor: colores.borde }]} /></View>
  );
  const chips = (opciones: readonly string[], actual: string | null, cambiar: (v: string) => void) => (
    <View style={styles.chips}>{opciones.map(opcion => <TouchableOpacity key={opcion} accessibilityRole="button"
      accessibilityState={{ selected: actual === opcion, disabled: ocupado }} disabled={ocupado} onPress={() => cambiar(opcion)}
      style={[styles.chip, { backgroundColor: actual === opcion ? '#236640' : colores.tarjeta, borderColor: colores.borde }]}>
      <Text style={{ color: actual === opcion ? '#FFFFFF' : colores.texto }}>{opcion}</Text></TouchableOpacity>)}</View>
  );
  const mostrarCamara = () => {
    if (bloqueoWeb) return <Text style={[styles.ayuda, { color: colores.secundario }]}>{bloqueoWeb}</Text>;
    if (!permiso || revisandoPermiso) return <View style={styles.estado}><ActivityIndicator /><Text style={{ color: colores.secundario }}>Comprobando permiso de cámara…</Text></View>;
    if (!permiso.granted || errorPermiso) return <View>
      <Text style={[styles.ayuda, { color: colores.secundario }]}>{errorPermiso || (permiso.canAskAgain
        ? 'Permite la cámara para escanear. También puedes ingresar alimentos manualmente.'
        : 'El permiso de cámara está desactivado. Habilítalo en Ajustes o continúa manualmente.')}</Text>
      <Boton titulo={permiso.canAskAgain ? 'Permitir cámara' : Platform.OS === 'web' ? 'Cómo habilitar la cámara' : 'Abrir ajustes del teléfono'}
        onPress={() => { void gestionarPermiso(); }} secundario ocupado={ocupado || solicitandoPermiso} colores={colores} />
      <Boton titulo="Comprobar permiso otra vez" onPress={() => { void refrescarPermiso(); }} secundario ocupado={ocupado || solicitandoPermiso} colores={colores} />
    </View>;
    if (errorCamara) return <View>
      <Text style={styles.error}>{errorCamara}</Text>
      <Boton titulo="Reintentar cámara" onPress={() => { setErrorCamara(''); setFlash(false); void refrescarPermiso(); }} secundario ocupado={ocupado} colores={colores} />
    </View>;
    if (!habilitarCamara || sesionCamara === null) return <Text style={{ color: colores.secundario }}>La cámara está en pausa.</Text>;
    return <View style={styles.camaraMarco}>
      <CameraView key={sesionCamara} ref={camara} style={styles.camara} facing="back" mode="picture" mute enableTorch={flash}
        onCameraReady={() => { controlCamara.lista(sesionCamara); }}
        onMountError={() => {
          if (controlCamara.estado().id !== sesionCamara) return;
          controlCamara.cerrar(); setFlash(false); setErrorCamara('No se pudo iniciar la cámara. Revisa el permiso o si otra aplicación la está usando.');
        }}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={paso === 'escaner' && camaraLista && escaneoArmado && !ocupado ? ({ data }) => {
          if (!controlCamara.vigente(sesionCamara) || bloqueado.current) return;
          setEscaneoArmado(false); void buscarCodigo(data);
        } : undefined} />
      <Text style={styles.guiaCamara}>{!camaraLista ? 'Preparando cámara…' : paso === 'escaner' ? 'Centra el código de barras' : 'Centra la fecha del envase'}</Text>
      {Platform.OS !== 'web' && <Boton titulo={flash ? 'Apagar luz' : 'Encender luz'} onPress={() => setFlash(!flash)} secundario ocupado={ocupado || !camaraLista} colores={colores} />}
      {paso === 'escaner' && !escaneoArmado && !ocupado && <Boton titulo="Escanear otra vez" onPress={() => { setEscaneoArmado(true); setError(''); }} secundario ocupado={false} colores={colores} />}
    </View>;
  };

  const opciones = ALIMENTOS_SIN_CODIGO.filter(([, n]) => normalizarBusqueda(n).includes(normalizarBusqueda(busqueda)));
  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.pantalla, { backgroundColor: colores.fondo }]}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenido}>
      <Text style={[styles.marca, { color: colores.secundario }]}>{paso === 'exito' ? 'REGISTRO COMPLETADO' : paso === 'detalle' ? '2 · COMPLETA EL REGISTRO' : '1 · ELIGE TU ALIMENTO'}</Text>
      <Text style={[styles.titulo, { color: colores.texto }]}>{paso === 'exito' ? 'Listo para tu despensa' : compraMultiple ? 'Preparar compra' : 'Agregar alimento'}</Text>
      {paso !== 'inicio' && paso !== 'exito' && <Boton titulo={'Volver al inicio'} onPress={volverInicio} secundario={true} ocupado={ocupado} colores={colores} />}
      {paso === 'inicio' && <>
        <Text style={[styles.subtitulo, { color: colores.secundario }]}>Elige cómo quieres agregarlo.</Text>
        {[
          { titulo: 'Escanear código', detalle: 'Apunta al código de barras del envase.', icono: 'barcode-outline' as const, accion: () => { setEscaneoArmado(true); setErrorCamara(''); setPaso('escaner'); void refrescarPermiso(); } },
          { titulo: 'Escribir código', detalle: 'Ingresa sus números si no se puede leer.', icono: 'keypad-outline' as const, accion: () => setPaso('codigo') },
          { titulo: 'Frutas y verduras', detalle: 'Alimentos sin código, por unidad o peso.', icono: 'leaf-outline' as const, accion: () => setPaso('genericos') },
        ].map(opcion => <TouchableOpacity key={opcion.titulo} accessibilityRole="button" disabled={ocupado} onPress={opcion.accion} style={[styles.opcionIngreso, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}>
          <View style={[styles.iconoIngreso, { backgroundColor: colores.suave }]}><Ionicons name={opcion.icono} size={27} color={colores.verde}/></View><View style={{ flex: 1, gap: 5 }}><Text style={{ color: colores.texto, fontSize: 18, fontWeight: '700' }}>{opcion.titulo}</Text><Text style={{ color: colores.secundario, fontSize: 13, lineHeight: 19 }}>{opcion.detalle}</Text></View><Ionicons name="chevron-forward" size={20} color={colores.secundario}/>
        </TouchableOpacity>)}
      </>}
      {paso === 'escaner' && <>{mostrarCamara()}{<Boton titulo={'Escribir el código'} onPress={() => setPaso('codigo')} secundario={true} ocupado={ocupado} colores={colores} />}</>}
      {paso === 'codigo' && <>
        {campo('Código de barras', codigo, t => setCodigo(t.replace(/\D/g, '')), 'Escribe todos los dígitos', 14, 'number-pad')}
        {<Boton titulo={'Buscar producto'} onPress={() => { void buscarCodigo(codigo); }} secundario={false} ocupado={ocupado} colores={colores} />}
      </>}
      {paso === 'genericos' && <>
        <Text style={[styles.subtitulo, { color: colores.secundario }]}>Selecciona el alimento. Luego indica cuánto tienes.</Text>
        {campo('Buscar alimento', busqueda, setBusqueda, 'Ejemplo: tomate')}
        <View style={styles.alimentos}>{opciones.map(([id, n, cat]) => <TouchableOpacity key={id} accessibilityRole="button"
          onPress={() => elegir({ ...alimentoGenerico(`sin:${id}`), origen: 'generico' })}
          style={[styles.alimento, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}>
          <Text style={[styles.nombreAlimento, { color: colores.texto }]}>{n}</Text><Text style={{ color: colores.secundario }}>{cat}</Text>
        </TouchableOpacity>)}</View>
        {opciones.length === 0 && <Text style={{ color: colores.secundario }}>No está en esta lista. Prueba otro nombre; iremos ampliando el catálogo.</Text>}
      </>}
      {paso === 'manual' && <>
        <Text style={[styles.subtitulo, { color: colores.secundario }]}>Este código aún no está en el catálogo. El registro será personal y aparecerá como “Ingresado por ti”.</Text>
        <Text style={{ color: colores.secundario }}>Código: {codigo}</Text>
        {campo('Nombre del alimento *', nombre, setNombre, 'Ejemplo: Margarina con sal')}
        {campo('Marca (opcional)', marca, setMarca, 'Como aparece en el envase', 80)}
        <Text style={[styles.label, { color: colores.texto }]}>Categoría *</Text>
        {chips(CATEGORIAS, categoria, v => setCategoria(v as CategoriaProducto))}
        {campo('Presentación (opcional)', formato, setFormato, 'Ejemplo: envase de 250 g', 80)}
        {<Boton titulo={'Guardar registro personal y continuar'} onPress={() => { void guardarManual(); }} secundario={false} ocupado={ocupado} colores={colores} />}
      </>}
      {paso === 'detalle' && producto && <>
        <Text accessibilityLiveRegion="polite" style={{ color: colores.texto, lineHeight: 21 }}>{inventarioDuplicados.cargando || inventarioDuplicados.desdeCache || inventarioDuplicados.error ? 'No podemos comprobar duplicados hasta actualizar la despensa.' : avisoDuplicado(producto.codigoBarras, inventarioDuplicados.productos)}</Text>
        <View style={[styles.resumen, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}>
          <Text style={[styles.etiqueta, { color: colores.secundario }]}>{producto.origen === 'catalogo' ? 'DEL CATÁLOGO' : producto.origen === 'generico' ? 'SIN CÓDIGO DE BARRAS' : 'INGRESADO POR TI'}</Text>
          <Text style={[styles.nombreProducto, { color: colores.texto }]}>{producto.nombre}</Text>
          <Text style={{ color: colores.secundario }}>{producto.marca} · {producto.formato}</Text>
          {producto.origen === 'catalogo' && <Boton titulo={'Reportar un error en los datos'} onPress={() => setReporte('')} secundario={true} ocupado={ocupado} colores={colores} />}
        </View>
        {reporte !== null && <View>
          {campo('¿Qué dato está incorrecto?', reporte, setReporte, 'Describe la diferencia con el envase', 300)}
          <Text style={{ color: colores.secundario }}>El reporte quedará guardado para revisión del administrador.</Text>
          {<Boton titulo={'Guardar reporte'} onPress={() => { void ejecutar(async vigente => { await reportarErrorProducto(producto.codigoBarras, reporte); if (vigente()) { setReporte(null); setMensaje('Reporte guardado.'); } }); }} secundario={true} ocupado={ocupado} colores={colores} />}
        </View>}
        {producto.origen === 'generico' && <><Text style={[styles.label, { color: colores.texto }]}>Unidad de medida</Text>
          {chips(UNIDADES_GRANEL, producto.unidad, u => { setProducto({ ...producto, unidad: u }); setCantidad('1'); })}</>}
        {campo(`Cantidad (${producto.origen === 'generico' ? producto.unidad : 'envases'})`, cantidad, setCantidad, '1', 8, 'decimal-pad')}
        <Text style={[styles.label, { color: colores.texto }]}>¿Dónde lo guardarás?</Text>
        {chips(UBICACIONES, ubicacion, u => setUbicacion(u as typeof ubicacion))}
        <Text style={[styles.label, { color: colores.texto }]}>Fecha del envase</Text>
        {chips(['Con fecha', 'Sin fecha'], sinFecha ? 'Sin fecha' : 'Con fecha', v => { setSinFecha(v === 'Sin fecha'); setVerCamaraFecha(false); })}
        {!sinFecha && <>
          {campo('Vencimiento', fecha, setFecha, 'DD/MM/AAAA o MM/AAAA', 10)}
          {candidatasFecha.length > 1 && <><Text style={[styles.ayuda, { color: colores.secundario }]}>Selecciona el vencimiento que indica el envase:</Text>{chips(candidatasFecha, fecha, setFecha)}</>}
          {Platform.OS !== 'web' && <Boton titulo={verCamaraFecha ? 'Cerrar cámara de fecha' : 'Leer fecha con cámara'} onPress={() => { setVerCamaraFecha(!verCamaraFecha); setErrorCamara(''); setFlash(false); if (!verCamaraFecha) void refrescarPermiso(); }} secundario={true} ocupado={ocupado} colores={colores} />}
          {verCamaraFecha && <>{mostrarCamara()}{permiso?.granted && <Boton titulo={'Detectar fecha'} onPress={() => { void leerFecha(); }} secundario={true} ocupado={ocupado || !camaraLista || !habilitarCamara} colores={colores} />}</>}
        </>}
        <Text style={[styles.ayuda, { color: colores.secundario }]}>{sinFecha ? 'Se guardará sin vencimiento. FrescApp no calculará una fecha estimada.' : 'Comprueba que la fecha corresponda al vencimiento del envase.'}</Text>
        {<Boton titulo={compraMultiple ? 'Añadir al borrador de compra' : 'Guardar en mi despensa'} onPress={() => { void guardar(); }} secundario={false} ocupado={ocupado} colores={colores} />}
      </>}
      {paso === 'exito' && resultado && <>
        <View style={[styles.resumen, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}>
          <Text style={[styles.nombreProducto, { color: colores.texto }]}>✓ {resultado.nombre}</Text>
          <Text style={{ color: colores.secundario }}>{resultado.cantidad} {resultado.codigoBarras.startsWith('sin:') ? resultado.unidad : 'envases'} · {resultado.ubicacion}</Text>
          <Text style={{ color: colores.secundario }}>{resultado.vencimiento === 'Sin fecha' ? 'Sin fecha de vencimiento' : `Vence: ${resultado.vencimiento}`}</Text>
        </View>
        {<Boton titulo={'Agregar otro alimento'} onPress={volverInicio} secundario={false} ocupado={ocupado} colores={colores} />}
        {<Boton titulo={'Ver mi despensa'} onPress={() => { volverInicio(); router.push('/(tabs)/despensa'); }} secundario={true} ocupado={ocupado} colores={colores} />}
      </>}
      {ocupado && <View style={styles.estado}><ActivityIndicator color="#388A52" /><Text style={{ color: colores.secundario }}>Procesando…</Text></View>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!mensaje && <Text accessibilityLiveRegion="polite" style={[styles.aviso, { color: colores.texto, borderColor: colores.borde }]}>{mensaje}</Text>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  opcionIngreso: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17, borderWidth: 1, borderRadius: 18, minHeight: 98, marginTop: 13 },
  iconoIngreso: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  pantalla: { flex: 1 }, contenido: { padding: 20, paddingBottom: 36, maxWidth: 680, width: '100%', alignSelf: 'center' },
  marca: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 }, titulo: { fontSize: 30, fontWeight: '800', marginTop: 8 },
  subtitulo: { fontSize: 16, lineHeight: 24, marginVertical: 16 },
  boton: { minHeight: 48, padding: 14, borderRadius: 14, borderWidth: 1, justifyContent: 'center', marginTop: 12 },
  primario: { backgroundColor: '#236640', borderColor: '#236640' }, botonTexto: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  label: { fontSize: 15, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, minHeight: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  alimentos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  alimento: { width: '47%', borderWidth: 1, borderRadius: 14, padding: 14, minHeight: 80, justifyContent: 'center' },
  nombreAlimento: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  resumen: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 8, marginTop: 20 }, etiqueta: { fontSize: 12, fontWeight: '700' }, nombreProducto: { fontSize: 24, fontWeight: '700' },
  ayuda: { fontSize: 14, lineHeight: 21, marginTop: 12 }, camaraMarco: { marginTop: 16 }, camara: { height: 260, borderRadius: 16 },
  guiaCamara: { padding: 10, backgroundColor: '#183628', color: '#FFFFFF', textAlign: 'center' },
  estado: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 16 }, error: { color: '#B42318', backgroundColor: '#FFF0EE', padding: 14, borderRadius: 12, marginTop: 16 },
  aviso: { borderWidth: 1, padding: 14, borderRadius: 12, marginTop: 16 },
});
