// Design system do StatsUp — identidade da logo: vermelho #DE1C1D + branco,
// tipografia condensada pesada, fundo carvão quente (sem azul/violeta).
import { Platform } from 'react-native';

export const colors = {
  // Fundos — uma única família de cinza quente, levemente puxada pro vermelho.
  bg: '#0F0D0D',
  bg2: '#151212',
  surface: '#1B1717', // card sólido
  surfaceAlt: '#241F1F',
  border: 'rgba(255,240,238,0.08)',
  glass: '#1B1717',
  glassStrong: '#221D1D',
  glassBorder: 'rgba(255,240,238,0.07)',
  glassBorderStrong: 'rgba(255,240,238,0.14)',
  cardSolid: '#1B1717',
  cardSolidAlt: '#241F1F',

  // Texto
  text: '#F8F4F3',
  textDim: '#B5ABA9',
  textFaint: '#726866',

  // Marca (cor da logo). primaryBright = versão legível como texto sobre o fundo escuro.
  primary: '#DE1C1D',
  primaryBright: '#FF5451',
  primaryDeep: '#A8100F',
  onPrimary: '#FFFFFF',

  // Estados (reservados — sempre com ícone + rótulo)
  good: '#2FC48D',
  warn: '#F2A93B',
  bad: '#FF6259',

  // Grupos musculares — paleta categórica validada (dataviz validator, dark,
  // pares vizinhos no radar, incluindo costas↔peito: CVD ΔE ≥ 8.1, visão
  // normal ΔE ≥ 21, contraste ≥ 3:1). Com 6 cores nem todos os pares se
  // separam, então a cor nunca aparece sozinha: sempre com o nome do grupo.
  chest: '#E8564A',
  back: '#199E70',
  shoulder: '#2BA3C9',
  biceps: '#C860B0',
  triceps: '#C98500',
  leg: '#3D8BE0',

  // Radar
  ring: 'rgba(255,240,238,0.08)',
  ringMid: 'rgba(255,84,81,0.55)',
  ringLabel: '#726866',
};

// Pares de gradiente (start → end).
export const gradients = {
  brand: ['#EE2B2A', '#C81415'],
  brandSoft: ['rgba(222,28,29,0.20)', 'rgba(222,28,29,0.04)'],
  screen: ['#151212', '#0F0D0D'],
  hero: ['#221B1B', '#171313'],
  good: ['#EE2B2A', '#B31112'],
  // Mais profundos que a cor base para aguentar texto branco por cima.
  chest: ['#D9483D', '#A8322A'],
  back: ['#178F66', '#0E6B4B'],
  shoulder: ['#2490B3', '#1A6C88'],
  biceps: ['#B5559F', '#8C3B7A'],
  triceps: ['#B57800', '#8A5B00'],
  leg: ['#3580D4', '#2462A8'],
  dark: ['#1E1919', '#151212'],
};

export const groupColor = {
  chest: colors.chest,
  back: colors.back,
  shoulder: colors.shoulder,
  biceps: colors.biceps,
  triceps: colors.triceps,
  leg: colors.leg,
};
export const groupGradient = {
  chest: gradients.chest,
  back: gradients.back,
  shoulder: gradients.shoulder,
  biceps: gradients.biceps,
  triceps: gradients.triceps,
  leg: gradients.leg,
};

export const spacing = (n) => n * 8;

// Raios mais secos, ecoando as letras quadradas da logo.
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

// Barlow (texto) + Barlow Condensed (títulos e números), carregadas no _layout.
export const fonts = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  extra: 'BarlowCondensed_700Bold',
  black: 'BarlowCondensed_800ExtraBold',
  heavy: 'BarlowCondensed_900Black',
  cond: 'BarlowCondensed_600SemiBold',
};

export const font = {
  display: 52,
  h1: 34,
  h2: 24,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
};

// Números alinhados (placares, percentis).
export const tabular = { fontVariant: ['tabular-nums'] };

// Sombras tingidas com o fundo quente (nunca preto puro).
export const shadow = (elevation = 6, color = '#050303') => {
  if (Platform.OS === 'android') {
    return { elevation };
  }
  return {
    shadowColor: color,
    shadowOpacity: color === '#050303' ? 0.5 : 0.45,
    shadowRadius: elevation * 1.6,
    shadowOffset: { width: 0, height: elevation * 0.6 },
  };
};

export const hexA = (hex, alpha) => {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return hex + a;
};
