// Estado global do app: profile + logs, derivações do radar e ações.
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
  clearAll,
} from '../storage/store';
import { getExercise } from '../data/exercises';
import { computeEntry } from '../engine/calc';
import { buildRadarState } from '../engine/selectors';
import { ageFromBirthDate } from '../data/levels';

const AppContext = createContext(null);

export const todayISO = () => new Date().toISOString().slice(0, 10);

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
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, l] = await Promise.all([loadProfile(), loadLogs()]);
      setProfile(p);
      setLogs(l || []);
      setReady(true);
    })();
  }, []);

  const persistProfile = useCallback(async (p) => {
    setProfile(p);
    await saveProfile(p);
  }, []);

  const persistLogs = useCallback(async (l) => {
    setLogs(l);
    await saveLogs(l);
  }, []);

  // Conclui onboarding: cria profile + primeiro log com as âncoras informadas.
  const completeOnboarding = useCallback(
    async (profileData, anchorInputs) => {
      const p = {
        id: 'me',
        age_compare_mode: 'absolute',
        created_at: new Date().toISOString(),
        ...profileData,
      };
      const entries = anchorInputs
        .map((inp) => makeEntry(p, inp))
        .filter(Boolean);
      const firstLog =
        entries.length > 0
          ? [{ id: `log_${Date.now()}`, date: todayISO(), entries, note: 'Onboarding' }]
          : [];
      await persistProfile(p);
      await persistLogs(firstLog);
      return p;
    },
    [persistProfile, persistLogs]
  );

  // Registra um treino (loop diário). entriesInput: [{exercise_id, weight, reps}].
  const addWorkout = useCallback(
    async (entriesInput, { date = todayISO(), note = '' } = {}) => {
      if (!profile) return null;
      const entries = entriesInput.map((inp) => makeEntry(profile, inp)).filter(Boolean);
      if (entries.length === 0) return null;
      const log = { id: `log_${Date.now()}`, date, entries, note };
      const next = [log, ...logs];
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

  const resetAll = useCallback(async () => {
    await clearAll();
    setProfile(null);
    setLogs([]);
  }, []);

  const radar = useMemo(() => {
    if (!profile) return null;
    return buildRadarState(profile, logs);
  }, [profile, logs]);

  const value = {
    ready,
    profile,
    logs,
    radar,
    completeOnboarding,
    addWorkout,
    updateProfile,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}
