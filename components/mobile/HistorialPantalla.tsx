import {useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {useHistorial} from '../../services/movimientos';
import {etiquetaCantidad} from '../../security/identidadProducto';
import {useTemaApp} from './TemaApp';
import {Aviso,BotonApp,Chip,Encabezado,ui} from './UI';
export function HistorialPantalla({hogar}:{hogar?:string}) {
 const h=useHistorial(hogar);const {colores}=useTemaApp();const [filtro,setFiltro]=useState('todos');const visibles=h.items.filter(m=>filtro==='todos'||m.tipo===filtro);
 return <ScrollView contentContainerStyle={ui.contenido}><Encabezado titulo={hogar?'Historial del hogar':'Mi historial'} detalle="Consumo y desperdicio registrados desde esta etapa."/>
 <Aviso texto="Solo aparecen las salidas que registraste explícitamente. Eliminar un alimento para corregir un registro no se cuenta como desperdicio."/>
 {(h.cache || h.error) && <Aviso texto={h.error || 'Esperando confirmación del servidor. Los datos pueden estar desactualizados.'} error={!!h.error}/>}{(h.cache || h.error) && <BotonApp texto="Reintentar historial" secundario onPress={h.reintentar}/>}
 <View style={[ui.fila,{flexWrap:'wrap'}]}>{['todos','consumo','desperdicio'].map(t=><Chip key={t} texto={t==='todos'?'Todos':t==='consumo'?'Consumo':'Desperdicio'} elegido={filtro===t} onPress={()=>setFiltro(t)}/>)}</View>
 <Text style={{color:colores.secundario}}>{h.items.filter(m=>m.tipo==='consumo').length} consumos · {h.items.filter(m=>m.tipo==='desperdicio').length} desperdicios en los {h.items.length} movimientos cargados.</Text>
 {!h.cache && !h.error && !visibles.length && <Text style={{color:colores.texto}}>No hay movimientos para este filtro.</Text>}
 {visibles.map(m=><View key={m.id} style={{backgroundColor:colores.tarjeta,borderColor:colores.borde,borderWidth:1,padding:16,borderRadius:16,gap:8}}><Text style={{color:colores.texto,fontWeight:'700',fontSize:18}}>{m.nombre} · {m.marca}</Text><Text style={{color:m.tipo==='desperdicio'?colores.peligro:colores.verde}}>{m.tipo==='consumo'?'Consumido':'Desechado'}: {etiquetaCantidad(m)}</Text><Text style={{color:colores.secundario}}>{m.motivo} · {m.creadoEn?.toDate().toLocaleString('es-CL') || 'Confirmando fecha'}</Text><Text style={{color:colores.secundario}}>Vencimiento del lote: {m.vencimiento} · Restante después de esta salida: {m.restante} {m.codigoBarras.startsWith('sin:')?m.unidad:'envases'}</Text></View>)}
 {h.hayMas && (h.tope<500?<BotonApp texto="Cargar 50 movimientos anteriores" secundario onPress={h.mas}/>:<Aviso texto="Se muestran hasta 500 movimientos. La exportación de privacidad incluye el historial completo."/>)}
 </ScrollView>;
}
