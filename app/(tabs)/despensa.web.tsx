import { SalidaWeb } from '../../components/web/SalidaWeb';
import { AperturaWeb } from '../../components/web/AperturaWeb';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { calcularDiasRestantes, ordenarPorVencimiento } from '../../services/fechas';
import { normalizarBusqueda, UBICACIONES } from '../../security/identidadProducto';
import { useInventarioWeb } from '../../components/web/InventarioContext';
import { EstadoCarga, ProductoFila, Titulo, Vacio } from '../../components/web/UI';

const TAMANO = 30;
const ESTADOS = ['todos', 'semana', 'vencido', 'sin-fecha'] as const;
export default function DespensaWeb() {
  const { productos } = useInventarioWeb();
  const router = useRouter();
  const params = useLocalSearchParams<{ estado?: string }>();
  const estado = ESTADOS.includes(params.estado as typeof ESTADOS[number]) ? params.estado! : 'todos';
  const [busqueda, setBusqueda] = useState('');
  const [ubicacion, setUbicacion] = useState('Todas');
  const [orden, setOrden] = useState('fecha');
  const [pagina, setPagina] = useState(1);
  const texto = normalizarBusqueda(busqueda);
  const filtrados = productos.filter(p => {
    if (texto && !normalizarBusqueda(`${p.nombre} ${p.marca} ${p.categoria} ${p.codigoBarras}`).includes(texto)) return false;
    if (ubicacion !== 'Todas' && (p.ubicacion || 'Sin ubicación') !== ubicacion) return false;
    const dias = calcularDiasRestantes(p.vencimiento);
    return estado === 'todos' || (estado === 'semana' && dias !== null && dias >= 0 && dias <= 7) || (estado === 'vencido' && dias !== null && dias < 0) || (estado === 'sin-fecha' && dias === null);
  });
  const ordenados = orden === 'fecha' ? ordenarPorVencimiento(filtrados) : [...filtrados].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const paginas = Math.max(1, Math.ceil(ordenados.length / TAMANO));
  const actual = Math.min(pagina, paginas);
  function limpiar() { setBusqueda(''); setUbicacion('Todas'); setOrden('fecha'); setPagina(1); router.setParams({ estado: 'todos' }); }
  return <>
    <Titulo etiqueta="Lo que tienes en casa" titulo="Mi despensa" descripcion="Busca por nombre, marca, categoría o código de barras."/>
    <div className="account-actions"><Link href="/registro-compras" className="btn">Registrar una compra</Link><Link href="/historial" className="btn">Mi historial</Link></div><EstadoCarga>{!productos.length ? <Vacio/> : <>
      <div className="filters" role="search" aria-label="Filtros de despensa">
        <div className="field search"><label htmlFor="buscar-producto">Buscar un producto</label><input id="buscar-producto" type="search" placeholder="Arroz, Soprole, lentejas…" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}/></div>
        <div className="field"><label htmlFor="ubicacion">Ubicación</label><select id="ubicacion" value={ubicacion} onChange={e => { setUbicacion(e.target.value); setPagina(1); }}><option>Todas</option>{[...UBICACIONES, 'Sin ubicación'].map(u => <option key={u}>{u}</option>)}</select></div>
        <div className="field"><label htmlFor="estado">Vencimiento</label><select id="estado" value={estado} onChange={e => { router.setParams({ estado: e.target.value }); setPagina(1); }}><option value="todos">Todos</option><option value="semana">En los próximos 7 días</option><option value="vencido">Vencidos</option><option value="sin-fecha">Sin fecha</option></select></div>
        <div className="field"><label htmlFor="orden">Ordenar por</label><select id="orden" value={orden} onChange={e => { setOrden(e.target.value); setPagina(1); }}><option value="fecha">Vencimiento</option><option value="nombre">Nombre: A–Z</option></select></div>
      </div>
      <div className="results-bar"><span role="status">{filtrados.length} de {productos.length} registros</span><button className="filter-reset" onClick={limpiar}>Limpiar filtros</button></div>
      {filtrados.length ? <div className="panel">{ordenados.slice((actual - 1) * TAMANO, actual * TAMANO).map(p => <div key={p.id}><ProductoFila producto={p}/><AperturaWeb producto={p}/><SalidaWeb producto={p}/></div>)}</div> : <Vacio titulo="No encontramos coincidencias" detalle="Prueba otro nombre o cambia los filtros de ubicación y vencimiento."/>}
      {paginas > 1 && <nav className="pagination" aria-label="Páginas de productos"><button className="btn small" disabled={actual <= 1} onClick={() => setPagina(actual - 1)}>Anterior</button><span>Página {actual} de {paginas}</span><button className="btn small" disabled={actual >= paginas} onClick={() => setPagina(actual + 1)}>Siguiente</button></nav>}
      <p className="page-footnote">Para agregar, cambiar cantidades o quitar productos, usa FrescApp en tu celular. Los cambios aparecerán aquí cuando ambos dispositivos tengan conexión.</p>
    </>}</EstadoCarga>
  </>;
}
