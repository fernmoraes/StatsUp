// Contas via Supabase Auth (e-mail + senha). Mesma interface da versão local:
// signUp / signIn / signOut / restoreSession — as telas não mudam.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, setRememberSession, isRememberingSession } from './supabase';
import * as secureStorage from '../storage/secureStorage';

const K_LAST_EMAIL = 'statsup:last-email:v1'; // preenche o login
// Última conta logada com "Salvar conta": permite abrir o app sem internet.
// Fica criptografada (secureStorage).
const K_CACHED_USER = 'statsup:cached-user:v1';

export const MAX_NAME = 60;

// Versão da política de privacidade aceita no cadastro (data da página
// site/privacidade.html). Fica na conta como comprovação do consentimento (LGPD).
export const PRIVACY_VERSION = '2026-10-02';
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

// Política de senha (cadastro). O login aceita senhas antigas, criadas antes
// desta regra, para não trancar contas existentes.
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 30;
export const PASSWORD_RULES = [
  { key: 'length', label: `De ${MIN_PASSWORD} a ${MAX_PASSWORD} caracteres`, test: (p) => p.length >= MIN_PASSWORD && p.length <= MAX_PASSWORD },
  { key: 'lower', label: 'Uma letra minúscula', test: (p) => /[a-z]/.test(p) },
  { key: 'upper', label: 'Uma letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { key: 'digit', label: 'Um número', test: (p) => /[0-9]/.test(p) },
  // Mesma lista de símbolos que o Supabase Auth aceita na exigência de senha.
  { key: 'symbol', label: 'Um caractere especial (ex.: ! @ # $ %)', test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p) },
];
export const checkPassword = (p) => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(p) }));
export const isStrongPassword = (p) => PASSWORD_RULES.every((r) => r.test(p));

export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const normalizeEmail = (email) => email.trim().toLowerCase();
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: (u.user_metadata && u.user_metadata.name) || '',
  tutorial_done: !!(u.user_metadata && u.user_metadata.tutorial_done),
  created_at: u.created_at,
});

const isNetworkError = (e) =>
  !e || e.name === 'AuthRetryableFetchError' || /network|fetch|timed? ?out/i.test(e.message || '');

// Mensagens do Supabase → português, no campo certo da tela.
function translate(error) {
  const msg = (error && error.message) || '';
  const code = error && error.code;
  if (isNetworkError(error) && !code) return new AuthError('network', 'Sem conexão com a internet. Conecte e tente de novo.');
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg))
    return new AuthError('credentials', 'E-mail ou senha incorretos.');
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg))
    return new AuthError('confirm', 'Confirme seu e-mail pelo link que enviamos antes de entrar.');
  if (code === 'user_already_exists' || /already registered/i.test(msg))
    return new AuthError('email', 'Já existe uma conta com esse e-mail. Entre com ela.');
  if (code === 'weak_password' || /password/i.test(msg))
    return new AuthError('password', 'Senha fraca. Siga todos os requisitos abaixo do campo.');
  if (code === 'email_address_invalid' || /email.*invalid/i.test(msg))
    return new AuthError('email', 'E-mail inválido.');
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit/i.test(msg))
    return new AuthError('rate', 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.');
  return new AuthError('unknown', 'Não foi possível concluir. Tente de novo.');
}

async function rememberUser(user) {
  await AsyncStorage.setItem(K_LAST_EMAIL, user.email);
  await secureStorage.setItem(K_CACHED_USER, JSON.stringify(user));
}

// Retorna { user } ou { needsConfirmation: true } quando o projeto exige
// confirmar o e-mail antes do primeiro login.
export async function signUp({ name, email, password, acceptedPrivacy }) {
  const cleanName = name.trim();
  if (!cleanName) throw new AuthError('name', 'Informe seu nome.');
  if (cleanName.length > MAX_NAME) throw new AuthError('name', `Use no máximo ${MAX_NAME} caracteres.`);
  if (!isValidEmail(email)) throw new AuthError('email', 'E-mail inválido.');
  if (!isStrongPassword(password)) throw new AuthError('password', 'A senha não atende a todos os requisitos.');
  if (!acceptedPrivacy) throw new AuthError('privacy', 'Aceite a política de privacidade para criar a conta.');

  await setRememberSession(true); // cadastro já entra com a conta salva
  let res;
  try {
    res = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        data: {
          name: cleanName,
          privacy_version: PRIVACY_VERSION,
          privacy_accepted_at: new Date().toISOString(),
        },
        // Depois de confirmar, o link abre a página do StatsUp (site/).
        emailRedirectTo: process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL,
      },
    });
  } catch (e) {
    throw translate(e);
  }
  if (res.error) throw translate(res.error);
  // Com "confirmar e-mail" ligado, o Supabase responde sem sessão (e, por
  // segurança, também sem erro quando o e-mail já existe).
  if (!res.data.session) {
    await AsyncStorage.setItem(K_LAST_EMAIL, normalizeEmail(email));
    return { needsConfirmation: true };
  }
  const user = publicUser(res.data.user);
  await rememberUser(user);
  return { user };
}

