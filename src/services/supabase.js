// Cliente Supabase do app.
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as secureStorage from '../storage/secureStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Travas de segurança da configuração (falham no início, não em produção):
// 1. Só HTTPS: sem TLS, senha e token trafegariam em texto aberto.
if (!/^https:\/\//.test(url || '')) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL precisa usar https://');
}
// 2. Só a chave PÚBLICA vai no app. A secret key (sb_secret_…) ou a antiga
//    service_role ignoram todo o RLS: nunca podem estar no app.
function isSecretKey(k) {
  if (!k || k.startsWith('sb_secret_')) return true;
  if (k.split('.').length === 3) {
    try {
      const payload = JSON.parse(globalThis.atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role === 'service_role';
    } catch (e) {
      return false;
    }
  }
  return false;
}
if (isSecretKey(key)) {
  throw new Error('Chave do Supabase inválida: use a publishable key (sb_publishable_…), nunca a secret key.');
}

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

// Sessão (tokens de acesso): no disco, só CRIPTOGRAFADA (secureStorage).
const sessionStorage = {
  async getItem(k) {
    await rememberLoaded;
    return remember ? secureStorage.getItem(k) : memory.get(k) ?? null;
  },
  async setItem(k, v) {
    await rememberLoaded;
    if (remember) await secureStorage.setItem(k, v);
    else memory.set(k, v);
  },
  async removeItem(k) {
    memory.delete(k);
    await secureStorage.removeItem(k);
  },
};

export const supabase = createClient(url, key, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
