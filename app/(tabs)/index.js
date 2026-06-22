import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/state/AppContext';
import {
  Screen, Display, H1, H2, H3, Body, Small, Tiny, Label,
  Card, GradientCard, Button, Row, Loader, Badge, SectionHeader, ProgressBar,
} from '../../src/components/ui';
import RadarChart from '../../src/components/RadarChart';
import ProgressRing from '../../src/components/ProgressRing';
import {
  colors, spacing, groupColor, groupGradient, gradients, fonts, hexA, radius,
} from '../../src/theme';
import { GROUP_LABELS_PT, SUBGROUPS_BY_GROUP } from '../../src/data/exercises';
import { LEVEL_LABELS_PT, levelFromPercentile } from '../../src/data/levels';
import { buildInsights, nextGoalForWeakest } from '../../src/engine/selectors';
import { getGoal } from '../../src/data/goals';

const toneIcon = { warn: 'alert-circle', info: 'bulb', good: 'checkmark-circle' };
const toneColor = { warn: colors.warn, info: colors.primary, good: colors.good };

function GroupTile({ group, score }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Row style={{ alignItems: 'center', marginBottom: 4 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: groupColor[group], marginRight: 5 }} />
        <Tiny style={{ color: colors.textDim }}>{GROUP_LABELS_PT[group]}</Tiny>
      </Row>
      <Body style={{ fontFamily: fonts.extra, fontSize: 19, color: score != null ? colors.text : colors.textFaint }}>
        {score != null ? Math.round(score) : '—'}
      </Body>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { profile, logs, radar } = useApp();

  const insights = useMemo(() => (profile && radar ? buildInsights(profile, radar) : []), [profile, radar]);
  const weakGoal = useMemo(() => (profile && radar ? nextGoalForWeakest(profile, radar) : null), [profile, radar]);

  if (!profile || !radar) return <Loader />;

  const hasData = logs.length > 0;
  const goal = getGoal(profile.goal);
  const overall = radar.overall;
  const onPressAxis = (group) => { if (SUBGROUPS_BY_GROUP[group]) router.push(`/subradar/${group}`); };

  return (
    <Screen>
      {/* Header */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing(1.5) }}>
        <View>
          <Label>Bem-vindo de volta</Label>
          <H1 style={{ marginTop: 2 }}>StatsUp</H1>
        </View>
        {goal && <Badge label={`${goal.emoji} ${goal.label}`} color={colors.primary} />}
      </Row>

      {/* Hero — radar */}
      <GradientCard gradient={gradients.hero} style={{ alignItems: 'center', paddingTop: spacing(2.5) }}>
        <Row style={{ alignSelf: 'stretch', justifyContent: 'space-between', marginBottom: spacing(0.5) }}>
          <Label color={colors.textDim}>Perfil de força</Label>
          <Tiny style={{ color: colors.textFaint }}>percentil 0–100</Tiny>
        </Row>
        <RadarChart scores={radar.scores} size={320} onPressAxis={onPressAxis} />
        <Row style={{ marginTop: spacing(0.5) }}>
          <Ionicons name="hand-left-outline" size={12} color={colors.textFaint} />
          <Tiny style={{ marginLeft: 5 }}>Toque em Braço ou Perna para o detalhe</Tiny>
        </Row>
      </GradientCard>

      {/* Score geral + grupos */}
      <Card strong>
        <Row style={{ alignItems: 'center' }}>
          <ProgressRing value={overall || 0} size={118} stroke={11} from={colors.primaryBright} to={colors.violet}>
            <Display style={{ fontSize: 34, lineHeight: 38 }}>{overall != null ? Math.round(overall) : '—'}</Display>
            <Tiny style={{ color: colors.textDim, marginTop: -2 }}>GERAL</Tiny>
          </ProgressRing>
          <View style={{ flex: 1, marginLeft: spacing(2) }}>
            <H3>Score de força</H3>
            <Small style={{ marginTop: 4 }}>
              {overall != null
                ? `Você é mais forte que ${Math.round(overall)}% das pessoas do seu perfil.`
                : 'Registre exercícios para gerar seu score.'}
            </Small>
            {overall != null && (
              <Badge
                label={LEVEL_LABELS_PT[levelFromPercentile(overall)]}
                color={colors.primary}
                style={{ marginTop: spacing(1) }}
              />
            )}
          </View>
        </Row>
        <View style={{ height: 1, backgroundColor: colors.glassBorder, marginVertical: spacing(1.75) }} />
        <Row>
          {['chest', 'back', 'arm', 'leg'].map((g) => (
            <GroupTile key={g} group={g} score={radar.scores[g] ? radar.scores[g].score : null} />
          ))}
        </Row>
      </Card>

      {/* Elo fraco */}
      {radar.weakest && (
        <GradientCard gradient={groupGradient[radar.weakest]} glow={groupColor[radar.weakest]} style={{ marginTop: spacing(0.5) }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Label color="rgba(255,255,255,0.85)">Maior potencial de ganho</Label>
            <Ionicons name="trending-up" size={18} color="#fff" />
          </Row>
          <Row style={{ alignItems: 'baseline', marginTop: spacing(0.5) }}>
            <H1 style={{ color: '#fff' }}>{GROUP_LABELS_PT[radar.weakest]}</H1>
            <H2 style={{ color: 'rgba(255,255,255,0.85)', marginLeft: spacing(1) }}>
              P{Math.round(radar.scores[radar.weakest].score)}
            </H2>
          </Row>
          {weakGoal && (
            <View style={{ marginTop: spacing(1.25) }}>
              <Body style={{ color: 'rgba(255,255,255,0.95)' }}>
                Faltam{' '}
                <Body style={{ fontFamily: fonts.extra, color: '#fff' }}>
                  {weakGoal.delta}{weakGoal.metric === 'reps' ? ' reps' : ' kg'}
                </Body>{' '}
                no {weakGoal.exercise.name_pt} para virar {LEVEL_LABELS_PT[weakGoal.next_level]}.
              </Body>
            </View>
          )}
        </GradientCard>
      )}

      {/* Insights */}
      {hasData && (
        <>
          <SectionHeader title="Insights" />
          {insights.map((ins, i) => (
            <Card key={i} accent={toneColor[ins.tone]}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: hexA(toneColor[ins.tone], 0.16), marginRight: spacing(1.5),
                }}>
                  <Ionicons name={toneIcon[ins.tone]} size={18} color={toneColor[ins.tone]} />
                </View>
                <View style={{ flex: 1 }}>
                  <H3 style={{ fontSize: 15 }}>{ins.title}</H3>
                  <Small style={{ marginTop: 3 }}>{ins.text}</Small>
                </View>
              </Row>
            </Card>
          ))}
        </>
      )}

      <Button
        title="Treinei hoje"
        icon={<Ionicons name="barbell" size={18} color="#fff" />}
        onPress={() => router.push('/(tabs)/log')}
        style={{ marginTop: spacing(1.5) }}
      />
    </Screen>
  );
}
