import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as FirebaseAuth from 'firebase/auth';
import { createChunkedStorage } from './chunkedStorage';

const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const storage = createChunkedStorage({
  getItem: key => SecureStore.getItemAsync(key, options),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, options),
  removeItem: key => SecureStore.deleteItemAsync(key, options),
}, randomUUID);

// El SDK proporciona este export en su entrada react-native. Su declaración
// web no lo incluye; se tipa el puente sin recurrir a `any`.
const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (adapter: typeof storage) => FirebaseAuth.Persistence;
};
if (typeof nativeAuth.getReactNativePersistence !== 'function') {
  throw new Error('Firebase debe resolver su entrada React Native. Revisa la instalación.');
}
export const sessionPersistence = nativeAuth.getReactNativePersistence(storage);
