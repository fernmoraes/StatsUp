import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, FlatList, SectionList, ScrollView, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp, makeEntry } from '../../src/state/AppContext';
import {
  Screen, Display, H1, H2, H3, Body, Small, Tiny, Label,
  Card, GradientCard, Button, Row, Badge, ProgressBar, SectionHeader, Chip,
} from '../../src/components/ui';
import ExerciseImage from '../../src/components/ExerciseImage';
import { EXERCISES, MUSCLE_GROUPS, GROUP_LABELS_PT, getExercise } from '../../src/data/exercises';
import { LEVEL_LABELS_PT, LEVELS } from '../../src/data/levels';
import {
  colors, spacing, radius, font, fonts, groupColor, groupGradient, gradients, hexA,
} from '../../src/theme';

const numInput = {
  backgroundColor: colors.glass,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  color: colors.text,
  paddingVertical: spacing(1.25),
  fontSize: 19,
  fontFamily: fonts.extra,
  textAlign: 'center',
};

const confLabel = { high: 'ALTA', medium: 'MÉDIA', low: 'BAIXA' };
const confColor = { high: colors.good, medium: colors.warn, low: colors.bad };

const FILTERS = [{ key: 'all', label: 'Todos' }, ...MUSCLE_GROUPS.map((g) => ({ key: g, label: GROUP_LABELS_PT[g] }))];

