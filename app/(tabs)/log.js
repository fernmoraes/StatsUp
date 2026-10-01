import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList, SectionList, ScrollView, Keyboard, useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp, makeEntry } from '../../src/state/AppContext';
import {
  Screen, Display, H1, H2, H3, Body, Small, Tiny, Label,
  Card, GradientCard, Button, Row, Badge, ProgressBar, SectionHeader, Chip, Input, useScreenKeyboard,
} from '../../src/components/ui';
import ExerciseImage from '../../src/components/ExerciseImage';
import Calendar from '../../src/components/Calendar';
import { DialogShell } from '../../src/components/dialog';
import { todayISO, friendlyDate, formatBR } from '../../src/utils/date';
import { EXERCISES, MUSCLE_GROUPS, GROUP_LABELS_PT, getExercise } from '../../src/data/exercises';
import { LEVEL_LABELS_PT, LEVELS } from '../../src/data/levels';
import {
  colors, spacing, radius, font, fonts, groupColor, groupGradient, gradients, hexA,
} from '../../src/theme';

const confLabel = { high: 'ALTA', medium: 'MÉDIA', low: 'BAIXA' };
const confColor = { high: colors.good, medium: colors.warn, low: colors.bad };

const FILTERS = [{ key: 'all', label: 'Todos' }, ...MUSCLE_GROUPS.map((g) => ({ key: g, label: GROUP_LABELS_PT[g] }))];

// Altura aproximada da barra "Salvar treino" (fica acima do teclado).
const SAVE_BAR_H = 76;

// SectionList ligada ao controle de teclado da <Screen> (rola o campo focado).
const KeyboardAwareSectionList = React.forwardRef(function KeyboardAwareSectionList(props, ref) {
  const { onScroll } = useScreenKeyboard();
  return <SectionList ref={ref} onScroll={onScroll} scrollEventThrottle={16} {...props} />;
});

const digits = (t) => t.replace(/[^0-9]/g, '');
const decimal = (t) => t.replace(',', '.').replace(/[^0-9.]/g, '');

