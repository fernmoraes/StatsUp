// Radar de 4 eixos (conceito §6). Percentil 0-100, anéis de nível 5/20/50/80/95.
import React from 'react';
import { View } from 'react-native';
import Svg, {
  Polygon,
  Line,
  Circle,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { colors, groupColor } from '../theme';
import { GROUP_LABELS_PT } from '../data/exercises';
import { LEVEL_PCT } from '../data/levels';

// Pares opostos: empurrar/puxar na vertical, braço/perna na horizontal.
const AXES = [
  { group: 'chest', angle: 0 }, // topo
  { group: 'arm', angle: 90 }, // direita
  { group: 'leg', angle: 180 }, // baixo
  { group: 'back', angle: 270 }, // esquerda
];

const RING_LABELS = ['Inic', 'Nov', 'Méd', 'Avç', 'Elite'];

function polar(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

export default function RadarChart({
  scores,
  size = 300,
  past = null,
  onPressAxis,
}) {
  const pad = 46;
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

  // Anéis (polígonos) nos percentis dos níveis.
  const rings = LEVEL_PCT.map((pct) => {
    const pts = AXES.map((a) => polar(cx, cy, (pct / 100) * R, a.angle));
    return { pct, pts };
  });

  const dataPts = AXES.map((a) => pointFor(scores, a.group, a.angle));
  const pastPts = past ? AXES.map((a) => pointFor(past, a.group, a.angle)) : null;

  const toStr = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Anéis de nível */}
        {rings.map((ring) => (
          <Polygon
            key={`ring-${ring.pct}`}
            points={toStr(ring.pts)}
            fill="none"
            stroke={ring.pct === 50 ? colors.primary : colors.ring}
            strokeWidth={ring.pct === 50 ? 1.5 : 1}
            strokeDasharray={ring.pct === 50 ? undefined : '3 4'}
          />
        ))}

        {/* Eixos */}
        {AXES.map((a) => {
          const end = polar(cx, cy, R, a.angle);
          return (
            <Line
              key={`axis-${a.group}`}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke={colors.ring}
              strokeWidth={1}
            />
          );
        })}

        {/* Rótulos dos anéis ao longo do eixo superior (Peito) */}
        {rings.map((ring, i) => {
          const p = polar(cx, cy, (ring.pct / 100) * R, 0);
          return (
            <SvgText
              key={`rl-${ring.pct}`}
              x={p.x + 4}
              y={p.y - 2}
              fill={colors.ringLabel}
              fontSize={8}
            >
              {RING_LABELS[i]}
            </SvgText>
          );
        })}

        {/* Silhueta passada (evolução) */}
        {pastPts && (
          <Polygon
            points={toStr(pastPts)}
            fill={colors.textFaint}
            fillOpacity={0.12}
            stroke={colors.textFaint}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}

        {/* Área de força atual */}
        <Polygon
          points={toStr(dataPts)}
          fill={colors.primary}
          fillOpacity={0.28}
          stroke={colors.primary}
          strokeWidth={2}
        />

        {/* Vértices + área de toque por eixo */}
        {AXES.map((a, i) => {
          const p = dataPts[i];
          const hasData = scores && scores[a.group] && scores[a.group].score != null;
          return (
            <G key={`v-${a.group}`}>
              {hasData && (
                <Circle cx={p.x} cy={p.y} r={4} fill={groupColor[a.group]} />
              )}
              {/* alvo de toque generoso */}
              <Circle
                cx={polar(cx, cy, R, a.angle).x}
                cy={polar(cx, cy, R, a.angle).y}
                r={26}
                fill="transparent"
                onPress={onPressAxis ? () => onPressAxis(a.group) : undefined}
              />
            </G>
          );
        })}

        {/* Rótulos dos eixos (grupo + score) */}
        {AXES.map((a) => {
          const labelPt = polar(cx, cy, R + 22, a.angle);
          const sc = scores && scores[a.group];
          const has = sc && sc.score != null;
          return (
            <G key={`lbl-${a.group}`}>
              <SvgText
                x={labelPt.x}
                y={labelPt.y}
                fill={groupColor[a.group]}
                fontSize={13}
                fontWeight="700"
                textAnchor="middle"
              >
                {GROUP_LABELS_PT[a.group]}
              </SvgText>
              <SvgText
                x={labelPt.x}
                y={labelPt.y + 14}
                fill={has ? colors.text : colors.textFaint}
                fontSize={12}
                textAnchor="middle"
              >
                {has ? `P${Math.round(sc.score)}` : '—'}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
