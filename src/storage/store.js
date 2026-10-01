// Cache local por conta (AsyncStorage). A nuvem (Supabase) é a fonte oficial;
// este cache deixa o app abrir e registrar treinos sem internet.
import AsyncStorage from '@react-native-async-storage/async-storage';

const kProfile = (userId) => `statsup:${userId}:profile:v1`;
const kLogs = (userId) => `statsup:${userId}:logs:v1`;
// Há mudanças locais ainda não enviadas para a nuvem.
const kDirty = (userId) => `statsup:${userId}:dirty:v1`;

// Versões anteriores: dados sem dono e contas locais (antes do Supabase).
const LEGACY_PROFILE = 'statsup:profile:v1';
const LEGACY_LOGS = 'statsup:logs:v1';
const LOCAL_ACCOUNTS = 'statsup:accounts:v1';

const readJSON = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const loadProfile = (userId) => readJSON(kProfile(userId), null);
export const loadLogs = (userId) => readJSON(kLogs(userId), []);

export async function saveProfile(userId, profile) {
  await AsyncStorage.setItem(kProfile(userId), JSON.stringify(profile));
}

export async function saveLogs(userId, logs) {
  await AsyncStorage.setItem(kLogs(userId), JSON.stringify(logs));
}

export async function isDirty(userId) {
  return (await AsyncStorage.getItem(kDirty(userId))) === '1';
}

export async function setDirty(userId, dirty) {
  if (dirty) await AsyncStorage.setItem(kDirty(userId), '1');
  else await AsyncStorage.removeItem(kDirty(userId));
}

// Dados criados antes desta conta existir na nuvem passam para ela (uma vez):
//   1. a conta LOCAL com o mesmo e-mail (versão anterior do login);
//   2. os dados sem dono (de antes de existir login).
// Só acontece se esta conta ainda não tem nada no aparelho. Retorna true se
// trouxe algo (o chamador então marca para enviar à nuvem).
export async function claimLocalData(userId, email) {
  if ((await loadProfile(userId)) || (await loadLogs(userId)).length) return false;

  const accounts = await readJSON(LOCAL_ACCOUNTS, {});
  const local = accounts[email];
  let sources = null;
  if (local) sources = [`statsup:${local.id}:profile:v1`, `statsup:${local.id}:logs:v1`];
  else sources = [LEGACY_PROFILE, LEGACY_LOGS];

  const [[, profile], [, logs]] = await AsyncStorage.multiGet(sources);
  if (!profile && !logs) return false;
  const pairs = [];
  if (profile) pairs.push([kProfile(userId), profile]);
  if (logs) pairs.push([kLogs(userId), logs]);
  await AsyncStorage.multiSet(pairs);
  await AsyncStorage.multiRemove(sources);
  if (local) {
    delete accounts[email];
    await AsyncStorage.setItem(LOCAL_ACCOUNTS, JSON.stringify(accounts));
  }
  return true;
}
