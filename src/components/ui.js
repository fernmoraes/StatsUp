// Biblioteca de UI do StatsUp — visual atlético da logo: vermelho sólido,
// carvão quente, tipografia condensada pesada.
import React, { forwardRef, useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, font, fonts, gradients, shadow, hexA, tabular } from '../theme';
import { KeyboardScrollContext, useKeyboardAvoid } from './keyboard';

const LOGO_MARK = require('../../assets/logo/logo-mark.png');
const LOGO_FULL = require('../../assets/logo/logo-white.png');

/* ------------------------------------------------------------------ fundo */
// Carvão quente + um único brilho vermelho vindo do topo (cor da logo).
export function ScreenBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradients.screen} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="topGlow" cx="85%" cy="0%" rx="75%" ry="40%">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.20" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#topGlow)" />
      </Svg>
    </View>
  );
}

// Tela base. Cuida do teclado: ganha espaço embaixo quando ele abre e rola o
// campo focado para a vista. Com scroll={false}, a lista da tela deve ser um
// <KeyboardAwareList> (ou receber `scrollRef` + onScroll do contexto).
export function Screen({ children, scroll = true, contentStyle, edges = true, scrollRef: externalScrollRef, keyboardExtra = 0 }) {
  const insets = useSafeAreaInsets();
  const rootRef = useRef(null);
  const ownScrollRef = useRef(null);
  const scrollRef = scroll ? ownScrollRef : externalScrollRef || ownScrollRef;
  const kb = useKeyboardAvoid({ rootRef, scrollRef, extraBottom: keyboardExtra });
  const padding = {
    paddingTop: (edges ? insets.top : 0) + spacing(1),
    paddingBottom: (kb.overlap ? kb.overlap : insets.bottom) + spacing(4),
    paddingHorizontal: spacing(2.5),
  };
  return (
    <KeyboardScrollContext.Provider value={kb}>
      <View ref={rootRef} style={styles.screen} onLayout={kb.onRootLayout}>
        <ScreenBackground />
        {scroll ? (
          <ScrollView
            ref={ownScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={[padding, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={kb.onScroll}
            scrollEventThrottle={16}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
        )}
      </View>
    </KeyboardScrollContext.Provider>
  );
}

// Para listas dentro de <Screen scroll={false}>: repassa o onScroll do teclado.
export function useScreenKeyboard() {
  return useContext(KeyboardScrollContext);
}

/* ------------------------------------------------------------------ input */
// Campo padrão: tema escuro, borda vermelha no foco e rola para a vista
// quando focado com o teclado já aberto (ex.: botão "Próximo").
export const Input = forwardRef(function Input({ style, onFocus, onBlur, big, ...props }, ref) {
  const { ensureVisible } = useContext(KeyboardScrollContext);
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textFaint}
      selectionColor={colors.primaryBright}
      cursorColor={colors.primaryBright}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        ensureVisible();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[styles.input, big && styles.inputBig, focused && styles.inputFocused, style]}
    />
  );
});

/* ------------------------------------------------------------------ marca */
// Torso da logo (branco, fundo transparente). `boxed` = selo vermelho.
export function BrandMark({ size = 28, boxed, style }) {
  const img = (
    <Image source={LOGO_MARK} style={{ width: size, height: size * 0.81 }} resizeMode="contain" accessibilityLabel="StatsUp" />
  );
  if (!boxed) return <View style={style}>{img}</View>;
  const box = Math.round(size * 1.6);
  return (
    <View style={[styles.brandBox, { width: box, height: box, borderRadius: Math.round(box * 0.26) }, shadow(8, colors.primary), style]}>
      {img}
    </View>
  );
}

