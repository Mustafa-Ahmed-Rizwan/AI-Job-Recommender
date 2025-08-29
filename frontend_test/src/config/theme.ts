import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Colors matching your web app's Tailwind config
// config/theme.ts

// ✅ Replace your old colors object with this
// Replace your colors object with this complete version
export const colors = {
  primary: {
    '50': '#f0f9ff',
    '100': '#e0f2fe',
    '200': '#bae6fd',
    '300': '#7dd3fc',
    '400': '#38bdf8',
    '500': '#0ea5e9',
    '600': '#0284c7',
    '700': '#0369a1',
    '800': '#075985',
    '900': '#0c4a6e',
    '950': '#082f49',
  },
  gray: {
    '50': '#f9fafb',
    '100': '#f3f4f6',
    '200': '#e5e7eb',
    '300': '#d1d5db',
    '400': '#9ca3af',
    '500': '#6b7280',
    '600': '#4b5563',
    '700': '#374151',
    '800': '#1f2937',
    '900': '#111827',
    '950': '#030712',
  },
  green: {
    '50': '#f0fdf4',
    '100': '#dcfce7',
    '200': '#bbf7d0',
    '300': '#86efac',
    '400': '#4ade80',
    '500': '#22c55e',
    '600': '#16a34a',
    '700': '#15803d',
    '800': '#166534',
    '900': '#14532d',
    '950': '#052e16',
  },
  yellow: {
    '50': '#fefce8',
    '100': '#fef9c3',
    '200': '#fef08a',
    '300': '#fde047',
    '400': '#facc15',
    '500': '#eab308',
    '600': '#ca8a04',
    '700': '#a16207',
    '800': '#854d0e',
    '900': '#713f12',
    '950': '#422006',
  },
  red: {
    '50': '#fef2f2',
    '100': '#fee2e2',
    '200': '#fecaca',
    '300': '#fca5a5',
    '400': '#f87171',
    '500': '#ef4444',
    '600': '#dc2626',
    '700': '#b91c1c',
    '800': '#991b1b',
    '900': '#7f1d1d',
    '950': '#450a0a',
  },
  blue: {
    '50': '#eff6ff',
    '100': '#dbeafe',
    '200': '#bfdbfe',
    '300': '#93c5fd',
    '400': '#60a5fa',
    '500': '#3b82f6',
    '600': '#2563eb',
    '700': '#1d4ed8',
    '800': '#1e40af',
    '900': '#1e3a8a',
    '950': '#172554',
  },
  orange: {
    '50': '#fff7ed',
    '100': '#ffedd5',
    '200': '#fed7aa',
    '300': '#fdba74',
    '400': '#fb923c',
    '500': '#f97316',
    '600': '#ea580c',
    '700': '#c2410c',
    '800': '#9a3412',
    '900': '#7c2d12',
    '950': '#431407',
  },
  purple: {
    '50': '#faf5ff',
    '100': '#f3e8ff',
    '200': '#e9d5ff',
    '300': '#d8b4fe',
    '400': '#c084fc',
    '500': '#a855f7',
    '600': '#9333ea',
    '700': '#7e22ce',
    '800': '#6b21a8',
    '900': '#581c87',
    '950': '#3b0764',
  },
  teal: {
    '50': '#f0fdfa',
    '100': '#ccfbf1',
    '200': '#99f6e4',
    '300': '#5eead4',
    '400': '#2dd4bf',
    '500': '#14b8a6',
    '600': '#0d9488',
    '700': '#0f766e',
    '800': '#115e59',
    '900': '#134e4a',
    '950': '#042f2e',
  },
  indigo: {
    '50': '#eef2ff',
    '100': '#e0e7ff',
    '200': '#c7d2fe',
    '300': '#a5b4fc',
    '400': '#818cf8',
    '500': '#6366f1',
    '600': '#4f46e5',
    '700': '#4338ca',
    '800': '#3730a3',
    '900': '#312e81',
    '950': '#1e1b4b',
  },
};


const baseFonts = MD3LightTheme.fonts as typeof MD3LightTheme.fonts;

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary['600'],
    onPrimary: '#ffffff',
    primaryContainer: colors.primary['100'],
    onPrimaryContainer: colors.primary['900'],
    secondary: colors.gray['600'],
    onSecondary: '#ffffff',
    secondaryContainer: colors.gray['100'],
    onSecondaryContainer: colors.gray['900'],
    tertiary: colors.blue['600'],
    onTertiary: '#ffffff',
    tertiaryContainer: colors.blue['100'],
    // blue['900'] doesn't exist in your scale, use an existing shade:
    onTertiaryContainer: colors.blue['600'],

    error: colors.red['600'],
    onError: '#ffffff',
    errorContainer: colors.red['100'],
    // red['900'] didn't exist in your file, use red['600'] or add red['900'] to colors above:
    onErrorContainer: colors.red['600'],

    background: colors.gray['50'],
    onBackground: colors.gray['900'],
    surface: '#ffffff',
    onSurface: colors.gray['900'],
    surfaceVariant: colors.gray['100'],
    onSurfaceVariant: colors.gray['700'],
    outline: colors.gray['300'],
    outlineVariant: colors.gray['200'],
    shadow: colors.gray['900'],
    scrim: colors.gray['900'],
    inverseSurface: colors.gray['800'],
    inverseOnSurface: colors.gray['100'],
    inversePrimary: colors.primary['200'],
    elevation: {
      level0: 'transparent',
      level1: '#ffffff',
      level2: '#ffffff',
      level3: '#ffffff',
      level4: '#ffffff',
      level5: '#ffffff',
    },
    surfaceDisabled: colors.gray['200'],
    onSurfaceDisabled: colors.gray['400'],
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },

  fonts: {
    ...baseFonts,
    // Map MD3 typescale keys to your Inter fonts. These keys match the MD3 typescale shape.
    displayLarge: { ...baseFonts.displayLarge, fontFamily: 'Inter-Bold' },
    displayMedium: { ...baseFonts.displayMedium, fontFamily: 'Inter-SemiBold' },
    displaySmall: { ...baseFonts.displaySmall, fontFamily: 'Inter-SemiBold' },

    headlineLarge: { ...baseFonts.headlineLarge, fontFamily: 'Inter-Bold' },
    headlineMedium: { ...baseFonts.headlineMedium, fontFamily: 'Inter-SemiBold' },
    headlineSmall: { ...baseFonts.headlineSmall, fontFamily: 'Inter-SemiBold' },

    titleLarge: { ...baseFonts.titleLarge, fontFamily: 'Inter-Bold' },
    titleMedium: { ...baseFonts.titleMedium, fontFamily: 'Inter-SemiBold' },
    titleSmall: { ...baseFonts.titleSmall, fontFamily: 'Inter-SemiBold' },

    bodyLarge: { ...baseFonts.bodyLarge, fontFamily: 'Inter-Regular' },
    bodyMedium: { ...baseFonts.bodyMedium, fontFamily: 'Inter-Regular' },
    bodySmall: { ...baseFonts.bodySmall, fontFamily: 'Inter-Regular' },

    labelLarge: { ...baseFonts.labelLarge, fontFamily: 'Inter-Medium' },
    labelMedium: { ...baseFonts.labelMedium, fontFamily: 'Inter-Medium' },
    labelSmall: { ...baseFonts.labelSmall, fontFamily: 'Inter-Medium' },
  } as typeof MD3LightTheme.fonts,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 16,
  },
};