export default function LogScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { profile, workouts, radar, addWorkout } = useApp();
  const params = useLocalSearchParams();

  const [mode, setMode] = useState('list'); // 'list' | 'carousel'
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [index, setIndex] = useState(0);
  const [carouselH, setCarouselH] = useState(0);
  const listRef = useRef(null);
  const sectionRef = useRef(null);
  const repsRefs = useRef({});

  // Data do treino: hoje por padrão; um dia passado vindo do calendário do
  // Histórico (?date=) ou escolhido aqui. Volta para hoje ao sair da aba.
  const [date, setDate] = useState(todayISO());
  const [pickerOpen, setPickerOpen] = useState(false);
  const isToday = date === todayISO();
  useEffect(() => {
    if (!params.date) return;
    setDate(String(params.date));
    setFeedback(null);
    router.setParams({ date: undefined }); // consome o parâmetro
  }, [params.date, router]);
  useFocusEffect(useCallback(() => () => setDate(todayISO()), []));

  const trainedByDay = useMemo(() => {
    const out = {};
    for (const log of workouts) {
      const set = new Set(out[log.date] || []);
      for (const e of log.entries) {
        const ex = getExercise(e.exercise_id);
        if (ex) set.add(ex.muscle_group);
      }
      out[log.date] = MUSCLE_GROUPS.filter((g) => set.has(g));
    }
    return out;
  }, [workouts]);

  const list = useMemo(
    () => EXERCISES.filter((e) => filter === 'all' || e.muscle_group === filter),
    [filter]
  );
  const sections = useMemo(() => {
    const groups = filter === 'all' ? MUSCLE_GROUPS : [filter];
    return groups
      .map((g) => ({ group: g, title: GROUP_LABELS_PT[g], data: EXERCISES.filter((e) => e.muscle_group === g) }))
      .filter((s) => s.data.length);
  }, [filter]);

  const setVal = (exId, key, v) =>
    setDraft((prev) => ({ ...prev, [exId]: { ...(prev[exId] || { weight: '', reps: '' }), [key]: v } }));
  const toggle = (exId) =>
    setDraft((prev) => {
      const next = { ...prev };
      if (next[exId]) delete next[exId];
      else next[exId] = { weight: '', reps: '' };
      return next;
    });

  const isValid = (ex) => {
    const d = draft[ex.id];
    if (!d) return false;
    return ex.metric === 'reps' ? Number(d.reps) > 0 : Number(d.weight) > 0 && Number(d.reps) > 0;
  };

  const validInputs = useMemo(() => {
    const out = [];
    for (const ex of EXERCISES) {
      const d = draft[ex.id];
      if (!d) continue;
      const ok = ex.metric === 'reps' ? Number(d.reps) > 0 : Number(d.weight) > 0 && Number(d.reps) > 0;
      if (ok) out.push({ exercise_id: ex.id, weight: d.weight, reps: d.reps });
    }
    return out;
  }, [draft]);

  const changeFilter = (key) => {
    setFilter(key);
    setIndex(0);
    requestAnimationFrame(() => listRef.current?.scrollToOffset?.({ offset: 0, animated: false }));
  };
  const goTo = (i) => {
    const clamped = Math.max(0, Math.min(list.length - 1, i));
    listRef.current?.scrollToOffset?.({ offset: clamped * width, animated: true });
    setIndex(clamped);
  };

  const handleSave = async () => {
    if (!profile || validInputs.length === 0) return;
    Keyboard.dismiss();
    const prevLatest = radar ? radar.latest : {};
    const fb = validInputs.map((inp) => {
      const entry = makeEntry(profile, inp);
      const ex = getExercise(inp.exercise_id);
      const prev = prevLatest[inp.exercise_id];
      const prevPct = prev ? prev.percentile : null;
      const prevLevelIdx = prev ? LEVELS.indexOf(prev.level) : -1;
      const newLevelIdx = LEVELS.indexOf(entry.level);
      // Recorde/subida de nível só fazem sentido para o treino de hoje: um
      // registro retroativo não substitui marcas mais recentes.
      return {
        ex, entry, prevPct,
        isPR: isToday && (prevPct == null || entry.percentile > prevPct),
        leveledUp: isToday && newLevelIdx > prevLevelIdx && prevLevelIdx >= 0,
      };
    });
    await addWorkout(validInputs, { date });
    setFeedback({ items: fb, date });
    setDraft({});
    setFilter('all');
    setIndex(0);
  };

  /* ----------------------------------------------------------- feedback */
  if (feedback) {
    const items = feedback.items;
    const prs = items.filter((f) => f.isPR).length;
    const past = feedback.date !== todayISO();
    return (
      <Screen>
        <GradientCard gradient={gradients.brand} glow={colors.primary} style={{ alignItems: 'center', paddingVertical: spacing(3) }}>
          <View style={styles.checkCircle}><Ionicons name="checkmark" size={34} color={colors.primary} /></View>
          <Display style={{ color: '#fff', marginTop: spacing(1.5), fontSize: 40, textTransform: 'uppercase' }}>Treino salvo</Display>
          <Body style={{ color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
            {items.length} exercício{items.length > 1 ? 's' : ''}{prs > 0 ? ` · ${prs} recorde${prs > 1 ? 's' : ''} 🔥` : ''}
          </Body>
          {past && (
            <Badge label={`Registrado em ${formatBR(feedback.date)}`} color="#fff" style={{ alignSelf: 'center', marginTop: spacing(1.25) }} />
          )}
        </GradientCard>

        <SectionHeader title="Resultados" />
        {items.map((f, i) => (
          <Card key={i} accent={groupColor[f.ex.muscle_group]}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <ExerciseImage exerciseId={f.ex.id} size={52} radius={13} style={{ marginRight: spacing(1.25) }} />
              <View style={{ flex: 1, marginRight: spacing(1) }}>
                <H3 numberOfLines={1}>{f.ex.name_pt}</H3>
                <Small style={{ marginTop: 2 }}>{f.ex.metric === 'reps' ? `${f.entry.est_1rm} reps` : `1RM est. ${f.entry.est_1rm} kg`}</Small>
              </View>
              <Display style={{ fontSize: 38, lineHeight: 40, color: colors.primaryBright }}>P{Math.round(f.entry.percentile)}</Display>
            </Row>
            <View style={{ marginTop: spacing(1.25) }}>
              <ProgressBar value={f.entry.percentile} gradient={groupGradient[f.ex.muscle_group]} height={8} />
            </View>
            <Row style={{ justifyContent: 'space-between', marginTop: spacing(1.25) }}>
              <Badge label={LEVEL_LABELS_PT[f.entry.level]} color={groupColor[f.ex.muscle_group]} />
              <Row><Label style={{ fontSize: 11 }}>Confiança </Label><Label color={confColor[f.entry.confidence]} style={{ fontSize: 11 }}>{confLabel[f.entry.confidence]}</Label></Row>
            </Row>
            {f.leveledUp && (
              <Row style={{ marginTop: spacing(1.25), backgroundColor: hexA(colors.good, 0.12), padding: spacing(1), borderRadius: radius.sm }}>
                <Ionicons name="trophy" size={16} color={colors.good} />
                <Body style={{ color: colors.good, marginLeft: 8, fontFamily: fonts.semibold }}>Subiu para {LEVEL_LABELS_PT[f.entry.level]}</Body>
              </Row>
            )}
            {!f.leveledUp && f.isPR && f.prevPct != null && (
              <Row style={{ marginTop: spacing(1.25), backgroundColor: hexA(colors.primary, 0.12), padding: spacing(1), borderRadius: radius.sm }}>
                <Ionicons name="flame" size={16} color={colors.primaryBright} />
                <Body style={{ color: colors.text, marginLeft: 8, fontFamily: fonts.semibold }}>Novo recorde: P{Math.round(f.prevPct)} → P{Math.round(f.entry.percentile)}</Body>
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

  /* -------------------------------------------------------------- card */
  const H = carouselH || Math.round(height * 0.55);
  const gifSize = Math.max(96, Math.min(width - spacing(11), 232, H - 232));

  const renderInputs = (ex) => {
    const repsOnly = ex.metric === 'reps';
    const d = draft[ex.id] || { weight: '', reps: '' };
    return (
      <Row>
        {!repsOnly && (
          <View style={{ flex: 1, marginRight: spacing(1.5) }}>
            <Label style={{ marginBottom: 5, textAlign: 'center', fontSize: 11 }}>Peso (kg)</Label>
            <Input
              big placeholder="0" keyboardType="decimal-pad" returnKeyType="next" submitBehavior="submit"
              value={d.weight} onChangeText={(t) => setVal(ex.id, 'weight', decimal(t))}
              onSubmitEditing={() => repsRefs.current[ex.id]?.focus()}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Label style={{ marginBottom: 5, textAlign: 'center', fontSize: 11 }}>{repsOnly ? 'Reps máx.' : 'Reps'}</Label>
          <Input
            ref={(r) => { repsRefs.current[ex.id] = r; }}
            big placeholder="0" keyboardType="number-pad" returnKeyType="done"
            value={d.reps} onChangeText={(t) => setVal(ex.id, 'reps', digits(t))}
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
      </Row>
    );
  };

  const renderCard = ({ item: ex }) => {
    const valid = isValid(ex);
    return (
      <View style={{ width, height: H, paddingHorizontal: spacing(2.5), paddingVertical: spacing(0.5) }}>
        <Card strong style={{ flex: 1, padding: spacing(2), justifyContent: 'space-between', borderColor: valid ? colors.primary : colors.glassBorderStrong }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge label={GROUP_LABELS_PT[ex.muscle_group]} color={groupColor[ex.muscle_group]} />
            {valid ? <Badge label="✓ No treino" color={colors.primary} solid /> : <Label style={{ fontSize: 12 }}>{index + 1} / {list.length}</Label>}
          </Row>
          <Pressable onPress={() => router.push(`/exercise/${ex.id}`)} style={{ alignItems: 'center' }}>
            <ExerciseImage exerciseId={ex.id} size={gifSize} radius={20} light />
            <H3 style={{ marginTop: spacing(1), textAlign: 'center' }} numberOfLines={1}>{ex.name_pt}</H3>
            <Small style={{ textAlign: 'center' }} numberOfLines={1}>
              {ex.equipment}{ex.per_dumbbell ? ' · halter' : ''}{ex.metric === 'reps' ? ' · reps' : ''}
            </Small>
          </Pressable>
          {renderInputs(ex)}
        </Card>
      </View>
    );
  };

  /* -------------------------------------------------------------- linha */
  const renderRow = ({ item: ex }) => {
    const selected = !!draft[ex.id];
    const valid = isValid(ex);
    return (
      <View>
        <Pressable onPress={() => toggle(ex.id)} style={[styles.row, selected && styles.rowActive]}>
          <Pressable onPress={() => router.push(`/exercise/${ex.id}`)} style={{ marginRight: spacing(1.25) }}>
            <ExerciseImage exerciseId={ex.id} size={46} radius={12} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Body style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{ex.name_pt}</Body>
            <Tiny style={{ marginTop: 2 }}>{ex.equipment}{ex.per_dumbbell ? ' · halter' : ''}{ex.metric === 'reps' ? ' · reps' : ''}</Tiny>
          </View>
          {valid && <Ionicons name="checkmark-circle" size={18} color={colors.primaryBright} style={{ marginRight: 6 }} />}
          <View style={[styles.addBtn, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Ionicons name={selected ? 'remove' : 'add'} size={18} color={selected ? '#fff' : colors.textDim} />
          </View>
        </Pressable>
        {selected && <View style={{ marginBottom: spacing(1), paddingHorizontal: spacing(0.5) }}>{renderInputs(ex)}</View>}
      </View>
    );
  };

  const modeToggle = () => (
    <Row style={styles.toggle}>
      {[['list', 'list'], ['carousel', 'albums']].map(([m, icon]) => {
        const active = mode === m;
        return (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.toggleBtn, active && { backgroundColor: colors.primary }]}>
            <Ionicons name={icon} size={16} color={active ? '#fff' : colors.textDim} />
          </Pressable>
        );
      })}
    </Row>
  );

  const chips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing(2.5), gap: spacing(1) }} style={{ flexGrow: 0, marginBottom: spacing(1) }}>
      {FILTERS.map((f) => (
        <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => changeFilter(f.key)} color={f.key === 'all' ? colors.primary : groupColor[f.key]} />
      ))}
    </ScrollView>
  );

  const saveBar = (withNav) => (
    <View style={{ paddingHorizontal: spacing(2.5), paddingTop: spacing(0.5) }}>
      {withNav && (
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) }}>
          <Pressable onPress={() => goTo(index - 1)} disabled={index <= 0} style={[styles.nav, index <= 0 && { opacity: 0.35 }]}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Tiny>{list.length ? `${index + 1} / ${list.length}` : '—'}{validInputs.length ? ` · ${validInputs.length} no treino` : ''}</Tiny>
          <Pressable onPress={() => goTo(index + 1)} disabled={index >= list.length - 1} style={[styles.nav, index >= list.length - 1 && { opacity: 0.35 }]}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </Row>
      )}
      <Button
        title={
          (validInputs.length ? `Salvar treino · ${validInputs.length}` : 'Salvar treino') +
          (isToday ? '' : ` · ${formatBR(date).slice(0, 5)}`)
        }
        icon={<Ionicons name="save" size={18} color="#fff" />}
        onPress={handleSave}
        disabled={validInputs.length === 0}
      />
    </View>
  );

  return (
    <Screen
      scroll={false}
      contentStyle={{ paddingHorizontal: 0 }}
      scrollRef={mode === 'list' ? sectionRef : null}
      keyboardExtra={SAVE_BAR_H}
    >
      <View style={{ paddingHorizontal: spacing(2.5) }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Label>Registrar treino</Label>
            <H1 style={{ marginTop: 4 }}>{isToday ? 'Treinei hoje' : 'Treino passado'}</H1>
          </View>
          {modeToggle()}
        </Row>

        {/* Data do treino: toque para marcar um dia que você esqueceu */}
        <Pressable
          onPress={() => { Keyboard.dismiss(); setPickerOpen(true); }}
          style={({ pressed }) => [styles.dateChip, !isToday && styles.dateChipPast, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Escolher data do treino"
        >
          <Ionicons name="calendar" size={16} color={isToday ? colors.textDim : colors.primaryBright} />
          <Text style={[styles.dateChipText, !isToday && { color: colors.text }]}>{friendlyDate(date)}</Text>
          {!isToday && <Text style={styles.dateChipHint}>{formatBR(date)}</Text>}
          <Ionicons name="chevron-down" size={14} color={colors.textFaint} style={{ marginLeft: 'auto' }} />
        </Pressable>

        <Body style={{ color: colors.textDim, marginTop: spacing(1), marginBottom: spacing(1.25) }}>
          {mode === 'list' ? 'Toque no exercício para registrar peso × reps.' : 'Deslize entre os exercícios e preencha o que você fez.'}
        </Body>
      </View>

      <DialogShell visible={pickerOpen} onClose={() => setPickerOpen(false)} style={{ padding: spacing(2) }}>
        <Label style={{ marginBottom: spacing(1) }}>Quando foi o treino?</Label>
        <Calendar
          selected={date}
          trained={trainedByDay}
          onSelect={(iso) => { setDate(iso); setPickerOpen(false); }}
        />
        <Row style={{ marginTop: spacing(1.5), gap: spacing(1) }}>
          <Button title="Hoje" variant="ghost" onPress={() => { setDate(todayISO()); setPickerOpen(false); }} style={{ flex: 1 }} />
          <Button title="Fechar" variant="ghost" onPress={() => setPickerOpen(false)} style={{ flex: 1 }} />
        </Row>
      </DialogShell>

      {chips()}

      {mode === 'carousel' ? (
        <>
          <View style={{ flex: 1 }} onLayout={(e) => setCarouselH(e.nativeEvent.layout.height)}>
            <FlatList
              key={filter}
              ref={listRef}
              data={list}
              renderItem={renderCard}
              keyExtractor={(e) => e.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={(d, i) => ({ length: width, offset: width * i, index: i })}
              onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
              initialNumToRender={2}
              maxToRenderPerBatch={3}
              windowSize={3}
              keyboardShouldPersistTaps="handled"
            />
          </View>
          {saveBar(true)}
        </>
      ) : (
        <>
          <KeyboardAwareSectionList
            ref={sectionRef}
            sections={sections}
            keyExtractor={(e) => e.id}
            renderItem={renderRow}
            renderSectionHeader={({ section }) => (
              <SectionHeader title={section.title} accent={groupColor[section.group]} />
            )}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: spacing(2.5), paddingBottom: spacing(2) }}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={8}
            windowSize={6}
          />
          {saveBar(false)}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing(1),
    marginTop: spacing(1.25), paddingVertical: spacing(1), paddingHorizontal: spacing(1.5),
    borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder,
  },
  dateChipPast: { borderColor: colors.primary, backgroundColor: hexA(colors.primary, 0.12) },
  dateChipText: { fontFamily: fonts.extra, fontSize: 16, color: colors.textDim, letterSpacing: 0.6, textTransform: 'uppercase' },
  dateChipHint: { fontFamily: fonts.medium, fontSize: 13, color: colors.textDim },
  checkCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  nav: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorderStrong, alignItems: 'center', justifyContent: 'center' },
  toggle: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, padding: 3 },
  toggleBtn: { width: 40, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.glass, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing(1.25), paddingVertical: spacing(1), marginBottom: spacing(1),
  },
  rowActive: { borderColor: hexA(colors.primary, 0.7), backgroundColor: hexA(colors.primary, 0.1) },
  addBtn: { width: 32, height: 32, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.glassBorderStrong, alignItems: 'center', justifyContent: 'center' },
});
