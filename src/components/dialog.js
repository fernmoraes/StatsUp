// Diálogos e avisos com a cara do app (substituem Alert.alert/window.confirm,
// que no Android usam o visual do sistema).
//
//   const { confirm, toast } = useDialog();
//   if (await confirm({ title: 'Sair da conta?', message: '…', confirmText: 'Sair' })) …
//   toast({ title: 'Peso atualizado', message: '…' });
//
// <DialogShell> é a "casca" (fundo escuro + cartão animado) também usada por
// outras caixas do app, como o seletor de data.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Animated, Easing, StyleSheet, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './ui';
import { colors, fonts, radius, spacing, hexA, shadow } from '../theme';

const DialogContext = createContext(null);
export const useDialog = () => useContext(DialogContext);

const TONES = {
  default: { icon: 'information-circle', color: colors.primaryBright },
  danger: { icon: 'alert-circle', color: colors.bad },
  success: { icon: 'checkmark-circle', color: colors.good },
};

/* ------------------------------------------------------------------ casca */
export function DialogShell({ visible, onClose, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, anim]);

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            shadow(16),
            {
              opacity: anim,
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
            },
            style,
          ]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/* --------------------------------------------------------------- diálogo */
function DialogView({ dialog, onAnswer }) {
  const d = dialog || {};
  const tone = TONES[d.tone] || TONES.default;
  const close = () => onAnswer(false);
  return (
    <DialogShell visible={!!dialog} onClose={close}>
      <View style={[styles.iconTile, { backgroundColor: hexA(tone.color, 0.14) }]}>
        <Ionicons name={d.icon || tone.icon} size={26} color={tone.color} />
      </View>
      <Text style={styles.title} accessibilityRole="header">{d.title}</Text>
      {d.message ? <Text style={styles.message}>{d.message}</Text> : null}
      <View style={styles.actions}>
        {d.cancelText !== null ? (
          <Button title={d.cancelText || 'Cancelar'} variant="ghost" onPress={close} style={{ flex: 1 }} />
        ) : null}
        <Button
          title={d.confirmText || 'OK'}
          icon={d.confirmIcon ? <Ionicons name={d.confirmIcon} size={18} color="#fff" /> : null}
          onPress={() => onAnswer(true)}
          style={{ flex: 1.3 }}
        />
      </View>
    </DialogShell>
  );
}

/* ------------------------------------------------------------------ aviso */
// Aviso curto no rodapé; some sozinho. Para confirmações que não pedem decisão.
function ToastView({ toast, onHide }) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return undefined;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }).start();
    if (toast.title) AccessibilityInfo.announceForAccessibility?.(`${toast.title}. ${toast.message || ''}`);
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onHide(toast.id));
    }, toast.duration || 2800);
    return () => clearTimeout(t);
  }, [toast, anim, onHide]);

  if (!toast) return null;
  const tone = TONES[toast.tone] || TONES.success;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.toastWrap,
        {
          bottom: insets.bottom + 88, // acima da barra de abas
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      <Pressable onPress={() => onHide(toast.id)} style={[styles.toast, shadow(12)]} accessibilityRole="alert">
        <View style={[styles.toastBar, { backgroundColor: tone.color }]} />
        <Ionicons name={toast.icon || tone.icon} size={22} color={tone.color} style={{ marginRight: spacing(1.25) }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.toastTitle}>{toast.title}</Text>
          {toast.message ? <Text style={styles.toastMsg}>{toast.message}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ---------------------------------------------------------------- provider */
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toastState, setToastState] = useState(null);
  const resolver = useRef(null);

  // Resolve com true (confirmou) ou false (cancelou/fechou).
  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        if (resolver.current) resolver.current(false); // fecha um diálogo anterior
        resolver.current = resolve;
        setDialog(opts);
      }),
    []
  );

  // Diálogo só com "OK".
  const alert = useCallback((opts) => confirm({ cancelText: null, ...opts }).then(() => undefined), [confirm]);

  const answer = useCallback((value) => {
    const r = resolver.current;
    resolver.current = null;
    setDialog(null);
    if (r) r(value);
  }, []);

  const toast = useCallback((opts) => setToastState({ id: Date.now(), ...opts }), []);
  const hideToast = useCallback((id) => setToastState((t) => (t && t.id === id ? null : t)), []);

  return (
    <DialogContext.Provider value={{ confirm, alert, toast }}>
      {children}
      <ToastView toast={toastState} onHide={hideToast} />
      <DialogView dialog={dialog} onAnswer={answer} />
    </DialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, justifyContent: 'center', padding: spacing(2.5),
    backgroundColor: 'rgba(5,3,3,0.74)',
  },
  card: {
    backgroundColor: colors.bg2, borderRadius: radius.xl, padding: spacing(2.5),
    borderWidth: 1, borderColor: colors.glassBorderStrong,
  },
  iconTile: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: fonts.black, fontSize: 26, lineHeight: 30, color: colors.text,
    textTransform: 'uppercase', letterSpacing: 0.3, marginTop: spacing(2),
  },
  message: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textDim, marginTop: spacing(1) },
  actions: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(2.5) },
  toastWrap: { position: 'absolute', left: spacing(2), right: spacing(2), zIndex: 50, elevation: 50 },
  toast: {
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
    paddingVertical: spacing(1.5), paddingLeft: spacing(2), paddingRight: spacing(1.5),
    borderWidth: 1, borderColor: colors.glassBorderStrong,
  },
  toastBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  toastTitle: { fontFamily: fonts.extra, fontSize: 17, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.6 },
  toastMsg: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textDim, marginTop: 1 },
});
