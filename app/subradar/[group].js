// Detalhe de um eixo do radar (toque no gráfico).
// - Perna: tem subgrupos (quadríceps, posterior, glúteos, panturrilha).
// - Demais eixos: nível do grupo + exercícios registrados e os que faltam.
import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/state/AppContext';
import {
  Screen, Display, H1, H3, Body, Small, Label,
  Card, GradientCard, Row, Badge, Button, ProgressBar, SectionHeader,
} from '../../src/components/ui';
import ExerciseImage from '../../src/components/ExerciseImage';
import { colors, spacing, groupColor, groupGradient, fonts, radius } from '../../src/theme';
import {
  SUBGROUPS_BY_GROUP, SUBGROUP_LABELS_PT, GROUP_LABELS_PT, getExercise, exercisesByGroup,
} from '../../src/data/exercises';
import { LEVEL_LABELS_PT, levelFromPercentile } from '../../src/data/levels';

export default function GroupDetail() {
  const { group } = useLocalSearchParams();
  const router = useRouter();
  const color = groupColor[group];
  const label = GROUP_LABELS_PT[group] || '';

  return (
    <Screen>
      <Row style={{ marginBottom: spacing(1.5), alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Voltar" style={({ pressed }) => [styles_back, pressed && { opacity: 0.7 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ marginLeft: spacing(1.5) }}>
          <Label>Detalhe do eixo</Label>
          <Row>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, marginRight: spacing(1) }} />
            <H1>{label}</H1>
          </Row>
        </View>
      </Row>

      {SUBGROUPS_BY_GROUP[group] ? <SubgroupView group={group} /> : <ExercisesView group={group} />}

      <Button
        title="Registrar treino"
        icon={<Ionicons name="barbell" size={18} color="#fff" />}
        onPress={() => router.push('/(tabs)/log')}
        style={{ marginTop: spacing(1) }}
      />
      <Button title="Voltar ao radar" variant="ghost" icon={<Ionicons name="pulse" size={16} color={colors.text} />} onPress={() => router.back()} style={{ marginTop: spacing(1) }} />
    </Screen>
  );
}

