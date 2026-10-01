// Tutorial de uso, mostrado uma vez depois das perguntas iniciais (e pelo
// Perfil, quando a pessoa quiser rever). Telas deslizáveis; cada uma aponta,
// numa mini barra de abas, onde aquilo fica no app.
import React, { useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, FlatList, StyleSheet, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground, BrandMark, Button, Label } from './ui';
import RadarChart from './RadarChart';
import ExerciseImage from './ExerciseImage';
import { useApp } from '../state/AppContext';
import { colors, fonts, radius, spacing, hexA, groupColor } from '../theme';

const TABS = [
  { key: 'radar', icon: 'pulse', label: 'Radar' },
  { key: 'log', icon: 'barbell', label: 'Treinar' },
  { key: 'history', icon: 'time', label: 'Histórico' },
  { key: 'profile', icon: 'person', label: 'Perfil' },
];

// Barra de abas em miniatura com a aba do passo em destaque.
function MiniTabs({ active }) {
  return (
    <View style={styles.miniTabs}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <View key={t.key} style={styles.miniTab}>
            <View style={[styles.miniTabBar, on && { backgroundColor: colors.primary }]} />
            <Ionicons name={on ? t.icon : `${t.icon}-outline`} size={18} color={on ? colors.text : colors.textFaint} />
            <Text style={[styles.miniTabLabel, on && { color: colors.text }]}>{t.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ---------------------------------------------------------------- visuais */
function WelcomeVisual() {
  return (
    <View style={{ alignItems: 'center' }}>
      <BrandMark size={52} boxed />
    </View>
  );
}

function RadarVisual({ scores }) {
  return (
    <View style={styles.visualCard}>
      <RadarChart scores={scores} size={250} />
    </View>
  );
}

function LogVisual() {
  return (
    <View style={[styles.visualCard, { padding: spacing(1.5), alignItems: 'stretch' }]}>
      <View style={styles.mockChip}>
        <Ionicons name="calendar" size={14} color={colors.primaryBright} />
        <Text style={styles.mockChipText}>Hoje</Text>
        <Ionicons name="chevron-down" size={12} color={colors.textFaint} style={{ marginLeft: 'auto' }} />
      </View>
      <View style={[styles.mockRow, { borderColor: hexA(colors.primary, 0.7), backgroundColor: hexA(colors.primary, 0.1) }]}>
        <ExerciseImage exerciseId="bench_press" size={40} radius={10} />
        <Text style={styles.mockRowText}>Supino Reto</Text>
        <View style={styles.mockMinus}><Ionicons name="remove" size={16} color="#fff" /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing(1) }}>
        <View style={styles.mockInput}><Text style={styles.mockInputLabel}>PESO (KG)</Text><Text style={styles.mockInputValue}>80</Text></View>
        <View style={styles.mockInput}><Text style={styles.mockInputLabel}>REPS</Text><Text style={styles.mockInputValue}>8</Text></View>
      </View>
    </View>
  );
}

function HistoryVisual() {
  // Semana de exemplo com dias treinados marcados pelas cores dos grupos.
  const days = [
    { d: 22 }, { d: 23, g: ['chest', 'triceps'] }, { d: 24 }, { d: 25, g: ['back', 'biceps'] },
    { d: 26 }, { d: 27, g: ['leg'] }, { d: 28, sel: true },
  ];
  return (
    <View style={[styles.visualCard, { padding: spacing(1.5), alignItems: 'stretch' }]}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {days.map((c) => (
          <View key={c.d} style={[styles.mockDay, c.g && { backgroundColor: hexA(colors.primary, 0.14) }, c.sel && { backgroundColor: colors.primary }]}>
            <Text style={[styles.mockDayText, (c.g || c.sel) && { color: '#fff', fontFamily: fonts.black }]}>{c.d}</Text>
            <View style={{ flexDirection: 'row', gap: 2, height: 5, marginTop: 2 }}>
              {(c.g || []).map((g) => <View key={g} style={{ width: 5, height: 5, borderRadius: 1.5, backgroundColor: groupColor[g] }} />)}
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.mockRow, { marginTop: spacing(1.25), marginBottom: 0 }]}>
        <Ionicons name="add-circle" size={20} color={colors.primaryBright} />
        <Text style={styles.mockRowText}>Registrar treino em 24/09</Text>
      </View>
    </View>
  );
}

function ProfileVisual() {
  const items = [
    ['scale-outline', 'Atualizar peso corporal'],
    ['flag-outline', 'Trocar objetivo'],
    ['cloud-done-outline', 'Tudo salvo na nuvem'],
  ];
  return (
    <View style={[styles.visualCard, { padding: spacing(1.5), alignItems: 'stretch' }]}>
      {items.map(([icon, text], i) => (
        <View key={text} style={[styles.mockRow, i === items.length - 1 && { marginBottom: 0 }]}>
          <Ionicons name={icon} size={20} color={i === 2 ? colors.good : colors.primaryBright} />
          <Text style={styles.mockRowText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ passos */
function buildSteps(firstName, scores) {
  return [
    {
      key: 'welcome',
      visual: <WelcomeVisual />,
      title: firstName ? `Bora, ${firstName}` : 'Bem-vindo',
      text: 'O StatsUp mostra o quão forte você é comparado a pessoas do seu sexo, peso e idade. Em 4 telas rápidas você aprende a usar.',
    },
    {
      key: 'radar',
      tab: 'radar',
      visual: <RadarVisual scores={scores} />,
      title: 'Seu radar',
      text: 'Cada ponta é um grupo muscular. O número é o seu percentil: 70 = mais forte que 70% das pessoas do seu perfil. Os anéis vão de Iniciante a Elite. Toque em Perna para ver o detalhe.',
    },
    {
      key: 'log',
      tab: 'log',
      visual: <LogVisual />,
      title: 'Registre seus treinos',
      text: 'Na aba Treinar, toque no exercício e informe peso × reps. Esqueceu de registrar outro dia? Toque em "Hoje" e escolha a data. Cada treino atualiza o radar.',
    },
    {
      key: 'history',
      tab: 'history',
      visual: <HistoryVisual />,
      title: 'Acompanhe a constância',
      text: 'No Histórico, o calendário marca os dias treinados. Toque num dia para ver o que fez ou registrar um treino esquecido. "Desde o último treino" mostra o que está parado há mais tempo.',
    },
    {
      key: 'profile',
      tab: 'profile',
      visual: <ProfileVisual />,
      title: 'Tudo na sua conta',
      text: 'No Perfil você atualiza peso e objetivo. Seus dados ficam salvos na nuvem e o app funciona sem internet: o que fizer offline sobe quando conectar.',
    },
  ];
}

/* --------------------------------------------------------------- tutorial */
export default function Tutorial({ visible, onDone }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user, radar } = useApp();
  const [index, setIndex] = useState(0);
  const [pageH, setPageH] = useState(0); // altura útil: centraliza o conteúdo de cada passo
  const listRef = useRef(null);

  const firstName = user && user.name ? user.name.split(' ')[0] : '';
  const steps = buildSteps(firstName, radar ? radar.scores : {});
  const last = index === steps.length - 1;

  const goTo = (i) => {
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };
  const finish = () => {
    setIndex(0);
    onDone();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={finish} statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenBackground />
        <View style={[styles.top, { paddingTop: insets.top + spacing(1.5) }]}>
          <Label>Tutorial · {index + 1} de {steps.length}</Label>
          {!last ? (
            <Pressable onPress={finish} hitSlop={10} accessibilityRole="button">
              <Text style={styles.skip}>Pular</Text>
            </Pressable>
          ) : null}
        </View>

        <FlatList
          ref={listRef}
          data={steps}
          keyExtractor={(s) => s.key}
          horizontal
          pagingEnabled
          style={{ flex: 1 }}
          onLayout={(e) => setPageH(e.nativeEvent.layout.height)}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(d, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, height: pageH || undefined, paddingHorizontal: spacing(3), justifyContent: 'center' }}>
              <View style={{ alignItems: 'center', marginBottom: spacing(3) }}>{item.visual}</View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.text}>{item.text}</Text>
              {item.tab ? (
                <View style={{ marginTop: spacing(3) }}>
                  <Label style={{ marginBottom: spacing(1), textAlign: 'center' }}>Onde fica</Label>
                  <MiniTabs active={item.tab} />
                </View>
              ) : null}
            </View>
          )}
        />

        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(2.5) }]}>
          <View style={styles.dots}>
            {steps.map((s, i) => (
              <View key={s.key} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing(1) }}>
            {index > 0 ? (
              <Button title="Voltar" variant="ghost" onPress={() => goTo(index - 1)} style={{ flex: 1 }} />
            ) : null}
            <Button
              title={last ? 'Começar' : 'Próximo'}
              icon={<Ionicons name={last ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" />}
              onPress={() => (last ? finish() : goTo(index + 1))}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing(3), paddingBottom: spacing(1),
  },
  skip: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 15 },
  title: {
    fontFamily: fonts.black, fontSize: 36, lineHeight: 40, color: colors.text,
    textTransform: 'uppercase', letterSpacing: 0.2,
  },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textDim, marginTop: spacing(1.25) },
  bottom: { paddingHorizontal: spacing(3), paddingTop: spacing(1) },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing(2) },
  dot: { width: 7, height: 7, borderRadius: 2, backgroundColor: colors.surfaceAlt },
  dotOn: { width: 22, backgroundColor: colors.primary },
  visualCard: {
    alignSelf: 'stretch', alignItems: 'center', borderRadius: radius.xl,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder,
  },
  miniTabs: {
    flexDirection: 'row', borderRadius: radius.lg, paddingVertical: spacing(1.25),
    backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.glassBorder,
  },
  miniTab: { flex: 1, alignItems: 'center' },
  miniTabBar: { width: 18, height: 3, borderRadius: 2, marginBottom: 6, backgroundColor: 'transparent' },
  miniTabLabel: {
    fontFamily: fonts.cond, fontSize: 11, letterSpacing: 0.6, color: colors.textFaint,
    textTransform: 'uppercase', marginTop: 2,
  },
  mockChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing(1), marginBottom: spacing(1),
    paddingVertical: spacing(0.75), paddingHorizontal: spacing(1.25), borderRadius: radius.md,
    backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.glassBorder,
  },
  mockChipText: { fontFamily: fonts.extra, fontSize: 14, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.6 },
  mockRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing(1.25), marginBottom: spacing(1),
    padding: spacing(1), borderRadius: radius.md, backgroundColor: colors.bg2,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  mockRowText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  mockMinus: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  mockInput: {
    flex: 1, alignItems: 'center', paddingVertical: spacing(0.75), borderRadius: radius.sm,
    backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.glassBorder,
  },
  mockInputLabel: { fontFamily: fonts.cond, fontSize: 10, letterSpacing: 1, color: colors.textFaint },
  mockInputValue: { fontFamily: fonts.black, fontSize: 24, color: colors.text },
  mockDay: { flex: 1, aspectRatio: 0.9, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  mockDayText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textDim },
});
