import {useState} from 'react';
import type {ProductoInventario} from '../../services/productos';
import {useInventarioWeb} from './InventarioContext';
import {MovimientoEditor} from '../mobile/MovimientoEditor';
import {TemaAppProvider} from '../mobile/TemaApp';
export function SalidaWeb({producto}:{producto:ProductoInventario}) {const [abierto,setAbierto]=useState(false);const i=useInventarioWeb();return <><button className="btn small" aria-label={`Registrar salida de ${producto.nombre}`} disabled={i.desdeCache || !i.online || !!i.error || !producto.id.startsWith('v5:')} onClick={()=>setAbierto(true)}>Consumí / deseché</button>{abierto && <TemaAppProvider><MovimientoEditor producto={producto} cerrar={()=>setAbierto(false)}/></TemaAppProvider>}</>;}
