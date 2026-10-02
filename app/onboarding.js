import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Easing, ScrollView, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp, makeEntry, todayISO } from '../src/state/AppContext';
import {
  Screen, Display, H1, H2, H3, Body, Small, Tiny, Label,
  Button, Card, GradientCard, Row, Badge, BrandLogo, Input,
} from '../src/components/ui';
import RadarChart from '../src/components/RadarChart';
import ProgressRing from '../src/components/ProgressRing';
import ExerciseImage from '../src/components/ExerciseImage';
import {
  colors, spacing, radius, font, fonts, groupColor, groupGradient, gradients, hexA,
} from '../src/theme';
import { GOALS } from '../src/data/goals';
import { ONBOARDING_ANCHORS, getExercise, GROUP_LABELS_PT, exercisesByGroup, MUSCLE_GROUPS } from '../src/data/exercises';
import { buildRadarState } from '../src/engine/selectors';
import { LEVEL_LABELS_PT } from '../src/data/levels';
import {
  validateBirthDate, validateHeight, validateBodyweight, validateSet, isBlankSet, toNumber,
} from '../src/utils/validation';

function Field({ label, error, children }) {
  return (
    <View style={{ marginBottom: spacing(1.75) }}>
      <Label style={{ marginBottom: spacing(0.75) }}>{label}</Label>
      {children}
      {error ? <Text style={fieldErrorStyle}>{error}</Text> : null}
    </View>
  );
}

