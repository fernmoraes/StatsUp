// Design system do StatsUp — tema escuro com profundidade, gradientes e glow.
// Referências: Whoop, Oura, Strava, Hevy.
import { Platform } from 'react-native';

export const colors = {
  // Fundos (do mais escuro ao "vidro")
  bg: '#06080F',
  bg2: '#0A0E1A',
  surface: '#121A2E', // card sólido (fallback)
  surfaceAlt: '#19223A',
  border: 'rgba(255,255,255,0.09)',
  glass: 'rgba(255,255,255,0.045)',
  glassStrong: 'rgba(255,255,255,0.07)',
  glassBorder: 'rgba(255,255,255,0.09)',
  glassBorderStrong: 'rgba(255,255,255,0.16)',
  cardSolid: '#121A2E',
  cardSolidAlt: '#19223A',

  // Texto
  text: '#F4F7FF',
  textDim: '#A9B4D0',
  textFaint: '#5C688A',

  // Marca
  primary: '#5B8DEF',
  primaryBright: '#7CA5FF',
  violet: '#9B6CFF',
  cyan: '#38E0D4',

  // Estados
  good: '#34E5A1',
  warn: '#FFB454',
  bad: '#FF5C72',

  // Grupos musculares
  chest: '#FF5C72',
  back: '#2DD4BF',
  arm: '#FBBF24',
  leg: '#A78BFA',

  // Radar
  ring: 'rgba(255,255,255,0.07)',
  ringMid: 'rgba(123,165,255,0.55)',
  ringLabel: '#5C688A',
};

// Pares de gradiente (start → end).
export const gradients = {
  brand: ['#5B8DEF', '#9B6CFF'],
  brandSoft: ['rgba(91,141,239,0.22)', 'rgba(155,108,255,0.10)'],
  screen: ['#0A0E1A', '#06080F'],
  hero: ['#16213D', '#0C1326'],
  good: ['#34E5A1', '#1FB8C9'],
  chest: ['#FF7A8A', '#FF4D6D'],
  back: ['#48E6CE', '#1FB8C9'],
  arm: ['#FFD166', '#F59E0B'],
  leg: ['#B79BFF', '#7C5CFC'],
  dark: ['#141C30', '#0D1424'],
};

export const groupColor = {
  chest: colors.chest,
  back: colors.back,
  arm: colors.arm,
  leg: colors.leg,
};
export const groupGradient = {
  chest: gradients.chest,
  back: gradients.back,
  arm: gradients.arm,
  leg: gradients.leg,
};

export const spacing = (n) => n * 8;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

// Famílias Inter (carregadas no _layout). Fallback p/ system se não carregar.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extra: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
};

export const font = {
  display: 46,
  h1: 30,
  h2: 22,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
};

// Sombras / glow. `color` opcional para glow colorido.
export const shadow = (elevation = 6, color = '#000') => {
  if (Platform.OS === 'android') {
    return { elevation };
  }
  return {
    shadowColor: color,
    shadowOpacity: color === '#000' ? 0.35 : 0.55,
    shadowRadius: elevation * 1.6,
    shadowOffset: { width: 0, height: elevation * 0.6 },
  };
};

export const hexA = (hex, alpha) => {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return hex + a;
};
