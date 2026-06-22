// Anel de progresso circular (estilo Whoop/Oura) com stroke em gradiente.
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { colors } from '../theme';

export default function ProgressRing({
  value = 0, // 0..100
  size = 200,
  stroke = 16,
  from = '#5B8DEF',
  to = '#9B6CFF',
  track = 'rgba(255,255,255,0.08)',
  children,
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c * (1 - pct / 100);
  const cx = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <G>
          <Circle
            cx={cx}
            cy={cx}
            r={r}
            stroke="url(#ringGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </G>
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