// Espera progressiva contra força bruta: depois de 3 senhas erradas para o
// mesmo e-mail, cada nova tentativa exige esperar 15 s, 30 s, 1 min… até 5 min.
// Sobrevive a fechar o app; zera no primeiro login certo. (O Supabase ainda
// limita tentativas por IP no servidor — esta trava é a camada do app.)
const K_LOGIN_FAILS = 'statsup:login-fails:v1';
const FREE_ATTEMPTS = 3;
const BASE_WAIT_S = 15;
const MAX_WAIT_S = 300;

async function readFails() {
  try {
    return JSON.parse((await AsyncStorage.getItem(K_LOGIN_FAILS)) || '{}');
  } catch (e) {
    return {};
  }
}

export async function loginLockSeconds(email) {
  const entry = (await readFails())[normalizeEmail(email)];
  if (!entry || !entry.until) return 0;
  return Math.max(0, Math.ceil((entry.until - Date.now()) / 1000));
}

async function registerFailure(email) {
  const all = await readFails();
  const key = normalizeEmail(email);
  const count = ((all[key] && all[key].count) || 0) + 1;
  const extra = count - FREE_ATTEMPTS;
  const wait = extra >= 0 ? Math.min(BASE_WAIT_S * 2 ** extra, MAX_WAIT_S) : 0;
  all[key] = { count, until: wait ? Date.now() + wait * 1000 : 0 };
  await AsyncStorage.setItem(K_LOGIN_FAILS, JSON.stringify(all));
  return wait;
}

async function clearFailures(email) {
  const all = await readFails();
  delete all[normalizeEmail(email)];
  await AsyncStorage.setItem(K_LOGIN_FAILS, JSON.stringify(all));
}

const lockedError = (s) =>
  new AuthError('locked', `Muitas tentativas com senha errada. Espere ${s < 60 ? `${s} s` : `${Math.ceil(s / 60)} min`} e tente de novo.`);

export async function signIn({ email, password, remember }) {
  const lock = await loginLockSeconds(email);
  if (lock > 0) throw lockedError(lock);

  await setRememberSession(!!remember);
  let res;
  try {
    res = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
  } catch (e) {
    throw translate(e);
  }
  if (res.error) {
    const err = translate(res.error);
    if (err.code === 'credentials') {
      const wait = await registerFailure(email);
      if (wait > 0) throw lockedError(wait);
    }
    throw err;
  }
  await clearFailures(email);
  const user = publicUser(res.data.user);
  if (remember) await rememberUser(user);
  else {
    await AsyncStorage.setItem(K_LAST_EMAIL, user.email);
    await secureStorage.removeItem(K_CACHED_USER);
  }
  return user;
}

// Exclusão de conta (LGPD). Pede a senha de novo — quem pegar o celular
// desbloqueado não consegue apagar a conta — e chama a função do banco, que só
// apaga a conta de quem está logado (supabase/migrations/…_delete_account.sql).
export async function deleteAccount(password) {
  const { data } = await supabase.auth.getSession();
  const email = data && data.session && data.session.user && data.session.user.email;
  if (!email) throw new AuthError('network', 'Entre de novo na sua conta e tente outra vez.');

  let check;
  try {
    check = await supabase.auth.signInWithPassword({ email, password });
  } catch (e) {
    throw translate(e);
  }
  if (check.error) {
    const err = translate(check.error);
    throw err.code === 'credentials' ? new AuthError('password', 'Senha incorreta.') : err;
  }

  let res;
  try {
    res = await supabase.rpc('delete_my_account');
  } catch (e) {
    throw translate(e);
  }
  if (res.error) throw translate(res.error);

  await signOut();
  await clearFailures(email);
  if ((await AsyncStorage.getItem(K_LAST_EMAIL)) === email) await AsyncStorage.removeItem(K_LAST_EMAIL);
}

export async function signOut() {
  // 'local' encerra só neste aparelho e funciona mesmo sem internet.
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (e) {
    // sem rede: a sessão local é apagada mesmo assim
  }
  await secureStorage.removeItem(K_CACHED_USER);
}

// Ao abrir o app. Com "Salvar conta", retoma a sessão; sem internet, usa a
// última conta salva para abrir com os dados do aparelho.
export async function restoreSession() {
  if (!(await isRememberingSession())) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (data && data.session) {
      // getSession só lê o que está salvo no aparelho. getUser manda o JWT ao
      // servidor, que confere assinatura/validade: conta apagada ou sessão
      // revogada não continua "logada". Sem internet, segue com a sessão salva.
      const check = await supabase.auth.getUser();
      if (check.error && !isNetworkError(check.error)) {
        await signOut();
        return null;
      }
      const user = publicUser((check.data && check.data.user) || data.session.user);
      await rememberUser(user);
      return user;
    }
    // Sem sessão e sem falha de rede = deslogado de verdade.
    if (!error || !isNetworkError(error)) return null;
  } catch (e) {
    if (!isNetworkError(e)) return null;
  }
  // Falha de rede: abre offline com a última conta salva.
  try {
    const raw = await secureStorage.getItem(K_CACHED_USER);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Tutorial visto: fica na própria conta (metadados), vale em qualquer aparelho.
export async function markTutorialDone() {
  try {
    await supabase.auth.updateUser({ data: { tutorial_done: true } });
  } catch (e) {
    // sem rede: o app também guarda no aparelho
  }
}

export async function getLastEmail() {
  try {
    return (await AsyncStorage.getItem(K_LAST_EMAIL)) || '';
  } catch (e) {
    return '';
  }
}
