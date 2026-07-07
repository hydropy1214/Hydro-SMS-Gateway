/**
 * HYDROPY Gateway — dark terminal aesthetic, matching the web dashboard.
 * Both light and dark keys use the same dark palette; the app forces dark mode.
 */

const palette = {
  text: '#e8e8ff',
  tint: '#00d4ff',

  background: '#08080e',
  foreground: '#e8e8ff',

  card: '#0f0f1a',
  cardForeground: '#e8e8ff',

  primary: '#00d4ff',
  primaryForeground: '#08080e',

  secondary: '#1a1a2e',
  secondaryForeground: '#a0a0c0',

  muted: '#1a1a2e',
  mutedForeground: '#6060a0',

  accent: '#00d4ff',
  accentForeground: '#08080e',

  destructive: '#ff4444',
  destructiveForeground: '#ffffff',

  success: '#00e676',
  successDim: '#00e67620',
  warning: '#ffab40',

  border: '#1e1e32',
  input: '#1a1a2e',
};

const colors = {
  light: palette,
  dark: palette,
  radius: 6,
};

export default colors;
