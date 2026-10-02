// Estado global do app: conta logada, profile + logs dela, radar e ações.
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  loadProfile,
  saveProfile,
  loadLogs,
  saveLogs,
  isDirty,
  setDirty,
  isTutorialDone,
  setTutorialDone,
  purgeUserData,
} from '../storage/store';
import * as auth from '../services/auth';
import { pushAll, pullAll } from '../services/sync';
import { getExercise } from '../data/exercises';
import { computeEntry } from '../engine/calc';
import { buildRadarState } from '../engine/selectors';
import { ageFromBirthDate } from '../data/levels';
import { todayISO } from '../utils/date';

const AppContext = createContext(null);

export { todayISO };

// Logs sempre do mais recente para o mais antigo. sort() é estável, então
// dois treinos no mesmo dia mantêm a ordem de criação (o novo primeiro).
const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

// Dois tipos de registro em `logs`:
//   - treino (padrão): o que a pessoa fez num dia. Entra no calendário,
//     sequência, contagem de treinos e "desde o último treino".
//   - baseline (kind: 'baseline'): as marcas do cadastro — o máximo que a pessoa
//     aguenta em cada exercício. NÃO é um treino daquele dia; só alimenta o radar.
export const isBaseline = (log) => log.kind === 'baseline';
export const isWorkout = (log) => !isBaseline(log);

// Versões antigas salvavam as marcas do cadastro como um treino comum com a
// nota 'Onboarding'. Converte para baseline (sem perder nenhum dado).
function migrateLogs(logs) {
  let changed = false;
  const out = logs.map((l) => {
    if (!l.kind && l.note === 'Onboarding') {
      changed = true;
      const { note, ...rest } = l;
      return { ...rest, kind: 'baseline' };
    }
    return l;
  });
  return { logs: out, changed };
}

