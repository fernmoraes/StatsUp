import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp, makeEntry } from '../../src/state/AppContext';
import {
  Screen, Display, H1, H2, H3, Body, Small, Tiny, Label,
  Card, GradientCard, Button, Row, Badge, ProgressBar, SectionHeader,
} from '../../src/components/ui';
import {
  colors, spacing, radius, font, fonts, groupColor, groupGradient, gradients, hexA,
} from '../../src/theme';
import { EXERCISES, MUSCLE_GROUPS, GROUP_LABELS_PT, getExercise } from '../../src/data/exercises';
import { LEVEL_LABELS_PT, LEVELS } from '../../src/data/levels';

const input = {
  backgroundColor: colors.glass,
  borderRadius: radius.sm,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  color: colors.text,
  paddingHorizontal: spacing(1),
  paddingVertical: spacing(1.25),
  fontSize: font.body,
  fontFamily: fonts.bold,
  textAlign: 'center',
};

const confLabel = { high: 'ALTA', medium: 'MÉDIA', low: 'BAIXA' };
const confColor = { high: colors.good, medium: colors.warn, low: colors.bad };

export default function LogScreen() {
  const router = useRouter();
  const { profile, radar, addWorkout } = useApp();

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({});
  const [feedback, setFeedback] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byGroup = {};
    for (const g of MUSCLE_GROUPS) byGroup[g] = [];
    for (const ex of EXERCISES) {
      if (q && !ex.name_pt.toLowerCase().includes(q) && !ex.name_en.toLowerCase().includes(q)) continue;
      byGroup[ex.muscle_group].push(ex);
    }
    return byGroup;
  }, [query]);

  const draftIds = Object.keys(draft);

  const toggle = (exId) => setDraft((prev) => {
    const next = { ...prev };
    if (next[exId]) delete next[exId];
    else next[exId] = { weight: '', reps: '' };
    return next;
  });
  const setVal = (exId, key, v) => setDraft((prev) => ({ ...prev, [exId]: { ...prev[exId], [key]: v } }));

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
    const prevLatest = radar ? radar.latest : {};
    const fb = validInputs.map((inp) => {
      const entry = makeEntry(profile, inp);
      const ex = getExercise(inp.exercise_id);
      const prev = prevLatest[inp.exercise_id];
      const prevPct = prev ? prev.percentile : null;
      const prevLevelIdx = prev ? LEVELS.indexOf(prev.level) : -1;
      const newLevelIdx = LEVELS.indexOf(entry.level);
      return {
        ex, entry, prevPct,
        isPR: prevPct == null || entry.percentile > prevPct,
        leveledUp: newLevelIdx > prevLevelIdx && prevLevelIdx >= 0,
      };
    });
    await addWorkout(validInputs);
    setFeedback(fb);
    setDraft({});
    setQuery('');
  };

  /* ----------------------------------------------------------- feedback */
  if (feedback) {
    const prs = feedback.filter((f) => f.isPR).length;
    return (
      <Screen>
        <GradientCard gradient={gradients.good} glow={colors.good} style={{ alignItems: 'center', paddingVertical: spacing(3) }}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={34} color={colors.good} />
          </View>
          <H1 style={{ color: '#04241A', marginTop: spacing(1.5) }}>Treino salvo!</H1>
          <Body style={{ color: '#04241A', opacity: 0.85, marginTop: 4 }}>
            {feedback.length} exercício{feedback.length > 1 ? 's' : ''}
            {prs > 0 ? ` · ${prs} recorde${prs > 1 ? 's' : ''} 🔥` : ''}
          </Body>
        </GradientCard>

        <SectionHeader title="Resultados" />
        {feedback.map((f, i) => (
          <Card key={i} accent={groupColor[f.ex.muscle_group]}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: spacing(1) }}>
                <H3 numberOfLines={1}>{f.ex.name_pt}</H3>
                <Small style={{ marginTop: 2 }}>
                  {f.ex.metric === 'reps' ? `${f.entry.est_1rm} reps` : `1RM est. ${f.entry.est_1rm} kg`}
                </Small>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Display style={{ fontSize: 30, color: colors.primaryBright }}>P{Math.round(f.entry.percentile)}</Display>
              </View>
            </Row>

            <View style={{ marginTop: spacing(1.25) }}>
              <ProgressBar value={f.entry.percentile} gradient={groupGradient[f.ex.muscle_group]} height={8} />
            </View>

            <Row style={{ justifyContent: 'space-between', marginTop: spacing(1.25) }}>
              <Badge label={LEVEL_LABELS_PT[f.entry.level]} color={groupColor[f.ex.muscle_group]} />
              <Row>
                <Tiny>CONFIANÇA </Tiny>
                <Tiny style={{ color: confColor[f.entry.confidence] }}>{confLabel[f.entry.confidence]}</Tiny>
              </Row>
            </Row>

            {f.leveledUp && (
              <Row style={{ marginTop: spacing(1.25), backgroundColor: hexA(colors.good, 0.12), padding: spacing(1), borderRadius: radius.sm }}>
                <Ionicons name="trophy" size={16} color={colors.good} />
                <Body style={{ color: colors.good, marginLeft: 8, fontFamily: fonts.semibold }}>
                  Subiu para {LEVEL_LABELS_PT[f.entry.level]}!
                </Body>
              </Row>
            )}
            {!f.leveledUp && f.isPR && f.prevPct != null && (
              <Row style={{ marginTop: spacing(1.25), backgroundColor: hexA(colors.primary, 0.12), padding: spacing(1), borderRadius: radius.sm }}>
                <Ionicons name="flame" size={16} color={colors.warn} />
                <Body style={{ color: colors.text, marginLeft: 8, fontFamily: fonts.semibold }}>
                  Novo recorde: P{Math.round(f.prevPct)} → P{Math.round(f.entry.percentile)}
                </Body>
              </Row>
            )}
          </Card>
        ))}

        <Row style={{ marginTop: spacing(1) }}>
          <Button title="Registrar mais" variant="ghost" onPress={() => setFeedback(null)} style={{ flex: 1, marginRight: spacing(1) }} />
          <Button title="Ver radar" icon={<Ionicons name="pulse" size={16} color="#fff" />} onPress={() => { setFeedback(null); router.push('/(tabs)'); }} style={{ flex: 1.3 }} />
        </Row>
      </Screen>
    );
  }

  /* ------------------------------------------------------------- picker */
  return (
    <Screen>
      <Label>Loop diário</Label>
      <H1 style={{ marginTop: 4 }}>Treinei hoje</H1>
      <Body style={{ color: colors.textDim, marginTop: spacing(0.75), marginBottom: spacing(1.5) }}>
        Escolha o que você fez e informe peso × reps.
      </Body>

      <Row style={[input, { textAlign: 'left', marginBottom: spacing(1.5), paddingVertical: spacing(1.25) }]}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <TextInput
          style={{ flex: 1, marginLeft: 8, color: colors.text, fontFamily: fonts.medium, fontSize: font.body }}
          placeholder="Buscar exercício…"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
        />
      </Row>

      {draftIds.length > 0 && (
        <Badge label={`${validInputs.length}/${draftIds.length} prontos para salvar`} color={colors.primary} style={{ marginBottom: spacing(1) }} />
      )}

      {MUSCLE_GROUPS.map((g) =>
        filtered[g].length ? (
          <View key={g} style={{ marginBottom: spacing(0.5) }}>
            <SectionHeader title={GROUP_LABELS_PT[g]} accent={groupColor[g]} />
            {filtered[g].map((ex) => {
              const selected = !!draft[ex.id];
              const repsOnly = ex.metric === 'reps';
              return (
                <View key={ex.id}>
                  <Pressable onPress={() => toggle(ex.id)} style={[styles.exRow, selected && styles.exRowActive]}>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontFamily: fonts.semibold }}>{ex.name_pt}</Body>
                      <Tiny style={{ marginTop: 2 }}>
                        {ex.equipment}{ex.per_dumbbell ? ' · halter' : ''}{repsOnly ? ' · reps' : ''}
                      </Tiny>
                    </View>
                    <View style={[styles.addBtn, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      <Ionicons name={selected ? 'checkmark' : 'add'} size={18} color={selected ? '#fff' : colors.textDim} />
                    </View>
                  </Pressable>

                  {selected && (
                    <Row style={{ marginBottom: spacing(1), paddingHorizontal: spacing(0.5) }}>
                      {!repsOnly && (
                        <View style={{ flex: 1, marginRight: spacing(1) }}>
                          <Tiny style={{ marginBottom: 4 }}>PESO (KG)</Tiny>
                          <TextInput style={input} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textFaint} value={draft[ex.id].weight} onChangeText={(t) => setVal(ex.id, 'weight', t)} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Tiny style={{ marginBottom: 4 }}>{repsOnly ? 'REPS MÁX.' : 'REPS'}</Tiny>
                        <TextInput style={input} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textFaint} value={draft[ex.id].reps} onChangeText={(t) => setVal(ex.id, 'reps', t)} />
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
        title={validInputs.length ? `Salvar treino · ${validInputs.length}` : 'Salvar treino'}
        icon={<Ionicons name="save" size={18} color="#fff" />}
        onPress={handleSave}
        disabled={validInputs.length === 0}
        style={{ marginTop: spacing(1.5) }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  exRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.glass, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing(1.75), paddingVertical: spacing(1.5), marginBottom: spacing(1),
  },
  exRowActive: { borderColor: colors.primary, backgroundColor: hexA(colors.primary, 0.1) },
  addBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
});