/* ----------------------------------------------- eixos sem subgrupo (5 de 6) */
function ExercisesView({ group }) {
  const router = useRouter();
  const { radar } = useApp();
  const color = groupColor[group];
  const label = GROUP_LABELS_PT[group] || '';
  const score = radar && radar.scores[group];

  const { done, todo } = useMemo(() => {
    const all = exercisesByGroup(group);
    const latest = (radar && radar.latest) || {};
    const d = all
      .filter((ex) => latest[ex.id])
      .map((ex) => ({ ex, entry: latest[ex.id] }))
      .sort((a, b) => b.entry.percentile - a.entry.percentile);
    return { done: d, todo: all.filter((ex) => !latest[ex.id]) };
  }, [radar, group]);

  const weakestId = done.length > 1 ? done[done.length - 1].ex.id : null;

  return (
    <>
      {score ? (
        <GradientCard gradient={groupGradient[group]} glow={color}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Label color="rgba(255,255,255,0.85)">Seu nível em {label.toLowerCase()}</Label>
            <Ionicons name="stats-chart" size={18} color="#fff" />
          </Row>
          <Row style={{ alignItems: 'baseline', marginTop: spacing(0.5) }}>
            <Display style={{ color: '#fff', fontSize: 48, lineHeight: 50 }}>P{Math.round(score.score)}</Display>
            <Badge label={LEVEL_LABELS_PT[levelFromPercentile(score.score)]} color="#fff" style={{ marginLeft: spacing(1.25) }} />
          </Row>
          <Body style={{ color: 'rgba(255,255,255,0.92)', marginTop: spacing(0.75) }}>
            Mais forte que {Math.round(score.score)}% das pessoas do seu perfil. É a média dos exercícios abaixo — os
            principais pesam mais.
          </Body>
          {score.provisional ? (
            <Small style={{ color: 'rgba(255,255,255,0.85)', marginTop: spacing(1) }}>
              Provisório: registre um exercício principal (composto) para firmar o número.
            </Small>
          ) : null}
        </GradientCard>
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: spacing(3) }}>
          <Ionicons name="barbell-outline" size={30} color={color} />
          <H3 style={{ marginTop: spacing(1.25), textAlign: 'center' }}>Ainda sem dados de {label.toLowerCase()}</H3>
          <Small style={{ marginTop: 4, textAlign: 'center' }}>
            Registre um exercício deste grupo para ele aparecer no seu radar.
          </Small>
        </Card>
      )}

      {done.length > 0 && (
        <>
          <SectionHeader title="Seus exercícios" accent={color} />
          {done.map(({ ex, entry }) => (
            <Card key={ex.id} onPress={() => router.push(`/exercise/${ex.id}`)} accent={ex.id === weakestId ? color : undefined}>
              <Row>
                <ExerciseImage exerciseId={ex.id} size={44} radius={11} style={{ marginRight: spacing(1.25) }} />
                <View style={{ flex: 1 }}>
                  <H3 numberOfLines={1}>{ex.name_pt}</H3>
                  <Small numberOfLines={1}>
                    {LEVEL_LABELS_PT[entry.level]}
                    {ex.id === weakestId ? ' · mais atrás no grupo' : ''}
                  </Small>
                </View>
                <Display style={{ fontSize: 28, lineHeight: 30, color: colors.primaryBright }}>P{Math.round(entry.percentile)}</Display>
              </Row>
              <View style={{ marginTop: spacing(1) }}>
                <ProgressBar value={entry.percentile} gradient={groupGradient[group]} height={7} />
              </View>
            </Card>
          ))}
        </>
      )}

      {todo.length > 0 && (
        <>
          <SectionHeader title={done.length ? 'Outros exercícios' : 'Exercícios do grupo'} accent={color} />
          <Small style={{ marginTop: -spacing(0.5), marginBottom: spacing(1.25) }}>
            Toque para ver os padrões de força para o seu perfil.
          </Small>
          {todo.map((ex) => (
            <Pressable
              key={ex.id}
              onPress={() => router.push(`/exercise/${ex.id}`)}
              style={({ pressed }) => [styles_row, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
            >
              <ExerciseImage exerciseId={ex.id} size={40} radius={10} style={{ marginRight: spacing(1.25) }} />
              <View style={{ flex: 1 }}>
                <Body style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{ex.name_pt}</Body>
                <Small numberOfLines={1}>{ex.equipment}{ex.metric === 'reps' ? ' · repetições' : ''}</Small>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ))}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------- perna: subgrupos */
function SubgroupView({ group }) {
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
    <>
      {weakestSub && sub[weakestSub] && (
        <GradientCard gradient={groupGradient[group]} glow={color}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Label color="rgba(255,255,255,0.85)">Subgrupo mais atrás</Label>
            <Ionicons name="locate" size={18} color="#fff" />
          </Row>
          <Row style={{ alignItems: 'baseline', marginTop: spacing(0.5) }}>
            <Display style={{ color: '#fff', fontSize: 38, textTransform: 'uppercase' }}>{SUBGROUP_LABELS_PT[weakestSub]}</Display>
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
                <Display style={{ fontSize: 32, lineHeight: 34, color: colors.text }}>P{Math.round(sc.score)}</Display>
              ) : (
                <Label style={{ fontSize: 11 }}>Sem dados</Label>
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
    </>
  );
}

const styles_back = {
  width: 44, height: 44, borderRadius: radius.md,
  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorderStrong,
  alignItems: 'center', justifyContent: 'center',
};

const styles_row = {
  flexDirection: 'row', alignItems: 'center', marginBottom: spacing(1),
  paddingHorizontal: spacing(1.25), paddingVertical: spacing(1), borderRadius: radius.md,
  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder,
};
