// Calendário mensal: dias treinados marcados, hoje com contorno, dia
// selecionado em vermelho sólido e dias futuros bloqueados.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing, hexA, groupColor } from '../theme';
import { MONTHS_PT, WEEKDAYS_PT, toISODate, todayISO, parseISODate } from '../utils/date';

// trained: { 'YYYY-MM-DD': ['chest', 'leg', ...] } (grupos treinados no dia)
export default function Calendar({ selected, onSelect, trained = {}, maxDate = todayISO() }) {
  const initial = parseISODate(selected || maxDate);
  const [ym, setYm] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
  const max = parseISODate(maxDate);

  // Seleção vinda de fora (ex.: tocar num treino antigo) leva ao mês dela.
  useEffect(() => {
    if (!selected) return;
    const d = parseISODate(selected);
    setYm((cur) => (cur.y === d.getFullYear() && cur.m === d.getMonth() ? cur : { y: d.getFullYear(), m: d.getMonth() }));
  }, [selected]);
  const atMaxMonth = ym.y > max.getFullYear() || (ym.y === max.getFullYear() && ym.m >= max.getMonth());

  const weeks = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1, 12);
    const start = new Date(first);
    start.setDate(1 - first.getDay()); // volta até o domingo
    const out = [];
    for (let w = 0; w < 6; w++) {
      const row = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        row.push({ iso: toISODate(day), day: day.getDate(), inMonth: day.getMonth() === ym.m });
      }
      // não desenha uma semana inteira do mês seguinte
      if (w > 0 && !row.some((c) => c.inMonth)) break;
      out.push(row);
    }
    return out;
  }, [ym]);

  const shift = (n) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const today = todayISO();
  const trainedInMonth = Object.keys(trained).filter((iso) => {
    const d = parseISODate(iso);
    return d.getFullYear() === ym.y && d.getMonth() === ym.m;
  }).length;

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} style={styles.navBtn} accessibilityLabel="Mês anterior">
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.month}>{MONTHS_PT[ym.m]} {ym.y}</Text>
          <Text style={styles.monthSub}>
            {trainedInMonth ? `${trainedInMonth} dia${trainedInMonth > 1 ? 's' : ''} treinado${trainedInMonth > 1 ? 's' : ''}` : 'Nenhum treino'}
          </Text>
        </View>
        <Pressable
          onPress={() => !atMaxMonth && shift(1)}
          hitSlop={10}
          disabled={atMaxMonth}
          style={[styles.navBtn, atMaxMonth && { opacity: 0.3 }]}
          accessibilityLabel="Próximo mês"
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.row}>
        {WEEKDAYS_PT.map((w) => (
          <Text key={w} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      {weeks.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((c) => {
            const groups = trained[c.iso];
            const isSel = c.iso === selected;
            const isToday = c.iso === today;
            const future = c.iso > maxDate;
            return (
              <Pressable
                key={c.iso}
                disabled={future}
                onPress={() => onSelect?.(c.iso)}
                style={({ pressed }) => [
                  styles.cell,
                  groups && styles.cellTrained,
                  isToday && styles.cellToday,
                  isSel && styles.cellSelected,
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityLabel={`${c.day}${groups ? ', treinado' : ''}`}
              >
                <Text
                  style={[
                    styles.dayText,
                    !c.inMonth && { color: colors.textFaint, opacity: 0.5 },
                    future && { color: colors.textFaint, opacity: 0.35 },
                    groups && { color: colors.text, fontFamily: fonts.black },
                    isSel && { color: '#fff' },
                  ]}
                >
                  {c.day}
                </Text>
                {/* até 3 marcas com as cores dos grupos treinados */}
                <View style={styles.dots}>
                  {(groups || []).slice(0, 3).map((g) => (
                    <View key={g} style={[styles.dot, { backgroundColor: isSel ? '#fff' : groupColor[g] }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(1.5) },
  navBtn: {
    width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  month: { fontFamily: fonts.black, fontSize: 20, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.4 },
  monthSub: { fontFamily: fonts.cond, fontSize: 12, color: colors.textFaint, letterSpacing: 0.6, marginTop: -2 },
  row: { flexDirection: 'row' },
  weekday: {
    flex: 1, textAlign: 'center', fontFamily: fonts.cond, fontSize: 11, color: colors.textFaint,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing(0.75),
  },
  cell: {
    flex: 1, aspectRatio: 1, margin: 2, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent',
  },
  cellTrained: { backgroundColor: hexA(colors.primary, 0.14) },
  cellToday: { borderColor: colors.glassBorderStrong },
  cellSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textDim, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', height: 5, marginTop: 2, gap: 2 },
  dot: { width: 5, height: 5, borderRadius: 1.5 },
});
