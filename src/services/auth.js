// Contas via Supabase Auth (e-mail + senha). Mesma interface da versão local:
// signUp / signIn / signOut / restoreSession — as telas não mudam.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, setRememberSession, isRememberingSession } from './supabase';

const K_LAST_EMAIL = 'statsup:last-email:v1'; // preenche o login
// Última conta logada com "Salvar conta": permite abrir o app sem internet.
const K_CACHED_USER = 'statsup:cached-user:v1';

export const MIN_PASSWORD = 6;

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
    return new AuthError('password', `Senha fraca. Use pelo menos ${MIN_PASSWORD} caracteres.`);
  if (code === 'email_address_invalid' || /email.*invalid/i.test(msg))
    return new AuthError('email', 'E-mail inválido.');
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit/i.test(msg))
    return new AuthError('rate', 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.');
  return new AuthError('unknown', 'Não foi possível concluir. Tente de novo.');
}

async function rememberUser(user) {
  await AsyncStorage.multiSet([
    [K_LAST_EMAIL, user.email],
    [K_CACHED_USER, JSON.stringify(user)],
  ]);
}

// Retorna { user } ou { needsConfirmation: true } quando o projeto exige
// confirmar o e-mail antes do primeiro login.
export async function signUp({ name, email, password }) {
  const cleanName = name.trim();
  if (!cleanName) throw new AuthError('name', 'Informe seu nome.');
  if (!isValidEmail(email)) throw new AuthError('email', 'E-mail inválido.');
  if (password.length < MIN_PASSWORD) throw new AuthError('password', `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`);

  await setRememberSession(true); // cadastro já entra com a conta salva
  let res;
  try {
    res = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        data: { name: cleanName },
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

export async function signIn({ email, password, remember }) {
  await setRememberSession(!!remember);
  let res;
  try {
    res = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
  } catch (e) {
    throw translate(e);
  }
  if (res.error) throw translate(res.error);
  const user = publicUser(res.data.user);
  if (remember) await rememberUser(user);
  else {
    await AsyncStorage.setItem(K_LAST_EMAIL, user.email);
    await AsyncStorage.removeItem(K_CACHED_USER);
  }
  return user;
}

export async function signOut() {
  // 'local' encerra só neste aparelho e funciona mesmo sem internet.
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (e) {
    // sem rede: a sessão local é apagada mesmo assim
  }
  await AsyncStorage.removeItem(K_CACHED_USER);
}

// Ao abrir o app. Com "Salvar conta", retoma a sessão; sem internet, usa a
// última conta salva para abrir com os dados do aparelho.
export async function restoreSession() {
  if (!(await isRememberingSession())) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (data && data.session) {
      const user = publicUser(data.session.user);
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
    const raw = await AsyncStorage.getItem(K_CACHED_USER);
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
