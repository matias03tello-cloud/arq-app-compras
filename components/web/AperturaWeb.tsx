import { useState } from 'react';
import type { ProductoInventario } from '../../services/productos';
import { AperturaEditor } from '../mobile/AperturaEditor';
import { TemaAppProvider } from '../mobile/TemaApp';
import { useInventarioWeb } from './InventarioContext';
export function AperturaWeb({ producto }: { producto: ProductoInventario }) {
 const [abierto,setAbierto]=useState(false);const i=useInventarioWeb();
 return <><button className="btn small" disabled={i.desdeCache || !!i.error || !i.online || !producto.id.startsWith('v5:')} onClick={()=>setAbierto(true)} aria-label={`Registrar apertura de ${producto.nombre}`}>Registrar apertura</button>{abierto && <TemaAppProvider><AperturaEditor producto={producto} cerrar={()=>setAbierto(false)}/></TemaAppProvider>}</>;
}
