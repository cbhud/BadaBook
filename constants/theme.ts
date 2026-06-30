/**
 * Ebook reader design tokens.
 *
 * The app shell is dark, while the reader uses a quiet black/dark surface
 * with warm text and sparse accent states.
 */

const darkShell = {
  background: '#101010',
  surface: '#181818',
  surfaceElevated: '#202020',
  surfaceSoft: '#242424',
  accent: '#00b894',
  accentDeep: '#009f7a',
  accentSoft: 'rgba(0, 184, 148, 0.14)',
  accentMuted: '#7acdb7',
  primary: '#f4eee7',
  text: '#f4eee7',
  textSecondary: '#b9b0a7',
  textMuted: '#8a8178',
  textFaint: '#5f5750',
  border: '#2a2a2a',
  borderSoft: '#222222',
  error: '#d45656',
  success: '#1ba673',
  warning: '#c37d0d',
  info: '#3772cf',
  tagBlue: '#3772cf',
  translating: '#7acdb7',
  overlay: 'rgba(0, 0, 0, 0.72)',
};

export const Colors = {
  app: darkShell,
  reader: {
    background: '#000000',
    surface: '#121212',
    surfaceElevated: '#181818',
    text: '#d8d0c7',
    textStrong: '#e8e1d7',
    textSecondary: '#b9b0a7',
    textMuted: '#8a8178',
    border: '#2a2a2a',
    accent: '#00b894',
    accentDeep: '#009f7a',
    progress: '#00b894',
    highlight: '#f4d35e',
    selection: 'rgba(0, 184, 148, 0.20)',
    overlay: 'rgba(18, 18, 18, 0.92)',
    floating: 'rgba(23, 19, 15, 0.88)',
    error: '#d45656',
    translating: '#7acdb7',
  },
  cover: {
    epubFrom: '#2d241e',
    epubTo: '#5b4635',
    pdfFrom: '#182331',
    pdfTo: '#2f4a62',
  },
  // Backward-compatible aliases for older imports while the app migrates.
  dark: darkShell,
  light: darkShell,
};

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  sectionSm: 48,
  section: 64,
  sectionLg: 88,
  readerMobile: 20,
  readerTablet: 40,
  readerDesktop: 64,
};

export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const FontSize = {
  micro: 11,
  xs: 12,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  title: 32,
  display: 36,
};

export const Reader = {
  minFontSize: 16,
  maxFontSize: 24,
  lineHeightMultiplier: 1.72,
  maxTextWidth: 700,
};

export const Shadow = {
  cover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
};
