import {useLocalSearchParams} from 'expo-router';
import {HistorialPantalla} from '../../components/mobile/HistorialPantalla';
import {Pantalla} from '../../components/mobile/UI';
export default function Pagina(){const {hogar}=useLocalSearchParams<{hogar?:string}>();return <Pantalla><HistorialPantalla hogar={hogar}/></Pantalla>;}
