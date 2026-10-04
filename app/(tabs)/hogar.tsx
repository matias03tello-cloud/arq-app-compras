import { useInventarioApp } from '../../components/mobile/InventarioApp';
import { HogarPantalla } from '../../components/mobile/HogarPantalla';
import { Pantalla } from '../../components/mobile/UI';
export default function Hogar() { const i=useInventarioApp(); return <Pantalla><HogarPantalla personales={i.productos} personalesListos={!i.cargando && !i.desdeCache && !i.error}/></Pantalla>; }
