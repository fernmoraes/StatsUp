// Biblioteca de UI do StatsUp — visual premium (glass + gradiente + glow).
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, font, fonts, gradients, shadow, hexA } from '../theme';

/* ------------------------------------------------------------------ fundo */
export function ScreenBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradients.screen} style={StyleSheet.absoluteFill} />
      {/* auroras decorativas */}
      <View style={[styles.blob, { top: -120, right: -90, backgroundColor: hexA(colors.primary, 0.16) }]} />
      <View style={[styles.blob, { top: 180, left: -130, backgroundColor: hexA(colors.violet, 0.12) }]} />
      <View style={[styles.blob, { bottom: -120, right: -80, backgroundColor: hexA(colors.cyan, 0.08) }]} />
    </View>
  );
}

export function Screen({ children, scroll = true, contentStyle, edges = true }) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: (edges ? insets.top : 0) + spacing(1),
    paddingBottom: insets.bottom + spacing(4),
    paddingHorizontal: spacing(2.5),
  };
  return (
    <View style={styles.screen}>
      <ScreenBackground />
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ cards */
export function Card({ children, style, accent, strong, onPress }) {
  const base = [
    styles.card,
    strong && { backgroundColor: colors.glassStrong, borderColor: colors.glassBorderStrong },
    accent && { borderLeftColor: accent, borderLeftWidth: 3 },
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

// Card com brilho de gradiente sutil no topo (para destaques).
export function GradientCard({ children, style, gradient = gradients.hero, glow }) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, styles.gradientCard, glow ? shadow(10, glow) : null, style]}
    >
      {children}
    </LinearGradient>
  );
}

/* ------------------------------------------------------------ tipografia */
const T = (size, family, color, extra) =>
  function TextComp({ children, style, numberOfLines }) {
    return (
      <Text
        numberOfLines={numberOfLines}
        style={[{ fontSize: size, fontFamily: family, color }, extra, style]}
      >
        {children}
      </Text>
    );
  };

export const Display = T(font.display, fonts.black, colors.text, { letterSpacing: -1.5 });
export const H1 = T(font.h1, fonts.extra, colors.text, { letterSpacing: -0.7 });
export const H2 = T(font.h2, fonts.bold, colors.text, { letterSpacing: -0.4 });
export const H3 = T(font.h3, fonts.bold, colors.text, { letterSpacing: -0.2 });
export const Body = T(font.body, fonts.regular, colors.text, { lineHeight: 22 });
export const Small = T(font.small, fonts.regular, colors.textDim, { lineHeight: 19 });
export const Tiny = T(font.tiny, fonts.semibold, colors.textFaint, {});

// Rótulo de seção em caixa-alta com tracking.
export function Label({ children, style, color = colors.textFaint }) {
  return (
    <Text
      style={[
        { fontSize: 11, fontFamily: fonts.bold, color, letterSpacing: 1.4, textTransform: 'uppercase' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* -------------------------------------------------------------- section */
export function SectionHeader({ title, action, onAction, accent = colors.primary }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1.25), marginTop: spacing(1) }}>
      <Row style={{ alignItems: 'center' }}>
        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: accent, marginRight: spacing(1) }} />
        <H3>{title}</H3>
      </Row>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Small style={{ color: accent, fontFamily: fonts.semibold }}>{action}</Small>
        </Pressable>
      ) : null}
    </Row>
  );
}

/* --------------------------------------------------------------- botões */
export function Button({ title, onPress, variant = 'primary', disabled, style, icon }) {
  if (variant === 'primary') {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        style={({ pressed }) => [{ borderRadius: radius.pill }, disabled && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.98 }] }, shadow(8, colors.primary), style]}
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btn}
        >
          {icon}
          <Text style={[styles.btnText, icon && { marginLeft: 8 }]}>{title}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.btnText,
          icon && { marginLeft: 8 },
          variant === 'ghost' && { color: colors.text },
          variant === 'danger' && { color: colors.bad },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/* ---------------------------------------------------------- chips/badges */
export function Chip({ label, active, onPress, color = colors.primary, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: hexA(color, 0.18), borderColor: color },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <Text style={[styles.chipText, active && { color: colors.text, fontFamily: fonts.semibold }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, color = colors.primary, solid, style }) {
  return (
    <View
      style={[
        styles.badge,
        solid ? { backgroundColor: color } : { backgroundColor: hexA(color, 0.16), borderColor: hexA(color, 0.5), borderWidth: 1 },
        style,
      ]}
    >
      <Text style={[styles.badgeText, { color: solid ? '#06080F' : color }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------- progresso */
export function ProgressBar({ value, gradient = gradients.brand, height = 10, track = colors.glassStrong }) {
  const w = Math.max(2, Math.min(100, value || 0));
  return (
    <View style={{ height, backgroundColor: track, borderRadius: height, overflow: 'hidden' }}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: '100%', width: `${w}%`, borderRadius: height }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ misc */
export function Divider({ style }) {
  return <View style={[{ height: 1, backgroundColor: colors.glassBorder, marginVertical: spacing(1.5) }, style]} />;
}

export function Row({ children, style }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Loader() {
  return (
    <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
      <ScreenBackground />
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  blob: { position: 'absolute', width: 320, height: 320, borderRadius: 320 },
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing(2),
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  gradientCard: { borderColor: colors.glassBorderStrong, overflow: 'hidden' },
  btn: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorderStrong },
  btnDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: hexA(colors.bad, 0.5) },
  btnText: { color: '#fff', fontSize: font.body, fontFamily: fonts.bold, letterSpacing: 0.2 },
  chip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    marginRight: spacing(1),
    marginBottom: spacing(1),
  },
  chipText: { color: colors.textDim, fontSize: font.small, fontFamily: fonts.medium },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.3 },
});
