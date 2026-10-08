import { SalidaWeb } from '../../components/web/SalidaWeb';
import { AperturaWeb } from '../../components/web/AperturaWeb';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { claveFecha, crearIndiceInventario, filtrarIndiceInventario, filtroValido } from '../../services/vistaInventario';
import { UBICACIONES } from '../../security/identidadProducto';
import { useInventarioWeb } from '../../components/web/InventarioContext';
import { EstadoCarga, ProductoFila, Titulo, Vacio } from '../../components/web/UI';

const TAMANO = 30;
export default function DespensaWeb() {
  const { productos } = useInventarioWeb();
  const router = useRouter();
  const params = useLocalSearchParams<{ estado?: string }>();
  const estado = filtroValido(params.estado);
  const [busqueda, setBusqueda] = useState('');
  const [ubicacion, setUbicacion] = useState('Todas');
  const [orden, setOrden] = useState<'fecha' | 'nombre'>('fecha');
  const [navegacion, setNavegacion] = useState({ clave: '', pagina: 1 });
  const clave = JSON.stringify([busqueda, ubicacion, estado, orden]);
  const dia = claveFecha(new Date());
  const indice = useMemo(() => crearIndiceInventario(productos, new Date(`${dia}T12:00:00`)), [productos, dia]);
  const filtrados = useMemo(() => filtrarIndiceInventario(indice, { busqueda, ubicacion, estado, orden }), [indice, busqueda, ubicacion, estado, orden]);
  const paginas = Math.max(1, Math.ceil(filtrados.length / TAMANO));
  const actual = Math.min(navegacion.clave === clave ? navegacion.pagina : 1, paginas);
  function setPagina(pagina: number) { setNavegacion({ clave, pagina }); }
  function limpiar() { setBusqueda(''); setUbicacion('Todas'); setOrden('fecha'); setPagina(1); router.setParams({ estado: 'todos' }); }
  return <>
    <Titulo etiqueta="Lo que tienes en casa" titulo="Mi despensa" descripcion="Busca por nombre, marca, categoría o código de barras."/>
    <div className="account-actions"><Link href="/registro-compras" className="btn">Registrar una compra</Link><Link href="/historial" className="btn">Mi historial</Link></div><EstadoCarga>{!productos.length ? <Vacio/> : <>
      <div className="filters" role="search" aria-label="Filtros de despensa">
        <div className="field search"><label htmlFor="buscar-producto">Buscar un producto</label><input id="buscar-producto" type="search" placeholder="Arroz, Soprole, lentejas…" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}/></div>
        <div className="field"><label htmlFor="ubicacion">Ubicación</label><select id="ubicacion" value={ubicacion} onChange={e => { setUbicacion(e.target.value); setPagina(1); }}><option>Todas</option>{[...UBICACIONES, 'Sin ubicación'].map(u => <option key={u}>{u}</option>)}</select></div>
        <div className="field"><label htmlFor="estado">Vencimiento</label><select id="estado" value={estado} onChange={e => { router.setParams({ estado: e.target.value }); setPagina(1); }}><option value="todos">Todos</option><option value="semana">En los próximos 7 días</option><option value="vencido">Vencidos</option><option value="sin-fecha">Sin fecha</option></select></div>
        <div className="field"><label htmlFor="orden">Ordenar por</label><select id="orden" value={orden} onChange={e => { setOrden(e.target.value === 'nombre' ? 'nombre' : 'fecha'); setPagina(1); }}><option value="fecha">Vencimiento</option><option value="nombre">Nombre: A–Z</option></select></div>
      </div>
      <div className="results-bar"><span role="status">{filtrados.length} de {productos.length} registros{filtrados.length > 0 && ` · Mostrando ${(actual - 1) * TAMANO + 1}–${Math.min(actual * TAMANO, filtrados.length)}`}</span><button className="filter-reset" onClick={limpiar}>Limpiar filtros</button></div>
      {filtrados.length ? <div className="panel">{filtrados.slice((actual - 1) * TAMANO, actual * TAMANO).map(p => <div key={p.id}><ProductoFila producto={p}/><AperturaWeb producto={p}/><SalidaWeb producto={p}/></div>)}</div> : <Vacio titulo="No encontramos coincidencias" detalle="Prueba otro nombre o cambia los filtros de ubicación y vencimiento."/>}
      {paginas > 1 && <nav className="pagination" aria-label="Páginas de productos"><button className="btn small" disabled={actual <= 1} onClick={() => setPagina(actual - 1)}>Anterior</button><span>Página {actual} de {paginas}</span><button className="btn small" disabled={actual >= paginas} onClick={() => setPagina(actual + 1)}>Siguiente</button></nav>}
      <p className="page-footnote">Registra compras y salidas desde esta página. Puedes corregir otros datos del producto desde FrescApp en tu celular. Los cambios se sincronizan cuando ambos dispositivos tienen conexión.</p>
    </>}</EstadoCarga>
  </>;
}
