// Contas LOCAIS (ficam só neste aparelho). Interface pensada para ser trocada
// pelo Supabase Auth depois: signUp / signIn / signOut / restoreSession.
//
// Senhas nunca são salvas em texto: guardamos SHA-256 iterado com um sal
// aleatório por conta. Como tudo fica no próprio aparelho, isto é uma trava do
// app, não segurança de servidor (isso vem com o backend).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { claimLegacyData } from './store';

const K_ACCOUNTS = 'statsup:accounts:v1'; // { [emailNormalizado]: conta }
const K_SESSION = 'statsup:session:v1'; // { userId } — só existe com "Salvar conta"
const K_LAST_EMAIL = 'statsup:last-email:v1'; // preenche o login

const HASH_ROUNDS = 300;

export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const normalizeEmail = (email) => email.trim().toLowerCase();
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
export const MIN_PASSWORD = 6;

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function hashPassword(password, salt) {
  let h = `${salt}:${password}`;
  for (let i = 0; i < HASH_ROUNDS; i++) {
    h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${h}`);
  }
  return h;
}

async function loadAccounts() {
  try {
    const raw = await AsyncStorage.getItem(K_ACCOUNTS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

// O que o app vê da conta (sem sal/hash).
const publicUser = ({ id, name, email, created_at }) => ({ id, name, email, created_at });

export async function signUp({ name, email, password }) {
  const cleanName = name.trim();
  if (!cleanName) throw new AuthError('name', 'Informe seu nome.');
  if (!isValidEmail(email)) throw new AuthError('email', 'E-mail inválido.');
  if (password.length < MIN_PASSWORD) throw new AuthError('password', `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`);

  const accounts = await loadAccounts();
  const key = normalizeEmail(email);
  if (accounts[key]) throw new AuthError('email', 'Já existe uma conta com esse e-mail. Entre com ela.');

  const salt = toHex(Crypto.getRandomBytes(16));
  const account = {
    id: Crypto.randomUUID(),
    name: cleanName,
    email: key,
    salt,
    hash: await hashPassword(password, salt),
    created_at: new Date().toISOString(),
  };
  const isFirstAccount = Object.keys(accounts).length === 0;
  accounts[key] = account;
  await AsyncStorage.setItem(K_ACCOUNTS, JSON.stringify(accounts));

  // Dados de antes do login (perfil/treinos sem dono) vão para a 1ª conta.
  if (isFirstAccount) await claimLegacyData(account.id);

  // Cadastro já entra com a conta salva.
  await AsyncStorage.multiSet([
    [K_SESSION, JSON.stringify({ userId: account.id })],
    [K_LAST_EMAIL, key],
  ]);
  return publicUser(account);
}

export async function signIn({ email, password, remember }) {
  const accounts = await loadAccounts();
  const account = accounts[normalizeEmail(email)];
  // Mesma mensagem para e-mail inexistente e senha errada (não revela contas).
  const fail = () => new AuthError('credentials', 'E-mail ou senha incorretos.');
  if (!account) throw fail();
  if ((await hashPassword(password, account.salt)) !== account.hash) throw fail();

  await AsyncStorage.setItem(K_LAST_EMAIL, account.email);
  if (remember) await AsyncStorage.setItem(K_SESSION, JSON.stringify({ userId: account.id }));
  else await AsyncStorage.removeItem(K_SESSION);
  return publicUser(account);
}

export async function signOut() {
  await AsyncStorage.removeItem(K_SESSION);
}

// Sessão salva ("Salvar conta") ao abrir o app. Sem ela, volta para o login.
export async function restoreSession() {
  try {
    const raw = await AsyncStorage.getItem(K_SESSION);
    if (!raw) return null;
    const { userId } = JSON.parse(raw);
    const account = Object.values(await loadAccounts()).find((a) => a.id === userId);
    return account ? publicUser(account) : null;
  } catch (e) {
    return null;
  }
}

export async function getLastEmail() {
  try {
    return (await AsyncStorage.getItem(K_LAST_EMAIL)) || '';
  } catch (e) {
    return '';
  }
}
