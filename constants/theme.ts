/**
 * FeedFlow Design System
 * Centralized theme tokens for consistent styling across the app
 */

// Color Palette
export const colors = {
  // Primary
  primary: '#007AFF',
  primaryLight: '#4DA6FF',
  primaryDark: '#0056B3',
  
  // Status Colors
  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  error: '#F44336',
  errorLight: '#FFEBEE',
  errorDark: '#C62828',
  
  // Neutral Colors
  black: '#000000',
  white: '#FFFFFF',
  
  // Grays
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Semantic Colors (mapped from palette)
  background: '#F5F5F5',
  backgroundDark: '#000000',
  surface: '#FFFFFF',
  surfaceSubtle: '#F9F9F9',
  
  text: {
    primary: '#333333',
    secondary: '#666666',
    tertiary: '#999999',
    inverse: '#FFFFFF',
  },
  
  border: {
    default: '#E0E0E0',
    light: '#F5F5F5',
  },
  
  // Interactive States
  active: {
    amplify: '#007AFF',
    reduce: '#F44336',
  },
} as const;

// Typography
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Spacing Scale (8px base)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

// Border Radius
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

// Shadows (iOS-style elevation)
export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

// Component-specific tokens
export const components = {
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  
  button: {
    height: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  
  input: {
    height: 48,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
  },
} as const;

// Animation Durations
export const animation = {
  fast: 200,
  normal: 300,
  slow: 400,
} as const;

// Breakpoints (for responsive design)
export const breakpoints = {
  sm: 320,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;
