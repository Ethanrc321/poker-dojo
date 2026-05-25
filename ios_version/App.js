import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';

import DashboardScreen from './src/screens/DashboardScreen.js';
import PreflopScreen   from './src/screens/PreflopScreen.js';
import PostflopScreen  from './src/screens/PostflopScreen.js';
import MathScreen      from './src/screens/MathScreen.js';
import ChartsScreen    from './src/screens/ChartsScreen.js';
import ReadingScreen   from './src/screens/ReadingScreen.js';
import GlossaryScreen  from './src/screens/GlossaryScreen.js';
import SettingsScreen  from './src/screens/SettingsScreen.js';

import SpadeMenu    from './src/components/SpadeMenu.js';
import PaywallGate  from './src/components/PaywallGate.js';

import { AuthProvider, useAuth }             from './src/context/AuthContext.js';
import { SubscriptionProvider }              from './src/context/SubscriptionContext.js';

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
function AppContent() {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold });
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [stats,         setStats]         = useState(INITIAL_STATS);

  const { user, saveStats, loadStats } = useAuth();
  const cloudLoadedRef = useRef(false); // prevents initial load overwriting cloud data

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

  if (!fontsLoaded) return null;

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
            />
          </View>

          {/* Free ─────────────────────────────────── */}
          <View style={show('Preflop')}>
            <PreflopScreen recordResult={(d) => recordResult('preflop', d)} />
          </View>

          <View style={show('Charts')}>
            <ChartsScreen />
          </View>

          {/* Premium — gated ─────────────────────── */}
          <View style={show('Postflop')}>
            <PaywallGate feature="postflop">
              <PostflopScreen recordResult={(d) => recordResult('postflop', d)} />
            </PaywallGate>
          </View>

          <View style={show('Math')}>
            <PaywallGate feature="math">
              <MathScreen recordResult={(d) => recordResult('math', d)} />
            </PaywallGate>
          </View>

          <View style={show('Reading')}>
            <PaywallGate feature="reading">
              <ReadingScreen recordResult={(d) => recordResult('quiz', d)} />
            </PaywallGate>
          </View>

          <View style={show('Glossary')}>
            <PaywallGate feature="glossary">
              <GlossaryScreen />
            </PaywallGate>
          </View>

          <View style={show('Settings')}>
            <SettingsScreen resetStats={resetStats} onNavigate={setCurrentScreen} />
          </View>

        </View>

        <SpadeMenu
          tabs={TABS}
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0F0F10' },
  screenWrap: { flex: 1, paddingBottom: 100 },
});
