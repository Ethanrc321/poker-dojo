import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    <SafeAreaProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// ── Main app — consumes context ───────────────────────────────────────────────
const ONBOARDING_KEY = '@poker_onboarding_done';

function AppContent() {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold });
  const [currentScreen,   setCurrentScreen]   = useState('Home');
  const [stats,           setStats]           = useState(INITIAL_STATS);
  const [onboardingDone,  setOnboardingDone]  = useState(null); // null = loading

  const { user, saveStats, loadStats } = useAuth();
  const cloudLoadedRef = useRef(false); // prevents initial load overwriting cloud data
  const { streak, longestStreak, practicedToday, dailyCount, loaded: streakLoaded, recordPractice } = useStreak();

  // Restore haptics preference on first mount
  useEffect(() => { loadHapticsPreference(); }, []);

  // Check if onboarding has been completed before
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      setOnboardingDone(val === 'true');
    });
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

  const recordResult = useCallback((module, { correct, position } = {}) => {
    // Record practice day for streak — awards streak once DAILY_GOAL hands are reached
    recordPractice().then(result => {
      if (result.isNew) cancelStreakReminder(); // just earned today's streak — cancel reminder
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

  if (!fontsLoaded || onboardingDone === null) return null;

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
    </>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0F0F10' },
  screenWrap: { flex: 1, paddingBottom: 100 },
});
