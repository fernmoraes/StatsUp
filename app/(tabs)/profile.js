import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { currentVersionName } from '../../src/services/appVersion';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/state/AppContext';
import {
  Screen, H1, H3, Body, Small, Tiny, Label,
  Card, Button, Row, Badge, Divider, BrandMark, Input,
} from '../../src/components/ui';
import { colors, spacing, radius, font, fonts, gradients, hexA } from '../../src/theme';
import { GOALS, getGoal } from '../../src/data/goals';
import { useDialog } from '../../src/components/dialog';
import { ageFromBirthDate } from '../../src/data/levels';

function InfoCol({ label, value, unit }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Row style={{ alignItems: 'baseline' }}>
        <Text style={{ fontFamily: fonts.black, fontSize: 28, color: colors.text, fontVariant: ['tabular-nums'] }}>{value}</Text>
        {unit ? <Text style={{ fontFamily: fonts.cond, fontSize: 13, color: colors.textFaint, marginLeft: 2 }}>{unit}</Text> : null}
      </Row>
      <Label style={{ fontSize: 10, letterSpacing: 1.2 }}>{label}</Label>
    </View>
  );
}

// Estado da sincronização com a nuvem (sempre com ícone + texto).
const SYNC_UI = {
  idle: { icon: 'cloud-outline', color: colors.textFaint, text: 'Conectando à nuvem…' },
  syncing: { icon: 'sync', color: colors.textDim, text: 'Sincronizando…' },
  synced: { icon: 'cloud-done-outline', color: colors.good, text: 'Tudo salvo na nuvem' },
  pending: { icon: 'cloud-upload-outline', color: colors.warn, text: 'Alterações aguardando envio' },
  offline: { icon: 'cloud-offline-outline', color: colors.warn, text: 'Sem internet · salvo no aparelho, envia quando conectar' },
  error: { icon: 'alert-circle-outline', color: colors.bad, text: 'Não foi possível sincronizar' },
};

