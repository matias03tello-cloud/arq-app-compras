import { useState } from 'react';
import { useCompras, type Compra } from '../../services/compras';
import { UNIDADES_COMPRA, type UnidadCompra } from '../../services/comprasModelo';
import { Titulo } from '../../components/web/UI';
export default function ComprasWeb() {
  const lista = useCompras(); const [nombre, setNombre] = useState(''); const [cantidad, setCantidad] = useState('1'); const [unidad, setUnidad] = useState<UnidadCompra>('unidad'); const [borrar, setBorrar] = useState<Compra | null>(null);
  const bloqueado = lista.ocupado || lista.cache || lista.cargando || !!lista.error;
  return <><Titulo etiqueta="TU PRÓXIMA COMPRA" titulo="Lista de compras" descripcion="Tu lista privada se sincroniza con la app al usar la misma cuenta."/>
    <p className="notice">Marcar como comprado no agrega el alimento a tu despensa. Registra su vencimiento desde la app.</p>
    {(lista.cache || lista.cargando) && <p className="notice" role="status">Esperando confirmación del servidor. Los datos pueden estar desactualizados.</p>}
    {(lista.error || lista.errorAccion) && <p className="notice error" role="alert">{lista.error || lista.errorAccion}</p>}
    {(lista.error || lista.cache) && <button className="btn" onClick={lista.reintentar}>Reintentar conexión</button>}
    <form className="shopping-form" onSubmit={e => { e.preventDefault(); void lista.agregar(nombre, cantidad, unidad).then(ok => { if (ok) { setNombre(''); setCantidad('1'); } }); }}>
      <label>Producto<input required maxLength={120} placeholder="Arroz, marca y formato" value={nombre} onChange={e => setNombre(e.target.value)}/></label>
      <label>Cantidad<input required inputMode="decimal" maxLength={7} value={cantidad} onChange={e => setCantidad(e.target.value)}/></label>
      <label>Unidad<select value={unidad} onChange={e => setUnidad(e.target.value as UnidadCompra)}>{UNIDADES_COMPRA.map(u => <option key={u}>{u}</option>)}</select></label>
      <button className="btn primary" disabled={bloqueado}>Añadir a la lista</button>
    </form>
    <h2>{lista.items.filter(i => !i.comprado).length} pendientes · {lista.items.filter(i => i.comprado).length} comprados</h2>
    {!lista.cargando && !lista.cache && !lista.error && !lista.items.length && <p>Tu lista está vacía. Añade lo que necesitas comprar.</p>}
    <ul className="shopping-items">{lista.items.map(i => <li key={i.id}><label><input type="checkbox" checked={i.comprado} disabled={bloqueado} onChange={() => { void lista.marcar(i); }}/><span style={{ textDecoration: i.comprado ? 'line-through' : undefined }}>{i.nombre}<small>{i.cantidad} {i.unidad} · {i.comprado ? 'Comprado' : 'Pendiente'}</small></span></label><button className="btn" disabled={bloqueado} aria-label={`Eliminar ${i.nombre}`} onClick={() => setBorrar(i)}>Eliminar</button></li>)}</ul>
    {borrar && <section className="notice" aria-label="Confirmar eliminación"><p>¿Eliminar {borrar.nombre} de la lista?</p><button className="btn" disabled={lista.ocupado} onClick={() => { void lista.eliminar(borrar).then(ok => { if (ok) setBorrar(null); }); }}>Confirmar eliminación</button> <button className="btn" disabled={lista.ocupado} onClick={() => setBorrar(null)}>Cancelar</button></section>}
  </>;
}
