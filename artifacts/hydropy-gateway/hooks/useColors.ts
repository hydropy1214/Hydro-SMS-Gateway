import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

/**
 * Returns the design tokens for the current color scheme.
 * Falls back to the dark palette (HYDROPY forces dark mode).
 */
export function useColors() {
  const scheme = useColorScheme();
  // Both light/dark keys use the same dark terminal palette in constants/colors.ts
  const palette = scheme === 'dark' ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
