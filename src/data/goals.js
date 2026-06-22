// Objetivos do usuário (conceito §10). NÃO distorcem o radar — ajustam copy/metas.
export const GOALS = [
  {
    id: 'strength',
    label: 'Força máxima',
    emoji: '🏋️',
    blurb: 'Metas focam em subir o percentil dos compostos. Faixa 1–6 reps.',
    repRange: '1–6',
  },
  {
    id: 'hypertrophy',
    label: 'Hipertrofia',
    emoji: '💪',
    blurb: 'Variedade por grupo e EMG. Faixa 6–12 reps, valoriza volume.',
    repRange: '6–12',
  },
  {
    id: 'endurance',
    label: 'Resistência',
    emoji: '🔥',
    blurb: 'Menos ênfase em 1RM; foco em reps/volume e condicionamento.',
    repRange: '12+',
  },
  {
    id: 'recomp',
    label: 'Emagrecimento',
    emoji: '⚖️',
    blurb: 'Destaca força relativa: manter carga perdendo peso sobe seu percentil.',
    repRange: '8–15',
  },
  {
    id: 'health',
    label: 'Saúde geral',
    emoji: '🌱',
    blurb: 'Linguagem suave, metas curtas, foco em consistência.',
    repRange: '8–12',
  },
];

export const getGoal = (id) => GOALS.find((g) => g.id === id);
