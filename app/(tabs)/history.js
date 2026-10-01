import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/state/AppContext';
import {
  Screen, Display, H1, H3, Body, Small, Tiny, Label,
  Card, GradientCard, Row, SectionHeader, Button,
} from '../../src/components/ui';
import RadarChart from '../../src/components/RadarChart';
import Calendar from '../../src/components/Calendar';
import { colors, spacing, groupColor, gradients, fonts, hexA, radius } from '../../src/theme';
import { getExercise, GROUP_LABELS_PT, MUSCLE_GROUPS } from '../../src/data/exercises';
import { buildRadarState } from '../../src/engine/selectors';
import {
  todayISO, addDays, formatBR, longDate, friendlyDate, parseISODate,
} from '../../src/utils/date';

function computeStreak(dates) {
  const set = new Set(dates);
  const today = todayISO();
  let cursor = set.has(today) ? today : addDays(today, -1);
  if (!set.has(cursor)) return 0;
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

const daysBetween = (a, b) => Math.round((parseISODate(b) - parseISODate(a)) / 86400000);

// Bloco de número. `hero` = destaque em vermelho sólido (a sequência).
function StatTile({ icon, value, label, hero }) {
  const body = (
    <>
      <Ionicons name={icon} size={18} color={hero ? '#fff' : colors.primaryBright} />
      <Display style={{ fontSize: 40, lineHeight: 44, marginTop: spacing(0.5), color: hero ? '#fff' : colors.text }}>{value}</Display>
      <Label color={hero ? 'rgba(255,255,255,0.85)' : colors.textFaint} style={{ fontSize: 10, letterSpacing: 1, lineHeight: 13 }}>{label}</Label>
    </>
  );
  if (hero) {
    return (
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[tileStyle, { borderColor: 'transparent' }]}>
        {body}
      </LinearGradient>
    );
  }
  return <View style={tileStyle}>{body}</View>;
}

const tileStyle = {
  flex: 1, padding: spacing(1.5), borderRadius: radius.lg,
  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder,
};

// Linhas de exercícios de um treino.
function EntryRows({ entries }) {
  return entries.map((e, i) => {
    const ex = getExercise(e.exercise_id);
    if (!ex) return null;
    return (
      <Row key={i} style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
        <Row style={{ flex: 1 }}>
          <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: groupColor[ex.muscle_group], marginRight: spacing(1.25) }} />
          <Body style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>{ex.name_pt}</Body>
        </Row>
        <Small style={{ marginRight: spacing(1.5), fontFamily: fonts.medium }}>
          {e.weight_kg ? `${e.weight_kg}kg×${e.reps || '-'}` : `${e.reps} reps`}
        </Small>
        <Text style={{ color: colors.primaryBright, fontFamily: fonts.black, fontSize: 17, width: 46, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
          P{Math.round(e.percentile)}
        </Text>
      </Row>
    );
  });
}

// Nomes dos grupos treinados (com a marca de cor ao lado do nome).
function GroupTags({ groups }) {
  return (
    <Row style={{ flexWrap: 'wrap', gap: spacing(1.5) }}>
      {groups.map((g) => (
        <Row key={g}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: groupColor[g], marginRight: 5 }} />
          <Label color={colors.textDim} style={{ fontSize: 12, letterSpacing: 1 }}>{GROUP_LABELS_PT[g]}</Label>
        </Row>
      ))}
    </Row>
  );
}

