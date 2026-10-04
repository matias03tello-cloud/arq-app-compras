import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ESTADO_INICIAL, observarInventario, type EstadoInventarioWeb } from '../../services/suscripcionInventario';

const Contexto = createContext<EstadoInventarioWeb & { online: boolean; reintentar: () => void }>({
  ...ESTADO_INICIAL, online: true, reintentar: () => {},
});
export function InventarioProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const [intento, setIntento] = useState(0);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const actualizar = () => setOnline(navigator.onLine);
    actualizar();
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => { window.removeEventListener('online', actualizar); window.removeEventListener('offline', actualizar); };
  }, []);
  useEffect(() => observarInventario(setEstado), [intento]);
  return <Contexto.Provider value={{ ...estado, online, reintentar: () => setIntento(n => n + 1) }}>{children}</Contexto.Provider>;
}
export const useInventarioWeb = () => useContext(Contexto);
