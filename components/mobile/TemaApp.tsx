import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

export type PreferenciaTema = 'system' | 'light' | 'dark';
const CLAVE = '@preferencia_tema';
const claro = { fondo: '#F6F8F2', tarjeta: '#FFFFFF', texto: '#203C33', secundario: '#5E7065', borde: '#D7E1D3', verde: '#245E47', suave: '#EAF1DF', acento: '#DCECAB', peligro: '#A23730' };
const oscuro = { fondo: '#101B16', tarjeta: '#1A2921', texto: '#F0F5ED', secundario: '#BCCCBF', borde: '#45604E', verde: '#B8DFA1', suave: '#263F2D', acento: '#314D33', peligro: '#FFB4AC' };
const Tema = createContext({ colores: claro, esOscuro: false, preferencia: 'system' as PreferenciaTema, cambiarTema: async (_tema: PreferenciaTema) => {} });

export function TemaAppProvider({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('system');
  const version = useRef(0);
  useEffect(() => {
    // Retira la selección global que aplicaban las versiones anteriores de Ajustes.
    if (typeof Appearance.setColorScheme === 'function') Appearance.setColorScheme('unspecified');
    let vigente = true;
    const inicio = version.current;
    AsyncStorage.getItem(CLAVE).then(valor => {
      if (vigente && inicio === version.current && ['system', 'light', 'dark'].includes(valor || '')) setPreferencia(valor as PreferenciaTema);
    }).catch(() => {});
    return () => { vigente = false; };
  }, []);
  const esOscuro = preferencia === 'dark' || (preferencia === 'system' && sistema === 'dark');
  async function cambiarTema(tema: PreferenciaTema) {
    const anterior = preferencia;
    const id = ++version.current;
    setPreferencia(tema);
    try { await AsyncStorage.setItem(CLAVE, tema); }
    catch { if (version.current === id) setPreferencia(anterior); throw new Error('No se pudo guardar el tema. Inténtalo nuevamente.'); }
  }
  return <Tema.Provider value={{ colores: esOscuro ? oscuro : claro, esOscuro, preferencia, cambiarTema }}>{children}</Tema.Provider>;
}
export const useTemaApp = () => useContext(Tema);
