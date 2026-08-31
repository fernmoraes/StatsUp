// Pictograma vetorial de exercício (fallback quando não há GIF do WorkoutX).
// Estilo diagrama de aparelho: figura na cor do grupo + equipamento + seta de movimento.
import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Circle, Polygon, Rect, G } from 'react-native-svg';
import { colors, groupColor } from '../theme';
import { getExercise } from '../data/exercises';

const EQ = '#7C88A8';

const PATTERN_BY_ID = {
  bench_press: 'press', decline_bench: 'press', dumbbell_bench: 'press',
  machine_chest_press: 'press', close_grip_bench: 'press',
  incline_bench: 'incline', incline_db_bench: 'incline',
  dumbbell_fly: 'fly', cable_fly: 'fly', pec_deck: 'fly',
  chest_dips: 'dip', push_ups: 'pushup',
  barbell_row: 'row', seated_cable_row: 'row', dumbbell_row: 'row', t_bar_row: 'row',
  pull_up: 'pulldown', lat_pulldown: 'pulldown',
  deadlift: 'hinge', rdl: 'hinge', good_morning: 'hinge', cable_pull_through: 'hinge',
  barbell_shrug: 'shrug',
  barbell_curl: 'curl', dumbbell_curl: 'curl', hammer_curl: 'curl',
  preacher_curl: 'curl', cable_curl: 'curl',
  triceps_pushdown: 'triceps', overhead_triceps_ext: 'triceps', skullcrusher: 'triceps',
  overhead_press: 'ohp', seated_db_press: 'ohp', machine_shoulder_press: 'ohp',
  lateral_raise: 'raise', front_raise: 'raise', face_pull: 'raise',
  back_squat: 'squat', front_squat: 'squat', hack_squat: 'squat',
  goblet_squat: 'squat', bulgarian_split_squat: 'squat', pistol_squat: 'squat',
  leg_press: 'legpress',
  leg_extension: 'legext', seated_leg_curl: 'legcurl', nordic_curl: 'legcurl',
  hip_thrust: 'hipthrust', glute_bridge: 'hipthrust',
  standing_calf_raise: 'calf', seated_calf_raise: 'calf',
};

function patternFor(id, ex) {
  if (id && PATTERN_BY_ID[id]) return PATTERN_BY_ID[id];
  if (!ex) return 'press';
  return { chest: 'press', back: 'row', arm: 'curl', leg: 'squat' }[ex.muscle_group] || 'press';
}

const seg = (k, x1, y1, x2, y2, c, w = 7) => (
  <Line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w} strokeLinecap="round" />
);
const dot = (k, x, y, r, c) => <Circle key={k} cx={x} cy={y} r={r} fill={c} />;

function arrow(k, x1, y1, x2, y2, c) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a = 9;
  const p1 = `${x2 - a * Math.cos(ang - 0.5)},${y2 - a * Math.sin(ang - 0.5)}`;
  const p2 = `${x2 - a * Math.cos(ang + 0.5)},${y2 - a * Math.sin(ang + 0.5)}`;
  return (
    <G key={k}>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={5} strokeLinecap="round" />
      <Polygon points={`${x2},${y2} ${p1} ${p2}`} fill={c} />
    </G>
  );
}

function barbell(k, cx, cy, half, c) {
  return (
    <G key={k}>
      <Line x1={cx - half} y1={cy} x2={cx + half} y2={cy} stroke={c} strokeWidth={4} strokeLinecap="round" />
      <Rect x={cx - half - 2} y={cy - 8} width={5} height={16} rx={2} fill={c} />
      <Rect x={cx + half - 3} y={cy - 8} width={5} height={16} rx={2} fill={c} />
    </G>
  );
}
const dumbbell = (k, cx, cy, c) => (
  <G key={k}>
    <Rect x={cx - 9} y={cy - 5} width={4} height={10} rx={1.5} fill={c} />
    <Rect x={cx + 5} y={cy - 5} width={4} height={10} rx={1.5} fill={c} />
    <Line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke={c} strokeWidth={3} />
  </G>
);
const stack = (k, x, y, c) => (
  <G key={k}>
    <Rect x={x} y={y} width={16} height={22} rx={3} fill="none" stroke={c} strokeWidth={2.5} />
    <Line x1={x + 3} y1={y + 8} x2={x + 13} y2={y + 8} stroke={c} strokeWidth={2} />
    <Line x1={x + 3} y1={y + 14} x2={x + 13} y2={y + 14} stroke={c} strokeWidth={2} />
  </G>
);

