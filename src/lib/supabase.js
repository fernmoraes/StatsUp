// Cliente Supabase do app.
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// "Salvar conta": a sessão só vai para o disco quando a pessoa pediu. Sem isso
// ela fica em memória e some ao fechar o app (volta para o login).
const K_REMEMBER = 'statsup:remember:v1';
const memory = new Map();
let remember = true;
const rememberLoaded = AsyncStorage.getItem(K_REMEMBER)
  .then((v) => { remember = v !== 'false'; })
  .catch(() => {});

export async function setRememberSession(value) {
  await rememberLoaded;
  remember = value;
  await AsyncStorage.setItem(K_REMEMBER, value ? 'true' : 'false');
}

export async function isRememberingSession() {
  await rememberLoaded;
  return remember;
}

const sessionStorage = {
  async getItem(k) {
    await rememberLoaded;
    return remember ? AsyncStorage.getItem(k) : memory.get(k) ?? null;
  },
  async setItem(k, v) {
    await rememberLoaded;
    if (remember) await AsyncStorage.setItem(k, v);
    else memory.set(k, v);
  },
  async removeItem(k) {
    memory.delete(k);
    await AsyncStorage.removeItem(k);
  },
};

export const supabase = createClient(url, key, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

// No celular, só renova o token com o app em primeiro plano (recomendação do
// Supabase para React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
