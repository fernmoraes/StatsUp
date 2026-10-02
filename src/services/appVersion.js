// Atualização obrigatória. Ao abrir, o app lê `site/version.json` (GitHub Pages):
//   { "minVersionCode": 2, "latestVersionCode": 2, "latestVersion": "1.0.1-beta",
//     "downloadUrl": "https://github.com/fernmoraes/StatsUp/releases" }
// - versão abaixo de minVersionCode → bloqueada (tela "Atualize o StatsUp");
// - abaixo de latestVersionCode → aviso de que existe versão nova (dispensável).
// Para desativar uma versão: publique o APK novo e aumente minVersionCode no JSON.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
// Lido do app.json no momento do build: vale igual no APK, no Expo Go e na web
// (o expo-constants nem sempre traz a seção android/ios em tempo de execução).
import appJson from '../../app.json';

const VERSION_URL = process.env.EXPO_PUBLIC_VERSION_URL;
const K_LAST_INFO = 'statsup:version-info:v1'; // última resposta, para funcionar offline
const TIMEOUT_MS = 5000;

const cfg = appJson.expo;

// Número da versão instalada (android.versionCode / ios.buildNumber do app.json).
export function currentVersionCode() {
  const code = Platform.OS === 'ios' ? cfg.ios && cfg.ios.buildNumber : cfg.android && cfg.android.versionCode;
  return Number(code) || 0;
}

export const currentVersionName = () => cfg.version || '';

async function fetchInfo() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // ?t= evita cache do GitHub Pages/CDN.
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const info = await res.json();
    if (typeof info.minVersionCode !== 'number') return null;
    return info;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Retorna { status: 'ok' | 'update-available' | 'outdated', info }.
// Sem internet usa a última resposta salva: uma versão já bloqueada continua
// bloqueada; se nunca conseguiu checar, deixa usar (o app funciona offline).
export async function checkAppVersion() {
  if (!VERSION_URL) return { status: 'ok', info: null };
  let info = await fetchInfo();
  if (info) {
    AsyncStorage.setItem(K_LAST_INFO, JSON.stringify(info)).catch(() => {});
  } else {
    try {
      const raw = await AsyncStorage.getItem(K_LAST_INFO);
      info = raw ? JSON.parse(raw) : null;
    } catch (e) {
      info = null;
    }
  }
  if (!info) return { status: 'ok', info: null };

  const code = currentVersionCode();
  if (code && code < info.minVersionCode) return { status: 'outdated', info };
  if (code && info.latestVersionCode && code < info.latestVersionCode) return { status: 'update-available', info };
  return { status: 'ok', info };
}
