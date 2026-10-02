// Cache local por conta (AsyncStorage). A nuvem (Supabase) é a fonte oficial;
// este cache deixa o app abrir e registrar treinos sem internet.
import AsyncStorage from '@react-native-async-storage/async-storage';
// Perfil e treinos são dados pessoais (nascimento, peso…): ficam criptografados.
import * as secureStorage from './secureStorage';

const kProfile = (userId) => `statsup:${userId}:profile:v1`;
const kLogs = (userId) => `statsup:${userId}:logs:v1`;
// Há mudanças locais ainda não enviadas para a nuvem.
const kDirty = (userId) => `statsup:${userId}:dirty:v1`;

// Cada conta só enxerga as próprias chaves: uma conta nova começa vazia e
// nunca herda dados de outra conta ou de versões antigas do app.

const readJSON = async (key, fallback) => {
  try {
    const raw = await secureStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const loadProfile = (userId) => readJSON(kProfile(userId), null);
export const loadLogs = (userId) => readJSON(kLogs(userId), []);

export async function saveProfile(userId, profile) {
  await secureStorage.setItem(kProfile(userId), JSON.stringify(profile));
}

export async function saveLogs(userId, logs) {
  await secureStorage.setItem(kLogs(userId), JSON.stringify(logs));
}

const kTutorial = (userId) => `statsup:${userId}:tutorial:v1`;

export async function isTutorialDone(userId) {
  return (await AsyncStorage.getItem(kTutorial(userId))) === '1';
}

export async function setTutorialDone(userId) {
  await AsyncStorage.setItem(kTutorial(userId), '1');
}

export async function isDirty(userId) {
  return (await AsyncStorage.getItem(kDirty(userId))) === '1';
}

export async function setDirty(userId, dirty) {
  if (dirty) await AsyncStorage.setItem(kDirty(userId), '1');
  else await AsyncStorage.removeItem(kDirty(userId));
}


