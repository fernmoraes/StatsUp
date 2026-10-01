// Abertura animada. Começa idêntica ao splash nativo (fundo vermelho + torso
// de 120dp no centro) para a troca ser invisível, e então:
//   1. o torso "pulsa" duas vezes seguidas (tum-tum), soltando ondas brancas;
//   2. o torso sobe e o "STATS UP" aparece por baixo;
//   3. a barra de carregamento enche enquanto o app carrega;
//   4. a tela vermelha sobe como uma cortina e revela o app.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Image, Animated, Easing, StyleSheet, useWindowDimensions, AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme';

const MARK = require('../../assets/logo/logo-mark.png'); // 369×298
const WORD = require('../../assets/logo/logo-word.png'); // 291×262

const MARK_W = 120; // igual ao `imageWidth` do splash no app.json
const MARK_H = Math.round((MARK_W * 298) / 369);
const WORD_W = 92;
const WORD_H = Math.round((WORD_W * 262) / 291);
const GAP = 14;
const BAR_W = 120;
const BAR_SPACE = 22 + 3; // margem + altura da barra
const RING = Math.round(MARK_W * 1.2);
// Torso, texto e barra formam UMA coluna centralizada pelo flexbox. No início
// ela desce LIFT para o torso ficar no centro exato da tela (igual ao splash
// nativo); quando o texto entra, sobe até o conjunto todo ficar centralizado.
const LIFT = (GAP + WORD_H + BAR_SPACE) / 2;

const MIN_INTRO_MS = 1500; // tempo mínimo para a animação ser lida

export default function AnimatedSplash({ ready, onLayout, onDone }) {
  const { height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  // Um valor por pulso: animar o mesmo valor duas vezes faria o segundo pulso
  // interromper o primeiro (e o Animated.parallel pararia a intro inteira).
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse = useRef(Animated.multiply(pulse1, pulse2)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // Intro: pulsos + entrada do texto + barra até 85% (os 15% finais esperam o app).
  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const beat = (pulse, ring) =>
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.spring(pulse, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
        ]),
        Animated.timing(ring, { toValue: 1, duration: 900, easing: ease, useNativeDriver: true }),
      ]);

    // Dois pulsos colados ("tum-tum", como um batimento), depois o texto entra.
    const intro = Animated.parallel([
      Animated.sequence([Animated.delay(150), beat(pulse1, ring1)]),
      Animated.sequence([Animated.delay(430), beat(pulse2, ring2)]),
      Animated.sequence([
        Animated.delay(820),
        Animated.parallel([
          Animated.spring(lift, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
          Animated.timing(word, { toValue: 1, duration: 420, easing: ease, useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(progress, { toValue: 0.85, duration: MIN_INTRO_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);

    // A saída espera a entrada terminar de verdade (não um cronômetro): se o
    // JS travar montando o app por baixo, o texto ainda aparece antes da cortina.
    intro.start(() => setIntroDone(true));
    return () => intro.stop();
  }, [pulse1, pulse2, ring1, ring2, lift, word, progress]);

  // Saída: completa a barra e levanta a cortina quando o app estiver pronto.
  useEffect(() => {
    if (!ready || !introDone) return;
    Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(80),
      Animated.timing(exit, {
        toValue: 1,
        duration: reduceMotion ? 250 : 560,
        easing: Easing.bezier(0.7, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => finished && onDone?.());
  }, [ready, introDone, reduceMotion, progress, exit, onDone]);

  const ringStyle = (v) => ({
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] }) }],
  });

  // Com "reduzir movimento": só um fade, sem cortina nem pulsos.
  const curtain = reduceMotion
    ? { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }
    : { transform: [{ translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, -height] }) }] };

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, curtain]}
      onLayout={onLayout}
      pointerEvents={introDone && ready ? 'none' : 'auto'}
      accessible
      accessibilityLabel="StatsUp carregando"
    >
      <LinearGradient colors={[colors.primary, colors.primary, gradients.brand[1]]} style={StyleSheet.absoluteFill} />

      {/* conteúdo some um pouco antes da cortina terminar */}
      <Animated.View style={[styles.center, { opacity: exit.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
        <Animated.View
          style={[
            styles.column,
            { transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [LIFT, 0] }) }] },
          ]}
        >
          <View style={styles.markBox}>
            {!reduceMotion && (
              <>
                <Animated.View style={[styles.ring, ringStyle(ring1)]} />
                <Animated.View style={[styles.ring, ringStyle(ring2)]} />
              </>
            )}
            <Animated.Image
              source={MARK}
              style={{ width: MARK_W, height: MARK_H, transform: [{ scale: reduceMotion ? 1 : pulse }] }}
              resizeMode="contain"
            />
          </View>

          <Animated.View
            style={{
              alignItems: 'center',
              marginTop: GAP,
              opacity: word,
              transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
            }}
          >
            <Image source={WORD} style={{ width: WORD_W, height: WORD_H }} resizeMode="contain" />
            <View style={styles.barTrack}>
              <Animated.View style={[styles.barFill, { transform: [{ scaleX: progress }] }]} />
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, elevation: 100, overflow: 'hidden', backgroundColor: colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  column: { alignItems: 'center' },
  markBox: { width: MARK_W, height: MARK_H, alignItems: 'center', justifyContent: 'center' },
  // Posição explícita (centrada no torso), sem depender de alinhamento automático.
  ring: {
    position: 'absolute',
    left: (MARK_W - RING) / 2,
    top: (MARK_H - RING) / 2,
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  barTrack: {
    width: BAR_W,
    height: 3,
    borderRadius: 2,
    marginTop: BAR_SPACE - 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  barFill: {
    width: BAR_W,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#fff',
    transformOrigin: 'left',
  },
});
