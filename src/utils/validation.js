// Validação de entradas — os MESMOS limites das regras (CHECK) do banco
// (supabase/migrations/20261002120000_security_hardening.sql).
//
// Por que no app também: o app salva primeiro no aparelho. Um valor que o banco
// recusa (ex.: 5000 kg, dia 45) ficaria "pendente" e travaria a sincronização
// para sempre. Validando aqui, o erro aparece na hora, no campo certo.
// Cada função devolve a mensagem de erro, ou null quando está tudo certo.

export const LIMITS = {
  height: { min: 50, max: 260 }, // cm
  bodyweight: { min: 20, max: 400 }, // kg
  load: { min: 0.5, max: 1000 }, // kg por série
  reps: { min: 1, max: 1000 },
  age: { min: 10, max: 100 },
  name: 60,
  note: 500,
};

// "80", "80.5", "80,5" → número. Qualquer outra coisa → NaN.
export function toNumber(text) {
  const s = String(text ?? '').trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

const inRange = (n, { min, max }) => Number.isFinite(n) && n >= min && n <= max;

export function validateHeight(text) {
  if (!String(text ?? '').trim()) return 'Informe sua altura.';
  return inRange(toNumber(text), LIMITS.height) ? null : `Entre ${LIMITS.height.min} e ${LIMITS.height.max} cm.`;
}

export function validateBodyweight(text) {
  if (!String(text ?? '').trim()) return 'Informe seu peso.';
  return inRange(toNumber(text), LIMITS.bodyweight) ? null : `Entre ${LIMITS.bodyweight.min} e ${LIMITS.bodyweight.max} kg.`;
}

// Data real do calendário (sem 31/02), no passado e com idade plausível.
export function validateBirthDate(day, month, year) {
  if (!day || !month || !year || String(year).length < 4) return 'Informe dia, mês e ano.';
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(y, m - 1, d, 12);
  if (!Number.isInteger(d) || !Number.isInteger(m) || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return 'Data inválida.';
  }
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() < m - 1 || (today.getMonth() === m - 1 && today.getDate() < d)) age--;
  if (age < LIMITS.age.min || age > LIMITS.age.max) return `Idade entre ${LIMITS.age.min} e ${LIMITS.age.max} anos.`;
  return null;
}

// Uma série: carga (exercícios com peso) e repetições.
export function validateSet(exercise, weightText, repsText) {
  const reps = toNumber(repsText);
  if (!Number.isInteger(reps) || !inRange(reps, LIMITS.reps)) return `Reps entre ${LIMITS.reps.min} e ${LIMITS.reps.max}.`;
  if (exercise.metric !== 'reps') {
    const w = toNumber(weightText);
    if (!inRange(w, LIMITS.load)) return `Carga entre ${LIMITS.load.min} e ${LIMITS.load.max} kg.`;
  }
  return null;
}

// "Ainda não preencheu" (não mostra erro) × "preencheu errado" (mostra).
export const isBlankSet = (exercise, weightText, repsText) =>
  !String(repsText ?? '').trim() && (exercise.metric === 'reps' || !String(weightText ?? '').trim());

/* ------------------------------------------------- última barreira (sync) */
// Antes de enviar ao banco: descarta o que violaria as regras do servidor, para
// um dado antigo inválido nunca travar a sincronização.
const LEVELS = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'];
const CONFIDENCE = ['high', 'medium', 'low'];
const optRange = (v, min, max) => v == null || (Number.isFinite(Number(v)) && v >= min && v <= max);

export function isValidEntryRow(e) {
  return (
    /^[a-z0-9_]{1,64}$/.test(e.exercise_id || '') &&
    Number.isFinite(Number(e.percentile)) && e.percentile >= 0 && e.percentile <= 100 &&
    CONFIDENCE.includes(e.confidence) &&
    LEVELS.includes(e.level) &&
    optRange(e.weight_kg, 0, 1000) &&
    optRange(e.reps, 0, 1000) &&
    optRange(e.est_1rm, 0, 2000) &&
    optRange(e.bodyweight_at_log, 20, 400)
  );
}

export function isValidWorkoutRow(w) {
  return (
    /^[A-Za-z0-9_-]{1,64}$/.test(String(w.id)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(w.date) &&
    String(w.note || '').length <= LIMITS.note
  );
}

export function isValidProfileRow(p) {
  return (
    p &&
    ['male', 'female'].includes(p.sex) &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.birth_date) &&
    inRange(Number(p.height_cm), LIMITS.height) &&
    inRange(Number(p.bodyweight_kg), LIMITS.bodyweight) &&
    String(p.name || '').length <= LIMITS.name
  );
}
