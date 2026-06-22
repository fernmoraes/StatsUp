import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/state/AppContext';
import {
  Screen, H1, H3, Body, Small, Tiny, Label,
  Card, Button, Row, Badge, Divider,
} from '../../src/components/ui';
import { colors, spacing, radius, font, fonts, gradients, hexA } from '../../src/theme';
import { GOALS, getGoal } from '../../src/data/goals';
import { ageFromBirthDate } from '../../src/data/levels';

const input = {
  backgroundColor: colors.glass,
  borderRadius: radius.sm,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  color: colors.text,
  paddingHorizontal: spacing(1.75),
  paddingVertical: spacing(1.5),
  fontSize: font.body,
  fontFamily: fonts.bold,
};

function InfoCol({ label, value }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Body style={{ fontFamily: fonts.extra, fontSize: 18 }}>{value}</Body>
      <Tiny style={{ marginTop: 2 }}>{label}</Tiny>
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const { profile, updateProfile, resetAll } = useApp();
  const [weight, setWeight] = useState(profile ? String(profile.bodyweight_kg) : '');

  if (!profile) return null;
  const age = ageFromBirthDate(profile.birth_date);
  const goal = getGoal(profile.goal);

  const saveWeight = async () => {
    const w = Number(weight);
    if (w > 0) {
      await updateProfile({ bodyweight_kg: w });
      Alert.alert('Peso atualizado', 'Novos registros usarão este peso. O histórico é preservado.');
    }
  };

  const confirmReset = () => {
    Alert.alert('Apagar tudo?', 'Isso remove perfil e todos os treinos. Não dá pra desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => { await resetAll(); router.replace('/onboarding'); } },
    ]);
  };

  return (
    <Screen>
      <H1 style={{ marginBottom: spacing(1.5) }}>Perfil</H1>

      {/* Cartão de identidade */}
      <Card strong style={{ alignItems: 'center', paddingVertical: spacing(2.5) }}>
        <LinearGradient colors={gradients.brand} style={styles.avatar}>
          <Ionicons name={profile.sex === 'male' ? 'male' : 'female'} size={28} color="#fff" />
        </LinearGradient>
        <Row style={{ marginTop: spacing(1.5) }}>
          {goal && <Badge label={`${goal.emoji} ${goal.label}`} color={colors.primary} />}
        </Row>
        <Divider style={{ alignSelf: 'stretch' }} />
        <Row style={{ alignSelf: 'stretch' }}>
          <InfoCol label="SEXO" value={profile.sex === 'male' ? 'M' : 'F'} />
          <InfoCol label="IDADE" value={age != null ? age : '—'} />
          <InfoCol label="ALTURA" value={`${profile.height_cm}`} />
          <InfoCol label="PESO" value={`${profile.bodyweight_kg}`} />
        </Row>
      </Card>

      {/* Peso */}
      <Card>
        <Row style={{ alignItems: 'center', marginBottom: spacing(1) }}>
          <Ionicons name="scale-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <H3>Peso corporal</H3>
        </Row>
        <Small style={{ marginBottom: spacing(1.25) }}>Recalcula os percentis dos próximos registros.</Small>
        <Row>
          <TextInput style={[input, { flex: 1, marginRight: spacing(1), textAlign: 'center' }]} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholder="kg" placeholderTextColor={colors.textFaint} />
          <Button title="Salvar" onPress={saveWeight} style={{ paddingHorizontal: spacing(3) }} />
        </Row>
      </Card>

      {/* Objetivo */}
      <Card>
        <Row style={{ alignItems: 'center', marginBottom: spacing(1.25) }}>
          <Ionicons name="flag-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <H3>Objetivo</H3>
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {GOALS.map((g) => {
            const active = profile.goal === g.id;
            return (
              <Pressable key={g.id} onPress={() => updateProfile({ goal: g.id })} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && { color: colors.text, fontFamily: fonts.semibold }]}>{g.emoji} {g.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Idade */}
      <Card>
        <Row style={{ alignItems: 'center', marginBottom: spacing(1) }}>
          <Ionicons name="hourglass-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <H3>Comparação por idade</H3>
        </Row>
        <Small style={{ marginBottom: spacing(1.25) }}>"Gentil" compara você com a sua faixa etária em vez de todos os adultos.</Small>
        <Row>
          {[['absolute', 'Todos os adultos'], ['age_adjusted', `Minha idade${age != null ? ` (${age})` : ''}`]].map(([v, label]) => {
            const active = profile.age_compare_mode === v;
            return (
              <Pressable key={v} onPress={() => updateProfile({ age_compare_mode: v })} style={[styles.seg, active && styles.segActive]}>
                <Text style={[styles.segText, active && { color: colors.text, fontFamily: fonts.bold }]}>{label}</Text>
              </Pressable>
            );
          })}
        </Row>
        <Tiny style={{ marginTop: spacing(1) }}>Aplica-se aos próximos registros.</Tiny>
      </Card>

      <Button title="Apagar dados e recomeçar" variant="danger" icon={<Ionicons name="trash-outline" size={16} color={colors.bad} />} onPress={confirmReset} style={{ marginTop: spacing(0.5) }} />

      <Small style={{ textAlign: 'center', marginTop: spacing(2.5), color: colors.textFaint }}>
        StatsUp · força em percentil · 100% offline
      </Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chip: {
    paddingVertical: spacing(1), paddingHorizontal: spacing(1.75), borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass,
    marginRight: spacing(1), marginBottom: spacing(1),
  },
  chipActive: { borderColor: colors.primary, backgroundColor: hexA(colors.primary, 0.16) },
  chipText: { color: colors.textDim, fontSize: font.small, fontFamily: fonts.medium },
  seg: {
    flex: 1, paddingVertical: spacing(1.5), borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing(1),
  },
  segActive: { borderColor: colors.primary, backgroundColor: hexA(colors.primary, 0.16) },
  segText: { color: colors.textDim, fontFamily: fonts.medium, fontSize: font.small },
});