function SyncRow({ state, onRetry }) {
  const ui = SYNC_UI[state] || SYNC_UI.idle;
  const canRetry = state === 'offline' || state === 'error' || state === 'pending';
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(1.5) }}>
      <Ionicons name={ui.icon} size={20} color={ui.color} style={{ marginRight: spacing(1.25) }} />
      <Small style={{ flex: 1, color: colors.text }}>{ui.text}</Small>
      {canRetry ? (
        <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
          <Text style={{ color: colors.primaryBright, fontFamily: fonts.bold }}>Tentar de novo</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export default function Profile() {
  const router = useRouter();
  const { user, profile, updateProfile, signOut, syncState, syncNow, openTutorial } = useApp();
  const { confirm, toast } = useDialog();
  const [weight, setWeight] = useState(profile ? String(profile.bodyweight_kg) : '');

  if (!profile) return null;
  const age = ageFromBirthDate(profile.birth_date);
  const goal = getGoal(profile.goal);

  const saveWeight = async () => {
    const w = Number(weight);
    Keyboard.dismiss();
    if (w > 0) {
      await updateProfile({ bodyweight_kg: w });
      toast({ title: 'Peso atualizado', message: 'Os próximos registros usam este peso. O histórico continua igual.' });
    }
  };

  // Sair não apaga nada: perfil e treinos ficam salvos para o próximo login.
  const doSignOut = async () => {
    await signOut();
    router.replace('/login');
  };
  const confirmSignOut = async () => {
    const ok = await confirm({
      title: 'Sair da conta?',
      message: 'Seus treinos continuam salvos na sua conta. É só entrar de novo com seu e-mail e senha.',
      icon: 'log-out-outline',
      tone: 'danger',
      confirmText: 'Sair',
      confirmIcon: 'log-out-outline',
    });
    if (ok) doSignOut();
  };

  const displayName = (user && user.name) || profile.name || '';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <Screen>
      <Label>Você</Label>
      <H1 style={{ marginTop: 2, marginBottom: spacing(1.5) }}>Perfil</H1>

      {/* Cartão de identidade */}
      <Card strong style={{ alignItems: 'center', paddingVertical: spacing(2.5) }}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          {initials ? (
            <Text style={styles.initials}>{initials}</Text>
          ) : (
            <Ionicons name={profile.sex === 'male' ? 'male' : 'female'} size={28} color="#fff" />
          )}
        </LinearGradient>
        {displayName ? <H3 style={{ marginTop: spacing(1.25), fontSize: 20 }}>{displayName}</H3> : null}
        {user ? <Small style={{ marginTop: 2 }}>{user.email}</Small> : null}
        <Row style={{ marginTop: spacing(1.25) }}>
          {goal && <Badge label={`${goal.emoji} ${goal.label}`} color={colors.textDim} />}
        </Row>
        <Divider style={{ alignSelf: 'stretch' }} />
        <Row style={{ alignSelf: 'stretch' }}>
          <InfoCol label="Sexo" value={profile.sex === 'male' ? 'M' : 'F'} />
          <InfoCol label="Idade" value={age != null ? age : '—'} />
          <InfoCol label="Altura" value={`${profile.height_cm}`} unit="cm" />
          <InfoCol label="Peso" value={`${profile.bodyweight_kg}`} unit="kg" />
        </Row>
      </Card>

      {/* Peso */}
      <Card>
        <Row style={{ alignItems: 'center', marginBottom: spacing(1) }}>
          <Ionicons name="scale-outline" size={18} color={colors.primaryBright} style={{ marginRight: 8 }} />
          <H3>Peso corporal</H3>
        </Row>
        <Small style={{ marginBottom: spacing(1.25) }}>Recalcula os percentis dos próximos registros.</Small>
        <Row>
          <Input
            style={{ flex: 1, marginRight: spacing(1), textAlign: 'center', fontFamily: fonts.bold }}
            keyboardType="decimal-pad" returnKeyType="done" placeholder="kg"
            value={weight} onChangeText={(t) => setWeight(t.replace(',', '.').replace(/[^0-9.]/g, ''))}
            onSubmitEditing={saveWeight}
          />
          <Button title="Salvar" onPress={saveWeight} style={{ paddingHorizontal: spacing(3) }} />
        </Row>
      </Card>

      {/* Objetivo */}
      <Card>
        <Row style={{ alignItems: 'center', marginBottom: spacing(1.25) }}>
          <Ionicons name="flag-outline" size={18} color={colors.primaryBright} style={{ marginRight: 8 }} />
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
          <Ionicons name="hourglass-outline" size={18} color={colors.primaryBright} style={{ marginRight: 8 }} />
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

      <SyncRow state={syncState} onRetry={syncNow} />

      <Card onPress={openTutorial} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(1.5) }}>
        <Ionicons name="school-outline" size={20} color={colors.primaryBright} style={{ marginRight: spacing(1.25) }} />
        <Small style={{ flex: 1, color: colors.text }}>Ver o tutorial de novo</Small>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </Card>

      <Button title="Sair da conta" variant="danger" icon={<Ionicons name="log-out-outline" size={18} color={colors.bad} />} onPress={confirmSignOut} style={{ marginTop: spacing(0.5) }} />

      <View style={{ alignItems: 'center', marginTop: spacing(3), opacity: 0.55 }}>
        <BrandMark size={26} />
        <Small style={{ textAlign: 'center', marginTop: spacing(1), color: colors.textFaint }}>
          StatsUp · força em percentil · funciona offline
        </Small>
        <Small style={{ textAlign: 'center', marginTop: 2, color: colors.textFaint }}>
          Versão {currentVersionName() || '—'}
        </Small>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontFamily: fonts.heavy, fontSize: 28, letterSpacing: 0.5 },
  chip: {
    paddingVertical: spacing(1), paddingHorizontal: spacing(1.75), borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass,
    marginRight: spacing(1), marginBottom: spacing(1),
  },
  chipActive: { borderColor: colors.primary, backgroundColor: hexA(colors.primary, 0.18) },
  chipText: { color: colors.textDim, fontSize: font.small, fontFamily: fonts.medium },
  seg: {
    flex: 1, paddingVertical: spacing(1.5), borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing(1),
  },
  segActive: { borderColor: colors.primary, backgroundColor: hexA(colors.primary, 0.18) },
  segText: { color: colors.textDim, fontFamily: fonts.medium, fontSize: font.small },
});
