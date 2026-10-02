/** Exporta el JSON elegido por el usuario y limpia las copias temporales creadas por la app. */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
const carpeta = () => FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}frescapp-privado/` : null;
export async function limpiarTemporales(): Promise<void> {
  if (Platform.OS === 'web') return;
  const dir = carpeta();
  if (dir) await FileSystem.deleteAsync(dir, { idempotent: true });
}
export async function compartirJson(json: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'frescapp-mis-datos.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('No hay una aplicación disponible para guardar el archivo.');
  const dir = carpeta();
  if (!dir) throw new Error('No se pudo acceder al almacenamiento temporal.');
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const path = `${dir}mis-datos.json`;
  try {
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Guardar mis datos de FrescApp' });
  } finally { await FileSystem.deleteAsync(path, { idempotent: true }); }
}
