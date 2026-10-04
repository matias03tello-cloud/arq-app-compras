import { Link } from 'expo-router';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { iniciarSesion, recuperarPassword } from '../services/auth';
import { Icono, Marca } from '../components/web/UI';
import '../components/web/web.css';

export default function LoginWeb() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const bloqueo = useRef(false);
  useEffect(() => { document.title = 'FrescApp · Inicia sesión'; }, []);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (bloqueo.current) return;
    bloqueo.current = true; setOcupado(true); setError(''); setAviso('');
    try { await iniciarSesion(email, password); }
    catch (err) { setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión. Intenta nuevamente.'); }
    finally { setPassword(''); setOcupado(false); bloqueo.current = false; }
  }
  async function recuperar() {
    if (bloqueo.current) return;
    bloqueo.current = true; setOcupado(true); setError(''); setAviso('');
    try { await recuperarPassword(email); setAviso('Si existe una cuenta con ese correo, recibirás las instrucciones para recuperar tu contraseña.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Intenta nuevamente.'); }
    finally { setOcupado(false); bloqueo.current = false; }
  }
  return <div className="fresc-login">
    <section className="login-story" aria-label="FrescApp en la web"><Marca/>
      <h1>Lo que tienes.<br/>Lo que vence.<br/><span>Todo más claro.</span></h1>
      <p>Tu despensa también está aquí. Organiza tu semana con los productos que ya tienes en casa.</p>
      <div className="pantry-art" aria-hidden="true"><div className="jar"><span>ARROZ</span></div><div className="jar tall"><span>PASTA</span></div><div className="jar green"><span>LENTEJAS</span></div></div>
      <p className="login-story-footer">El mismo hogar. La misma cuenta. Tu FrescApp.</p>
    </section>
    <main className="login-form-side"><div className="login-mobile-brand"><Marca/></div>
      <div className="login-form"><p className="eyebrow">Bienvenido a casa</p><h2>Abre tu despensa</h2><p>Usa el mismo correo y contraseña de FrescApp en tu celular.</p>
        <form onSubmit={enviar} aria-label="Iniciar sesión">
          <div className="login-field"><label htmlFor="correo">Correo electrónico</label><input id="correo" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" maxLength={254} required disabled={ocupado} placeholder="tu@correo.cl"/></div>
          <div className="login-field"><label htmlFor="clave">Contraseña</label><div className="password-wrap"><input id="clave" type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" maxLength={128} required disabled={ocupado}/><button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} disabled={ocupado} onClick={() => setVisible(v => !v)}>{visible ? 'Ocultar' : 'Mostrar'}</button></div></div>
          <button type="button" className="recovery" onClick={recuperar} disabled={ocupado}>Olvidé mi contraseña</button>
          {error && <p className="notice error" role="alert">{error}</p>}{aviso && <p className="notice success" role="status">{aviso}</p>}
          <button className="btn primary" type="submit" disabled={ocupado}>{ocupado ? 'Un momento…' : 'Entrar a mi despensa'}<Icono nombre="flecha" size={18}/></button>
        </form>
        <div className="login-help"><p>¿Aún no tienes cuenta? Créala desde la app FrescApp en tu celular.</p><p>Por seguridad, al recargar o cerrar esta página tendrás que iniciar sesión otra vez.</p><p><Link href="/aviso-privacidad" className="text-link">Información de privacidad</Link></p></div>
      </div>
    </main>
  </div>;
}
