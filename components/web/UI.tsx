import type { ReactNode } from 'react';
import { obtenerEstadoVencimiento } from '../../services/fechas';
import { etiquetaCantidad } from '../../security/identidadProducto';
import type { ProductoInventario } from '../../services/productos';
import { useInventarioWeb } from './InventarioContext';

type IconoNombre = 'hoja' | 'inicio' | 'despensa' | 'calendario' | 'cuenta' | 'salir' | 'buscar' | 'flecha';
const trazos: Record<IconoNombre, ReactNode> = {
  hoja: <><path d="M20 4C9 2 3 8 5 15c2 6 11 5 14-1 2-4 1-10 1-10Z"/><path d="m4 21 12-12"/></>,
  inicio: <><path d="m3 11 9-8 9 8M5 10v11h14V10"/><path d="M9 21v-8h6v8"/></>,
  despensa: <><path d="M4 5h16v15H4zM4 11h16M10 5v15"/><path d="M14 8h2m-2 7h2"/></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-14 4h2m4 0h2m-8 3h2"/></>,
  cuenta: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  salir: <><path d="M9 4H4v16h5m0-8h12m-4-4 4 4-4 4"/></>,
  buscar: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
  flecha: <path d="M4 12h16m-6-6 6 6-6 6"/>,
};
export function Icono({ nombre, size = 22 }: { nombre: IconoNombre; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{trazos[nombre]}</svg>;
}
export function Marca() { return <span className="marca-web"><span className="marca-icon"><Icono nombre="hoja"/></span>FrescApp<span className="marca-punto">.</span></span>; }
export function Titulo({ etiqueta, titulo, descripcion, accion }: { etiqueta: string; titulo: string; descripcion: string; accion?: ReactNode }) {
  return <header className="page-heading"><div><p className="eyebrow">{etiqueta}</p><h1>{titulo}</h1><p className="muted">{descripcion}</p></div>{accion}</header>;
}
export function EstadoCarga({ children }: { children: ReactNode }) {
  const { cargando, error, reintentar, online, desdeCache, productos } = useInventarioWeb();
  if (error) return <section className="empty-state" role="alert"><Icono nombre="despensa" size={38}/><h2>No pudimos cargar tu despensa</h2><p>{error}</p><button className="btn primary" onClick={reintentar}>Reintentar</button></section>;
  if (cargando) return <section className="empty-state" role="status"><span className="spinner"/><h2>{online ? 'Cargando tus productos…' : 'Esperando conexión…'}</h2><p>Tu despensa aparecerá cuando podamos consultarla.</p></section>;
  if ((!online || desdeCache) && productos.length === 0) return <section className="empty-state" role="status"><h2>Esperando los datos de tu cuenta</h2><p>No podemos confirmar si tu despensa está vacía hasta conectar con el servidor.</p><button className="btn" onClick={reintentar}>Volver a conectar</button></section>;
  return <>{children}</>;
}
export function ProductoFila({ producto }: { producto: ProductoInventario }) {
  const estado = obtenerEstadoVencimiento(producto.vencimiento);
  return <article className="product-row">
    <div className={`product-mark ${producto.codigoBarras.startsWith('sin:') ? 'fresh' : ''}`} aria-hidden="true">{producto.codigoBarras.startsWith('sin:') ? <Icono nombre="hoja"/> : <Icono nombre="despensa"/>}</div>
    <div className="product-name"><h3>{producto.nombre}</h3><p>{producto.marca}{producto.formato ? ` · ${producto.formato}` : ''}</p><span className="mobile-location">{producto.ubicacion || 'Sin ubicación'}</span></div>
    <div className="product-quantity">{etiquetaCantidad(producto)}</div>
    <div className="product-location">{producto.ubicacion || 'Sin ubicación'}</div>
    <div className="product-date"><span className={`badge status-${estado.estado}`}>{estado.etiqueta}</span><small>{estado.estado !== 'sin-fecha' ? producto.vencimiento : 'Fecha no registrada'}</small></div>
  </article>;
}
export function Vacio({ titulo = 'Tu despensa empieza aquí', detalle = 'Agrega tus productos desde FrescApp en tu celular. Aparecerán aquí con la misma cuenta.' }: { titulo?: string; detalle?: string }) {
  return <section className="empty-state"><Icono nombre="despensa" size={40}/><h2>{titulo}</h2><p>{detalle}</p></section>;
}
