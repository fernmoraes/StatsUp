// Primitivos de UI reutilizáveis.
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, font } from '../theme';

export function Screen({ children, scroll = true, contentStyle }) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + spacing(1),
    paddingBottom: insets.bottom + spacing(3),
    paddingHorizontal: spacing(2),
  };
  if (scroll) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[padding, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.screen, padding, contentStyle]}>{children}</View>;
}

export function Card({ children, style, color }) {
  return (
    <View
      style={[
        styles.card,
        color ? { borderLeftColor: color, borderLeftWidth: 3 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function H1({ children, style }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}
export function H2({ children, style }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}
export function H3({ children, style }) {
  return <Text style={[styles.h3, style]}>{children}</Text>;
}
export function Body({ children, style, dim }) {
  return <Text style={[styles.body, dim && { color: colors.textDim }, style]}>{children}</Text>;
}
export function Small({ children, style, dim }) {
  return (
    <Text style={[styles.small, dim && { color: colors.textDim }, style]}>{children}</Text>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled, style }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <Text
        style={[
          styles.btnText,
          variant === 'ghost' && { color: colors.primary },
          variant === 'danger' && { color: colors.bad },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: (color || colors.primary) + '33', borderColor: color || colors.primary },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.chipText, active && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Loader() {
  return (
    <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function Row({ children, style }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing(2),
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  h1: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  h2: { color: colors.text, fontSize: font.h2, fontWeight: '700' },
  h3: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  body: { color: colors.text, fontSize: font.body, lineHeight: 21 },
  small: { color: colors.textDim, fontSize: font.small, lineHeight: 18 },
  btn: {
    borderRadius: radius.pill,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  btnDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.bad },
  btnText: { color: '#fff', fontSize: font.body, fontWeight: '700' },
  chip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing(1),
    marginBottom: spacing(1),
  },
  chipText: { color: colors.textDim, fontSize: font.small, fontWeight: '600' },
});
