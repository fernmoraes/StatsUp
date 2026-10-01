// Peças das telas de login/cadastro.
import React, { forwardRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark, Display, Body, Label, Input, Row } from './ui';
import { colors, fonts, radius, spacing, hexA } from '../theme';

export function AuthHeader({ title, subtitle }) {
  return (
    <View style={{ marginTop: spacing(3), marginBottom: spacing(3) }}>
      <BrandMark size={28} boxed />
      <Display style={{ marginTop: spacing(3), fontSize: 46, lineHeight: 48, textTransform: 'uppercase' }}>{title}</Display>
      {subtitle ? <Body style={{ color: colors.textDim, marginTop: spacing(1) }}>{subtitle}</Body> : null}
    </View>
  );
}

// Campo com rótulo e mensagem de erro logo abaixo (sem alertas).
export const Field = forwardRef(function Field({ label, error, style, ...props }, ref) {
  return (
    <View style={[{ marginBottom: spacing(2) }, style]}>
      <Label style={{ marginBottom: spacing(0.75) }}>{label}</Label>
      <Input ref={ref} style={error ? styles.inputError : null} {...props} />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
});

// Senha com botão de mostrar/ocultar.
export const PasswordField = forwardRef(function PasswordField({ label = 'Senha', error, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ marginBottom: spacing(2) }}>
      <Label style={{ marginBottom: spacing(0.75) }}>{label}</Label>
      <View>
        <Input
          ref={ref}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={[{ paddingRight: 52 }, error ? styles.inputError : null]}
          {...props}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={styles.eye}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textDim} />
        </Pressable>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
});

export function Checkbox({ checked, onChange, label, hint }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.checkRow, pressed && { opacity: 0.8 }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.checkLabel}>{label}</Text>
        {hint ? <Text style={styles.checkHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <Row style={styles.formError} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={18} color={colors.bad} style={{ marginRight: spacing(1) }} />
      <Text style={styles.formErrorText}>{message}</Text>
    </Row>
  );
}

export function FormNotice({ message }) {
  if (!message) return null;
  return (
    <Row style={styles.formNotice}>
      <Ionicons name="mail-outline" size={18} color={colors.good} style={{ marginRight: spacing(1) }} />
      <Text style={styles.formErrorText}>{message}</Text>
    </Row>
  );
}

export function SwitchLink({ question, action, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ alignSelf: 'center', marginTop: spacing(2.5), padding: spacing(1) }}>
      <Text style={styles.switchText}>
        {question} <Text style={styles.switchAction}>{action}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inputError: { borderColor: colors.bad },
  fieldError: { color: colors.bad, fontFamily: fonts.medium, fontSize: 13, marginTop: 6 },
  eye: {
    position: 'absolute', right: 4, top: 0, bottom: 0, width: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), paddingVertical: spacing(0.5), marginBottom: spacing(2) },
  box: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.glassBorderStrong,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  checkHint: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
  formError: {
    padding: spacing(1.5), borderRadius: radius.md, marginBottom: spacing(2),
    backgroundColor: hexA(colors.bad, 0.12), borderWidth: 1, borderColor: hexA(colors.bad, 0.4),
  },
  formNotice: {
    padding: spacing(1.5), borderRadius: radius.md, marginBottom: spacing(2),
    backgroundColor: hexA(colors.good, 0.12), borderWidth: 1, borderColor: hexA(colors.good, 0.4),
  },
  formErrorText: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  switchText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 15 },
  switchAction: { color: colors.primaryBright, fontFamily: fonts.bold },
});
