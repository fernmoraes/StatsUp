import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/state/AppContext';
import {
  Screen, Display, H1, H3, Body, Small, Tiny, Label,
  Card, GradientCard, Row, SectionHeader,
} from '../../src/components/ui';
import RadarChart from '../../src/components/RadarChart';
import { colors, spacing, groupColor, gradients, fonts, hexA } from '../../src/theme';
import { getExercise } from '../../src/data/exercises';
import { buildRadarState } from '../../src/engine/selectors';

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function computeStreak(dates) {
  const set = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  const todayISO = cursor.toISOString().slice(0, 10);
  const yISO = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (!set.has(todayISO) && !set.has(yISO)) return 0;
  if (!set.has(todayISO)) cursor.setDate(cursor.getDate() - 1);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function StatTile({ icon, value, label, color }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: spacing(2), marginBottom: 0 }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: hexA(color, 0.16), marginBottom: spacing(0.75) }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Display style={{ fontSize: 26 }}>{value}</Display>
      <Tiny style={{ marginTop: 2, textAlign: 'center' }}>{label}</Tiny>
    </Card>
  );
}

export default function History() {
  const { profile, logs, radar } = useApp();

  const dates = useMemo(() => logs.map((l) => l.date), [logs]);
  const distinctDays = useMemo(() => new Set(dates).size, [dates]);
  const streak = useMemo(() => computeStreak(dates), [dates]);

  const pastRadar = useMemo(() => {
    if (!profile || logs.length < 2) return null;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const old = logs.filter((l) => l.date <= cutoff);
    const base = old.length ? old : logs.slice(-1);
    const r = buildRadarState(profile, base);
    return r.overall != null ? r.scores : null;
  }, [profile, logs]);

  return (
    <Screen>
      <Label>Consistência</Label>
      <H1 style={{ marginTop: 4, marginBottom: spacing(1.5) }}>Histórico</H1>

      <Row style={{ gap: spacing(1.5) }}>
        <StatTile icon="flame" value={streak} label="SEQUÊNCIA (DIAS)" color={colors.warn} />
        <StatTile icon="calendar" value={distinctDays} label="DIAS TREINADOS" color={colors.cyan} />
        <StatTile icon="barbell" value={logs.length} label="TREINOS" color={colors.primary} />
      </Row>

      {pastRadar && radar && (
        <>
          <SectionHeader title="Evolução do radar" />
          <GradientCard gradient={gradients.hero} style={{ alignItems: 'center' }}>
            <RadarChart scores={radar.scores} past={pastRadar} size={300} />
            <Row style={{ marginTop: spacing(1), gap: spacing(2) }}>
              <Row><View style={{ width: 16, height: 3, backgroundColor: colors.primary, marginRight: 6, borderRadius: 2 }} /><Tiny>Hoje</Tiny></Row>
              <Row><View style={{ width: 16, height: 0, borderTopWidth: 2, borderColor: colors.textFaint, borderStyle: 'dashed', marginRight: 6 }} /><Tiny>~30 dias atrás</Tiny></Row>
            </Row>
          </GradientCard>
        </>
      )}

      <SectionHeader title="Linha do tempo" />

      {logs.length === 0 && (
        <Card style={{ alignItems: 'center', paddingVertical: spacing(3) }}>
          <Ionicons name="time-outline" size={32} color={colors.textFaint} />
          <Small style={{ marginTop: spacing(1) }}>Nenhum treino registrado ainda.</Small>
        </Card>
      )}

      {logs.map((log) => (
        <Card key={log.id}>
          <Row style={{ justifyContent: 'space-between', marginBottom: spacing(1) }}>
            <Row>
              <Ionicons name="calendar-outline" size={15} color={colors.textDim} style={{ marginRight: 6 }} />
              <H3 style={{ fontSize: 15 }}>{formatDate(log.date)}</H3>
            </Row>
            <Tiny>{log.entries.length} EXERCÍCIOS</Tiny>
          </Row>
          {log.entries.map((e, i) => {
            const ex = getExercise(e.exercise_id);
            if (!ex) return null;
            return (
              <Row key={i} style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
                <Row style={{ flex: 1 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: groupColor[ex.muscle_group], marginRight: spacing(1.25) }} />
                  <Body style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>{ex.name_pt}</Body>
                </Row>
                <Small style={{ marginRight: spacing(1.5), fontFamily: fonts.medium }}>
                  {e.weight_kg ? `${e.weight_kg}kg×${e.reps || '-'}` : `${e.reps} reps`}
                </Small>
                <Text style={{ color: colors.primaryBright, fontFamily: fonts.extra, width: 42, textAlign: 'right' }}>
                  P{Math.round(e.percentile)}
                </Text>
              </Row>
            );
          })}
          {log.note ? <Small style={{ marginTop: spacing(0.75), color: colors.textFaint }}>📝 {log.note}</Small> : null}
        </Card>
      ))}
    </Screen>
  );
}