export default function LogScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { profile, radar, addWorkout } = useApp();

  const [mode, setMode] = useState('list'); // 'list' | 'carousel'
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [index, setIndex] = useState(0);
  const [carouselH, setCarouselH] = useState(0);
  const listRef = useRef(null);

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
    const prevLatest = radar ? radar.latest : {};
    const fb = validInputs.map((inp) => {
      const entry = makeEntry(profile, inp);
      const ex = getExercise(inp.exercise_id);
      const prev = prevLatest[inp.exercise_id];
      const prevPct = prev ? prev.percentile : null;
      const prevLevelIdx = prev ? LEVELS.indexOf(prev.level) : -1;
      const newLevelIdx = LEVELS.indexOf(entry.level);
      return { ex, entry, prevPct, isPR: prevPct == null || entry.percentile > prevPct, leveledUp: newLevelIdx > prevLevelIdx && prevLevelIdx >= 0 };
    });
    await addWorkout(validInputs);
    setFeedback(fb);
    setDraft({});
    setFilter('all');
    setIndex(0);
  };

  /* ----------------------------------------------------------- feedback */
  if (feedback) {
    const prs = feedback.filter((f) => f.isPR).length;
    return (
      <Screen>
        <GradientCard gradient={gradients.good} glow={colors.good} style={{ alignItems: 'center', paddingVertical: spacing(3) }}>
          <View style={styles.checkCircle}><Ionicons name="checkmark" size={34} color={colors.good} /></View>
          <H1 style={{ color: '#04241A', marginTop: spacing(1.5) }}>Treino salvo!</H1>
          <Body style={{ color: '#04241A', opacity: 0.85, marginTop: 4 }}>
            {feedback.length} exercício{feedback.length > 1 ? 's' : ''}{prs > 0 ? ` · ${prs} recorde${prs > 1 ? 's' : ''} 🔥` : ''}
          </Body>
        </GradientCard>

        <SectionHeader title="Resultados" />
        {feedback.map((f, i) => (
          <Card key={i} accent={groupColor[f.ex.muscle_group]}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <ExerciseImage exerciseId={f.ex.id} size={52} radius={13} style={{ marginRight: spacing(1.25) }} />
              <View style={{ flex: 1, marginRight: spacing(1) }}>
                <H3 numberOfLines={1}>{f.ex.name_pt}</H3>
                <Small style={{ marginTop: 2 }}>{f.ex.metric === 'reps' ? `${f.entry.est_1rm} reps` : `1RM est. ${f.entry.est_1rm} kg`}</Small>
              </View>
              <Display style={{ fontSize: 30, color: colors.primaryBright }}>P{Math.round(f.entry.percentile)}</Display>
            </Row>
            <View style={{ marginTop: spacing(1.25) }}>
              <ProgressBar value={f.entry.percentile} gradient={groupGradient[f.ex.muscle_group]} height={8} />
            </View>
            <Row style={{ justifyContent: 'space-between', marginTop: spacing(1.25) }}>
              <Badge label={LEVEL_LABELS_PT[f.entry.level]} color={groupColor[f.ex.muscle_group]} />
              <Row><Tiny>CONFIANÇA </Tiny><Tiny style={{ color: confColor[f.entry.confidence] }}>{confLabel[f.entry.confidence]}</Tiny></Row>
            </Row>
            {f.leveledUp && (
              <Row style={{ marginTop: spacing(1.25), backgroundColor: hexA(colors.good, 0.12), padding: spacing(1), borderRadius: radius.sm }}>
                <Ionicons name="trophy" size={16} color={colors.good} />
                <Body style={{ color: colors.good, marginLeft: 8, fontFamily: fonts.semibold }}>Subiu para {LEVEL_LABELS_PT[f.entry.level]}!</Body>
              </Row>
            )}
            {!f.leveledUp && f.isPR && f.prevPct != null && (
              <Row style={{ marginTop: spacing(1.25), backgroundColor: hexA(colors.primary, 0.12), padding: spacing(1), borderRadius: radius.sm }}>
                <Ionicons name="flame" size={16} color={colors.warn} />
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
            <Tiny style={{ marginBottom: 5, textAlign: 'center' }}>PESO (KG)</Tiny>
            <TextInput style={numInput} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textFaint} value={d.weight} onChangeText={(t) => setVal(ex.id, 'weight', t)} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Tiny style={{ marginBottom: 5, textAlign: 'center' }}>{repsOnly ? 'REPS MÁX.' : 'REPS'}</Tiny>
          <TextInput style={numInput} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textFaint} value={d.reps} onChangeText={(t) => setVal(ex.id, 'reps', t)} />
        </View>
      </Row>
    );
  };

  const renderCard = ({ item: ex }) => {
    const valid = isValid(ex);
    return (
      <View style={{ width, height: H, paddingHorizontal: spacing(2.5), paddingVertical: spacing(0.5) }}>
        <Card strong style={{ flex: 1, padding: spacing(2), justifyContent: 'space-between', borderColor: valid ? colors.good : colors.glassBorderStrong }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge label={GROUP_LABELS_PT[ex.muscle_group]} color={groupColor[ex.muscle_group]} />
            {valid ? <Badge label="✓ NO TREINO" color={colors.good} solid /> : <Tiny>{index + 1} / {list.length}</Tiny>}
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
          {valid && <Ionicons name="checkmark-circle" size={18} color={colors.good} style={{ marginRight: 6 }} />}
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
        title={validInputs.length ? `Salvar treino · ${validInputs.length}` : 'Salvar treino'}
        icon={<Ionicons name="save" size={18} color="#fff" />}
        onPress={handleSave}
        disabled={validInputs.length === 0}
      />
    </View>
  );

  return (
    <Screen scroll={false} contentStyle={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: spacing(2.5) }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Label>Loop diário</Label>
            <H1 style={{ marginTop: 4 }}>Treinei hoje</H1>
          </View>
          {modeToggle()}
        </Row>
        <Body style={{ color: colors.textDim, marginTop: spacing(0.5), marginBottom: spacing(1.25) }}>
          {mode === 'list' ? 'Toque no exercício para registrar peso × reps.' : 'Deslize entre os exercícios e preencha o que você fez.'}
        </Body>
      </View>

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
          <SectionList
            sections={sections}
            keyExtractor={(e) => e.id}
            renderItem={renderRow}
            renderSectionHeader={({ section }) => (
              <View style={{ paddingHorizontal: spacing(2.5) }}>
                <SectionHeader title={section.title} accent={groupColor[section.group]} />
              </View>
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
  checkCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  nav: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorderStrong, alignItems: 'center', justifyContent: 'center' },
  toggle: { backgroundColor: colors.glass, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.glassBorder, padding: 3 },
  toggleBtn: { width: 38, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.glass, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing(1.25), paddingVertical: spacing(1), marginBottom: spacing(1),
  },
  rowActive: { borderColor: colors.primary, backgroundColor: hexA(colors.primary, 0.1) },
  addBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorderStrong, alignItems: 'center', justifyContent: 'center' },
});
