// Radar de 6 eixos (conceito §6) — área em vermelho da marca, anéis de nível e glow.
import React from 'react';
import { View } from 'react-native';
import Svg, {
  Polygon,
  Line,
  Circle,
  Rect,
  Text as SvgText,
  G,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { colors, groupColor, fonts } from '../theme';
import { GROUP_LABELS_PT } from '../data/exercises';
import { LEVEL_PCT } from '../data/levels';

// Hexágono: empurrar à direita (peito no topo, ombro, tríceps), puxar à
// esquerda (costas, bíceps) e perna embaixo.
const AXES = [
  { group: 'chest', angle: 0 },
  { group: 'shoulder', angle: 60 },
  { group: 'triceps', angle: 120 },
  { group: 'leg', angle: 180 },
  { group: 'biceps', angle: 240 },
  { group: 'back', angle: 300 },
];

const RING_LABELS = ['INIC', 'NOV', 'MÉD', 'AVÇ', 'ELITE'];

function polar(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

export default function RadarChart({ scores, size = 320, past = null, onPressAxis }) {
  const pad = 52;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - pad;

  const valueOf = (src, group) => {
    const s = src && src[group];
    if (!s || s.score == null) return 0;
    return Math.max(0, Math.min(100, s.score));
  };
  const pointFor = (src, group, angle) => {
    const v = valueOf(src, group);
    return polar(cx, cy, (v / 100) * R, angle);
  };

  const rings = LEVEL_PCT.map((pct) => ({
    pct,
    pts: AXES.map((a) => polar(cx, cy, (pct / 100) * R, a.angle)),
  }));

  const dataPts = AXES.map((a) => pointFor(scores, a.group, a.angle));
  const pastPts = past ? AXES.map((a) => pointFor(past, a.group, a.angle)) : null;
  const toStr = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.14" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="fillGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primaryBright} stopOpacity="0.50" />
            <Stop offset="1" stopColor={colors.primaryDeep} stopOpacity="0.30" />
          </LinearGradient>
          <LinearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primaryBright} />
            <Stop offset="1" stopColor={colors.primary} />
          </LinearGradient>
        </Defs>

        {/* Glow de fundo */}
        <Circle cx={cx} cy={cy} r={R} fill="url(#bgGlow)" />

        {/* Anéis de nível */}
        {rings.map((ring) => (
          <Polygon
            key={`ring-${ring.pct}`}
            points={toStr(ring.pts)}
            fill="none"
            stroke={ring.pct === 50 ? colors.ringMid : colors.ring}
            strokeWidth={ring.pct === 50 ? 1.5 : 1}
            strokeDasharray={ring.pct === 50 ? undefined : '2 5'}
          />
        ))}

        {/* Eixos */}
        {AXES.map((a) => {
          const end = polar(cx, cy, R, a.angle);
          return <Line key={`axis-${a.group}`} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={colors.ring} strokeWidth={1} />;
        })}

        {/* Rótulos de nível ao longo do eixo superior */}
        {rings.map((ring, i) => {
          const p = polar(cx, cy, (ring.pct / 100) * R, 0);
          return (
            <SvgText key={`rl-${ring.pct}`} x={p.x + 5} y={p.y - 2} fill={colors.ringLabel} fontSize={9} fontFamily={fonts.cond} letterSpacing={0.6}>
              {RING_LABELS[i]}
            </SvgText>
          );
        })}

        {/* Silhueta passada */}
        {pastPts && (
          <Polygon points={toStr(pastPts)} fill={colors.textFaint} fillOpacity={0.1} stroke={colors.textFaint} strokeWidth={1.5} strokeDasharray="4 4" />
        )}

        {/* Glow da área (stroke largo translúcido) */}
        <Polygon points={toStr(dataPts)} fill="none" stroke={colors.primary} strokeOpacity={0.22} strokeWidth={10} strokeLinejoin="round" />
        {/* Área de força */}
        <Polygon points={toStr(dataPts)} fill="url(#fillGrad)" stroke="url(#strokeGrad)" strokeWidth={2.5} strokeLinejoin="round" />

        {/* Vértices + toque */}
        {AXES.map((a, i) => {
          const p = dataPts[i];
          const has = scores && scores[a.group] && scores[a.group].score != null;
          return (
            <G key={`v-${a.group}`}>
              {has && (
                <>
                  <Circle cx={p.x} cy={p.y} r={6} fill={groupColor[a.group]} fillOpacity={0.25} />
                  <Circle cx={p.x} cy={p.y} r={3.5} fill={groupColor[a.group]} stroke={colors.bg} strokeWidth={1.5} />
                </>
              )}
              <Circle
                cx={polar(cx, cy, R, a.angle).x}
                cy={polar(cx, cy, R, a.angle).y}
                r={30}
                fill="transparent"
                onPress={onPressAxis ? () => onPressAxis(a.group) : undefined}
              />
            </G>
          );
        })}

        {/* Rótulos dos eixos */}
        {AXES.map((a) => {
          const labelPt = polar(cx, cy, R + 26, a.angle);
          const sc = scores && scores[a.group];
          const has = sc && sc.score != null;
          return (
            <G key={`lbl-${a.group}`}>
              {/* identidade do grupo vai na marca (traço colorido); o texto usa tokens de texto */}
              <Rect x={labelPt.x - 8} y={labelPt.y - 21} width={16} height={3} rx={1.5} fill={groupColor[a.group]} />
              <SvgText x={labelPt.x} y={labelPt.y - 3} fill={colors.textDim} fontSize={13} fontFamily={fonts.cond} letterSpacing={0.8} textAnchor="middle">
                {GROUP_LABELS_PT[a.group].toUpperCase()}
              </SvgText>
              <SvgText x={labelPt.x} y={labelPt.y + 16} fill={has ? colors.text : colors.textFaint} fontSize={19} fontFamily={fonts.black} textAnchor="middle">
                {has ? `${Math.round(sc.score)}` : '—'}
              </SvgText>
              {/* Área de toque sobre o nome + número. Os textos ficam por cima do
                  ponto do eixo e "engoliam" o toque (ex.: TRÍCEPS, o rótulo mais
                  largo, cobria o alvo). Agora tocar no nome também abre o grupo. */}
              {onPressAxis ? (
                <Rect
                  x={labelPt.x - 38}
                  y={labelPt.y - 28}
                  width={76}
                  height={52}
                  fill="transparent"
                  onPress={() => onPressAxis(a.group)}
                />
              ) : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
