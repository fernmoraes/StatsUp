import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/state/AppContext';
import {
  Screen, Display, H1, H2, H3, Body, Small, Tiny, Label,
  Card, GradientCard, Button, Row, Loader, Badge, SectionHeader, ProgressBar, BrandMark,
} from '../../src/components/ui';
import RadarChart from '../../src/components/RadarChart';
import ProgressRing from '../../src/components/ProgressRing';
import {
  colors, spacing, groupColor, groupGradient, gradients, fonts, hexA, radius,
} from '../../src/theme';
import { GROUP_LABELS_PT, SUBGROUPS_BY_GROUP, MUSCLE_GROUPS } from '../../src/data/exercises';
import { LEVEL_LABELS_PT, levelFromPercentile } from '../../src/data/levels';
import { buildInsights, nextGoalForWeakest } from '../../src/engine/selectors';
import { getGoal } from '../../src/data/goals';

const toneIcon = { warn: 'alert-circle', info: 'bulb', good: 'checkmark-circle' };
const toneColor = { warn: colors.warn, info: colors.primaryBright, good: colors.good };

function GroupTile({ group, score }) {
  return (
    <View style={{ width: '33.33%', alignItems: 'center', paddingVertical: spacing(0.75) }}>
      <Row style={{ alignItems: 'center', marginBottom: 2 }}>
        <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: groupColor[group], marginRight: 5 }} />
        <Label color={colors.textDim} style={{ fontSize: 11, letterSpacing: 1 }}>{GROUP_LABELS_PT[group]}</Label>
      </Row>
      <H2 style={{ fontSize: 26, color: score != null ? colors.text : colors.textFaint }}>
        {score != null ? Math.round(score) : '—'}
      </H2>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, profile, logs, radar } = useApp();

  const insights = useMemo(() => (profile && radar ? buildInsights(profile, radar) : []), [profile, radar]);
  const weakGoal = useMemo(() => (profile && radar ? nextGoalForWeakest(profile, radar) : null), [profile, radar]);

  if (!profile || !radar) return <Loader />;

  const hasData = logs.length > 0;
  const goal = getGoal(profile.goal);
  const overall = radar.overall;
  // Todo eixo abre o detalhe do grupo (perna mostra subgrupos; os demais, exercícios).
  const onPressAxis = (group) => router.push(`/subradar/${group}`);

  return (
    <Screen>
      {/* Header */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(2) }}>
        <Row>
          <BrandMark size={22} boxed />
          <View style={{ marginLeft: spacing(1.5) }}>
            <Label>{user && user.name ? `Bem-vindo, ${user.name.split(' ')[0]}` : 'Bem-vindo de volta'}</Label>
            <H1 style={{ fontSize: 28, lineHeight: 30 }}>Seu radar</H1>
          </View>
        </Row>
        {goal && <Badge label={`${goal.emoji} ${goal.label}`} color={colors.textDim} />}
      </Row>

      {/* Hero — radar */}
      <GradientCard gradient={gradients.hero} style={{ alignItems: 'center', paddingTop: spacing(2.5) }}>
        <Row style={{ alignSelf: 'stretch', justifyContent: 'space-between', marginBottom: spacing(0.5) }}>
          <Label color={colors.textDim}>Perfil de força</Label>
          <Label style={{ letterSpacing: 0.8 }}>Percentil 0–100</Label>
        </Row>
        <RadarChart scores={radar.scores} size={320} onPressAxis={onPressAxis} />
        <Row style={{ marginTop: spacing(0.5) }}>
          <Ionicons name="hand-left-outline" size={12} color={colors.textFaint} />
          <Tiny style={{ marginLeft: 5 }}>Toque em um grupo do radar para ver o detalhe</Tiny>
        </Row>
      </GradientCard>

      {/* Score geral + grupos */}
      <Card strong>
        <Row style={{ alignItems: 'center' }}>
          <ProgressRing value={overall || 0} size={118} stroke={10}>
            <Display style={{ fontSize: 44, lineHeight: 46 }}>{overall != null ? Math.round(overall) : '—'}</Display>
            <Label color={colors.textDim} style={{ fontSize: 10, marginTop: -4 }}>Geral</Label>
          </ProgressRing>
          <View style={{ flex: 1, marginLeft: spacing(2) }}>
            <H2>Score de força</H2>
            <Small style={{ marginTop: 4 }}>
              {overall != null
                ? `Você é mais forte que ${Math.round(overall)}% das pessoas do seu perfil.`
                : 'Registre exercícios para gerar seu score.'}
            </Small>
            {overall != null && (
              <Badge
                label={LEVEL_LABELS_PT[levelFromPercentile(overall)]}
                color={colors.primary}
                solid
                style={{ marginTop: spacing(1) }}
              />
            )}
          </View>
        </Row>
        <View style={{ height: 1, backgroundColor: colors.glassBorder, marginVertical: spacing(1.75) }} />
        <Row style={{ flexWrap: 'wrap' }}>
          {MUSCLE_GROUPS.map((g) => (
            <GroupTile key={g} group={g} score={radar.scores[g] ? radar.scores[g].score : null} />
          ))}
        </Row>
      </Card>

      {/* Elo fraco */}
      {radar.weakest && (
        <GradientCard gradient={gradients.brand} glow={colors.primary} style={{ marginTop: spacing(0.5) }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Label color="rgba(255,255,255,0.85)">Maior potencial de ganho</Label>
            <Ionicons name="trending-up" size={18} color="#fff" />
          </Row>
          <Row style={{ alignItems: 'baseline', marginTop: spacing(0.5) }}>
            <Display style={{ color: '#fff', fontSize: 40, textTransform: 'uppercase' }}>{GROUP_LABELS_PT[radar.weakest]}</Display>
            <H2 style={{ color: 'rgba(255,255,255,0.8)', marginLeft: spacing(1) }}>
              P{Math.round(radar.scores[radar.weakest].score)}
            </H2>
          </Row>
          {weakGoal && (
            <View style={{ marginTop: spacing(1.25) }}>
              <Body style={{ color: 'rgba(255,255,255,0.95)' }}>
                Faltam{' '}
                <Body style={{ fontFamily: fonts.bold, color: '#fff' }}>
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
                  width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
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
