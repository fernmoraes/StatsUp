// Motor de cálculo (conceito §5). Tudo local, sem dependência de servidor.
import {
  LEVEL_PCT,
  BW_STEPS,
  clamp,
  lerp,
  ageMultiplier,
  levelFromPercentile,
} from '../data/levels';
import { getExercise } from '../data/exercises';

// §5.2 — Estimar 1RM (Epley). reps limitadas a 12 para o cálculo de força.
export function epley1RM(weight, reps) {
  const r = reps || 1;
  if (r <= 1) return weight;
  const capped = Math.min(r, 12);
  return weight * (1 + capped / 30);
}

// §5.3 — valores dos 5 níveis para um exercício/sexo num peso corporal arbitrário.
// Retorna array crescente [beg, nov, int, adv, elite] na unidade de comparação
// (kg para 'load', reps para 'reps'). `extrapolated` indica clamp de PC.
export function levelValues(exercise, sex, bw, { ageMode, age } = {}) {
  const s = exercise.standards && exercise.standards[sex];
  if (!s) return null;

  let extrapolated = false;
  let vals;

  if (s.byBW) {
    const cbw = clamp(bw, BW_STEPS[0], BW_STEPS[BW_STEPS.length - 1]);
    if (cbw !== bw) extrapolated = true;
    let lo = BW_STEPS[0];
    let hi = BW_STEPS[BW_STEPS.length - 1];
    for (let i = 0; i < BW_STEPS.length - 1; i++) {
      if (cbw >= BW_STEPS[i] && cbw <= BW_STEPS[i + 1]) {
        lo = BW_STEPS[i];
        hi = BW_STEPS[i + 1];
        break;
      }
    }
    const vlo = s.byBW[lo];
    const vhi = s.byBW[hi];
    if (lo === hi) {
      vals = vlo.slice();
    } else {
      const t = (cbw - lo) / (hi - lo);
      vals = vlo.map((v, i) => v + (vhi[i] - v) * t);
    }
  } else if (s.ratio) {
    if (bw < BW_STEPS[0] || bw > BW_STEPS[BW_STEPS.length - 1]) extrapolated = true;
    vals = s.ratio.map((r) => r * bw);
  } else if (s.flat) {
    vals = s.flat.slice();
  } else {
    return null;
  }

  // §5.8 — ajuste de idade multiplica os standards (não o desempenho).
  if (ageMode === 'age_adjusted' && age != null) {
    const m = ageMultiplier(age);
    vals = vals.map((v) => v * m);
  }

  return { vals, extrapolated };
}

// §5.4 — converter um valor (1RM em kg, ou reps) em percentil 0-100.
export function toPercentile(value, vals) {
  const p = LEVEL_PCT;
  if (value <= vals[0]) {
    // Abaixo de Beginner: interpola de 0% a P5 ao longo de uma largura de nível.
    const span = vals[1] - vals[0] || 1;
    const t = (value - (vals[0] - span)) / span;
    return clamp(t * 5, 0, 5);
  }
  if (value >= vals[4]) {
    // Acima de Elite: satura suavemente 95→100 (+50% por unidade).
    const base = Math.abs(vals[4]) || 1;
    const excess = (value - vals[4]) / base;
    return clamp(95 + excess * 50, 95, 100);
  }
  for (let i = 0; i < 4; i++) {
    if (value >= vals[i] && value <= vals[i + 1]) {
      const denom = vals[i + 1] - vals[i] || 1;
      const t = (value - vals[i]) / denom;
      return lerp(p[i], p[i + 1], t);
    }
  }
  return 50;
}

// §5.7 — confiança do dado.
export function confidenceOf(exercise, reps, extrapolated) {
  const isolator = exercise.weight_in_score === 1;
  if (reps > 12 || extrapolated) return 'low';
  if (reps >= 7 || isolator) return 'medium';
  return 'high';
}

// Pipeline completo para uma série registrada. Persiste est_1rm + percentil.
// weight: kg (por halter quando per_dumbbell). reps: repetições.
export function computeEntry({ exercise, sex, bw, weight, reps, ageMode, age }) {
  const lv = levelValues(exercise, sex, bw, { ageMode, age });
  if (!lv) return null;

  let compareValue;
  let est1rm;
  if (exercise.metric === 'reps') {
    compareValue = reps || 0;
    est1rm = compareValue; // a "carga" é a contagem de repetições
  } else {
    est1rm = epley1RM(weight || 0, reps || 1);
    compareValue = est1rm;
  }

  const percentile = toPercentile(compareValue, lv.vals);
  const confidence = confidenceOf(exercise, reps || 1, lv.extrapolated);
  const level = levelFromPercentile(percentile);

  return {
    est_1rm: Math.round(est1rm * 10) / 10,
    percentile: Math.round(percentile * 10) / 10,
    confidence,
    level,
    extrapolated: lv.extrapolated,
  };
}

// §9.2 — próxima meta: o que falta para subir de nível.
export function nextGoal({ exercise, sex, bw, est1rm, ageMode, age }) {
  const lv = levelValues(exercise, sex, bw, { ageMode, age });
  if (!lv) return null;
  const labels = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'];
  for (let i = 0; i < lv.vals.length; i++) {
    if (lv.vals[i] > est1rm) {
      return {
        next_level: labels[i],
        target: Math.round(lv.vals[i] * 10) / 10,
        delta: Math.round((lv.vals[i] - est1rm) * 10) / 10,
        metric: exercise.metric,
      };
    }
  }
  return null; // já é Elite
}

// §5.6 — score de um grupo: média ponderada do percentil mais recente por exercício.
// `latestByExercise`: { exerciseId: { percentile, ... } }.
export function groupScore(group, latestByExercise) {
  let num = 0;
  let den = 0;
  let hasCompound = false;
  let count = 0;
  let lowConfDominant = true;

  for (const [exId, entry] of Object.entries(latestByExercise)) {
    const ex = getExercise(exId);
    if (!ex || ex.muscle_group !== group) continue;
    const w = ex.weight_in_score;
    num += entry.percentile * w;
    den += w;
    count++;
    if (w >= 2) hasCompound = true;
    if (entry.confidence !== 'low') lowConfDominant = false;
  }

  if (den === 0) return null;
  return {
    score: Math.round((num / den) * 10) / 10,
    count,
    provisional: !hasCompound, // §5.6: só isoladores → score provisório
    lowConfidence: lowConfDominant,
  };
}

// Score por subgrupo (sub-radar de braço/perna) — §6.3.
export function subgroupScore(subGroup, latestByExercise) {
  let num = 0;
  let den = 0;
  let count = 0;
  for (const [exId, entry] of Object.entries(latestByExercise)) {
    const ex = getExercise(exId);
    if (!ex || ex.sub_group !== subGroup) continue;
    const w = ex.weight_in_score;
    num += entry.percentile * w;
    den += w;
    count++;
  }
  if (den === 0) return null;
  return { score: Math.round((num / den) * 10) / 10, count };
}

// §9.1 — elo fraco: grupo com menor score entre os que têm dados.
export function weakestLink(scores) {
  let weakest = null;
  let min = Infinity;
  for (const g of ['chest', 'back', 'arm', 'leg']) {
    const s = scores[g];
    if (s && s.score < min) {
      min = s.score;
      weakest = g;
    }
  }
  return weakest;
}

// Score geral: média simples dos eixos com dados (conceito §14, MVP).
export function overallScore(scores) {
  const vals = ['chest', 'back', 'arm', 'leg']
    .map((g) => scores[g] && scores[g].score)
    .filter((v) => v != null);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
