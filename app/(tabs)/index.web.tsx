import { Link } from 'expo-router';
import { auth } from '../../services/auth';
import { calcularDiasRestantes, ordenarPorVencimiento } from '../../services/fechas';
import { resumenCantidades } from '../../security/identidadProducto';
import { useInventarioWeb } from '../../components/web/InventarioContext';
import { EstadoCarga, Icono, ProductoFila, Titulo, Vacio } from '../../components/web/UI';

export default function InicioWeb() {
  const { productos } = useInventarioWeb();
  const nombre = auth.currentUser?.displayName?.trim().split(/\s+/)[0];
  const proximos = ordenarPorVencimiento(productos.filter(p => { const d = calcularDiasRestantes(p.vencimiento); return d !== null && d >= 0 && d <= 7; }));
  const vencidos = productos.filter(p => { const d = calcularDiasRestantes(p.vencimiento); return d !== null && d < 0; });
  const sinFecha = productos.filter(p => calcularDiasRestantes(p.vencimiento) === null);
  return <>
    <Titulo etiqueta="Tu hogar de un vistazo" titulo={nombre ? `Hola, ${nombre}` : 'Hola, bienvenido'} descripcion="Un poco de organización, mucho por aprovechar." accion={<Link className="btn" href="/despensa">Ver mi despensa<Icono nombre="flecha" size={17}/></Link>}/>
    <div className="account-actions"><Link className="btn" href="/recetas">Ideas para cocinar</Link></div>
    <EstadoCarga>
      <section className="hero-panel"><div><p className="eyebrow">Planifica con lo que tienes</p><h2>{proximos.length ? `${proximos.length} ${proximos.length === 1 ? 'producto vence' : 'productos vencen'} esta semana` : 'Tu próxima comida empieza en casa'}</h2><p>{proximos.length ? 'Revisa las fechas y ten estos productos presentes al organizar tus comidas.' : 'Consulta tu despensa antes de comprar y encuentra lo que ya tienes.'}</p><Link href="/calendario" className="text-link">Revisar vencimientos →</Link></div><span className="hero-symbol"><Icono nombre="hoja" size={50}/></span></section>
      <div className="stats-grid">
        <Link href="/despensa" className="stat-card"><span className="stat-label">En tu despensa</span><strong>{productos.length}</strong><small>Registros de productos</small></Link>
        <Link href="/despensa?estado=semana" className="stat-card warn"><span className="stat-label">Vencen en 7 días</span><strong>{proximos.length}</strong><small>Incluye los que vencen hoy</small></Link>
        <Link href="/despensa?estado=vencido" className="stat-card danger"><span className="stat-label">Vencidos</span><strong>{vencidos.length}</strong><small>Para revisar por separado</small></Link>
        <Link href="/despensa?estado=sin-fecha" className="stat-card"><span className="stat-label">Sin fecha</span><strong>{sinFecha.length}</strong><small>Fecha no registrada</small></Link>
      </div>
      <div className="section-heading"><div><h2>Tenlos presentes esta semana</h2><p>Ordenados por su fecha de vencimiento.</p></div><Link className="text-link" href="/despensa?estado=semana">Ver todos →</Link></div>
      {!productos.length ? <Vacio/> : proximos.length ? <div className="panel">{proximos.slice(0, 5).map(p => <ProductoFila key={p.id} producto={p}/>)}</div> : <Vacio titulo="Sin vencimientos registrados para esta semana" detalle="Puedes revisar todas las fechas en el calendario. Los productos vencidos y sin fecha se muestran por separado."/>}
      {!!productos.length && <p className="page-footnote">Cantidades registradas: {resumenCantidades(productos)}. Un mismo producto puede aparecer en varios registros si tiene distintas fechas.</p>}
    </EstadoCarga>
  </>;
}