// Logo completa (torso + STATS UP).
export function BrandLogo({ height = 120, style }) {
  return (
    <Image source={LOGO_FULL} style={[{ height, width: height * 0.63 }, style]} resizeMode="contain" accessibilityLabel="StatsUp" />
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
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

// Card com gradiente (destaques).
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

// Display/H1/H2 em Barlow Condensed — o mesmo peso atlético do "STATS UP" da logo.
export const Display = T(font.display, fonts.heavy, colors.text, { letterSpacing: -0.5, ...tabular });
export const H1 = T(font.h1, fonts.black, colors.text, { letterSpacing: 0.2, textTransform: 'uppercase', lineHeight: font.h1 + 4 });
export const H2 = T(font.h2, fonts.extra, colors.text, { letterSpacing: 0.1, ...tabular });
export const H3 = T(font.h3, fonts.bold, colors.text, { letterSpacing: -0.1 });
export const Body = T(font.body, fonts.regular, colors.text, { lineHeight: 22 });
export const Small = T(font.small, fonts.regular, colors.textDim, { lineHeight: 19 });
export const Tiny = T(font.tiny, fonts.semibold, colors.textFaint, { letterSpacing: 0.4 });

// Rótulo de seção: condensado, caixa-alta, tracking aberto.
export function Label({ children, style, color = colors.textFaint }) {
  return (
    <Text
      style={[
        { fontSize: 12, fontFamily: fonts.cond, color, letterSpacing: 1.6, textTransform: 'uppercase' },
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
    <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1.25), marginTop: spacing(1.5) }}>
      <Row style={{ alignItems: 'center' }}>
        <View style={[styles.slash, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </Row>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Small style={{ color: colors.primaryBright, fontFamily: fonts.semibold }}>{action}</Small>
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
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [
          { borderRadius: radius.md },
          !disabled && shadow(8, colors.primary),
          disabled && { opacity: 0.4 },
          pressed && styles.pressed,
          style,
        ]}
      >
        {({ pressed }) => (
          <LinearGradient
            colors={pressed ? [colors.primaryDeep, colors.primaryDeep] : gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.btn}
          >
            {icon}
            <Text style={[styles.btnText, icon && { marginLeft: 8 }]}>{title}</Text>
          </LinearGradient>
        )}
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        disabled && { opacity: 0.4 },
        pressed && styles.pressed,
        pressed && variant === 'ghost' && { backgroundColor: colors.surfaceAlt },
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
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: hexA(color, 0.18), borderColor: color },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.chipText, active && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

// Selo retangular (não pílula), condensado.
export function Badge({ label, color = colors.primary, solid, style }) {
  return (
    <View
      style={[
        styles.badge,
        solid ? { backgroundColor: color } : { backgroundColor: hexA(color, 0.14), borderColor: hexA(color, 0.45), borderWidth: 1 },
        style,
      ]}
    >
      <Text style={[styles.badgeText, { color: solid ? colors.onPrimary : color === colors.primary ? colors.primaryBright : color }]}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------- progresso */
export function ProgressBar({ value, gradient = gradients.brand, height = 10, track = colors.surfaceAlt }) {
  const w = Math.max(2, Math.min(100, value || 0));
  return (
    <View style={{ height, backgroundColor: track, borderRadius: 3, overflow: 'hidden' }}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: '100%', width: `${w}%`, borderRadius: 3 }}
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

// Carregamento: selo da marca pulsando (em vez de spinner genérico).
export function Loader() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  return (
    <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
      <ScreenBackground />
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <BrandMark size={34} boxed />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  brandBox: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing(2),
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  gradientCard: { borderColor: colors.glassBorderStrong, overflow: 'hidden' },
  slash: { width: 4, height: 18, borderRadius: 1, marginRight: spacing(1), transform: [{ skewX: '-14deg' }] },
  sectionTitle: { fontSize: 20, fontFamily: fonts.black, color: colors.text, letterSpacing: 0.4, textTransform: 'uppercase' },
  btn: {
    flexDirection: 'row',
    borderRadius: radius.md,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(3),
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorderStrong },
  btnDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: hexA(colors.bad, 0.5) },
  btnText: { color: colors.onPrimary, fontSize: 17, fontFamily: fonts.extra, letterSpacing: 1, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    color: colors.text,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1.5),
    fontSize: font.body,
    fontFamily: fonts.semibold,
    minWidth: 0,
  },
  inputBig: {
    textAlign: 'center',
    fontSize: 26,
    fontFamily: fonts.black,
    paddingVertical: spacing(1),
    fontVariant: ['tabular-nums'],
  },
  inputFocused: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  chip: {
    paddingVertical: spacing(0.9),
    paddingHorizontal: spacing(1.75),
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
    marginRight: spacing(1),
    marginBottom: spacing(1),
  },
  chipText: { color: colors.textDim, fontSize: 14, fontFamily: fonts.cond, letterSpacing: 0.6, textTransform: 'uppercase' },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontFamily: fonts.extra, letterSpacing: 0.8, textTransform: 'uppercase' },
});
