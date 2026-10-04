import { CompraMultipleProvider } from '../../components/mobile/CompraMultiple';
import { Link, Slot, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { auth, cerrarSesion } from '../../services/auth';
import { InventarioProvider, useInventarioWeb } from '../../components/web/InventarioContext';
import { Icono, Marca } from '../../components/web/UI';
import '../../components/web/web.css';

const enlaces = [
  { href: '/', texto: 'Resumen', icono: 'inicio' },
  { href: '/despensa', texto: 'Despensa', icono: 'despensa' },
  { href: '/recetas', texto: 'Recetas', icono: 'hoja' },
  { href: '/compras', texto: 'Compras', icono: 'despensa' },
  { href: '/calendario', texto: 'Calendario', icono: 'calendario' },
  { href: '/configuracion', texto: 'Mi cuenta', icono: 'cuenta' },
] as const;

function MarcoWeb() {
  const ruta = usePathname();
  const { online, desdeCache, cargando, error } = useInventarioWeb();
  const [saliendo, setSaliendo] = useState(false);
  const [errorSalida, setErrorSalida] = useState('');
  const nombre = auth.currentUser?.displayName || 'Mi cuenta';
  const pendiente = !online || desdeCache || cargando || !!error;
  const estado = !online ? 'Sin conexión' : error ? 'Sincronización interrumpida' : cargando ? 'Conectando…' : desdeCache ? 'Esperando al servidor…' : 'Actualización en vivo';
  useEffect(() => { document.title = `FrescApp · ${enlaces.find(e => e.href === ruta)?.texto || 'Mi despensa'}`; }, [ruta]);
  async function salir() {
    if (saliendo) return;
    setSaliendo(true); setErrorSalida('');
    try { await cerrarSesion(); }
    catch (e) { setErrorSalida(e instanceof Error ? e.message : 'No pudimos cerrar la sesión.'); }
    finally { setSaliendo(false); }
  }
  return <div className="fresc-web">
    <aside className="web-sidebar">
      <Marca/>
      <div><p className="nav-caption">Tu hogar, organizado</p><nav className="web-nav" aria-label="Navegación principal">
        {enlaces.map(e => <Link key={e.href} href={e.href} aria-current={ruta === e.href ? 'page' : undefined}><Icono nombre={e.icono}/>{e.texto}</Link>)}
      </nav></div>
      <div className="sidebar-note"><Icono nombre="hoja" size={26}/><strong>Menos olvido.<br/>Más aprovechamiento.</strong><p>Planifica tu compra aquí. Registra los alimentos y sus fechas desde la app.</p></div>
      <button className="logout sidebar-logout" onClick={salir} disabled={saliendo}><Icono nombre="salir" size={18}/>{saliendo ? 'Cerrando…' : 'Cerrar sesión'}</button>
    </aside>
    <div className="web-main">
      <div className="web-topbar"><span className="sync-label" role="status"><span className={`sync-dot ${pendiente ? 'pending' : ''}`}/>{estado}</span><span className="account-label"><span className="avatar" aria-hidden="true">{nombre.slice(0, 1).toUpperCase()}</span><span className="account-name">{nombre}</span></span></div>
      <main className="web-content" id="contenido">
        {errorSalida && <p className="notice error" role="alert">{errorSalida}</p>}
        {(!online || (!cargando && desdeCache && !error)) && <p className="notice" role="status">{!online ? 'Estás sin conexión. ' : ''}Los datos de esta sesión pueden estar desactualizados. Se actualizarán al conectar con el servidor.</p>}
        <Slot/>
      </main>
    </div>
  </div>;
}
export default function WebLayout() { return <InventarioProvider key={auth.currentUser?.uid}><CompraMultipleProvider><MarcoWeb/></CompraMultipleProvider></InventarioProvider>; }
