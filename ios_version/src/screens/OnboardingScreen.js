import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Size, Space, Radius } from '../theme/tokens.js';

const { width: W } = Dimensions.get('window');

// ─── Slide definitions ─────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: 'welcome',
    icon: 'logo-ionitron',          // replaced below with custom spade render
    customIcon: 'spade',
    accent: Colors.green,
    title: 'Master Poker.\nWin More.',
    body: 'A GTO poker trainer built to sharpen your decisions and eliminate costly leaks at the table.',
  },
  {
    id: 'modules',
    customIcon: 'modules',
    accent: Colors.amber,
    title: 'Six Training\nModules',
    body: 'Preflop ranges, postflop play, pot odds, hand reading, GTO charts, and a full glossary — everything in one place.',
  },
  {
    id: 'stats',
    customIcon: 'stats',
    accent: Colors.blue,
    title: 'Track Every\nDecision',
    body: 'See your accuracy by position and module. Pinpoint exactly where you\'re losing and drill those spots until they\'re fixed.',
  },
  {
    id: 'premium',
    customIcon: 'premium',
    accent: Colors.green,
    title: 'Start Training\nToday',
    body: null, // replaced by feature list + CTA
  },
];

const MODULE_ICONS = [
  { icon: 'hand-left-outline',   label: 'Preflop',   color: Colors.green  },
  { icon: 'layers-outline',      label: 'Postflop',  color: Colors.amber  },
  { icon: 'calculator-outline',  label: 'Math',      color: Colors.blue   },
  { icon: 'eye-outline',         label: 'Reading',   color: Colors.purple },
  { icon: 'stats-chart-outline', label: 'Charts',    color: Colors.amber  },
  { icon: 'school-outline',      label: 'Glossary',  color: Colors.gray   },
];

const PREMIUM_FEATURES = [
  'Ad free — no interruptions',
  'Unlimited training, no stamina limits',
  'Postflop, Math & Hand Reading modules',
  'Advanced GTO charts & reference tables',
  'Complete poker glossary',
];

// ─── Custom icon renders ───────────────────────────────────────────────────────

function SpadeIcon({ color }) {
  return (
    <View style={[iconStyles.circle, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
      <Text style={[iconStyles.spadeText, { color }]}>♠</Text>
    </View>
  );
}

function ModulesIcon({ color }) {
  return (
    <View style={iconStyles.modulesGrid}>
      {MODULE_ICONS.map(m => (
        <View key={m.label} style={iconStyles.moduleCell}>
          <View style={[iconStyles.moduleCircle, { backgroundColor: `${m.color}18` }]}>
            <Ionicons name={m.icon} size={26} color={m.color} />
          </View>
          <Text style={iconStyles.moduleLabel}>{m.label}</Text>
        </View>
      ))}
    </View>
  );
}

function StatsIcon({ color }) {
  const bars = [0.4, 0.6, 0.85, 0.55, 0.75, 0.95, 0.65];
  return (
    <View style={[iconStyles.circle, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
      <View style={iconStyles.barsRow}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={[
              iconStyles.bar,
              {
                height: h * 52,
                backgroundColor: i === bars.length - 1 ? color : `${color}70`,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function PremiumIcon({ color }) {
  return (
    <View style={[iconStyles.circle, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
      <Ionicons name="diamond-outline" size={48} color={color} />
    </View>
  );
}

function SlideIcon({ type, color }) {
  if (type === 'spade')   return <SpadeIcon color={color} />;
  if (type === 'modules') return <ModulesIcon color={color} />;
  if (type === 'stats')   return <StatsIcon color={color} />;
  return <PremiumIcon color={color} />;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function OnboardingScreen({ onComplete, onStartTrial }) {
  const insets  = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  function goNext() {
    if (isLast) return;
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * W, animated: true });
    setIndex(next);
  }

  function onScrollEnd(e) {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / W);
    setIndex(newIndex);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.id} style={styles.slide}>
            {/* Icon area */}
            <View style={styles.iconWrap}>
              <SlideIcon type={slide.customIcon} color={slide.accent} />
            </View>

            {/* Text */}
            <Text style={[styles.slideTitle, { color: Colors.textPrimary }]}>
              {slide.title}
            </Text>

            {slide.body && (
              <Text style={styles.slideBody}>{slide.body}</Text>
            )}

            {/* Premium slide: feature list + CTAs */}
            {slide.id === 'premium' && (
              <View style={styles.premiumContent}>
                <View style={styles.featureList}>
                  {PREMIUM_FEATURES.map(f => (
                    <View key={f} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.trialBtn}
                  onPress={onStartTrial}
                  activeOpacity={0.85}
                >
                  <Text style={styles.trialBtnText}>Start 7-Day Free Trial</Text>
                  <Text style={styles.trialBtnSub}>Then $9.99/mo or $79.99/yr · Cancel anytime</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.freeBtn}
                  onPress={onComplete}
                  activeOpacity={0.7}
                >
                  <Text style={styles.freeBtnText}>Continue with free version</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Dots + Next */}
      <View style={styles.footer}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index
                  ? { width: 20, backgroundColor: SLIDES[index].accent }
                  : { width: 6, backgroundColor: Colors.bg4 },
              ]}
            />
          ))}
        </View>

        {/* Next button — hidden on last slide (CTAs are inline) */}
        {!isLast && (
          <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color="#000" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const iconStyles = StyleSheet.create({
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spadeText: {
    fontSize: 72,
    lineHeight: 86,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 250,
    gap: 16,
    justifyContent: 'center',
  },
  moduleCell: {
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  moduleCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 60,
  },
  bar: {
    width: 10,
    borderRadius: 3,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg1,
  },
  pager: {
    flex: 1,
  },
  slide: {
    width: W,
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
    height: 190,
  },
  slideTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 34,
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 16,
  },
  slideBody: {
    fontFamily: Fonts.regular,
    fontSize: Size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Size.base * 1.6,
    maxWidth: 320,
  },
  premiumContent: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  featureList: {
    width: '100%',
    gap: 10,
    marginBottom: 28,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Space.base,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontFamily: Fonts.regular,
    fontSize: Size.sm,
    color: Colors.textPrimary,
    flex: 1,
  },
  trialBtn: {
    width: '100%',
    backgroundColor: Colors.green,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
    gap: 3,
  },
  trialBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: Size.base,
    color: '#000',
  },
  trialBtnSub: {
    fontFamily: Fonts.regular,
    fontSize: Size.xxs,
    color: 'rgba(0,0,0,0.55)',
  },
  freeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  freeBtnText: {
    fontFamily: Fonts.regular,
    fontSize: Size.sm,
    color: Colors.textTertiary,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.green,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: Radius.lg,
  },
  nextBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: Size.sm,
    color: '#000',
  },
});