export default function History() {
  const router = useRouter();
  // `workouts` = só treinos. As marcas do cadastro (`baseline`) não são treino
  // de nenhum dia: ficam fora do calendário, da sequência e das contagens.
  // `logs` (tudo) só é usado para o radar.
  const { profile, logs, workouts, baseline, radar } = useApp();
  const [selected, setSelected] = useState(todayISO());

  // Logs antigos podem estar fora de ordem (antes do registro retroativo).
  const sortedLogs = useMemo(() => [...workouts].sort(byDateDesc), [workouts]);
  const dates = useMemo(() => workouts.map((l) => l.date), [workouts]);
  const distinctDays = useMemo(() => new Set(dates).size, [dates]);
  const streak = useMemo(() => computeStreak(dates), [dates]);

  // { data: [grupos treinados] } para o calendário.
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

  // Dias desde o último treino de cada grupo (para decidir o que treinar hoje).
  const restByGroup = useMemo(() => {
    const today = todayISO();
    return MUSCLE_GROUPS.map((g) => {
      const last = Object.keys(trainedByDay)
        .filter((d) => d <= today && trainedByDay[d].includes(g))
        .sort()
        .pop();
      return { g, days: last ? daysBetween(last, today) : null };
    });
  }, [trainedByDay]);

  const dayLogs = useMemo(() => sortedLogs.filter((l) => l.date === selected), [sortedLogs, selected]);
  const dayEntries = dayLogs.flatMap((l) => l.entries);

  const pastRadar = useMemo(() => {
    if (!profile || logs.length < 2) return null;
    const cutoff = addDays(todayISO(), -30);
    const old = logs.filter((l) => l.date <= cutoff);
    const base = old.length ? old : [...logs].sort(byDateDesc).slice(-1);
    const r = buildRadarState(profile, base);
    return r.overall != null ? r.scores : null;
  }, [profile, logs]);

  const logOnDay = () => router.push({ pathname: '/(tabs)/log', params: { date: selected } });

  return (
    <Screen>
      <Label>Consistência</Label>
      <H1 style={{ marginTop: 4, marginBottom: spacing(1.5) }}>Histórico</H1>

      <Row style={{ gap: spacing(1.5) }}>
        <StatTile icon="flame" value={streak} label={'Sequência\n(dias)'} hero />
        <StatTile icon="calendar" value={distinctDays} label={'Dias\ntreinados'} />
        <StatTile icon="barbell" value={workouts.length} label={'Treinos\nregistrados'} />
      </Row>

      {/* Calendário + o que foi feito no dia escolhido */}
      <SectionHeader title="Calendário" />
      <Card>
        <Calendar selected={selected} onSelect={setSelected} trained={trainedByDay} />
      </Card>

      <Card strong accent={dayEntries.length ? colors.primary : undefined}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Label>{friendlyDate(selected)}</Label>
            <H3 style={{ marginTop: 2 }}>{longDate(selected).replace(/^./, (c) => c.toUpperCase())}</H3>
          </View>
          {dayEntries.length > 0 && <Label style={{ fontSize: 11 }}>{plural(dayEntries.length, 'exercício', 'exercícios')}</Label>}
        </Row>

        {dayEntries.length > 0 ? (
          <>
            <View style={{ marginTop: spacing(1), marginBottom: spacing(0.5) }}>
              <GroupTags groups={trainedByDay[selected] || []} />
            </View>
            <EntryRows entries={dayEntries} />
            <Button
              title="Adicionar a este dia"
              variant="ghost"
              icon={<Ionicons name="add" size={18} color={colors.text} />}
              onPress={logOnDay}
              style={{ marginTop: spacing(1.5) }}
            />
          </>
        ) : (
          <>
            <Small style={{ marginTop: spacing(1) }}>
              {selected === todayISO()
                ? 'Você ainda não registrou nada hoje.'
                : 'Nenhum treino neste dia. Esqueceu de registrar? Dá para marcar agora.'}
            </Small>
            <Button
              title={selected === todayISO() ? 'Registrar treino de hoje' : `Registrar treino em ${formatBR(selected).slice(0, 5)}`}
              icon={<Ionicons name="add" size={18} color="#fff" />}
              onPress={logOnDay}
              style={{ marginTop: spacing(1.5) }}
            />
          </>
        )}
      </Card>

      {/* Guia: há quantos dias cada grupo não é treinado */}
      {workouts.length > 0 && (
        <>
          <SectionHeader title="Desde o último treino" />
          <Card>
            <Row style={{ flexWrap: 'wrap' }}>
              {restByGroup.map(({ g, days }) => (
                <View key={g} style={{ width: '33.33%', paddingVertical: spacing(0.75) }}>
                  <Row>
                    <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: groupColor[g], marginRight: 5 }} />
                    <Label color={colors.textDim} style={{ fontSize: 11, letterSpacing: 1 }}>{GROUP_LABELS_PT[g]}</Label>
                  </Row>
                  <Text style={{ fontFamily: fonts.black, fontSize: 22, color: days == null ? colors.textFaint : days >= 7 ? colors.primaryBright : colors.text, marginTop: 2 }}>
                    {days == null ? '—' : days === 0 ? 'Hoje' : `${days}d`}
                  </Text>
                </View>
              ))}
            </Row>
            <Tiny style={{ marginTop: spacing(0.5) }}>Em vermelho: 7 dias ou mais sem treinar.</Tiny>
          </Card>
        </>
      )}

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

      {workouts.length === 0 && (
        <Card style={{ alignItems: 'center', paddingVertical: spacing(3.5), paddingHorizontal: spacing(3) }}>
          <View style={{ width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: hexA(colors.primary, 0.14) }}>
            <Ionicons name="barbell-outline" size={26} color={colors.primaryBright} />
          </View>
          <H3 style={{ marginTop: spacing(1.5), textAlign: 'center' }}>Sua linha do tempo começa no primeiro treino</H3>
          <Small style={{ marginTop: spacing(0.5), textAlign: 'center' }}>Cada registro entra aqui com o percentil de cada exercício.</Small>
        </Card>
      )}

      {sortedLogs.map((log) => (
        <Card key={log.id} onPress={() => setSelected(log.date)}>
          <Row style={{ justifyContent: 'space-between', marginBottom: spacing(1) }}>
            <Row>
              <Ionicons name="calendar-outline" size={15} color={colors.textDim} style={{ marginRight: 6 }} />
              <H3 style={{ fontSize: 15 }}>{formatBR(log.date)}</H3>
            </Row>
            <Label style={{ fontSize: 11 }}>{plural(log.entries.length, 'exercício', 'exercícios')}</Label>
          </Row>
          <EntryRows entries={log.entries} />
          {log.note ? <Small style={{ marginTop: spacing(0.75), color: colors.textFaint }}>📝 {log.note}</Small> : null}
        </Card>
      ))}

      {/* Marcas do cadastro: o ponto de partida do radar, não um treino */}
      {baseline && (
        <>
          <SectionHeader title="Suas marcas iniciais" />
          <Card style={{ borderStyle: 'dashed', borderColor: colors.glassBorderStrong }}>
            <Row style={{ alignItems: 'flex-start', marginBottom: spacing(1) }}>
              <Ionicons name="flag-outline" size={16} color={colors.textDim} style={{ marginRight: 8, marginTop: 2 }} />
              <Small style={{ flex: 1 }}>
                O que você disse que aguenta no cadastro ({formatBR(baseline.date)}). É o ponto de partida do
                radar e não conta como treino. Cada treino novo atualiza o exercício correspondente.
              </Small>
            </Row>
            <EntryRows entries={baseline.entries} />
          </Card>
        </>
      )}
    </Screen>
  );
}
