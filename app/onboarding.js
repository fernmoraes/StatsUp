import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp, makeEntry, todayISO } from '../src/state/AppContext';
import {
  Screen, Display, H1, H2, H3, Body, Small, Tiny, Label,
  Button, Card, GradientCard, Row, Badge,
} from '../src/components/ui';
import RadarChart from '../src/components/RadarChart';
import ProgressRing from '../src/components/ProgressRing';
import {
  colors, spacing, radius, font, fonts, groupColor, groupGradient, gradients, hexA,
} from '../src/theme';
import { GOALS } from '../src/data/goals';
import { ONBOARDING_ANCHORS, getExercise, GROUP_LABELS_PT } from '../src/data/exercises';
import { buildRadarState } from '../src/engine/selectors';
import { LEVEL_LABELS_PT } from '../src/data/levels';

const inputStyle = {
  backgroundColor: colors.glass,
  borderRadius: radius.sm,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  color: colors.text,
  paddingHorizontal: spacing(1.75),
  paddingVertical: spacing(1.5),
  fontSize: font.body,
  fontFamily: fonts.semibold,
};

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: spacing(1.75) }}>
      <Label style={{ marginBottom: spacing(0.75) }}>{label}</Label>
      {children}
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState(0);
  const [sex, setSex] = useState('male');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('hypertrophy');

  const [anchors, setAnchors] = useState(() => {
    const o = {};
    for (const a of ONBOARDING_ANCHORS) o[a.group] = { exerciseId: a.exerciseId, weight: '', reps: '', skipped: false };
    return o;
  });

  const basicsValid = height && weight && year && Number(year) > 1900 && Number(year) < 2020;

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
      const ok = ex.metric === 'reps' ? Number(a.reps) > 0 : Number(a.weight) > 0 && Number(a.reps) > 0;
      if (ok) out.push({ exercise_id: a.exerciseId, weight: a.weight, reps: a.reps });
    }
    return out;
  }, [anchors]);

  const previewRadar = useMemo(() => {
    const tempProfile = { id: 'me', age_compare_mode: 'absolute', ...profileDraft };
    const entries = anchorInputs.map((i) => makeEntry(tempProfile, i)).filter(Boolean);
    const logs = entries.length ? [{ id: 'tmp', date: todayISO(), entries }] : [];
    return buildRadarState(tempProfile, logs);
  }, [profileDraft, anchorInputs]);

  const setAnchor = (group, patch) => setAnchors((p) => ({ ...p, [group]: { ...p[group], ...patch } }));

  const handleGenerate = async () => {
    await completeOnboarding(profileDraft, anchorInputs);
    setStep(3);
  };

  return (
    <Screen>
      {step < 3 && (
        <Row style={{ marginBottom: spacing(2.5), marginTop: spacing(0.5) }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.progressTrack}>
              {i <= step && (
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 3 }} />
              )}
            </View>
          ))}
        </Row>
      )}

      {/* ---------------------------------------------------------- passo 0 */}
      {step === 0 && (
        <View>
          <LinearGradient colors={gradients.brand} style={styles.logo}>
            <Ionicons name="stats-chart" size={26} color="#fff" />
          </LinearGradient>
          <Display style={{ marginTop: spacing(2) }}>StatsUp</Display>
          <Body style={{ color: colors.textDim, marginTop: spacing(1), marginBottom: spacing(2.5) }}>
            Transforme sua força em um radar de percentil. Comece com seus dados.
          </Body>

          <Field label="Sexo · base de comparação dos padrões">
            <Row>
              {[['male', 'Masculino', 'male'], ['female', 'Feminino', 'female']].map(([v, label, icn]) => {
                const active = sex === v;
                return (
                  <Pressable key={v} onPress={() => setSex(v)} style={[styles.seg, active && styles.segActive]}>
                    <Ionicons name={icn} size={16} color={active ? colors.text : colors.textFaint} style={{ marginRight: 6 }} />
                    <Text style={[styles.segText, active && { color: colors.text, fontFamily: fonts.bold }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </Row>
          </Field>

          <Field label="Data de nascimento">
            <Row>
              <TextInput style={[inputStyle, { flex: 1, marginRight: spacing(1), textAlign: 'center' }]} placeholder="Dia" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={day} onChangeText={setDay} maxLength={2} />
              <TextInput style={[inputStyle, { flex: 1, marginRight: spacing(1), textAlign: 'center' }]} placeholder="Mês" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={month} onChangeText={setMonth} maxLength={2} />
              <TextInput style={[inputStyle, { flex: 1.4, textAlign: 'center' }]} placeholder="Ano" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={year} onChangeText={setYear} maxLength={4} />
            </Row>
          </Field>

          <Row>
            <View style={{ flex: 1, marginRight: spacing(1.5) }}>
              <Field label="Altura (cm)">
                <TextInput style={inputStyle} placeholder="175" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={height} onChangeText={setHeight} maxLength={3} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Peso (kg)">
                <TextInput style={inputStyle} placeholder="80" placeholderTextColor={colors.textFaint} keyboardType="numeric" value={weight} onChangeText={setWeight} maxLength={5} />
              </Field>
            </View>
          </Row>

          <Button title="Continuar" icon={<Ionicons name="arrow-forward" size={18} color="#fff" />} onPress={() => setStep(1)} disabled={!basicsValid} style={{ marginTop: spacing(1) }} />
        </View>
      )}

      {/* ---------------------------------------------------------- passo 1 */}
      {step === 1 && (
        <View>
          <Label>Passo 2 de 3</Label>
          <H1 style={{ marginTop: 4 }}>Qual seu objetivo?</H1>
          <Body style={{ color: colors.textDim, marginTop: spacing(1), marginBottom: spacing(2) }}>
            Ajusta recomendações e metas — nunca o tamanho do radar.
          </Body>

          {GOALS.map((g) => {
            const active = goal === g.id;
            return (
              <Pressable key={g.id} onPress={() => setGoal(g.id)}>
                <Card strong={active} style={active ? { borderColor: colors.primary } : null}>
                  <Row>
                    <View style={[styles.goalEmoji, active && { backgroundColor: hexA(colors.primary, 0.18) }]}>
                      <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing(1.5) }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <H3>{g.label}</H3>
                        {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      </Row>
                      <Small style={{ marginTop: 2 }}>{g.blurb}</Small>
                    </View>
                  </Row>
                </Card>
              </Pressable>
            );
          })}

          <Row style={{ marginTop: spacing(1) }}>
            <Button title="Voltar" variant="ghost" onPress={() => setStep(0)} style={{ flex: 1, marginRight: spacing(1) }} />
            <Button title="Continuar" onPress={() => setStep(2)} style={{ flex: 1.5 }} />
          </Row>
        </View>
      )}

      {/* ---------------------------------------------------------- passo 2 */}
      {step === 2 && (
        <View>
          <Label>Passo 3 de 3</Label>
          <H1 style={{ marginTop: 4 }}>Exercícios-âncora</H1>
          <Body style={{ color: colors.textDim, marginTop: spacing(1), marginBottom: spacing(2) }}>
            Um por grupo. Peso × reps (ou só reps). Pode pular o que não faz.
          </Body>

          {ONBOARDING_ANCHORS.map((a) => {
            const state = anchors[a.group];
            const ex = getExercise(state.exerciseId);
            const alt = a.altExerciseId ? getExercise(a.altExerciseId) : null;
            const repsOnly = ex.metric === 'reps';
            return (
              <Card key={a.group} accent={groupColor[a.group]} style={state.skipped ? { opacity: 0.6 } : null}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Row>
                    <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: groupColor[a.group], marginRight: spacing(1) }} />
                    <H3 style={{ color: groupColor[a.group] }}>{GROUP_LABELS_PT[a.group]}</H3>
                  </Row>
                  <Pressable onPress={() => setAnchor(a.group, { skipped: !state.skipped })} hitSlop={8}>
                    <Tiny style={{ color: state.skipped ? colors.warn : colors.textFaint }}>
                      {state.skipped ? 'PULADO · REATIVAR' : 'NÃO FAÇO'}
                    </Tiny>
                  </Pressable>
                </Row>

                {alt ? (
                  <Row style={{ marginTop: spacing(1.25) }}>
                    {[a.exerciseId, a.altExerciseId].map((eid) => {
                      const e = getExercise(eid);
                      const active = state.exerciseId === eid;
                      return (
                        <Pressable key={eid} onPress={() => setAnchor(a.group, { exerciseId: eid })} style={[styles.altChip, active && { borderColor: groupColor[a.group], backgroundColor: hexA(groupColor[a.group], 0.16) }]}>
                          <Text style={[styles.altChipText, active && { color: colors.text, fontFamily: fonts.semibold }]}>{e.name_pt}</Text>
                        </Pressable>
                      );
                    })}
                  </Row>
                ) : (
                  <Body style={{ marginTop: spacing(0.75), color: colors.textDim }}>{ex.name_pt}</Body>
                )}

                {!state.skipped && (
                  <Row style={{ marginTop: spacing(1.5) }}>
                    {!repsOnly && (
                      <View style={{ flex: 1, marginRight: spacing(1.5) }}>
                        <Tiny style={{ marginBottom: 5 }}>PESO (KG){ex.per_dumbbell ? ' · HALTER' : ''}</Tiny>
                        <TextInput style={[inputStyle, { textAlign: 'center' }]} placeholder="0" placeholderTextColor={colors.textFaint} keyboardType="numeric" value={state.weight} onChangeText={(t) => setAnchor(a.group, { weight: t })} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Tiny style={{ marginBottom: 5 }}>{repsOnly ? 'REPETIÇÕES MÁX.' : 'REPS'}</Tiny>
                      <TextInput style={[inputStyle, { textAlign: 'center' }]} placeholder="0" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={state.reps} onChangeText={(t) => setAnchor(a.group, { reps: t })} />
                    </View>
                  </Row>
                )}
              </Card>
            );
          })}

          <Row style={{ marginTop: spacing(1) }}>
            <Button title="Voltar" variant="ghost" onPress={() => setStep(1)} style={{ flex: 1, marginRight: spacing(1) }} />
            <Button title={anchorInputs.length ? 'Gerar radar' : 'Pular tudo'} icon={<Ionicons name="sparkles" size={16} color="#fff" />} onPress={handleGenerate} style={{ flex: 1.5 }} />
          </Row>
        </View>
      )}

      {step === 3 && <Reveal radar={previewRadar} onDone={() => router.replace('/(tabs)')} />}
    </Screen>
  );
}

function Reveal({ radar, onDone }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setT(value));
    Animated.timing(anim, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
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
    <View style={{ alignItems: 'center', paddingTop: spacing(1) }}>
      <Badge label="✨ SEU RADAR ESTÁ PRONTO" color={colors.primary} />
      <H1 style={{ marginTop: spacing(1.5), textAlign: 'center' }}>Perfil de força</H1>

      <GradientCard gradient={gradients.hero} style={{ alignItems: 'center', marginTop: spacing(2), width: '100%' }}>
        <RadarChart scores={scaled} size={310} />
      </GradientCard>

      <Card strong style={{ width: '100%', alignItems: 'center', paddingVertical: spacing(2.5) }}>
        <ProgressRing value={(overall || 0) * t} size={140} stroke={13} from={colors.primaryBright} to={colors.violet}>
          <Display style={{ fontSize: 42 }}>{overall != null ? Math.round(overall * t) : '—'}</Display>
          <Tiny style={{ color: colors.textDim, marginTop: -4 }}>SCORE GERAL</Tiny>
        </ProgressRing>
        {weakest && (
          <Body style={{ color: colors.textDim, textAlign: 'center', marginTop: spacing(1.5) }}>
            Maior potencial de ganho:{' '}
            <Body style={{ color: groupColor[weakest], fontFamily: fonts.bold }}>{GROUP_LABELS_PT[weakest]}</Body>
          </Body>
        )}
      </Card>

      <Button title="Começar a treinar" icon={<Ionicons name="rocket" size={18} color="#fff" />} onPress={onDone} style={{ width: '100%', marginTop: spacing(0.5) }} />
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { flex: 1, height: 6, borderRadius: 3, marginHorizontal: 3, backgroundColor: colors.glassStrong, overflow: 'hidden' },
  logo: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  seg: {
    flex: 1, flexDirection: 'row', paddingVertical: spacing(1.5), borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing(1),
  },
  segActive: { borderColor: colors.primary, backgroundColor: hexA(colors.primary, 0.16) },
  segText: { color: colors.textDim, fontFamily: fonts.medium, fontSize: font.body },
  goalEmoji: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: colors.glass,
    alignItems: 'center', justifyContent: 'center',
  },
  altChip: {
    paddingVertical: spacing(0.85), paddingHorizontal: spacing(1.5), borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.glassBorder, marginRight: spacing(1),
  },
  altChipText: { color: colors.textDim, fontSize: font.small, fontFamily: fonts.medium },
});
