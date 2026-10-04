import { useState } from 'react';
import { fechaTextoADate, ordenarPorVencimiento } from '../../services/fechas';
import { useInventarioWeb } from '../../components/web/InventarioContext';
import { EstadoCarga, ProductoFila, Titulo, Vacio } from '../../components/web/UI';

const clave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
export default function CalendarioWeb() {
  const { productos } = useInventarioWeb();
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [seleccion, setSeleccion] = useState<Date | null>(null);
  const hoy = new Date();
  const delMes = ordenarPorVencimiento(productos.filter(p => { const d = fechaTextoADate(p.vencimiento); return d && d.getMonth() === mes.getMonth() && d.getFullYear() === mes.getFullYear(); }));
  const elegidos = seleccion ? delMes.filter(p => clave(fechaTextoADate(p.vencimiento)!) === clave(seleccion)) : delMes;
  const desplazamiento = (mes.getDay() + 6) % 7;
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const sinFecha = productos.filter(p => !fechaTextoADate(p.vencimiento)).length;
  const conteo = new Map<string, number>();
  for (const p of delMes) { const k = clave(fechaTextoADate(p.vencimiento)!); conteo.set(k, (conteo.get(k) || 0) + 1); }
  function mover(delta: number) { setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1)); setSeleccion(null); }
  return <>
    <Titulo etiqueta="Organiza tu semana" titulo="Calendario de vencimientos" descripcion="Selecciona un día para ver qué productos vencen en esa fecha."/>
    <EstadoCarga><div className="calendar-layout">
      <section className="panel calendar" aria-label="Calendario mensual">
        <div className="month-heading"><button className="btn small" aria-label="Mes anterior" onClick={() => mover(-1)}>←</button><h2 aria-live="polite">{mes.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</h2><button className="btn small" aria-label="Mes siguiente" onClick={() => mover(1)}>→</button></div>
        <div className="calendar-grid">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <span className="weekday" key={d}>{d}</span>)}
          {Array.from({ length: desplazamiento }, (_, i) => <span key={`espacio-${i}`} aria-hidden="true"/>)}
          {Array.from({ length: dias }, (_, i) => {
            const d = new Date(mes.getFullYear(), mes.getMonth(), i + 1), k = clave(d), n = conteo.get(k) || 0;
            const activo = !!seleccion && k === clave(seleccion);
            return <button key={k} className={`day ${n ? 'has-products' : ''} ${k === clave(hoy) ? 'today' : ''} ${activo ? 'selected' : ''}`} aria-pressed={activo} aria-label={`${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}, ${n} productos`} onClick={() => setSeleccion(activo ? null : d)}>{i + 1}{n > 0 && <small>{n} {n === 1 ? 'prod.' : 'prods.'}</small>}</button>;
          })}
        </div>
        <p className="calendar-note">Los días con productos están destacados. Si solo registraste mes y año, se muestra el último día de ese mes.</p>
        <div className="account-actions" style={{ marginTop: 18 }}><button className="btn small" onClick={() => { setMes(new Date(hoy.getFullYear(), hoy.getMonth(), 1)); setSeleccion(null); }}>Mes actual</button>{seleccion && <button className="btn small" onClick={() => setSeleccion(null)}>Ver todo el mes</button>}</div>
      </section>
      <section className="calendar-details"><div className="section-heading"><div><h2>{seleccion ? seleccion.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' }) : 'Vencimientos del mes'}</h2><p role="status">{elegidos.length} registros</p></div></div>
        {elegidos.length ? <div className="panel">{elegidos.map(p => <ProductoFila producto={p} key={p.id}/>)}</div> : <Vacio titulo="Sin vencimientos en esta selección" detalle="Selecciona otro día o cambia de mes para consultar más fechas."/>}
      </section>
    </div><p className="page-footnote">{sinFecha} registros sin fecha no aparecen en el calendario. Las fechas corresponden a lo que ingresaste en la app.</p></EstadoCarga>
  </>;
}
