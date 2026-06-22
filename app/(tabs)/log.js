import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, makeEntry } from '../../src/state/AppContext';
import { Screen, H1, H2, H3, Body, Small, Card, Button, Row } from '../../src/components/ui';
import { colors, spacing, radius, font, groupColor } from '../../src/theme';
import {
  EXERCISES,
  MUSCLE_GROUPS,
  GROUP_LABELS_PT,
  getExercise,
} from '../../src/data/exercises';
import { LEVEL_LABELS_PT, LEVELS } from '../../src/data/levels';

const input = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radius.sm,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  paddingHorizontal: spacing(1),
  paddingVertical: spacing(1),
  fontSize: font.body,
  textAlign: 'center',
};

const confLabel = { high: 'alta', medium: 'média', low: 'baixa' };
const confColor = { high: colors.good, medium: colors.warn, low: colors.bad };

export default function LogScreen() {
  const router = useRouter();
  const { profile, radar, addWorkout } = useApp();

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({}); // { exId: { weight, reps } }
  const [feedback, setFeedback] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byGroup = {};
    for (const g of MUSCLE_GROUPS) byGroup[g] = [];
    for (const ex of EXERCISES) {
      if (q && !ex.name_pt.toLowerCase().includes(q) && !ex.name_en.toLowerCase().includes(q))
        continue;
      byGroup[ex.muscle_group].push(ex);
    }
    return byGroup;
  }, [query]);

  const draftIds = Object.keys(draft);

  const toggle = (exId) =>
    setDraft((prev) => {
      const next = { ...prev };
      if (next[exId]) delete next[exId];
      else next[exId] = { weight: '', reps: '' };
      return next;
    });

  const setVal = (exId, key, v) =>
    setDraft((prev) => ({ ...prev, [exId]: { ...prev[exId], [key]: v } }));

  const validInputs = useMemo(() => {
    const out = [];
    for (const exId of draftIds) {
      const ex = getExercise(exId);
      const { weight, reps } = draft[exId];
      const ok = ex.metric === 'reps' ? Number(reps) > 0 : Number(weight) > 0 && Number(reps) > 0;
      if (ok) out.push({ exercise_id: exId, weight, reps });
    }
    return out;
  }, [draft, draftIds]);

  const handleSave = async () => {
    if (!profile || validInputs.length === 0) return;

    // Captura estado anterior para detectar PRs / subida de nível.
    const prevLatest = radar ? radar.latest : {};
    const fb = validInputs.map((inp) => {
      const entry = makeEntry(profile, inp);
      const ex = getExercise(inp.exercise_id);
      const prev = prevLatest[inp.exercise_id];
      const prevPct = prev ? prev.percentile : null;
      const prevLevelIdx = prev ? LEVELS.indexOf(prev.level) : -1;
      const newLevelIdx = LEVELS.indexOf(entry.level);
      return {
        ex,
        entry,
        prevPct,
        isPR: prevPct == null || entry.percentile > prevPct,
        leveledUp: newLevelIdx > prevLevelIdx && prevLevelIdx >= 0,
      };
    });

    await addWorkout(validInputs);
    setFeedback(fb);
    setDraft({});
    setQuery('');
  };

  // Tela de feedback pós-registro (§8.4).
  if (feedback) {
    return (
      <Screen>
        <H1>Treino salvo 🎉</H1>
        <Body dim style={{ marginTop: spacing(0.5), marginBottom: spacing(2) }}>
          {feedback.length} exercício{feedback.length > 1 ? 's' : ''} registrado
          {feedback.length > 1 ? 's' : ''}.
        </Body>

        {feedback.map((f, i) => (
          <Card key={i} color={groupColor[f.ex.muscle_group]}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H3 style={{ flex: 1 }}>{f.ex.name_pt}</H3>
              <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '900' }}>
                P{Math.round(f.entry.percentile)}
              </Text>
            </Row>
            <Small style={{ marginTop: 2 }}>
              {LEVEL_LABELS_PT[f.entry.level]} ·{' '}
              {f.ex.metric === 'reps'
                ? `${f.entry.est_1rm} reps`
                : `1RM est. ${f.entry.est_1rm} kg`}{' '}
              · confiança{' '}
              <Text style={{ color: confColor[f.entry.confidence] }}>
                {confLabel[f.entry.confidence]}
              </Text>
            </Small>
            {f.leveledUp && (
              <Body style={{ color: colors.good, marginTop: spacing(0.5), fontWeight: '700' }}>
                ⬆ Subiu para {LEVEL_LABELS_PT[f.entry.level]}!
              </Body>
            )}
            {!f.leveledUp && f.isPR && f.prevPct != null && (
              <Body style={{ color: colors.good, marginTop: spacing(0.5) }}>
                🔥 Novo recorde: P{Math.round(f.prevPct)} → P{Math.round(f.entry.percentile)}
              </Body>
            )}
          </Card>
        ))}

        <Row style={{ marginTop: spacing(1) }}>
          <Button
            title="Registrar mais"
            variant="ghost"
            onPress={() => setFeedback(null)}
            style={{ flex: 1, marginRight: spacing(1) }}
          />
          <Button
            title="Ver radar"
            onPress={() => {
              setFeedback(null);
              router.push('/(tabs)');
            }}
            style={{ flex: 1 }}
          />
        </Row>
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>Treinei hoje</H1>
      <Body dim style={{ marginTop: spacing(0.5), marginBottom: spacing(1.5) }}>
        Escolha o que você fez e informe peso × reps.
      </Body>

      <TextInput
        style={[input, { textAlign: 'left', marginBottom: spacing(1.5) }]}
        placeholder="Buscar exercício…"
        placeholderTextColor={colors.textFaint}
        value={query}
        onChangeText={setQuery}
      />

      {draftIds.length > 0 && (
        <Body style={{ color: colors.primary, marginBottom: spacing(1) }}>
          {validInputs.length}/{draftIds.length} prontos para salvar
        </Body>
      )}

      {MUSCLE_GROUPS.map((g) =>
        filtered[g].length ? (
          <View key={g} style={{ marginBottom: spacing(1) }}>
            <H3 style={{ color: groupColor[g], marginBottom: spacing(0.5) }}>
              {GROUP_LABELS_PT[g]}
            </H3>
            {filtered[g].map((ex) => {
              const selected = !!draft[ex.id];
              const repsOnly = ex.metric === 'reps';
              return (
                <View key={ex.id}>
                  <Pressable
                    onPress={() => toggle(ex.id)}
                    style={[styles.exRow, selected && styles.exRowActive]}
                  >
                    <View style={{ flex: 1 }}>
                      <Body>{ex.name_pt}</Body>
                      <Small>
                        {ex.equipment}
                        {ex.per_dumbbell ? ' · por halter' : ''}
                        {repsOnly ? ' · reps' : ''}
                      </Small>
                    </View>
                    <Text style={{ color: selected ? colors.primary : colors.textFaint, fontSize: 22 }}>
                      {selected ? '−' : '+'}
                    </Text>
                  </Pressable>

                  {selected && (
                    <Row style={{ marginBottom: spacing(1), paddingHorizontal: spacing(1) }}>
                      {!repsOnly && (
                        <View style={{ flex: 1, marginRight: spacing(1) }}>
                          <Small style={{ marginBottom: 2 }}>Peso (kg)</Small>
                          <TextInput
                            style={input}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textFaint}
                            value={draft[ex.id].weight}
                            onChangeText={(t) => setVal(ex.id, 'weight', t)}
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Small style={{ marginBottom: 2 }}>{repsOnly ? 'Reps máx.' : 'Reps'}</Small>
                        <TextInput
                          style={input}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={colors.textFaint}
                          value={draft[ex.id].reps}
                          onChangeText={(t) => setVal(ex.id, 'reps', t)}
                        />
                      </View>
                    </Row>
                  )}
                </View>
              );
            })}
          </View>
        ) : null
      )}

      <Button
        title={validInputs.length ? `Salvar treino (${validInputs.length})` : 'Salvar treino'}
        onPress={handleSave}
        disabled={validInputs.length === 0}
        style={{ marginTop: spacing(1) }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    marginBottom: spacing(0.75),
  },
  exRowActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
});
