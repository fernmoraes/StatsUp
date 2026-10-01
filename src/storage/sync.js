// Sincronização cache local ⇄ Supabase.
//
// Regra simples (os dados são pequenos):
//   - mudanças locais marcam a conta como "pendente" e são enviadas (push);
//   - ao entrar/abrir, primeiro envia o que estiver pendente e depois baixa
//     tudo da nuvem (pull), que passa a ser o estado oficial do aparelho.
// O app não apaga treinos, então o push é um upsert do estado inteiro.
import { supabase } from '../lib/supabase';

// --------------------------------------------------------------- app → banco
const profileRow = (userId, p) => ({
  id: userId,
  name: p.name || '',
  sex: p.sex,
  birth_date: p.birth_date,
  height_cm: p.height_cm,
  bodyweight_kg: p.bodyweight_kg,
  goal: p.goal || 'hypertrophy',
  age_compare_mode: p.age_compare_mode || 'absolute',
});

// Treinos antigos não têm created_at; o id 'log_<ms>' guarda o horário.
const createdAtOf = (log) => {
  if (log.created_at) return log.created_at;
  const ms = Number(String(log.id).split('_').pop());
  return Number.isFinite(ms) && ms > 1e12 ? new Date(ms).toISOString() : new Date(0).toISOString();
};

const workoutRow = (userId, log) => ({
  user_id: userId,
  id: String(log.id),
  kind: log.kind === 'baseline' ? 'baseline' : 'workout',
  date: log.date,
  note: log.note || '',
  created_at: createdAtOf(log),
});

const entryRows = (userId, log) =>
  log.entries.map((e, position) => ({
    user_id: userId,
    workout_id: String(log.id),
    position,
    exercise_id: e.exercise_id,
    weight_kg: e.weight_kg,
    reps: e.reps,
    est_1rm: e.est_1rm,
    percentile: e.percentile,
    confidence: e.confidence,
    level: e.level,
    bodyweight_at_log: e.bodyweight_at_log,
  }));

const check = ({ error }) => {
  if (error) throw error;
};

export async function pushAll(userId, profile, logs) {
  if (profile) check(await supabase.from('profiles').upsert(profileRow(userId, profile)));
  if (logs.length) {
    check(await supabase.from('workouts').upsert(logs.map((l) => workoutRow(userId, l))));
    const entries = logs.flatMap((l) => entryRows(userId, l));
    if (entries.length) check(await supabase.from('workout_entries').upsert(entries));
  }
}

// --------------------------------------------------------------- banco → app
const num = (v) => (v == null ? null : Number(v));

const toProfile = (r) => ({
  id: r.id,
  name: r.name,
  sex: r.sex,
  birth_date: r.birth_date,
  height_cm: num(r.height_cm),
  bodyweight_kg: num(r.bodyweight_kg),
  goal: r.goal,
  age_compare_mode: r.age_compare_mode,
  created_at: r.created_at,
});

const toLog = (r) => ({
  id: r.id,
  ...(r.kind === 'baseline' ? { kind: 'baseline' } : {}),
  date: r.date,
  note: r.note || '',
  created_at: r.created_at,
  entries: [...(r.workout_entries || [])]
    .sort((a, b) => a.position - b.position)
    .map((e) => ({
      exercise_id: e.exercise_id,
      weight_kg: num(e.weight_kg),
      reps: e.reps,
      est_1rm: num(e.est_1rm),
      percentile: num(e.percentile),
      confidence: e.confidence,
      level: e.level,
      bodyweight_at_log: num(e.bodyweight_at_log),
    })),
});

// RLS já filtra pelo usuário logado; o .eq deixa a intenção explícita.
export async function pullAll(userId) {
  const [p, w] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('workouts')
      .select('id, kind, date, note, created_at, workout_entries(*)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  check(p);
  check(w);
  return { profile: p.data ? toProfile(p.data) : null, logs: (w.data || []).map(toLog) };
}
