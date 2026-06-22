import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/state/AppContext';
import { Screen, H1, H2, H3, Body, Small, Card, Button, Row, Loader } from '../../src/components/ui';
import RadarChart from '../../src/components/RadarChart';
import { colors, spacing, groupColor, radius } from '../../src/theme';
import { GROUP_LABELS_PT, SUBGROUPS_BY_GROUP } from '../../src/data/exercises';
import { LEVEL_LABELS_PT } from '../../src/data/levels';
import { buildInsights, nextGoalForWeakest } from '../../src/engine/selectors';
import { getGoal } from '../../src/data/goals';

const toneColor = { warn: colors.warn, info: colors.primary, good: colors.good };

export default function Home() {
  const router = useRouter();
  const { profile, logs, radar } = useApp();

  const insights = useMemo(
    () => (profile && radar ? buildInsights(profile, radar) : []),
    [profile, radar]
  );
  const weakGoal = useMemo(
    () => (profile && radar ? nextGoalForWeakest(profile, radar) : null),
    [profile, radar]
  );

  if (!profile || !radar) return <Loader />;

  const hasData = logs.length > 0;
  const goal = getGoal(profile.goal);

  const onPressAxis = (group) => {
    if (SUBGROUPS_BY_GROUP[group]) router.push(`/subradar/${group}`);
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <H1>StatsUp</H1>
        {goal && (
          <Small style={{ marginBottom: 6 }}>
            {goal.emoji} {goal.label}
          </Small>
        )}
      </Row>

      <View style={{ alignItems: 'center', marginVertical: spacing(1) }}>
        <RadarChart scores={radar.scores} size={320} onPressAxis={onPressAxis} />
        <Small style={{ marginTop: spacing(0.5) }}>
          Toque em Braço ou Perna para ver o detalhe por subgrupo
        </Small>
      </View>

      {/* Score geral */}
      <Card style={{ alignItems: 'center' }}>
        <Small>Score geral de força</Small>
        <Text style={{ color: colors.primary, fontSize: 52, fontWeight: '900' }}>
          {radar.overall != null ? Math.round(radar.overall) : '—'}
        </Text>
        <Small>
          {radar.overall != null
            ? `Mais forte que ${Math.round(radar.overall)}% do seu perfil`
            : 'Registre exercícios para gerar seu score'}
        </Small>
      </Card>

      {/* Elo fraco + próxima meta */}
      {radar.weakest && (
        <Card color={groupColor[radar.weakest]}>
          <Small>Elo fraco — maior potencial de ganho</Small>
          <H2 style={{ color: groupColor[radar.weakest], marginTop: 2 }}>
            {GROUP_LABELS_PT[radar.weakest]}{' '}
            <Text style={{ color: colors.text }}>
              P{Math.round(radar.scores[radar.weakest].score)}
            </Text>
          </H2>
          {weakGoal && (
            <Body dim style={{ marginTop: spacing(0.5) }}>
              Faltam{' '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {weakGoal.delta}
                {weakGoal.metric === 'reps' ? ' reps' : ' kg'}
              </Text>{' '}
              no {weakGoal.exercise.name_pt} para virar{' '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {LEVEL_LABELS_PT[weakGoal.next_level]}
              </Text>
              .
            </Body>
          )}
        </Card>
      )}

      {/* Insights */}
      {hasData && (
        <>
          <H3 style={{ marginTop: spacing(1), marginBottom: spacing(1) }}>Insights</H3>
          {insights.map((ins, i) => (
            <Card key={i} color={toneColor[ins.tone]}>
              <H3 style={{ fontSize: 15 }}>{ins.title}</H3>
              <Small style={{ marginTop: 2 }}>{ins.text}</Small>
            </Card>
          ))}
        </>
      )}

      <Button
        title="🏋️  Treinei hoje"
        onPress={() => router.push('/(tabs)/log')}
        style={{ marginTop: spacing(1.5) }}
      />
    </Screen>
  );
}
