import { Link } from 'expo-router';
import { useState } from 'react';
import { auth, cerrarSesion } from '../../services/auth';
import { Titulo } from '../../components/web/UI';

export default function CuentaWeb() {
  const usuario = auth.currentUser;
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  async function salir() {
    if (ocupado) return;
    setOcupado(true); setError('');
    try { await cerrarSesion(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos cerrar la sesión.'); }
    finally { setOcupado(false); }
  }
  return <><Titulo etiqueta="Tu espacio personal" titulo="Mi cuenta" descripcion="La misma cuenta que usas en la app FrescApp."/>
    <section className="panel account-panel"><h2>Datos de tu cuenta</h2><dl><dt>Nombre o apodo</dt><dd>{usuario?.displayName || 'Sin nombre registrado'}</dd><dt>Correo electrónico</dt><dd>{usuario?.email}</dd><dt>Verificación de correo</dt><dd>{usuario?.emailVerified ? 'Verificado' : 'Pendiente de verificación'}</dd></dl>
      <div className="account-actions"><Link href="/privacidad" className="btn primary">Privacidad y mis datos</Link><button className="btn" onClick={salir} disabled={ocupado}>{ocupado ? 'Cerrando sesión…' : 'Cerrar sesión'}</button></div>
      {error && <p className="notice error" role="alert" style={{ marginTop: 18 }}>{error}</p>}
      <p className="page-footnote">La sesión web se mantiene mientras esta página está abierta. Si la recargas o la cierras, tendrás que iniciar sesión nuevamente.</p>
    </section></>;
}
