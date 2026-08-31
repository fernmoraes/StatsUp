import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/state/AppContext';
import {
  Screen, Display, H1, H2, H3, Body, Small, Tiny, Label,
  Card, GradientCard, Row, Badge, Button, ProgressBar, SectionHeader,
} from '../../src/components/ui';
import ExerciseImage from '../../src/components/ExerciseImage';
import {
  colors, spacing, groupColor, groupGradient, fonts, hexA, radius,
} from '../../src/theme';
import {
  getExercise, GROUP_LABELS_PT, SUBGROUP_LABELS_PT,
} from '../../src/data/exercises';
import { levelValues, nextGoal } from '../../src/engine/calc';
import {
  LEVELS, LEVEL_PCT, LEVEL_LABELS_PT, ageFromBirthDate,
} from '../../src/data/levels';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { profile, radar } = useApp();
  const ex = getExercise(id);
  const age = profile ? ageFromBirthDate(profile.birth_date) : null;

  // Hook antes de qualquer return condicional (Rules of Hooks).
  const lv = useMemo(
    () =>
      ex && profile
        ? levelValues(ex, profile.sex, profile.bodyweight_kg, {
            ageMode: profile.age_compare_mode,
            age,
          })
        : null,
    [ex, profile, age]
  );

  if (!ex || !profile) return null;

  const color = groupColor[ex.muscle_group];
  const unit = ex.metric === 'reps' ? 'reps' : 'kg';
  const opts = { ageMode: profile.age_compare_mode, age };
  const latest = radar && radar.latest ? radar.latest[ex.id] : null;
  const goal = latest
    ? nextGoal({ exercise: ex, sex: profile.sex, bw: profile.bodyweight_kg, est1rm: latest.est_1rm, ...opts })
    : null;
  const fmt = (v) => (ex.metric === 'reps' ? Math.round(v) : Math.round(v * 2) / 2);

  return (
    <Screen>
      <Row style={{ marginBottom: spacing(1.5) }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles_back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      </Row>

      {/* Herói: GIF demonstrativo grande */}
      <GradientCard gradient={groupGradient[ex.muscle_group]} glow={color} style={{ alignItems: 'center', paddingVertical: spacing(2) }}>
        <ExerciseImage exerciseId={ex.id} size={210} radius={22} light />
        <H1 style={{ color: '#fff', marginTop: spacing(1.5), textAlign: 'center' }}>{ex.name_pt}</H1>
        <Small style={{ color: 'rgba(255,255,255,0.85)' }}>{ex.name_en}</Small>
        <Row style={{ marginTop: spacing(1.25), flexWrap: 'wrap', justifyContent: 'center' }}>
          <Badge label={GROUP_LABELS_PT[ex.muscle_group]} color="#fff" />
          {ex.sub_group && <View style={{ width: 6 }} />}
          {ex.sub_group && <Badge label={SUBGROUP_LABELS_PT[ex.sub_group]} color="#fff" />}
        </Row>
      </GradientCard>

      <Row style={{ flexWrap: 'wrap', marginBottom: spacing(0.5) }}>
        <InfoChip icon="construct-outline" label={ex.equipment} />
        {ex.per_dumbbell && <InfoChip icon="swap-horizontal" label="por halter" />}
        <InfoChip icon="repeat-outline" label={ex.metric === 'reps' ? 'repetições' : 'carga'} />
        {ex.weight_in_score >= 3 && <InfoChip icon="star" label="composto âncora" />}
      </Row>

      {/* Sua posição */}
      {latest ? (
        <Card strong>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Label>Sua posição</Label>
              <Row style={{ alignItems: 'baseline', marginTop: 2 }}>
                <Display style={{ fontSize: 36, color: colors.primaryBright }}>P{Math.round(latest.percentile)}</Display>
                <Badge label={LEVEL_LABELS_PT[latest.level]} color={color} style={{ marginLeft: spacing(1) }} />
              </Row>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Tiny>{ex.metric === 'reps' ? 'MELHOR' : '1RM EST.'}</Tiny>
              <H2>{latest.est_1rm} {unit}</H2>
            </View>
          </Row>
          <View style={{ marginTop: spacing(1.25) }}>
            <ProgressBar value={latest.percentile} gradient={groupGradient[ex.muscle_group]} height={9} />
          </View>
          {goal && (
            <Row style={{ marginTop: spacing(1.25), alignItems: 'center' }}>
              <Ionicons name="flag" size={15} color={color} style={{ marginRight: 8 }} />
              <Body style={{ flex: 1, fontSize: 14 }}>
                Faltam{' '}
                <Body style={{ fontFamily: fonts.extra, fontSize: 14 }}>{fmt(goal.delta)} {unit}</Body>{' '}
                para {LEVEL_LABELS_PT[goal.next_level]}.
              </Body>
            </Row>
          )}
        </Card>
      ) : (
        <Card>
          <Row style={{ alignItems: 'center' }}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textDim} style={{ marginRight: 8 }} />
            <Small style={{ flex: 1 }}>Você ainda não registrou este exercício. Faça um treino para ver sua posição.</Small>
          </Row>
        </Card>
      )}

      {/* Tabela de padrões */}
      <SectionHeader title="Padrões para o seu perfil" accent={color} />
      <Card>
        <Small style={{ marginBottom: spacing(1) }}>
          {profile.sex === 'male' ? 'Masculino' : 'Feminino'} · {profile.bodyweight_kg} kg
          {profile.age_compare_mode === 'age_adjusted' ? ` · idade ${age}` : ''}
        </Small>
        {lv &&
          LEVELS.map((lvlKey, i) => {
            const isCurrent = latest && latest.level === lvlKey;
            return (
              <Row
                key={lvlKey}
                style={{
                  justifyContent: 'space-between', alignItems: 'center',
                  paddingVertical: spacing(1), paddingHorizontal: spacing(1.25),
                  borderRadius: radius.sm, marginBottom: 4,
                  backgroundColor: isCurrent ? hexA(color, 0.16) : 'transparent',
                  borderWidth: isCurrent ? 1 : 0, borderColor: hexA(color, 0.5),
                }}
              >
                <Row>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isCurrent ? color : colors.textFaint, marginRight: spacing(1.25) }} />
                  <Body style={{ fontFamily: isCurrent ? fonts.bold : fonts.medium }}>{LEVEL_LABELS_PT[lvlKey]}</Body>
                  <Tiny style={{ marginLeft: 6 }}>P{LEVEL_PCT[i]}</Tiny>
                </Row>
                <Body style={{ fontFamily: fonts.extra, color: isCurrent ? color : colors.text }}>
                  {fmt(lv.vals[i])} {unit}
                </Body>
              </Row>
            );
          })}
        {lv && lv.extrapolated && (
          <Tiny style={{ marginTop: spacing(0.5), color: colors.warn }}>
            ⚠ Peso fora da faixa tabelada (50–120 kg) — valores extrapolados.
          </Tiny>
        )}
      </Card>

      <Button title="Registrar este exercício" icon={<Ionicons name="add" size={18} color="#fff" />} onPress={() => router.push('/(tabs)/log')} style={{ marginTop: spacing(0.5) }} />
    </Screen>
  );
}

function InfoChip({ icon, label }) {
  return (
    <Row style={{
      backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
      borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12,
      marginRight: spacing(1), marginBottom: spacing(1),
    }}>
      <Ionicons name={icon} size={13} color={colors.textDim} style={{ marginRight: 5 }} />
      <Tiny style={{ color: colors.textDim }}>{label}</Tiny>
    </Row>
  );
}

const styles_back = {
  width: 42, height: 42, borderRadius: 14,
  backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
  alignItems: 'center', justifyContent: 'center',
};
