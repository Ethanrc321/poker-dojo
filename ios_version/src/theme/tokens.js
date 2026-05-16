/*
 * Design tokens — single source of truth for all visual values.
 * Audit findings:
 *   - Backgrounds: mixed #0a0a0a / #111111 / #1c1c1e / #2c2c2e — standardised to iOS system dark
 *   - Typography: system font throughout, arbitrary sizes (9–30pt), no hierarchy
 *   - Spacing: arbitrary values (4–22pt), inconsistent across screens
 *   - Radii: 8–20pt mixed, no shared token
 *   - Shadows: heavy shadows on many surfaces (opacity 0.4–0.5), some decorative
 *   - Icons: Ionicons primary, MaterialCommunityIcons in SpadeMenu — kept Ionicons
 */

export const Colors = {
  // Surfaces — iOS system dark foundations
  bg0: '#000000',     // OLED black, status bar only
  bg1: '#0F0F10',     // primary screen background
  bg2: '#1C1C1E',     // card / cell surface
  bg3: '#2C2C2E',     // elevated surface — modals, sheets
  bg4: '#3A3A3C',     // active / pressed state

  // Text
  textPrimary:   '#EBEBEB',
  textSecondary: '#8E8E93',
  textTertiary:  '#48484A',

  // Borders / separators
  separator:    '#2C2C2E',
  borderSubtle: '#2C2C2E',
  borderMedium: '#3A3A3C',

  // Semantic — poker-specific, keep intentional colour coding
  green:    '#68A870',
  greenDim: '#4A7A4A',
  blue:     '#5577E0',
  amber:    '#E8A030',
  red:      '#E04545',
  purple:   '#8068E8',
  gray:     '#C0C0C0',
};

export const Fonts = {
  regular:  'DMSans_400Regular',
  medium:   'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
};

export const Size = {
  xxs:  10,
  xs:   12,
  sm:   14,
  base: 16,
  md:   18,
  lg:   22,
  xl:   28,
  xxl:  36,
};

export const Space = {
  xxs:  4,
  xs:   8,
  sm:   12,
  base: 16,
  md:   20,
  lg:   24,
  xl:   32,
  xxl:  40,
};

export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
};

export const Shadow = {
  none: {},
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
};

// Pre-composed text style objects — import and spread these
export const T = {
  screenTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: Size.lg,       // 22
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: Size.xs,       // 12
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bodyPrimary: {
    fontFamily: 'DMSans_500Medium',
    fontSize: Size.base,     // 16
    color: Colors.textPrimary,
  },
  bodySecondary: {
    fontFamily: 'DMSans_400Regular',
    fontSize: Size.sm,       // 14
    color: Colors.textSecondary,
    lineHeight: 14 * 1.5,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: Size.sm,       // 14
    color: Colors.textSecondary,
  },
  caption: {
    fontFamily: 'DMSans_400Regular',
    fontSize: Size.xs,       // 12
    color: Colors.textTertiary,
  },
  statHero: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: Size.xl,       // 28
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  btnPrimary: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: Size.base,     // 16
    letterSpacing: 0.2,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: Size.xs,       // 12
    letterSpacing: 0.3,
  },
};
