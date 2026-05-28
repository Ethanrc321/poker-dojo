import React, { useState, useCallback, useEffect, useRef, Component } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';

// ── Error boundary — catches render errors and guarantees splash is hidden ────
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  // If we catch an error, AppContent never mounts so hideAsync is never called.
  // Call it here so the native splash doesn't sit on top of the error screen.
  componentDidMount() {
    SplashScreen.hideAsync().catch(() => {});
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0F0F10', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Something went wrong</Text>
          <Text style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>{this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keep splash visible until we're ready — must be called after all imports
SplashScreen.preventAutoHideAsync().catch(() => {});

import DashboardScreen from './src/screens/DashboardScreen.js';
import PreflopScreen   from './src/screens/PreflopScreen.js';
import PostflopScreen  from './src/screens/PostflopScreen.js';
import MathScreen      from './src/screens/MathScreen.js';
import ChartsScreen    from './src/screens/ChartsScreen.js';
import ReadingScreen   from './src/screens/ReadingScreen.js';
import GlossaryScreen      from './src/screens/GlossaryScreen.js';
import SettingsScreen      from './src/screens/SettingsScreen.js';
import SubscriptionScreen  from './src/screens/SubscriptionScreen.js';

import SpadeMenu         from './src/components/SpadeMenu.js';
import PaywallGate       from './src/components/PaywallGate.js';
import OnboardingScreen  from './src/screens/OnboardingScreen.js';

import { AuthProvider, useAuth }             from './src/context/AuthContext.js';
import { SubscriptionProvider }              from './src/context/SubscriptionContext.js';
import { useStreak }                         from './src/utils/streak.js';
import { scheduleStreakReminder, cancelStreakReminder } from './src/utils/notifications.js';
import { loadHapticsPreference } from './src/utils/haptics.js';
import { loadSkillRating, saveSkillRating, calcNewRating } from './src/utils/skillRating.js';

// ── Initial stats shape ───────────────────────────────────────────────────────
const INITIAL_STATS = {
  preflop:  { total: 0, correct: 0, byPosition: {} },
  postflop: { total: 0, correct: 0 },
  math:     { total: 0, correct: 0 },
  quiz:     { total: 0, correct: 0 },
};

// ── Navigation tabs ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'Home',     label: 'Home',     icon: 'home-outline'          },
  { id: 'Preflop',  label: 'Preflop',  icon: 'hand-left-outline'     },
  { id: 'Postflop', label: 'Postflop', icon: 'layers-outline'        },
  { id: 'Math',     label: 'Math',     icon: 'calculator-outline'    },
  { id: 'Charts',   label: 'Charts',   icon: 'stats-chart-outline'   },
  { id: 'Reading',  label: 'Reading',  icon: 'eye-outline'           },
  { id: 'Glossary', label: 'Glossary', icon: 'school-outline'        },
  { id: 'Settings', label: 'Settings', icon: 'settings-outline'      },
];

// Screens that don't appear in the SpadeMenu tab bar (pushed over the top)
const OVERLAY_SCREENS = ['Subscription'];

// ── Root shell — provides context ─────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <AppContent />
          </SubscriptionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// ── Main app — consumes context ───────────────────────────────────────────────
const ONBOARDING_KEY = '@poker_onboarding_done';

function AppContent() {
  const [fontsLoaded, fontError] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold });
  const [currentScreen,   setCurrentScreen]   = useState('Home');
  const [stats,           setStats]           = useState(INITIAL_STATS);
  const [onboardingDone,  setOnboardingDone]  = useState(null); // null = loading
  const [skillRating,     setSkillRating]     = useState(800);
  const [ratingHistory,   setRatingHistory]   = useState([]);

  const { user, saveStats, loadStats } = useAuth();
  const cloudLoadedRef = useRef(false); // prevents initial load overwriting cloud data
  const { streak, longestStreak, practicedToday, dailyCount, loaded: streakLoaded, recordPractice, lostStreakInfo, clearLostStreakInfo } = useStreak();

  // Lost-streak modal is shown via lostStreakInfo state (see JSX below)

  // Restore haptics preference on first mount
  useEffect(() => { loadHapticsPreference(); }, []);

  // Load skill rating on mount
  useEffect(() => {
    loadSkillRating().then(({ rating, history }) => {
      setSkillRating(rating);
      setRatingHistory(history);
    });
  }, []);

  // Check if onboarding has been completed before
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(val => setOnboardingDone(val === 'true'))
      .catch(() => setOnboardingDone(false)); // fallback: show onboarding if storage fails
  }, []);

  // ── Splash screen hide — three independent triggers so it can never get stuck ─
  //
  // Trigger 1: unconditional on mount — hides as soon as React has painted.
  // The dark loading View (#0F0F10) matches the splash bg so the transition is
  // seamless. We no longer wait for onboardingDone because that dependency chain
  // has proven unreliable in production.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Trigger 2: hard timeout — if the effect above somehow fires late or the
  // native hide is slow on iOS 26, this forces it after 2 s.
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 2000);
    return () => clearTimeout(t);
  }, []);

  // Schedule (or reschedule) the 8pm streak reminder on every app launch
  useEffect(() => {
    if (streakLoaded) scheduleStreakReminder(streak, practicedToday);
  }, [streakLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load cloud stats once when user signs in
  useEffect(() => {
    if (!user) { cloudLoadedRef.current = false; return; }
    loadStats().then(cs => {
      if (cs) setStats(cs);
      cloudLoadedRef.current = true;
    });
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced cloud sync on every stats change (only after initial load)
  useEffect(() => {
    if (!user || !cloudLoadedRef.current) return;
    const t = setTimeout(() => saveStats(stats), 2000);
    return () => clearTimeout(t);
  }, [stats]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordResult = useCallback((module, { correct, position, minor = false } = {}) => {
    // Record practice day for streak — awards streak once DAILY_GOAL hands are reached
    recordPractice().then(result => {
      if (result.isNew) cancelStreakReminder(); // just earned today's streak — cancel reminder
    });

    // Update skill rating
    setSkillRating(prev => {
      const next    = calcNewRating(prev, correct, minor);
      const snapshot = { rating: next, ts: Date.now() };
      setRatingHistory(h => {
        const updated = [...h, snapshot];
        saveSkillRating(next, updated); // fire-and-forget
        return updated;
      });
      return next;
    });

    setStats(prev => {
      const m = prev[module] || { total: 0, correct: 0 };
      const updated = {
        ...prev,
        [module]: {
          ...m,
          total:   m.total   + 1,
          correct: m.correct + (correct ? 1 : 0),
        },
      };
      if (module === 'preflop' && position) {
        const byPos   = m.byPosition || {};
        const posData = byPos[position] || { total: 0, correct: 0 };
        updated[module].byPosition = {
          ...byPos,
          [position]: {
            total:   posData.total   + 1,
            correct: posData.correct + (correct ? 1 : 0),
          },
        };
      }
      return updated;
    });
  }, []);

  const resetStats = useCallback(() => {
    setStats(INITIAL_STATS);
    cloudLoadedRef.current = false; // allow re-sync after reset
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDone(true);
  }, []);

  const onboardingStartTrial = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDone(true);
    setCurrentScreen('Subscription');
  }, []);

  // Only block render until onboarding state is loaded (fast AsyncStorage read).
  // Return dark background instead of null so there's no transparent flash if
  // the splash screen dismisses before onboarding state resolves.
  if (onboardingDone === null) return <View style={{ flex: 1, backgroundColor: '#0F0F10' }} />;

  // Show onboarding for first-time users
  if (!onboardingDone) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={completeOnboarding} onStartTrial={onboardingStartTrial} />
      </>
    );
  }

  // All screens stay mounted; only the active one is visible
  const show = id => ({ flex: 1, display: currentScreen === id ? 'flex' : 'none' });

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.screenWrap}>

          <View style={show('Home')}>
            <DashboardScreen
              stats={stats}
              resetStats={resetStats}
              onNavigate={setCurrentScreen}
              streak={streak}
              longestStreak={longestStreak}
              practicedToday={practicedToday}
              dailyCount={dailyCount}
              skillRating={skillRating}
              ratingHistory={ratingHistory}
            />
          </View>

          {/* Free ─────────────────────────────────── */}
          <View style={show('Preflop')}>
            <PreflopScreen
              recordResult={(d) => recordResult('preflop', d)}
              isActive={currentScreen === 'Preflop'}
              onNavigate={setCurrentScreen}
            />
          </View>

          <View style={show('Charts')}>
            <ChartsScreen onNavigate={setCurrentScreen} />
          </View>

          {/* Premium — gated ─────────────────────── */}
          <View style={show('Postflop')}>
            <PaywallGate feature="postflop" onUpgrade={() => setCurrentScreen('Subscription')}>
              <PostflopScreen recordResult={(d) => recordResult('postflop', d)} />
            </PaywallGate>
          </View>

          <View style={show('Math')}>
            <PaywallGate feature="math" onUpgrade={() => setCurrentScreen('Subscription')}>
              <MathScreen recordResult={(d) => recordResult('math', d)} />
            </PaywallGate>
          </View>

          <View style={show('Reading')}>
            <PaywallGate feature="reading" onUpgrade={() => setCurrentScreen('Subscription')}>
              <ReadingScreen recordResult={(d) => recordResult('quiz', d)} />
            </PaywallGate>
          </View>

          <View style={show('Glossary')}>
            <PaywallGate feature="glossary" onUpgrade={() => setCurrentScreen('Subscription')}>
              <GlossaryScreen />
            </PaywallGate>
          </View>

          <View style={show('Settings')}>
            <SettingsScreen resetStats={resetStats} onNavigate={setCurrentScreen} />
          </View>

          {/* Overlay screens — no tab bar entry ──── */}
          <View style={show('Subscription')}>
            <SubscriptionScreen onNavigate={setCurrentScreen} />
          </View>

        </View>

        {!OVERLAY_SCREENS.includes(currentScreen) && (
          <SpadeMenu
            tabs={TABS}
            currentScreen={currentScreen}
            onNavigate={setCurrentScreen}
          />
        )}

      </View>

      {/* Lost-streak in-app popup */}
      <Modal
        visible={!!lostStreakInfo}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={clearLostStreakInfo}
      >
        <View style={styles.streakOverlay}>
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakTitle}>Streak Lost</Text>
            <Text style={styles.streakBody}>
              {lostStreakInfo?.wasRecord
                ? `Your ${lostStreakInfo.oldStreak}-day streak was a personal best!`
                : `Your ${lostStreakInfo?.oldStreak}-day streak is gone.`}
            </Text>
            <Text style={styles.streakHint}>Start a new one today.</Text>
            <TouchableOpacity style={styles.streakBtn} onPress={clearLostStreakInfo} activeOpacity={0.8}>
              <Text style={styles.streakBtnText}>Let's go</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0F0F10' },
  screenWrap: { flex: 1, paddingBottom: 100 },

  // Lost-streak popup
  streakOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  streakCard: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  streakEmoji: { fontSize: 36, marginBottom: 10 },
  streakTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 8, letterSpacing: -0.2 },
  streakBody:  { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 },
  streakHint:  { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4, marginBottom: 20 },
  streakBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#E8A030',
    alignItems: 'center',
  },
  streakBtnText: { fontSize: 15, fontWeight: '600', color: '#000', letterSpacing: 0.1 },
});
