import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useApp } from '../../src/state/AppContext';
import { Screen, H1, H3, Body, Small, Card, Row } from '../../src/components/ui';
import RadarChart from '../../src/components/RadarChart';
import { colors, spacing, groupColor } from '../../src/theme';
import { getExercise, GROUP_LABELS_PT } from '../../src/data/exercises';
import { buildRadarState } from '../../src/engine/selectors';
import { LEVEL_LABELS_PT } from '../../src/data/levels';

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Maior sequência de dias consecutivos terminando em hoje/ontem.
function computeStreak(dates) {
  const set = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  // tolera começar ontem
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

export default function History() {
  const { profile, logs, radar } = useApp();

  const dates = useMemo(() => logs.map((l) => l.date), [logs]);
  const distinctDays = useMemo(() => new Set(dates).size, [dates]);
  const streak = useMemo(() => computeStreak(dates), [dates]);

  // Radar de ~30 dias atrás para sobrepor (evolução).
  const pastRadar = useMemo(() => {
    if (!profile || logs.length < 2) return null;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const old = logs.filter((l) => l.date <= cutoff);
    const base = old.length ? old : logs.slice(-1); // fallback: primeiro registro
    const r = buildRadarState(profile, base);
    return r.overall != null ? r.scores : null;
  }, [profile, logs]);

  return (
    <Screen>
      <H1>Histórico</H1>

      <Row style={{ marginTop: spacing(1), marginBottom: spacing(1) }}>
        <Card style={{ flex: 1, marginRight: spacing(1), alignItems: 'center' }}>
          <Text style={{ color: colors.primary, fontSize: 32, fontWeight: '900' }}>🔥{streak}</Text>
          <Small>sequência (dias)</Small>
        </Card>
        <Card style={{ flex: 1, marginRight: spacing(1), alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: '900' }}>{distinctDays}</Text>
          <Small>dias treinados</Small>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: '900' }}>{logs.length}</Text>
          <Small>treinos</Small>
        </Card>
      </Row>

      {pastRadar && radar && (
        <Card>
          <H3 style={{ marginBottom: spacing(1) }}>Evolução do radar</H3>
          <View style={{ alignItems: 'center' }}>
            <RadarChart scores={radar.scores} past={pastRadar} size={300} />
          </View>
          <Small style={{ textAlign: 'center', marginTop: spacing(0.5) }}>
            Linha tracejada = ~30 dias atrás · área cheia = hoje
          </Small>
        </Card>
      )}

      <H3 style={{ marginTop: spacing(1), marginBottom: spacing(1) }}>Linha do tempo</H3>

      {logs.length === 0 && (
        <Card>
          <Body dim>Nenhum treino registrado ainda. Toque em "Treinar".</Body>
        </Card>
      )}

      {logs.map((log) => (
        <Card key={log.id}>
          <Row style={{ justifyContent: 'space-between', marginBottom: spacing(0.5) }}>
            <H3 style={{ fontSize: 15 }}>{formatDate(log.date)}</H3>
            <Small>{log.entries.length} exercícios</Small>
          </Row>
          {log.entries.map((e, i) => {
            const ex = getExercise(e.exercise_id);
            if (!ex) return null;
            return (
              <Row key={i} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
                <Row style={{ flex: 1 }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: groupColor[ex.muscle_group],
                      marginRight: spacing(1),
                    }}
                  />
                  <Body style={{ flex: 1 }}>{ex.name_pt}</Body>
                </Row>
                <Small style={{ marginRight: spacing(1) }}>
                  {e.weight_kg ? `${e.weight_kg}kg×${e.reps || '-'}` : `${e.reps} reps`}
                </Small>
                <Text style={{ color: colors.primary, fontWeight: '700', width: 42, textAlign: 'right' }}>
                  P{Math.round(e.percentile)}
                </Text>
              </Row>
            );
          })}
          {log.note ? <Small style={{ marginTop: spacing(0.5) }}>📝 {log.note}</Small> : null}
        </Card>
      ))}
    </Screen>
  );
}
