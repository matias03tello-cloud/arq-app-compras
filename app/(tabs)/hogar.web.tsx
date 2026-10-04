import { HogarPantalla } from '../../components/mobile/HogarPantalla';
import { TemaAppProvider } from '../../components/mobile/TemaApp';
import { useInventarioWeb } from '../../components/web/InventarioContext';
export default function HogarWeb() { const i=useInventarioWeb();return <TemaAppProvider><HogarPantalla personales={i.productos} personalesListos={!i.cargando && !i.desdeCache && !i.error && i.online}/></TemaAppProvider>; }
