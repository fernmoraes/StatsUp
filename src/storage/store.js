// Persistência local (offline-first) via AsyncStorage, separada por conta.
import AsyncStorage from '@react-native-async-storage/async-storage';

const kProfile = (userId) => `statsup:${userId}:profile:v1`;
const kLogs = (userId) => `statsup:${userId}:logs:v1`;

// Chaves de antes das contas (dados sem dono).
const LEGACY_PROFILE = 'statsup:profile:v1';
const LEGACY_LOGS = 'statsup:logs:v1';

export async function loadProfile(userId) {
  try {
    const raw = await AsyncStorage.getItem(kProfile(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function saveProfile(userId, profile) {
  await AsyncStorage.setItem(kProfile(userId), JSON.stringify(profile));
}

export async function loadLogs(userId) {
  try {
    const raw = await AsyncStorage.getItem(kLogs(userId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function saveLogs(userId, logs) {
  await AsyncStorage.setItem(kLogs(userId), JSON.stringify(logs));
}

// Quem já usava o app antes do login não perde nada: o perfil e os treinos
// sem dono passam para a primeira conta criada neste aparelho.
export async function claimLegacyData(userId) {
  const [[, profile], [, logs]] = await AsyncStorage.multiGet([LEGACY_PROFILE, LEGACY_LOGS]);
  if (!profile && !logs) return false;
  const pairs = [];
  if (profile) pairs.push([kProfile(userId), profile]);
  if (logs) pairs.push([kLogs(userId), logs]);
  await AsyncStorage.multiSet(pairs);
  await AsyncStorage.multiRemove([LEGACY_PROFILE, LEGACY_LOGS]);
  return true;
}
