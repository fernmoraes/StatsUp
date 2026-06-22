import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, makeEntry, todayISO } from '../src/state/AppContext';
import { Screen, H1, H2, H3, Body, Small, Button, Card, Row } from '../src/components/ui';
import RadarChart from '../src/components/RadarChart';
import { colors, spacing, radius, font, groupColor } from '../src/theme';
import { GOALS } from '../src/data/goals';
import {
  ONBOARDING_ANCHORS,
  getExercise,
  GROUP_LABELS_PT,
} from '../src/data/exercises';
import { buildRadarState } from '../src/engine/selectors';

const inputStyle = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radius.sm,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  paddingHorizontal: spacing(1.5),
  paddingVertical: spacing(1.25),
  fontSize: font.body,
};

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: spacing(1.5) }}>
      <Small style={{ marginBottom: spacing(0.5), color: colors.textDim }}>{label}</Small>
      {children}
    </View>
  );
}

function SexToggle({ value, onChange }) {
  return (
    <Row>
      {[
        ['male', 'Masculino'],
        ['female', 'Feminino'],
      ].map(([v, label]) => (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          style={[
            styles.seg,
            value === v && { backgroundColor: colors.primary + '33', borderColor: colors.primary },
          ]}
        >
          <Text style={[styles.segText, value === v && { color: colors.text }]}>{label}</Text>
        </Pressable>
      ))}
    </Row>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState(0);

  // Passo 1 — básicos
  const [sex, setSex] = useState('male');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Passo 2 — objetivo
  const [goal, setGoal] = useState('hypertrophy');

  // Passo 3 — âncoras: { group: { exerciseId, weight, reps, skipped } }
  const [anchors, setAnchors] = useState(() => {
    const o = {};
    for (const a of ONBOARDING_ANCHORS) {
      o[a.group] = { exerciseId: a.exerciseId, weight: '', reps: '', skipped: false };
    }
    return o;
  });

  const basicsValid =
    height && weight && year && Number(year) > 1900 && Number(year) < 2020;

  const profileDraft = useMemo(() => {
    const d = String(day || 1).padStart(2, '0');
    const m = String(month || 1).padStart(2, '0');
    return {
      sex,
      birth_date: `${year || 2000}-${m}-${d}`,
      height_cm: Number(height) || 0,
      bodyweight_kg: Number(weight) || 0,
      goal,
    };
  }, [sex, day, month, year, height, weight, goal]);

  const anchorInputs = useMemo(() => {
    const out = [];
    for (const g of Object.keys(anchors)) {
      const a = anchors[g];
      if (a.skipped) continue;
      const ex = getExercise(a.exerciseId);
      const hasData =
        ex.metric === 'reps' ? Number(a.reps) > 0 : Number(a.weight) > 0 && Number(a.reps) > 0;
      if (hasData) out.push({ exercise_id: a.exerciseId, weight: a.weight, reps: a.reps });
    }
    return out;
  }, [anchors]);

  // Radar prévia (computado localmente para o reveal).
  const previewRadar = useMemo(() => {
    const tempProfile = { id: 'me', age_compare_mode: 'absolute', ...profileDraft };
    const entries = anchorInputs.map((i) => makeEntry(tempProfile, i)).filter(Boolean);
    const logs = entries.length
      ? [{ id: 'tmp', date: todayISO(), entries }]
      : [];
    return buildRadarState(tempProfile, logs);
  }, [profileDraft, anchorInputs]);

  const setAnchor = (group, patch) =>
    setAnchors((prev) => ({ ...prev, [group]: { ...prev[group], ...patch } }));

  const handleGenerate = async () => {
    await completeOnboarding(profileDraft, anchorInputs);
    setStep(3);
  };

  return (
    <Screen>
      {/* Cabeçalho de progresso */}
      {step < 3 && (
        <Row style={{ marginBottom: spacing(2), marginTop: spacing(1) }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.progress,
                { backgroundColor: i <= step ? colors.primary : colors.border },
              ]}
            />
          ))}
        </Row>
      )}

      {step === 0 && (
        <View>
          <H1>Bem-vindo ao{'\n'}StatsUp</H1>
          <Body dim style={{ marginTop: spacing(1), marginBottom: spacing(2) }}>
            Vamos transformar sua força em um radar. Comece com seus dados.
          </Body>

          <Field label="Sexo (base de comparação dos padrões)">
            <SexToggle value={sex} onChange={setSex} />
          </Field>

          <Field label="Data de nascimento">
            <Row>
              <TextInput
                style={[inputStyle, { flex: 1, marginRight: spacing(1) }]}
                placeholder="Dia"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                value={day}
                onChangeText={setDay}
                maxLength={2}
              />
              <TextInput
                style={[inputStyle, { flex: 1, marginRight: spacing(1) }]}
                placeholder="Mês"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                value={month}
                onChangeText={setMonth}
                maxLength={2}
              />
              <TextInput
                style={[inputStyle, { flex: 1.4 }]}
                placeholder="Ano"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                value={year}
                onChangeText={setYear}
                maxLength={4}
              />
            </Row>
          </Field>

          <Row>
            <Field label="Altura (cm)">
              <TextInput
                style={[inputStyle, { width: 140 }]}
                placeholder="175"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                value={height}
                onChangeText={setHeight}
                maxLength={3}
              />
            </Field>
            <View style={{ width: spacing(2) }} />
            <Field label="Peso (kg)">
              <TextInput
                style={[inputStyle, { width: 140 }]}
                placeholder="80"
                placeholderTextColor={colors.textFaint}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                maxLength={5}
              />
            </Field>
          </Row>

          <Button
            title="Continuar"
            onPress={() => setStep(1)}
            disabled={!basicsValid}
            style={{ marginTop: spacing(2) }}
          />
        </View>
      )}

      {step === 1 && (
        <View>
          <H1>Qual seu objetivo?</H1>
          <Body dim style={{ marginTop: spacing(1), marginBottom: spacing(2) }}>
            Isso ajusta as recomendações e metas — nunca o tamanho do radar.
          </Body>

          {GOALS.map((g) => (
            <Pressable key={g.id} onPress={() => setGoal(g.id)}>
              <Card
                style={
                  goal === g.id
                    ? { borderColor: colors.primary, backgroundColor: colors.surfaceAlt }
                    : null
                }
              >
                <Row>
                  <Text style={{ fontSize: 26, marginRight: spacing(1.5) }}>{g.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <H3>{g.label}</H3>
                    <Small style={{ marginTop: 2 }}>{g.blurb}</Small>
                  </View>
                </Row>
              </Card>
            </Pressable>
          ))}

          <Row style={{ marginTop: spacing(1) }}>
            <Button title="Voltar" variant="ghost" onPress={() => setStep(0)} style={{ flex: 1, marginRight: spacing(1) }} />
            <Button title="Continuar" onPress={() => setStep(2)} style={{ flex: 1 }} />
          </Row>
        </View>
      )}

      {step === 2 && (
        <View>
          <H1>Seus 4 exercícios-âncora</H1>
          <Body dim style={{ marginTop: spacing(1), marginBottom: spacing(2) }}>
            Um por grupo. Informe peso × reps (ou só reps). Pode pular o que não faz.
          </Body>

          {ONBOARDING_ANCHORS.map((a) => {
            const state = anchors[a.group];
            const ex = getExercise(state.exerciseId);
            const alt = a.altExerciseId ? getExercise(a.altExerciseId) : null;
            const repsOnly = ex.metric === 'reps';
            return (
              <Card key={a.group} color={groupColor[a.group]}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <H3 style={{ color: groupColor[a.group] }}>{GROUP_LABELS_PT[a.group]}</H3>
                  <Pressable onPress={() => setAnchor(a.group, { skipped: !state.skipped })}>
                    <Small style={{ color: state.skipped ? colors.warn : colors.textFaint }}>
                      {state.skipped ? 'pulado · reativar' : 'não faço esse'}
                    </Small>
                  </Pressable>
                </Row>

                {alt && (
                  <Row style={{ marginTop: spacing(1) }}>
                    {[a.exerciseId, a.altExerciseId].map((eid) => {
                      const e = getExercise(eid);
                      const active = state.exerciseId === eid;
                      return (
                        <Pressable
                          key={eid}
                          onPress={() => setAnchor(a.group, { exerciseId: eid })}
                          style={[styles.altChip, active && styles.altChipActive]}
                        >
                          <Text style={[styles.altChipText, active && { color: colors.text }]}>
                            {e.name_pt}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </Row>
                )}

                {!alt && (
                  <Body style={{ marginTop: spacing(0.5) }}>{ex.name_pt}</Body>
                )}

                {!state.skipped && (
                  <Row style={{ marginTop: spacing(1.5) }}>
                    {!repsOnly && (
                      <View style={{ flex: 1, marginRight: spacing(1) }}>
                        <Small style={{ marginBottom: 4 }}>
                          Peso (kg){ex.per_dumbbell ? ' · por halter' : ''}
                        </Small>
                        <TextInput
                          style={inputStyle}
                          placeholder="0"
                          placeholderTextColor={colors.textFaint}
                          keyboardType="numeric"
                          value={state.weight}
                          onChangeText={(t) => setAnchor(a.group, { weight: t })}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Small style={{ marginBottom: 4 }}>
                        {repsOnly ? 'Repetições máximas' : 'Reps'}
                      </Small>
                      <TextInput
                        style={inputStyle}
                        placeholder="0"
                        placeholderTextColor={colors.textFaint}
                        keyboardType="number-pad"
                        value={state.reps}
                        onChangeText={(t) => setAnchor(a.group, { reps: t })}
                      />
                    </View>
                  </Row>
                )}
              </Card>
            );
          })}

          <Row style={{ marginTop: spacing(1) }}>
            <Button title="Voltar" variant="ghost" onPress={() => setStep(1)} style={{ flex: 1, marginRight: spacing(1) }} />
            <Button
              title={anchorInputs.length ? 'Gerar meu radar' : 'Pular tudo'}
              onPress={handleGenerate}
              style={{ flex: 1 }}
            />
          </Row>
        </View>
      )}

      {step === 3 && (
        <Reveal radar={previewRadar} onDone={() => router.replace('/(tabs)')} />
      )}
    </Screen>
  );
}

// "Momento uau" — radar cresce do centro até os valores (conceito §6.5).
function Reveal({ radar, onDone }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setT(value));
    Animated.timing(anim, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [anim]);

  const scaled = useMemo(() => {
    const out = {};
    for (const g of ['chest', 'back', 'arm', 'leg']) {
      const s = radar.scores[g];
      out[g] = s ? { ...s, score: s.score * t } : null;
    }
    return out;
  }, [radar, t]);

  const overall = radar.overall;
  const weakest = radar.weakest;

  return (
    <View style={{ alignItems: 'center', paddingTop: spacing(2) }}>
      <H2 style={{ marginBottom: spacing(1) }}>Seu radar de força</H2>
      <RadarChart scores={scaled} size={320} />

      <Card style={{ width: '100%', marginTop: spacing(2), alignItems: 'center' }}>
        <Small>Score geral</Small>
        <Text style={{ color: colors.primary, fontSize: 44, fontWeight: '900' }}>
          {overall != null ? Math.round(overall) : '—'}
        </Text>
        {weakest && (
          <Body dim style={{ textAlign: 'center' }}>
            Maior potencial de ganho:{' '}
            <Text style={{ color: groupColor[weakest], fontWeight: '700' }}>
              {GROUP_LABELS_PT[weakest]}
            </Text>
          </Body>
        )}
      </Card>

      <Button title="Começar a treinar" onPress={onDone} style={{ width: '100%', marginTop: spacing(1) }} />
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 3 },
  seg: {
    flex: 1,
    paddingVertical: spacing(1.25),
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    marginRight: spacing(1),
  },
  segText: { color: colors.textDim, fontWeight: '600' },
  altChip: {
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.5),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing(1),
  },
  altChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  altChipText: { color: colors.textDim, fontSize: font.small, fontWeight: '600' },
});
