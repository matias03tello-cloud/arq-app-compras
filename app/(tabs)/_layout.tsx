import {AvisosInventario} from '../../components/mobile/AvisosInventario';
import { CompraMultipleProvider } from '../../components/mobile/CompraMultiple';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../services/auth';
import { InventarioAppProvider } from '../../components/mobile/InventarioApp';
import { TemaAppProvider, useTemaApp } from '../../components/mobile/TemaApp';

function Pestanas() {
  const { colores, esOscuro } = useTemaApp();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return <><AvisosInventario/><StatusBar style={esOscuro ? 'light' : 'dark'}/><Tabs screenOptions={{
    headerShown: false, tabBarActiveTintColor: colores.verde, tabBarInactiveTintColor: colores.secundario,
    tabBarHideOnKeyboard: true, tabBarAllowFontScaling: true,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    tabBarStyle: { height: 62 + Math.max(insets.bottom, 8) + Math.max(0, fontScale - 1) * 24, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8, backgroundColor: colores.tarjeta, borderTopColor: colores.borde },
  }}>
    <Tabs.Screen name="recetas" options={{href:null}}/><Tabs.Screen name="registro-compras" options={{href:null}}/><Tabs.Screen name="historial" options={{href:null}}/><Tabs.Screen name="hogar" options={{ href: null }}/><Tabs.Screen name="compras" options={{ href: null }}/><Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={23} color={color}/> }}/>
    <Tabs.Screen name="despensa" options={{ title: 'Despensa', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'basket' : 'basket-outline'} size={23} color={color}/> }}/>
    <Tabs.Screen name="camara" listeners={({navigation})=>({tabPress:e=>{e.preventDefault();navigation.navigate('camara',{compra:'0'});}})} options={{ title: 'Agregar', tabBarAccessibilityLabel: 'Agregar alimento', tabBarIcon: () => <View style={{ backgroundColor: '#245E47', borderRadius: 13, width: 42, height: 34, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="add" size={27} color="#FFFFFF"/></View> }}/>
    <Tabs.Screen name="calendario" options={{ title: 'Fechas', tabBarAccessibilityLabel: 'Calendario de vencimientos', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={23} color={color}/> }}/>
    <Tabs.Screen name="configuracion" options={{ title: 'Ajustes', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={23} color={color}/> }}/>
  </Tabs></>;
}
export default function LayoutPestanas() {
  return <TemaAppProvider><InventarioAppProvider key={auth.currentUser?.uid}><CompraMultipleProvider><Pestanas/></CompraMultipleProvider></InventarioAppProvider></TemaAppProvider>;
}
