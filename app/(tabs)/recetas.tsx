import {RecetasPantalla} from '../../components/mobile/RecetasPantalla';
import {useInventarioApp} from '../../components/mobile/InventarioApp';
import {Pantalla} from '../../components/mobile/UI';
export default function Pagina(){const i=useInventarioApp();return <Pantalla><RecetasPantalla productos={i.productos} listo={!i.cargando && !i.desdeCache && !i.error} error={i.error} reintentar={i.reintentar} revisionDia={i.revisionDia}/></Pantalla>;}
