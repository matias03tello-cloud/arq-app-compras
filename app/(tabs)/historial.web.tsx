import {useLocalSearchParams} from 'expo-router';
import {HistorialPantalla} from '../../components/mobile/HistorialPantalla';
import {TemaAppProvider} from '../../components/mobile/TemaApp';
export default function Pagina(){const {hogar}=useLocalSearchParams<{hogar?:string}>();return <TemaAppProvider><HistorialPantalla hogar={hogar}/></TemaAppProvider>;}