function parts(p, c) {
  switch (p) {
    case 'press':
      return [
        seg('back', 38, 44, 38, 74, EQ, 6), seg('seat', 38, 74, 60, 74, EQ, 6),
        dot('head', 40, 36, 8, c), seg('torso', 40, 44, 42, 70, c, 8),
        seg('thigh', 42, 72, 64, 74, c, 8), seg('shin', 64, 74, 64, 90, c, 7),
        seg('arm', 44, 50, 70, 52, c, 7), seg('handle', 70, 44, 70, 60, EQ, 5),
        arrow('a', 78, 52, 92, 52, c),
      ];
    case 'incline':
      return [
        seg('back', 36, 46, 44, 74, EQ, 6), seg('seat', 44, 74, 64, 74, EQ, 6),
        dot('head', 38, 38, 8, c), seg('torso', 40, 46, 46, 70, c, 8),
        seg('thigh', 46, 72, 66, 74, c, 8), seg('arm', 46, 50, 68, 36, c, 7),
        seg('handle', 64, 30, 72, 42, EQ, 5), arrow('a', 74, 40, 86, 24, c),
      ];
    case 'fly':
      return [
        dot('head', 60, 20, 9, c), seg('torso', 60, 29, 60, 66, c, 8),
        seg('lleg', 60, 66, 50, 90, c, 7), seg('rleg', 60, 66, 70, 90, c, 7),
        seg('larm', 60, 40, 34, 46, c, 7), seg('rarm', 60, 40, 86, 46, c, 7),
        dumbbell('ld', 32, 47, EQ), dumbbell('rd', 88, 47, EQ),
        arrow('al', 30, 60, 44, 52, c), arrow('ar', 90, 60, 76, 52, c),
      ];
    case 'dip':
      return [
        seg('lbar', 46, 38, 46, 82, EQ, 5), seg('rbar', 84, 38, 84, 82, EQ, 5),
        dot('head', 65, 30, 9, c), seg('torso', 65, 39, 65, 66, c, 8),
        seg('lleg', 65, 66, 58, 82, c, 7), seg('rleg', 65, 66, 72, 82, c, 7),
        seg('larm', 65, 41, 50, 48, c, 7), seg('rarm', 65, 41, 80, 48, c, 7),
        arrow('a', 94, 64, 94, 48, c),
      ];
    case 'pushup':
      return [
        seg('floor', 18, 92, 102, 92, EQ, 3), dot('head', 92, 60, 8, c),
        seg('torso', 86, 62, 40, 72, c, 8), seg('legs', 40, 72, 26, 86, c, 7),
        seg('arm', 64, 67, 64, 88, c, 7), arrow('a', 76, 76, 76, 62, c),
      ];
    case 'row':
      return [
        seg('seat', 32, 76, 58, 76, EQ, 6), dot('head', 48, 36, 9, c),
        seg('torso', 46, 44, 44, 72, c, 8), seg('thigh', 44, 72, 68, 72, c, 8),
        seg('shin', 68, 72, 70, 88, c, 7), seg('arm', 47, 50, 74, 56, c, 7),
        arrow('a', 82, 56, 60, 54, c), seg('cable', 74, 56, 94, 62, EQ, 2.5), stack('st', 94, 50, EQ),
      ];
    case 'pulldown':
      return [
        barbell('bar', 60, 16, 24, EQ), dot('head', 60, 30, 8, c),
        seg('torso', 60, 38, 60, 66, c, 8), seg('lleg', 60, 66, 52, 90, c, 7),
        seg('rleg', 60, 66, 68, 90, c, 7), seg('larm', 60, 40, 48, 20, c, 7),
        seg('rarm', 60, 40, 72, 20, c, 7), arrow('a', 90, 20, 90, 36, c),
      ];
    case 'hinge':
      return [
        dot('head', 38, 40, 9, c), seg('torso', 42, 46, 68, 58, c, 8),
        seg('leg', 68, 58, 70, 90, c, 8), seg('arm', 64, 56, 64, 74, c, 7),
        barbell('bar', 64, 78, 20, EQ), arrow('a', 92, 72, 92, 52, c),
      ];
    case 'shrug':
      return [
        dot('head', 58, 22, 9, c), seg('torso', 58, 31, 58, 60, c, 8),
        seg('lleg', 58, 60, 50, 90, c, 7), seg('rleg', 58, 60, 66, 90, c, 7),
        seg('larm', 52, 36, 52, 62, c, 7), seg('rarm', 64, 36, 64, 62, c, 7),
        barbell('bar', 58, 64, 22, EQ), arrow('al', 44, 46, 44, 32, c), arrow('ar', 72, 46, 72, 32, c),
      ];
    case 'curl':
      return [
        dot('head', 56, 22, 9, c), seg('torso', 56, 31, 56, 60, c, 8),
        seg('lleg', 56, 60, 48, 90, c, 7), seg('rleg', 56, 60, 64, 90, c, 7),
        seg('upper', 56, 36, 54, 58, c, 7), seg('fore', 54, 58, 72, 44, c, 7),
        dumbbell('d', 74, 43, EQ), arrow('a', 80, 56, 82, 40, c),
      ];
    case 'triceps':
      return [
        dot('head', 56, 22, 9, c), seg('torso', 56, 31, 56, 60, c, 8),
        seg('lleg', 56, 60, 48, 90, c, 7), seg('rleg', 56, 60, 64, 90, c, 7),
        seg('upper', 56, 37, 58, 56, c, 7), seg('fore', 58, 56, 72, 70, c, 7),
        seg('handle', 68, 70, 78, 70, EQ, 4), arrow('a', 84, 56, 86, 74, c),
      ];
    case 'ohp':
      return [
        dot('head', 58, 30, 9, c), seg('torso', 58, 39, 58, 66, c, 8),
        seg('lleg', 58, 66, 50, 90, c, 7), seg('rleg', 58, 66, 66, 90, c, 7),
        seg('larm', 58, 42, 50, 28, c, 7), seg('rarm', 58, 42, 66, 28, c, 7),
        barbell('bar', 58, 18, 18, EQ), arrow('a', 84, 30, 84, 14, c),
      ];
    case 'raise':
      return [
        dot('head', 54, 24, 9, c), seg('torso', 54, 33, 54, 62, c, 8),
        seg('lleg', 54, 62, 46, 90, c, 7), seg('rleg', 54, 62, 62, 90, c, 7),
        seg('arm', 54, 38, 84, 42, c, 7), dumbbell('d', 86, 42, EQ), arrow('a', 90, 54, 92, 36, c),
      ];
    case 'squat':
      return [
        barbell('bar', 56, 34, 22, EQ), dot('head', 56, 22, 8, c),
        seg('torso', 56, 34, 54, 58, c, 8), seg('thighB', 54, 58, 44, 60, c, 8),
        seg('shinB', 44, 60, 46, 88, c, 8), seg('thighF', 54, 58, 72, 60, c, 8),
        seg('shinF', 72, 60, 70, 88, c, 8), arrow('a', 92, 50, 92, 66, c),
      ];
    case 'legpress':
      return [
        seg('back', 24, 56, 46, 50, EQ, 6), dot('head', 24, 64, 8, c),
        seg('torso', 28, 58, 48, 54, c, 8), seg('thigh', 48, 56, 68, 46, c, 8),
        seg('shin', 68, 46, 88, 52, c, 8), seg('plate', 90, 38, 96, 60, EQ, 6),
        arrow('a', 74, 66, 88, 60, c),
      ];
    case 'legext':
      return [
        seg('back', 34, 44, 34, 66, EQ, 6), seg('seat', 34, 66, 58, 66, EQ, 6),
        dot('head', 34, 38, 8, c), seg('torso', 36, 46, 40, 64, c, 8),
        seg('thigh', 40, 66, 62, 66, c, 8), seg('shin', 62, 66, 74, 50, c, 7),
        seg('pad', 72, 46, 80, 54, EQ, 5), arrow('a', 84, 64, 86, 48, c),
      ];
    case 'legcurl':
      return [
        seg('back', 34, 44, 34, 66, EQ, 6), seg('seat', 34, 66, 58, 66, EQ, 6),
        dot('head', 34, 38, 8, c), seg('torso', 36, 46, 40, 64, c, 8),
        seg('thigh', 40, 66, 62, 66, c, 8), seg('shin', 62, 66, 74, 80, c, 7),
        seg('pad', 72, 76, 80, 84, EQ, 5), arrow('a', 84, 64, 86, 82, c),
      ];
    case 'hipthrust':
      return [
        seg('bench', 26, 60, 50, 60, EQ, 6), dot('head', 24, 56, 8, c),
        seg('torso', 30, 58, 60, 66, c, 8), seg('thigh', 60, 66, 78, 66, c, 8),
        seg('shin', 78, 66, 82, 88, c, 8), barbell('bar', 60, 60, 16, EQ), arrow('a', 60, 84, 60, 70, c),
      ];
    case 'calf':
      return [
        seg('step', 48, 90, 70, 90, EQ, 4), dot('head', 58, 26, 8, c),
        seg('torso', 58, 34, 58, 60, c, 8), seg('leg', 58, 60, 56, 86, c, 8),
        seg('foot', 52, 86, 60, 84, c, 6), arrow('a', 80, 74, 80, 56, c),
      ];
    default:
      return [dot('h', 60, 40, 10, c), seg('t', 60, 50, 60, 80, c, 8)];
  }
}

export default function ExerciseFigure({ exerciseId, pattern, color, size = 56, style }) {
  const ex = exerciseId ? getExercise(exerciseId) : null;
  const p = pattern || patternFor(exerciseId, ex);
  const c = color || (ex ? groupColor[ex.muscle_group] : colors.primary);
  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 120 100">{parts(p, c)}</Svg>
    </View>
  );
}