const fieldErrorStyle = { color: colors.bad, fontFamily: fonts.medium, fontSize: 13, marginTop: 6 };

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState(0);
  const [anchorIdx, setAnchorIdx] = useState(0);
  const [sex, setSex] = useState('male');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('hypertrophy');

  // Cadeia de campos do passo 1: "Próximo" no teclado leva ao campo seguinte e
  // dia/mês pulam sozinhos quando completos.
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const heightRef = useRef(null);
  const weightRef = useRef(null);
  const repsRef = useRef(null);
  const digits = (t) => t.replace(/[^0-9]/g, '');
  const decimal = (t) => t.replace(',', '.').replace(/[^0-9.]/g, '');

  const [anchors, setAnchors] = useState(() => {
    const o = {};
    for (const a of ONBOARDING_ANCHORS) o[a.group] = { exerciseId: a.exerciseId, weight: '', reps: '', skipped: false };
    return o;
  });

  // Mesmos limites do banco (src/utils/validation). O erro só aparece depois que
  // o campo foi preenchido, para não pintar de vermelho antes de digitar.
  const birthError = validateBirthDate(day, month, year);
  const heightError = validateHeight(height);
  const weightError = validateBodyweight(weight);
  const basicsValid = !birthError && !heightError && !weightError;
  const showBirthError = year.length === 4 && day && month ? birthError : null;

  const profileDraft = useMemo(() => {
    const d = String(day || 1).padStart(2, '0');
    const m = String(month || 1).padStart(2, '0');
    return {
      sex,
      birth_date: `${year || 2000}-${m}-${d}`,
      height_cm: toNumber(height) || 0,
      bodyweight_kg: toNumber(weight) || 0,
      goal,
    };
  }, [sex, day, month, year, height, weight, goal]);

  const anchorInputs = useMemo(() => {
    const out = [];
    for (const g of Object.keys(anchors)) {
      const a = anchors[g];
      if (a.skipped) continue;
      const ex = getExercise(a.exerciseId);
      if (!validateSet(ex, a.weight, a.reps)) out.push({ exercise_id: a.exerciseId, weight: a.weight, reps: a.reps });
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
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
            <BrandLogo height={132} />
          </LinearGradient>
          <Display style={{ marginTop: spacing(2.5), fontSize: 44, lineHeight: 46, textTransform: 'uppercase' }}>
            Sua força,{'\n'}em percentil
          </Display>
          <Body style={{ color: colors.textDim, marginTop: spacing(1), marginBottom: spacing(3) }}>
            Compare cada levantamento com pessoas do seu sexo, peso e idade. Comece pelos seus dados.
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

          <Field label="Data de nascimento" error={showBirthError}>
            <Row>
              <Input
                style={{ flex: 1, marginRight: spacing(1), textAlign: 'center' }}
                placeholder="Dia" keyboardType="number-pad" maxLength={2} returnKeyType="next" submitBehavior="submit"
                value={day}
                onChangeText={(t) => { const v = digits(t); setDay(v); if (v.length === 2) monthRef.current?.focus(); }}
                onSubmitEditing={() => monthRef.current?.focus()}
              />
              <Input
                ref={monthRef}
                style={{ flex: 1, marginRight: spacing(1), textAlign: 'center' }}
                placeholder="Mês" keyboardType="number-pad" maxLength={2} returnKeyType="next" submitBehavior="submit"
                value={month}
                onChangeText={(t) => { const v = digits(t); setMonth(v); if (v.length === 2) yearRef.current?.focus(); }}
                onSubmitEditing={() => yearRef.current?.focus()}
              />
              <Input
                ref={yearRef}
                style={{ flex: 1.4, textAlign: 'center' }}
                placeholder="Ano" keyboardType="number-pad" maxLength={4} returnKeyType="next" submitBehavior="submit"
                value={year}
                onChangeText={(t) => { const v = digits(t); setYear(v); if (v.length === 4) heightRef.current?.focus(); }}
                onSubmitEditing={() => heightRef.current?.focus()}
              />
            </Row>
          </Field>

          <Row>
            <View style={{ flex: 1, marginRight: spacing(1.5) }}>
              <Field label="Altura (cm)" error={height ? heightError : null}>
                <Input
                  ref={heightRef}
                  placeholder="175" keyboardType="number-pad" maxLength={3} returnKeyType="next" submitBehavior="submit"
                  value={height} onChangeText={(t) => setHeight(digits(t))}
                  onSubmitEditing={() => weightRef.current?.focus()}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Peso (kg)" error={weight ? weightError : null}>
                <Input
                  ref={weightRef}
                  placeholder="80" keyboardType="decimal-pad" maxLength={5} returnKeyType="done"
                  value={weight} onChangeText={(t) => setWeight(decimal(t))}
                  onSubmitEditing={() => { Keyboard.dismiss(); if (basicsValid) setStep(1); }}
                />
              </Field>
            </View>
          </Row>

          <Button title="Continuar" icon={<Ionicons name="arrow-forward" size={18} color="#fff" />} onPress={() => { Keyboard.dismiss(); setStep(1); }} disabled={!basicsValid} style={{ marginTop: spacing(1) }} />
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
                <Card strong={active} style={active ? { borderColor: colors.primary, backgroundColor: hexA(colors.primary, 0.08) } : null}>
                  <Row>
                    <View style={[styles.goalEmoji, active && { backgroundColor: hexA(colors.primary, 0.2) }]}>
                      <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing(1.5) }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <H3>{g.label}</H3>
                        {active && <Ionicons name="checkmark-circle" size={20} color={colors.primaryBright} />}
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
      {step === 2 && (() => {
        const a = ONBOARDING_ANCHORS[anchorIdx];
        const group = a.group;
        const state = anchors[group];
        const ex = getExercise(state.exerciseId);
        const repsOnly = ex.metric === 'reps';
        const groupExs = exercisesByGroup(group);
        const isLast = anchorIdx === ONBOARDING_ANCHORS.length - 1;

        const onNext = () => { Keyboard.dismiss(); return isLast ? handleGenerate() : setAnchorIdx(anchorIdx + 1); };
        const onBack = () => { Keyboard.dismiss(); return anchorIdx === 0 ? setStep(1) : setAnchorIdx(anchorIdx - 1); };

        return (
          <View>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>Suas marcas · {anchorIdx + 1} de {ONBOARDING_ANCHORS.length}</Label>
              <Pressable onPress={() => setAnchor(group, { skipped: !state.skipped })} hitSlop={8}>
                <Label color={state.skipped ? colors.primaryBright : colors.textFaint} style={{ fontSize: 11 }}>
                  {state.skipped ? 'Pulado · reativar' : 'Não faço isso'}
                </Label>
              </Pressable>
            </Row>
            <Row style={{ marginTop: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: groupColor[group], marginRight: spacing(1) }} />
              <H1>{GROUP_LABELS_PT[group]}</H1>
            </Row>
            <Body style={{ color: colors.textDim, marginTop: spacing(0.5), marginBottom: spacing(1) }}>
              Quanto você aguenta hoje num exercício de {GROUP_LABELS_PT[group].toLowerCase()}? Use sua melhor série recente.
            </Body>
            {/* Deixa claro que não é o treino do dia (antes virava um treino no calendário). */}
            <Row style={styles.note}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textDim} style={{ marginRight: 6 }} />
              <Small style={{ flex: 1 }}>Não precisa ter treinado hoje: é a sua marca, não um treino. Ela não entra no calendário.</Small>
            </Row>

            <GradientCard gradient={groupGradient[group]} glow={groupColor[group]} style={{ alignItems: 'center', paddingVertical: spacing(2), opacity: state.skipped ? 0.5 : 1 }}>
              <ExerciseImage exerciseId={state.exerciseId} size={176} radius={20} light />
              <H2 style={{ color: '#fff', marginTop: spacing(1.5), textAlign: 'center' }} numberOfLines={2}>{ex.name_pt}</H2>
              <Small style={{ color: 'rgba(255,255,255,0.85)' }}>
                {ex.equipment}{ex.per_dumbbell ? ' · por halter' : ''}{repsOnly ? ' · repetições' : ''}
              </Small>
            </GradientCard>

            <Label style={{ marginTop: spacing(0.5), marginBottom: spacing(1) }}>Escolha o exercício</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing(1), paddingRight: spacing(2) }} style={{ marginBottom: spacing(1.5) }}>
              {groupExs.map((e) => {
                const active = state.exerciseId === e.id;
                return (
                  <Pressable key={e.id} onPress={() => setAnchor(group, { exerciseId: e.id })} style={[styles.altChip, active && { borderColor: groupColor[group], backgroundColor: hexA(groupColor[group], 0.16) }]}>
                    <Text style={[styles.altChipText, active && { color: colors.text, fontFamily: fonts.semibold }]}>{e.name_pt}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {!state.skipped && (
              <Row>
                {!repsOnly && (
                  <View style={{ flex: 1, marginRight: spacing(1.5) }}>
                    <Label style={{ marginBottom: 5, fontSize: 11 }}>Carga máx. (kg){ex.per_dumbbell ? ' · halter' : ''}</Label>
                    <Input
                      big placeholder="0" keyboardType="decimal-pad" returnKeyType="next" submitBehavior="submit"
                      value={state.weight} onChangeText={(t) => setAnchor(group, { weight: decimal(t) })}
                      onSubmitEditing={() => repsRef.current?.focus()}
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Label style={{ marginBottom: 5, fontSize: 11 }}>{repsOnly ? 'Repetições máx.' : 'Reps com essa carga'}</Label>
                  <Input
                    ref={repsRef}
                    big placeholder="0" keyboardType="number-pad" returnKeyType="done"
                    value={state.reps} onChangeText={(t) => setAnchor(group, { reps: digits(t) })}
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>
              </Row>
            )}
            {!state.skipped && !isBlankSet(ex, state.weight, state.reps) && validateSet(ex, state.weight, state.reps) ? (
              <Text style={[fieldErrorStyle, { textAlign: 'center' }]}>{validateSet(ex, state.weight, state.reps)}</Text>
            ) : null}

            <Row style={{ justifyContent: 'center', marginTop: spacing(2), marginBottom: spacing(1) }}>
              {ONBOARDING_ANCHORS.map((_, i) => (
                <View key={i} style={{ width: i === anchorIdx ? 22 : 7, height: 7, borderRadius: 2, marginHorizontal: 3, backgroundColor: i === anchorIdx ? colors.primary : i < anchorIdx ? hexA(colors.primary, 0.5) : colors.surfaceAlt }} />
              ))}
            </Row>

            <Row>
              <Button title="Voltar" variant="ghost" onPress={onBack} style={{ flex: 1, marginRight: spacing(1) }} />
              <Button
                title={isLast ? (anchorInputs.length ? 'Gerar radar' : 'Pular tudo') : 'Próximo'}
                icon={<Ionicons name={isLast ? 'pulse' : 'arrow-forward'} size={16} color="#fff" />}
                onPress={onNext}
                style={{ flex: 1.5 }}
              />
            </Row>
          </View>
        );
      })()}

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
    for (const g of MUSCLE_GROUPS) {
      const s = radar.scores[g];
      out[g] = s ? { ...s, score: s.score * t } : null;
    }
    return out;
  }, [radar, t]);

  const overall = radar.overall;
  const weakest = radar.weakest;

  return (
    <View style={{ alignItems: 'center', paddingTop: spacing(1) }}>
      <Badge label="Seu radar está pronto" color={colors.primary} solid style={{ alignSelf: 'center' }} />
      <H1 style={{ marginTop: spacing(1.5), textAlign: 'center' }}>Perfil de força</H1>

      <GradientCard gradient={gradients.hero} style={{ alignItems: 'center', marginTop: spacing(2), width: '100%' }}>
        <RadarChart scores={scaled} size={310} />
      </GradientCard>

      <Card strong style={{ width: '100%', alignItems: 'center', paddingVertical: spacing(2.5) }}>
        <ProgressRing value={(overall || 0) * t} size={150} stroke={12}>
          <Display style={{ fontSize: 56, lineHeight: 58 }}>{overall != null ? Math.round(overall * t) : '—'}</Display>
          <Label color={colors.textDim} style={{ fontSize: 10, marginTop: -4 }}>Score geral</Label>
        </ProgressRing>
        {weakest && (
          <Body style={{ color: colors.textDim, textAlign: 'center', marginTop: spacing(1.5) }}>
            Maior potencial de ganho:{' '}
            <Body style={{ color: colors.text, fontFamily: fonts.bold }}>{GROUP_LABELS_PT[weakest]}</Body>
          </Body>
        )}
      </Card>

      <Button title="Começar a treinar" icon={<Ionicons name="arrow-forward" size={18} color="#fff" />} onPress={onDone} style={{ width: '100%', marginTop: spacing(0.5) }} />
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  logo: { width: 132, height: 172, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  seg: {
    flex: 1, flexDirection: 'row', paddingVertical: spacing(1.5), borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing(1),
  },
  segActive: { borderColor: colors.primary, backgroundColor: hexA(colors.primary, 0.18) },
  segText: { color: colors.textDim, fontFamily: fonts.medium, fontSize: font.body },
  goalEmoji: {
    width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  note: {
    alignItems: 'flex-start', padding: spacing(1.25), marginBottom: spacing(1.5),
    borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  altChip: {
    paddingVertical: spacing(0.85), paddingHorizontal: spacing(1.5), borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.glassBorder, marginRight: spacing(1),
  },
  altChipText: { color: colors.textDim, fontSize: font.small, fontFamily: fonts.medium },
});
