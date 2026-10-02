// Excluir conta (LGPD): explica o que será apagado e pede a senha de novo.
import React, { useState } from 'react';
import { View, Text, Pressable, Keyboard, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/state/AppContext';
import { Screen, H1, Body, Label, Button, Card, Row } from '../src/components/ui';
import { PasswordField, FormError } from '../src/components/authForm';
import { colors, fonts, radius, spacing, hexA } from '../src/theme';

const WHAT_GOES = [
  ['person-outline', 'Sua conta (nome, e-mail e senha)'],
  ['body-outline', 'Seu perfil (sexo, nascimento, altura e peso)'],
  ['barbell-outline', 'Todos os treinos e as marcas do cadastro'],
  ['phone-portrait-outline', 'A cópia salva neste celular'],
];

export default function DeleteAccount() {
  const router = useRouter();
  const { user, deleteAccount } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    Keyboard.dismiss();
    if (!password) {
      setError('Digite sua senha para confirmar.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await deleteAccount(password);
      router.replace({ pathname: '/login', params: { notice: 'deleted' } });
    } catch (e) {
      setError(e.message || 'Não foi possível excluir a conta. Tente de novo.');
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Voltar" style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>

      <View style={styles.iconTile}>
        <Ionicons name="trash-outline" size={28} color={colors.bad} />
      </View>
      <Label>Conta {user ? `· ${user.email}` : ''}</Label>
      <H1 style={{ marginTop: 4 }}>Excluir conta</H1>
      <Body style={{ color: colors.textDim, marginTop: spacing(1) }}>
        Isso apaga tudo de forma permanente. Não dá para desfazer e não há como recuperar depois.
      </Body>

      <Card style={{ marginTop: spacing(2.5) }}>
        <Label style={{ marginBottom: spacing(1.25) }}>O que será apagado</Label>
        {WHAT_GOES.map(([icon, text]) => (
          <Row key={text} style={{ marginBottom: spacing(1) }}>
            <Ionicons name={icon} size={18} color={colors.bad} style={{ marginRight: spacing(1.25) }} />
            <Text style={styles.item}>{text}</Text>
          </Row>
        ))}
        <Text style={styles.note}>
          Cópias de segurança criptografadas do banco são apagadas automaticamente em até 90 dias.
        </Text>
      </Card>

      <View style={{ marginTop: spacing(1) }}>
        <FormError message={error} />
        <PasswordField
          label="Confirme com sua senha"
          value={password}
          onChangeText={(t) => { setPassword(t); setError(''); }}
          placeholder="Sua senha"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>

      <Button
        title={loading ? 'Excluindo…' : 'Excluir minha conta'}
        icon={<Ionicons name="trash-outline" size={18} color="#fff" />}
        onPress={submit}
        disabled={loading}
      />
      <Button title="Cancelar" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing(1) }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 44, height: 44, borderRadius: radius.md, marginBottom: spacing(2),
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  iconTile: {
    width: 56, height: 56, borderRadius: radius.md, marginBottom: spacing(2),
    alignItems: 'center', justifyContent: 'center', backgroundColor: hexA(colors.bad, 0.14),
  },
  item: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 15 },
  note: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, marginTop: spacing(0.5) },
});
