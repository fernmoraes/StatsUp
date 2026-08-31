import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/state/AppContext';
import {
  Screen, Display, H1, H3, Body, Small, Tiny, Label,
  Card, GradientCard, Row, Badge, Button, ProgressBar,
} from '../../src/components/ui';
import ExerciseImage from '../../src/components/ExerciseImage';
import { colors, spacing, groupColor, groupGradient, fonts, hexA } from '../../src/theme';
import {
  SUBGROUPS_BY_GROUP, SUBGROUP_LABELS_PT, GROUP_LABELS_PT, getExercise,
} from '../../src/data/exercises';
import { LEVEL_LABELS_PT, levelFromPercentile } from '../../src/data/levels';

export default function SubRadar() {
  const { group } = useLocalSearchParams();
  const router = useRouter();
  const { radar } = useApp();

  const subs = SUBGROUPS_BY_GROUP[group] || [];
  const color = groupColor[group];
  const sub = radar ? radar.subScores[group] || {} : {};

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

  const weakestSub = useMemo(() => {
    let w = null, min = Infinity;
    for (const s of subs) if (sub[s] && sub[s].score < min) { min = sub[s].score; w = s; }
    return w;
  }, [sub, subs]);

  return (
    <Screen>
      <Row style={{ marginBottom: spacing(1.5), alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles_back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ marginLeft: spacing(1.5) }}>
          <Label color={color}>Detalhe do eixo</Label>
          <H1 style={{ color }}>{GROUP_LABELS_PT[group]}</H1>
        </View>
      </Row>

      {weakestSub && sub[weakestSub] && (
        <GradientCard gradient={groupGradient[group]} glow={color}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Label color="rgba(255,255,255,0.85)">Subgrupo mais atrás</Label>
            <Ionicons name="locate" size={18} color="#fff" />
          </Row>
          <Row style={{ alignItems: 'baseline', marginTop: spacing(0.5) }}>
            <H1 style={{ color: '#fff' }}>{SUBGROUP_LABELS_PT[weakestSub]}</H1>
            <H3 style={{ color: 'rgba(255,255,255,0.85)', marginLeft: spacing(1) }}>P{Math.round(sub[weakestSub].score)}</H3>
          </Row>
          <Body style={{ color: 'rgba(255,255,255,0.92)', marginTop: spacing(0.75) }}>
            Focar aqui equilibra o eixo de {GROUP_LABELS_PT[group].toLowerCase()}.
          </Body>
        </GradientCard>
      )}

      {subs.map((s) => {
        const sc = sub[s];
        const list = exBySub[s] || [];
        return (
          <Card key={s} accent={color}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: sc ? spacing(1) : 0 }}>
              <H3>{SUBGROUP_LABELS_PT[s]}</H3>
              {sc ? (
                <Display style={{ fontSize: 24, color: colors.text }}>P{Math.round(sc.score)}</Display>
              ) : (
                <Tiny>SEM DADOS</Tiny>
              )}
            </Row>

            {sc ? (
              <>
                <ProgressBar value={sc.score} gradient={groupGradient[group]} height={9} />
                <Row style={{ marginTop: spacing(1) }}>
                  <Badge label={LEVEL_LABELS_PT[levelFromPercentile(sc.score)]} color={color} />
                </Row>
                {list.map(({ ex, entry }, i) => (
                  <Pressable key={i} onPress={() => router.push(`/exercise/${ex.id}`)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing(1) }}>
                    <Row style={{ flex: 1 }}>
                      <ExerciseImage exerciseId={ex.id} size={34} radius={9} color={color} style={{ marginRight: spacing(1) }} />
                      <Body style={{ flex: 1, fontSize: 14, color: colors.textDim }} numberOfLines={1}>{ex.name_pt}</Body>
                    </Row>
                    <Small style={{ color: colors.primaryBright, fontFamily: fonts.bold }}>P{Math.round(entry.percentile)}</Small>
                  </Pressable>
                ))}
              </>
            ) : (
              <Small style={{ color: colors.textFaint }}>
                Registre um exercício de {SUBGROUP_LABELS_PT[s].toLowerCase()} para preencher.
              </Small>
            )}
          </Card>
        );
      })}

      <Button title="Voltar ao radar" variant="ghost" icon={<Ionicons name="pulse" size={16} color={colors.text} />} onPress={() => router.back()} style={{ marginTop: spacing(0.5) }} />
    </Screen>
  );
}

const styles_back = {
  width: 42, height: 42, borderRadius: 14,
  backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
  alignItems: 'center', justifyContent: 'center',
};
