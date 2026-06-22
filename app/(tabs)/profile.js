import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/state/AppContext';
import { Screen, H1, H3, Body, Small, Card, Button, Row } from '../../src/components/ui';
import { colors, spacing, radius, font } from '../../src/theme';
import { GOALS } from '../../src/data/goals';
import { ageFromBirthDate } from '../../src/data/levels';

const input = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radius.sm,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  paddingHorizontal: spacing(1.5),
  paddingVertical: spacing(1.25),
  fontSize: font.body,
};

export default function Profile() {
  const router = useRouter();
  const { profile, updateProfile, resetAll } = useApp();
  const [weight, setWeight] = useState(profile ? String(profile.bodyweight_kg) : '');

  if (!profile) return null;
  const age = ageFromBirthDate(profile.birth_date);

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
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await resetAll();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  return (
    <Screen>
      <H1>Perfil</H1>

      <Card style={{ marginTop: spacing(1) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Small>Sexo</Small>
          <Body>{profile.sex === 'male' ? 'Masculino' : 'Feminino'}</Body>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: spacing(0.5) }}>
          <Small>Idade</Small>
          <Body>{age != null ? `${age} anos` : '—'}</Body>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: spacing(0.5) }}>
          <Small>Altura</Small>
          <Body>{profile.height_cm} cm</Body>
        </Row>
      </Card>

      <Card>
        <H3>Peso corporal</H3>
        <Small style={{ marginBottom: spacing(1) }}>
          Recalcula os percentis dos próximos registros (§12).
        </Small>
        <Row>
          <TextInput
            style={[input, { flex: 1, marginRight: spacing(1) }]}
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
            placeholder="kg"
            placeholderTextColor={colors.textFaint}
          />
          <Button title="Salvar" onPress={saveWeight} style={{ paddingHorizontal: spacing(3) }} />
        </Row>
      </Card>

      <Card>
        <H3 style={{ marginBottom: spacing(1) }}>Objetivo</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {GOALS.map((g) => {
            const active = profile.goal === g.id;
            return (
              <Pressable
                key={g.id}
                onPress={() => updateProfile({ goal: g.id })}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && { color: colors.text }]}>
                  {g.emoji} {g.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <H3>Comparação por idade</H3>
        <Small style={{ marginBottom: spacing(1) }}>
          "Gentil" compara você com a sua faixa etária em vez de todos os adultos.
        </Small>
        <Row>
          {[
            ['absolute', 'Todos os adultos'],
            ['age_adjusted', `Minha idade${age != null ? ` (${age})` : ''}`],
          ].map(([v, label]) => {
            const active = profile.age_compare_mode === v;
            return (
              <Pressable
                key={v}
                onPress={() => updateProfile({ age_compare_mode: v })}
                style={[styles.seg, active && styles.segActive]}
              >
                <Text style={[styles.segText, active && { color: colors.text }]}>{label}</Text>
              </Pressable>
            );
          })}
        </Row>
        <Small style={{ marginTop: spacing(1), color: colors.textFaint }}>
          Aplica-se aos próximos registros.
        </Small>
      </Card>

      <Button
        title="Apagar dados e recomeçar"
        variant="danger"
        onPress={confirmReset}
        style={{ marginTop: spacing(1) }}
      />

      <Small style={{ textAlign: 'center', marginTop: spacing(2), color: colors.textFaint }}>
        StatsUp · força em percentil · dados offline
      </Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing(1),
    marginBottom: spacing(1),
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  chipText: { color: colors.textDim, fontSize: font.small, fontWeight: '600' },
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
  segActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  segText: { color: colors.textDim, fontWeight: '600', fontSize: font.small },
});
