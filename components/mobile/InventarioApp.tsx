import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { ESTADO_INICIAL, observarInventario } from '../../services/suscripcionInventario';

const Inventario = createContext({ ...ESTADO_INICIAL, revisionDia: 0, reintentar: () => {} });
/** Una sola suscripción de inventario para Inicio, Despensa y Calendario. */
export function InventarioAppProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const [intento, setIntento] = useState(0);
  const [revisionDia, setRevisionDia] = useState(0);
  useEffect(() => observarInventario(setEstado), [intento]);
  useEffect(() => {
    // Recalcula etiquetas al volver a la app o al cambiar el día, aunque no cambien los documentos.
    let dia = new Date().toDateString();
    const revisar = () => {
      const actual = new Date().toDateString();
      if (actual !== dia) { dia = actual; setRevisionDia(n => n + 1); }
    };
    const reloj = setInterval(revisar, 60000);
    const sub = AppState.addEventListener('change', e => { if (e === 'active') revisar(); });
    return () => { clearInterval(reloj); sub.remove(); };
  }, []);
  return <Inventario.Provider value={{ ...estado, revisionDia, reintentar: () => setIntento(n => n + 1) }}>{children}</Inventario.Provider>;
}
export const useInventarioApp = () => useContext(Inventario);
