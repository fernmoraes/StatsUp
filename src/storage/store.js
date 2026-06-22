// Persistência local (offline-first) via AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';

const K_PROFILE = 'statsup:profile:v1';
const K_LOGS = 'statsup:logs:v1';

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(K_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function saveProfile(profile) {
  await AsyncStorage.setItem(K_PROFILE, JSON.stringify(profile));
}

export async function loadLogs() {
  try {
    const raw = await AsyncStorage.getItem(K_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function saveLogs(logs) {
  await AsyncStorage.setItem(K_LOGS, JSON.stringify(logs));
}

export async function clearAll() {
  await AsyncStorage.multiRemove([K_PROFILE, K_LOGS]);
}
