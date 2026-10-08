import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ESTADO_INICIAL, observarInventario, type EstadoInventarioWeb } from '../../services/suscripcionInventario';

const Contexto = createContext<EstadoInventarioWeb & { online: boolean; revisionDia: number; reintentar: () => void }>({
  ...ESTADO_INICIAL, online: true, revisionDia: 0, reintentar: () => {},
});
export function InventarioProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const [intento, setIntento] = useState(0);
  const [revisionDia, setRevisionDia] = useState(0);
  useEffect(() => {
    let dia = new Date().toDateString();
    const revisar = () => { const actual = new Date().toDateString(); if (actual !== dia) { dia = actual; setRevisionDia(n => n + 1); } };
    const intervalo = window.setInterval(revisar, 60000);
    document.addEventListener('visibilitychange', revisar);
    window.addEventListener('focus', revisar);
    return () => { window.clearInterval(intervalo); document.removeEventListener('visibilitychange', revisar); window.removeEventListener('focus', revisar); };
  }, []);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const actualizar = () => setOnline(navigator.onLine);
    actualizar();
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => { window.removeEventListener('online', actualizar); window.removeEventListener('offline', actualizar); };
  }, []);
  useEffect(() => observarInventario(setEstado), [intento]);
  return <Contexto.Provider value={{ ...estado, online, revisionDia, reintentar: () => setIntento(n => n + 1) }}>{children}</Contexto.Provider>;
}
export const useInventarioWeb = () => useContext(Contexto);
