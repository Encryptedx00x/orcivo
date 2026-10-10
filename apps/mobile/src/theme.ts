/**
 * Tokens aprovados do design system Orcivo para React Native.
 * Fonte: docs/design-handoff/orcivo-design-system/colors_and_type.css.
 */
export const theme = {
  colors: {
    purple50: '#F5F3FF',
    purple100: '#EDE9FE',
    purple200: '#DDD6FE',
    purple300: '#C4B5FD',
    purple600: '#6D28D9',
    purple700: '#5B21B6',
    purple800: '#4C1D95',
    ink: '#0A0A0F',
    white: '#FFFFFF',
    slate50: '#F8FAFC',
    slate100: '#F1F5F9',
    slate200: '#E2E8F0',
    slate300: '#CBD5E1',
    slate500: '#64748B',
    slate600: '#475569',
    slate700: '#334155',
    success: '#16A34A',
    successBg: '#DCFCE7',
    warning: '#D97706',
    warningBg: '#FEF3C7',
    danger: '#DC2626',
    dangerBg: '#FEE2E2',
    info: '#0284C7',
    infoBg: '#E0F2FE',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 9999 },
  type: {
    display: 32,
    h1: 28,
    h2: 24,
    h3: 20,
    body: 16,
    small: 14,
    caption: 12,
    button: 14,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  touchTarget: 44,
} as const;

export const statusTheme = {
  wait: { bg: theme.colors.warningBg, fg: '#92400E', dot: theme.colors.warning },
  ok: { bg: theme.colors.successBg, fg: '#166534', dot: theme.colors.success },
  draft: { bg: theme.colors.slate100, fg: theme.colors.slate700, dot: theme.colors.slate500 },
  late: { bg: theme.colors.dangerBg, fg: '#991B1B', dot: theme.colors.danger },
  doing: { bg: theme.colors.purple100, fg: theme.colors.purple800, dot: theme.colors.purple600 },
} as const;
