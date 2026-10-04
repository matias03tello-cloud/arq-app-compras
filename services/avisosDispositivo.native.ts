import * as N from 'expo-notifications';
import {Platform} from 'react-native';
import {auth} from './auth';
import type {AvisoProgramado} from './avisosModelo';
const marca='frescapp-vencimientos-v1';
export const disponible=true;
N.setNotificationHandler({handleNotification:async n=>{const visible=n.request.content.data?.marca===marca && n.request.content.data?.cuenta===auth.currentUser?.uid;return {shouldShowBanner:visible,shouldShowList:visible,shouldPlaySound:false,shouldSetBadge:false};}});
export async function limpiar(){
 for(const n of await N.getAllScheduledNotificationsAsync())if(n.content.data?.marca===marca)await N.cancelScheduledNotificationAsync(n.identifier);
 for(const n of await N.getPresentedNotificationsAsync())if(n.request.content.data?.marca===marca)await N.dismissNotificationAsync(n.request.identifier);
}
export async function permiso(pedir=false){
 if(Platform.OS==='android')await N.setNotificationChannelAsync(marca,{name:'Vencimientos de la despensa',importance:N.AndroidImportance.DEFAULT,lockscreenVisibility:N.AndroidNotificationVisibility.PRIVATE,sound:null});
 let p=await N.getPermissionsAsync();if(pedir && !p.granted && p.canAskAgain)p=await N.requestPermissionsAsync();
 return p.granted || p.ios?.status===N.IosAuthorizationStatus.PROVISIONAL;
}
export const cancelar=(id:string)=>N.cancelScheduledNotificationAsync(id);
export const programar=(uid:string,a:AvisoProgramado)=>N.scheduleNotificationAsync({content:{title:'FrescApp · Revisa tu despensa',body:'Tienes alimentos con fechas próximas. Abre la app y revisa tus registros.',sound:false,data:{marca,cuenta:uid}},trigger:{type:N.SchedulableTriggerInputTypes.DATE,date:a.fecha,channelId:marca}});
