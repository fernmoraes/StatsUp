// Estado global do app: conta logada, profile + logs dela, radar e ações.
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import {
  loadProfile,
  saveProfile,
  loadLogs,
  saveLogs,
} from '../storage/store';
import * as auth from '../storage/auth';
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

  // Carrega perfil + treinos de uma conta.
  const loadUserData = useCallback(async (u) => {
    const [p, l] = await Promise.all([loadProfile(u.id), loadLogs(u.id)]);
    const migrated = migrateLogs(l || []);
    if (migrated.changed) await saveLogs(u.id, migrated.logs);
    setProfile(p);
    setLogs(migrated.logs);
    setUser(u);
  }, []);

  // Ao abrir: retoma a conta salva ("Salvar conta"); sem ela, vai pro login.
  useEffect(() => {
    (async () => {
      const u = await auth.restoreSession();
      if (u) await loadUserData(u);
      setReady(true);
    })();
  }, [loadUserData]);

  const signUp = useCallback(async (data) => {
    const u = await auth.signUp(data);
    await loadUserData(u);
    return u;
  }, [loadUserData]);

  const signIn = useCallback(async (data) => {
    const u = await auth.signIn(data);
    await loadUserData(u);
    return u;
  }, [loadUserData]);

  // Sai da conta: os dados continuam salvos no aparelho para o próximo login.
  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setLogs([]);
  }, []);

  const persistProfile = useCallback(async (p) => {
    setProfile(p);
    await saveProfile(user.id, p);
  }, [user]);

  const persistLogs = useCallback(async (l) => {
    setLogs(l);
    await saveLogs(user.id, l);
  }, [user]);

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
          ? [{ id: `baseline_${Date.now()}`, kind: 'baseline', date: todayISO(), entries }]
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
      const log = { id: `log_${Date.now()}`, date, entries, note };
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}
