// Armazenamento criptografado (padrão recomendado pelo Supabase para React Native).
//
// Cada valor é cifrado com AES-256-CTR usando uma chave aleatória NOVA a cada
// gravação. A chave fica no cofre do sistema (Android Keystore / iOS Keychain,
// via SecureStore) e o conteúdo cifrado no AsyncStorage — o SecureStore sozinho
// só aceita valores pequenos (~2 KB) e a sessão do Supabase pode passar disso.
// Quem copiar o AsyncStorage do aparelho não consegue ler nada sem o cofre.
//
// Na web (só desenvolvimento) não existe cofre: grava sem cifrar.
// Valores antigos, gravados sem criptografia, continuam legíveis e passam a ser
// cifrados na próxima gravação.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';

const PREFIX = 'enc1:'; // marca o formato cifrado
const native = Platform.OS !== 'web';

// SecureStore só aceita [A-Za-z0-9._-] no nome da chave.
const vaultKey = (key) => `k_${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;

function encrypt(plain, keyBytes) {
  const ctr = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(1));
  return aesjs.utils.hex.fromBytes(ctr.encrypt(aesjs.utils.utf8.toBytes(plain)));
}

function decrypt(hex, keyBytes) {
  const ctr = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(1));
  return aesjs.utils.utf8.fromBytes(ctr.decrypt(aesjs.utils.hex.toBytes(hex)));
}

export async function getItem(key) {
  const stored = await AsyncStorage.getItem(key);
  if (stored == null) return null;
  if (!stored.startsWith(PREFIX)) return stored; // legado (sem criptografia)
  if (!native) return null;
  const keyHex = await SecureStore.getItemAsync(vaultKey(key));
  if (!keyHex) return null; // chave perdida (ex.: app reinstalado): trata como vazio
  try {
    return decrypt(stored.slice(PREFIX.length), aesjs.utils.hex.toBytes(keyHex));
  } catch (e) {
    return null;
  }
}

export async function setItem(key, value) {
  if (!native) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  const keyBytes = Crypto.getRandomBytes(32); // AES-256, chave nova a cada gravação
  await SecureStore.setItemAsync(vaultKey(key), aesjs.utils.hex.fromBytes(keyBytes));
  await AsyncStorage.setItem(key, PREFIX + encrypt(value, keyBytes));
}

export async function removeItem(key) {
  await AsyncStorage.removeItem(key);
  if (native) await SecureStore.deleteItemAsync(vaultKey(key)).catch(() => {});
}
