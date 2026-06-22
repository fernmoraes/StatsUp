// Definições de níveis de força e utilidades de interpolação.
// Cada nível ancora um percentil fixo (conceito §5.4).

export const LEVELS = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'];

// Percentil ancorado por nível: Beginner=5, Novice=20, Intermediate=50, Advanced=80, Elite=95.
export const LEVEL_PCT = [5, 20, 50, 80, 95];

export const LEVEL_LABELS_PT = {
  beginner: 'Iniciante',
  novice: 'Novato',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  elite: 'Elite',
};

// Degraus de peso corporal tabelados (kg). Interpolar entre eles (conceito §5.3).
export const BW_STEPS = [50, 60, 70, 80, 90, 100, 110, 120];

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Retorna o índice do nível ancorado a partir de um percentil.
export function levelFromPercentile(pct) {
  if (pct < 20) return 'beginner';
  if (pct < 50) return 'novice';
  if (pct < 80) return 'intermediate';
  if (pct < 95) return 'advanced';
  return 'elite';
}

// Coeficiente de idade (conceito §5.8 / dados §7.4). Multiplicador sobre o pico (25-40 anos).
const AGE_POINTS = [
  [20, 0.97],
  [25, 1.0],
  [40, 1.0],
  [45, 0.95],
  [50, 0.89],
  [55, 0.82],
  [60, 0.75],
  [65, 0.68],
  [70, 0.61],
  [80, 0.49],
];

export function ageMultiplier(age) {
  if (age == null || Number.isNaN(age)) return 1.0;
  if (age <= AGE_POINTS[0][0]) return AGE_POINTS[0][1];
  const last = AGE_POINTS[AGE_POINTS.length - 1];
  if (age >= last[0]) return last[1];
  for (let i = 0; i < AGE_POINTS.length - 1; i++) {
    const [a0, m0] = AGE_POINTS[i];
    const [a1, m1] = AGE_POINTS[i + 1];
    if (age >= a0 && age <= a1) {
      const t = (age - a0) / (a1 - a0);
      return lerp(m0, m1, t);
    }
  }
  return 1.0;
}

export function ageFromBirthDate(birthISO) {
  if (!birthISO) return null;
  const b = new Date(birthISO);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
