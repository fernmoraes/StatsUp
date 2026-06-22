// Derivações a partir de (profile, logs): percentis recentes, scores do radar,
// elo fraco, score geral e insights automáticos. Tudo memoizável na UI.
import {
  groupScore,
  subgroupScore,
  weakestLink,
  overallScore,
  nextGoal,
} from './calc';
import { getExercise, MUSCLE_GROUPS, SUBGROUPS_BY_GROUP } from '../data/exercises';
import { GROUP_LABELS_PT, SUBGROUP_LABELS_PT } from '../data/exercises';
import { ageFromBirthDate } from '../data/levels';

// Achata todos os logs em uma lista de entradas ordenadas por data (mais nova primeiro).
function allEntries(logs) {
  const out = [];
  for (const log of logs) {
    for (const e of log.entries) {
      out.push({ ...e, date: log.date });
    }
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

// Percentil mais recente por exercício (conceito §5.6: "último registro").
export function latestPercentilePerExercise(logs) {
  const map = {};
  for (const e of allEntries(logs)) {
    if (!map[e.exercise_id]) map[e.exercise_id] = e;
  }
  return map;
}

// Estado completo do radar.
export function buildRadarState(profile, logs) {
  const latest = latestPercentilePerExercise(logs);

  const scores = {};
  for (const g of MUSCLE_GROUPS) {
    scores[g] = groupScore(g, latest);
  }

  const overall = overallScore(scores);
  const weakest = weakestLink(scores);

  // Sub-scores (braço/perna).
  const subScores = {};
  for (const [group, subs] of Object.entries(SUBGROUPS_BY_GROUP)) {
    subScores[group] = {};
    for (const sub of subs) {
      subScores[group][sub] = subgroupScore(sub, latest);
    }
  }

  return { latest, scores, overall, weakest, subScores };
}

// Recorde de percentil por exercício (melhor já registrado) — para detectar PRs.
export function bestPercentilePerExercise(logs) {
  const map = {};
  for (const log of logs) {
    for (const e of log.entries) {
      if (!map[e.exercise_id] || e.percentile > map[e.exercise_id]) {
        map[e.exercise_id] = e.percentile;
      }
    }
  }
  return map;
}

// §9.3 — insights automáticos (regras simples, expansível).
export function buildInsights(profile, radarState) {
  const { scores, subScores } = radarState;
  const out = [];
  const s = (g) => (scores[g] ? scores[g].score : null);

  const chest = s('chest');
  const back = s('back');
  const arm = s('arm');
  const leg = s('leg');

  // Desequilíbrio empurrar/puxar.
  if (chest != null && back != null && chest - back > 15) {
    out.push({
      type: 'imbalance',
      tone: 'warn',
      title: 'Empurrar > Puxar',
      text: `Seu peito (P${Math.round(chest)}) está bem à frente das costas (P${Math.round(
        back
      )}). Adicione volume de costas para equilibrar.`,
    });
  }

  // Pernas negligenciadas.
  const upper = [chest, back, arm].filter((v) => v != null);
  if (leg != null && upper.length) {
    const avgUpper = upper.reduce((a, b) => a + b, 0) / upper.length;
    if (leg < avgUpper - 15) {
      out.push({
        type: 'leg_day',
        tone: 'warn',
        title: 'Não pule o leg day',
        text: `Suas pernas (P${Math.round(leg)}) estão atrás do trem superior (P${Math.round(
          avgUpper
        )}). Priorize agachamento e terra.`,
      });
    }
  }

  // Subgrupo de braço mais atrás.
  if (subScores.arm) {
    const armSubs = Object.entries(subScores.arm).filter(([, v]) => v);
    if (armSubs.length >= 2) {
      armSubs.sort((a, b) => a[1].score - b[1].score);
      const [lowKey, lowVal] = armSubs[0];
      const [, highVal] = armSubs[armSubs.length - 1];
      if (highVal.score - lowVal.score > 15) {
        out.push({
          type: 'arm_sub',
          tone: 'info',
          title: `${SUBGROUP_LABELS_PT[lowKey]} atrás no braço`,
          text: `Seu ${SUBGROUP_LABELS_PT[lowKey].toLowerCase()} (P${Math.round(
            lowVal.score
          )}) está atrás do resto do braço. Foque aí para destravar o eixo.`,
        });
      }
    }
  }

  // Confiança baixa dominando um eixo.
  for (const g of MUSCLE_GROUPS) {
    const sc = scores[g];
    if (sc && sc.provisional) {
      out.push({
        type: 'provisional',
        tone: 'info',
        title: `${GROUP_LABELS_PT[g]} provisório`,
        text: `O eixo de ${GROUP_LABELS_PT[
          g
        ].toLowerCase()} está só com isoladores. Registre o composto âncora para firmar o número.`,
      });
      break;
    }
  }

  if (out.length === 0) {
    out.push({
      type: 'ok',
      tone: 'good',
      title: 'Equilíbrio em dia',
      text: 'Nenhum desequilíbrio grave detectado. Continue progredindo nos compostos.',
    });
  }

  return out;
}

// Próxima meta do exercício âncora do elo fraco (destaque na Home).
export function nextGoalForWeakest(profile, radarState) {
  const { weakest, latest } = radarState;
  if (!weakest) return null;
  const age = ageFromBirthDate(profile.birth_date);
  const opts = { ageMode: profile.age_compare_mode, age };

  // Pega o exercício do grupo com maior peso que o usuário já registrou.
  let chosen = null;
  for (const [exId, entry] of Object.entries(latest)) {
    const ex = getExercise(exId);
    if (!ex || ex.muscle_group !== weakest) continue;
    if (!chosen || ex.weight_in_score > chosen.ex.weight_in_score) {
      chosen = { ex, entry };
    }
  }
  if (!chosen) return null;

  const goal = nextGoal({
    exercise: chosen.ex,
    sex: profile.sex,
    bw: chosen.entry.bodyweight_at_log || profile.bodyweight_kg,
    est1rm: chosen.entry.est_1rm,
    ...opts,
  });
  if (!goal) return null;
  return { exercise: chosen.ex, group: weakest, ...goal };
}