// Constrói uma SetEntry persistível a partir do input do usuário.
export function makeEntry(profile, { exercise_id, weight, reps }) {
  const exercise = getExercise(exercise_id);
  if (!exercise) return null;
  const age = ageFromBirthDate(profile.birth_date);
  const computed = computeEntry({
    exercise,
    sex: profile.sex,
    bw: profile.bodyweight_kg,
    weight: Number(weight) || 0,
    reps: Number(reps) || (exercise.metric === 'reps' ? 0 : 1),
    ageMode: profile.age_compare_mode,
    age,
  });
  if (!computed) return null;
  return {
    exercise_id,
    weight_kg: exercise.metric === 'reps' ? null : Number(weight) || 0,
    reps: Number(reps) || null,
    est_1rm: computed.est_1rm,
    percentile: computed.percentile,
    confidence: computed.confidence,
    level: computed.level,
    bodyweight_at_log: profile.bodyweight_kg,
  };
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null); // conta logada (null = deslogado)
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [ready, setReady] = useState(false);
  // 'idle' | 'syncing' | 'synced' | 'pending' (mudança local ainda não enviada)
  // | 'offline' | 'error'
  const [syncState, setSyncState] = useState('idle');
  // Tutorial de uso: aparece uma vez por conta (depois das perguntas iniciais)
  // e pode ser reaberto pelo Perfil.
  const [tutorialVisible, setTutorialVisible] = useState(false);

  const userRef = useRef(null);
  const writeSeq = useRef(0); // muda a cada escrita local
  const syncChain = useRef(Promise.resolve()); // uma sincronização por vez

  // Envia o que está pendente e (pull=true) baixa o estado oficial da nuvem.
  const doSync = useCallback(async (uid, { pull = true } = {}) => {
    const seq = writeSeq.current;
    setSyncState('syncing');
    try {
      const [p, l, dirty] = await Promise.all([loadProfile(uid), loadLogs(uid), isDirty(uid)]);
      if (dirty) await pushAll(uid, p, l);
      if (pull) {
        const remote = await pullAll(uid);
        // A nuvem é o estado oficial da conta (o que estava pendente já foi
        // enviado acima). Só não aplica se houve escrita local durante o sync.
        if (writeSeq.current === seq && userRef.current?.id === uid) {
          await saveProfile(uid, remote.profile);
          await saveLogs(uid, remote.logs);
          setProfile(remote.profile);
          setLogs(remote.logs);
        }
      }
      const clean = writeSeq.current === seq;
      if (clean) await setDirty(uid, false);
      if (userRef.current?.id === uid) setSyncState(clean ? 'synced' : 'pending');
    } catch (e) {
      const offline = /network|fetch|timed? ?out/i.test((e && e.message) || '') || e?.name === 'AuthRetryableFetchError';
      // Cota contra abuso do banco (migração abuse_protection) estourada.
      const quota = /^quota_/.test((e && e.hint) || '');
      if (userRef.current?.id === uid) setSyncState(quota ? 'quota' : offline ? 'offline' : 'error');
    }
  }, []);

  const runSync = useCallback((uid, opts) => {
    syncChain.current = syncChain.current.then(() => doSync(uid, opts)).catch(() => {});
    return syncChain.current;
  }, [doSync]);

  // Abre a conta: dados do aparelho na hora; a nuvem atualiza em seguida.
  // Num aparelho novo (sem cache) espera a nuvem para não mandar a pessoa
  // refazer as perguntas iniciais à toa.
  const loadUserData = useCallback(async (u) => {
    userRef.current = u;
    const [p, l] = await Promise.all([loadProfile(u.id), loadLogs(u.id)]);
    const migrated = migrateLogs(l || []);
    if (migrated.changed) {
      await saveLogs(u.id, migrated.logs);
      await setDirty(u.id, true);
    }
    setProfile(p);
    setLogs(migrated.logs);
    setTutorialVisible(!(u.tutorial_done || (await isTutorialDone(u.id))));
    setUser(u);
    const sync = runSync(u.id);
    if (!p) await sync;
  }, [runSync]);

  // Ao abrir: retoma a conta salva ("Salvar conta"); sem ela, vai pro login.
  useEffect(() => {
    (async () => {
      const u = await auth.restoreSession();
      if (u) await loadUserData(u);
      setReady(true);
    })();
  }, [loadUserData]);

  // Retorna { user } ou { needsConfirmation } (projeto exige confirmar e-mail).
  const signUp = useCallback(async (data) => {
    const res = await auth.signUp(data);
    if (res.user) await loadUserData(res.user);
    return res;
  }, [loadUserData]);

  const signIn = useCallback(async (data) => {
    const u = await auth.signIn(data);
    await loadUserData(u);
    return u;
  }, [loadUserData]);

  // Sai da conta: os dados continuam salvos no aparelho para o próximo login.
  const signOut = useCallback(async () => {
    await auth.signOut();
    userRef.current = null;
    setSyncState('idle');
    setTutorialVisible(false);
    setUser(null);
    setProfile(null);
    setLogs([]);
  }, []);

  // Escritas: salva no aparelho na hora, marca pendente e envia para a nuvem.
  // Exclui a conta (nuvem + aparelho). Lança AuthError (ex.: senha incorreta).
  const deleteAccount = useCallback(async (password) => {
    const uid = userRef.current && userRef.current.id;
    await auth.deleteAccount(password);
    if (uid) await purgeUserData(uid);
    userRef.current = null;
    setSyncState('idle');
    setTutorialVisible(false);
    setUser(null);
    setProfile(null);
    setLogs([]);
  }, []);

  const persistProfile = useCallback(async (p) => {
    writeSeq.current++;
    setProfile(p);
    await saveProfile(user.id, p);
    await setDirty(user.id, true);
    runSync(user.id, { pull: false });
  }, [user, runSync]);

  const persistLogs = useCallback(async (l) => {
    writeSeq.current++;
    setLogs(l);
    await saveLogs(user.id, l);
    await setDirty(user.id, true);
    runSync(user.id, { pull: false });
  }, [user, runSync]);

  const openTutorial = useCallback(() => setTutorialVisible(true), []);
  const closeTutorial = useCallback(async () => {
    setTutorialVisible(false);
    if (!user) return;
    await setTutorialDone(user.id);
    auth.markTutorialDone();
  }, [user]);

  const syncNow = useCallback(() => (user ? runSync(user.id) : Promise.resolve()), [user, runSync]);

  // Conclui onboarding: cria profile + as marcas iniciais (baseline). A data só
  // serve para ordenar: um treino registrado depois atualiza o radar.
  const completeOnboarding = useCallback(
    async (profileData, anchorInputs) => {
      const p = {
        id: user.id,
        name: user.name,
        age_compare_mode: 'absolute',
        created_at: new Date().toISOString(),
        ...profileData,
      };
      const entries = anchorInputs
        .map((inp) => makeEntry(p, inp))
        .filter(Boolean);
      const firstLog =
        entries.length > 0
          ? [{ id: `baseline_${Date.now()}`, kind: 'baseline', date: todayISO(), entries, created_at: new Date().toISOString() }]
          : [];
      await persistProfile(p);
      await persistLogs(firstLog);
      return p;
    },
    [user, persistProfile, persistLogs]
  );

  // Registra um treino. entriesInput: [{exercise_id, weight, reps}].
  // `date` pode ser um dia passado (treino esquecido, marcado pelo calendário).
  const addWorkout = useCallback(
    async (entriesInput, { date = todayISO(), note = '' } = {}) => {
      if (!profile) return null;
      const entries = entriesInput.map((inp) => makeEntry(profile, inp)).filter(Boolean);
      if (entries.length === 0) return null;
      const log = { id: `log_${Date.now()}`, date, entries, note, created_at: new Date().toISOString() };
      const next = [log, ...logs].sort(byDateDesc);
      await persistLogs(next);
      return log;
    },
    [profile, logs, persistLogs]
  );

  const updateProfile = useCallback(
    async (patch) => {
      const next = { ...profile, ...patch };
      await persistProfile(next);
      return next;
    },
    [profile, persistProfile]
  );

  // Só treinos de verdade (sem as marcas do cadastro) e as marcas em separado.
  const workouts = useMemo(() => logs.filter(isWorkout), [logs]);
  const baseline = useMemo(() => logs.find(isBaseline) || null, [logs]);

  const radar = useMemo(() => {
    if (!profile) return null;
    return buildRadarState(profile, logs);
  }, [profile, logs]);

  const value = {
    ready,
    user,
    profile,
    logs, // tudo (treinos + marcas do cadastro) — use para o radar
    workouts,
    baseline,
    radar,
    completeOnboarding,
    addWorkout,
    updateProfile,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    syncState,
    syncNow,
    tutorialVisible,
    openTutorial,
    closeTutorial,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}
