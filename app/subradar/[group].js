import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/state/AppContext';
import { Screen, H1, H3, Body, Small, Card, Row, Button } from '../../src/components/ui';
import { colors, spacing, groupColor, radius } from '../../src/theme';
import {
  SUBGROUPS_BY_GROUP,
  SUBGROUP_LABELS_PT,
  GROUP_LABELS_PT,
  getExercise,
} from '../../src/data/exercises';
import { LEVEL_LABELS_PT, levelFromPercentile, LEVEL_PCT } from '../../src/data/levels';

function Bar({ value, color }) {
  return (
    <View style={{ height: 10, backgroundColor: colors.surfaceAlt, borderRadius: 5, overflow: 'hidden' }}>
      <View
        style={{
          height: '100%',
          width: `${Math.max(2, Math.min(100, value))}%`,
          backgroundColor: color,
          borderRadius: 5,
        }}
      />
    </View>
  );
}

export default function SubRadar() {
  const { group } = useLocalSearchParams();
  const router = useRouter();
  const { radar } = useApp();

  const subs = SUBGROUPS_BY_GROUP[group] || [];
  const color = groupColor[group];

  const sub = radar ? radar.subScores[group] || {} : {};

  // Exercícios registrados por subgrupo.
  const exBySub = useMemo(() => {
    const out = {};
    for (const s of subs) out[s] = [];
    if (radar) {
      for (const [exId, entry] of Object.entries(radar.latest)) {
        const ex = getExercise(exId);
        if (ex && ex.muscle_group === group && ex.sub_group && out[ex.sub_group]) {
          out[ex.sub_group].push({ ex, entry });
        }
      }
    }
    return out;
  }, [radar, group, subs]);

  // Identifica subgrupo mais atrás.
  const weakestSub = useMemo(() => {
    let w = null;
    let min = Infinity;
    for (const s of subs) {
      if (sub[s] && sub[s].score < min) {
        min = sub[s].score;
        w = s;
      }
    }
    return w;
  }, [sub, subs]);

  return (
    <Screen>
      <Row style={{ marginBottom: spacing(1) }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: spacing(1) }}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <H1 style={{ color }}>{GROUP_LABELS_PT[group]}</H1>
      </Row>
      <Body dim style={{ marginBottom: spacing(2) }}>
        Detalhe por subgrupo — revela desequilíbrios dentro do eixo.
      </Body>

      {weakestSub && sub[weakestSub] && (
        <Card color={colors.warn}>
          <Small>Subgrupo mais atrás</Small>
          <H3 style={{ color: colors.warn }}>
            {SUBGROUP_LABELS_PT[weakestSub]} · P{Math.round(sub[weakestSub].score)}
          </H3>
          <Small style={{ marginTop: 2 }}>Focar aqui equilibra o eixo de {GROUP_LABELS_PT[group].toLowerCase()}.</Small>
        </Card>
      )}

      {subs.map((s) => {
        const sc = sub[s];
        const list = exBySub[s] || [];
        return (
          <Card key={s} color={color}>
            <Row style={{ justifyContent: 'space-between', marginBottom: spacing(1) }}>
              <H3>{SUBGROUP_LABELS_PT[s]}</H3>
              <Text style={{ color: sc ? colors.text : colors.textFaint, fontWeight: '800', fontSize: 18 }}>
                {sc ? `P${Math.round(sc.score)}` : '—'}
              </Text>
            </Row>

            {sc ? (
              <>
                <Bar value={sc.score} color={color} />
                <Small style={{ marginTop: spacing(0.5) }}>
                  Nível {LEVEL_LABELS_PT[levelFromPercentile(sc.score)]}
                </Small>
                {list.map(({ ex, entry }, i) => (
                  <Row key={i} style={{ justifyContent: 'space-between', marginTop: spacing(0.75) }}>
                    <Body style={{ flex: 1, fontSize: 14 }}>{ex.name_pt}</Body>
                    <Small style={{ color: colors.primary }}>P{Math.round(entry.percentile)}</Small>
                  </Row>
                ))}
              </>
            ) : (
              <Small style={{ color: colors.textFaint }}>
                Sem dados. Registre um exercício de {SUBGROUP_LABELS_PT[s].toLowerCase()}.
              </Small>
            )}
          </Card>
        );
      })}

      <Button title="Voltar ao radar" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing(1) }} />
    </Screen>
  );
}
