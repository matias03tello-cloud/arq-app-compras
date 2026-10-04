import {useEffect,useState} from 'react';
import {RecetasPantalla} from '../../components/mobile/RecetasPantalla';
import {TemaAppProvider} from '../../components/mobile/TemaApp';
import {useInventarioWeb} from '../../components/web/InventarioContext';
export default function Pagina(){const i=useInventarioWeb();const [dia,setDia]=useState(0);useEffect(()=>{let fecha=new Date().toDateString();const revisar=()=>{const nueva=new Date().toDateString();if(fecha!==nueva){fecha=nueva;setDia(n=>n+1);}};const reloj=setInterval(revisar,60000);document.addEventListener('visibilitychange',revisar);return()=>{clearInterval(reloj);document.removeEventListener('visibilitychange',revisar);};},[]);return <TemaAppProvider><RecetasPantalla productos={i.productos} listo={!i.cargando && !i.desdeCache && !i.error && i.online} error={i.error} reintentar={i.reintentar} revisionDia={dia}/></TemaAppProvider>;}
