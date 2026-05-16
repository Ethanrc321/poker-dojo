import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';

import DashboardScreen from './src/screens/DashboardScreen.js';
import PlayScreen      from './src/screens/PlayScreen.js';
import PreflopScreen   from './src/screens/PreflopScreen.js';
import PostflopScreen  from './src/screens/PostflopScreen.js';
import MathScreen      from './src/screens/MathScreen.js';
import ChartsScreen    from './src/screens/ChartsScreen.js';
import ReadingScreen   from './src/screens/ReadingScreen.js';
import GlossaryScreen  from './src/screens/GlossaryScreen.js';

import SpadeMenu from './src/components/SpadeMenu.js';

const INITIAL_STATS = {
  preflop:  { total: 0, correct: 0, byPosition: {} },
  postflop: { total: 0, correct: 0 },
  math:     { total: 0, correct: 0 },
  quiz:     { total: 0, correct: 0 },
  play:     { total: 0, correct: 0 },
};

const TABS = [
  { id: 'Home',     label: 'Home',     icon: 'home-outline'          },
  { id: 'Play',     label: 'Play',     icon: 'play-circle-outline'   },
  { id: 'Preflop',  label: 'Preflop',  icon: 'hand-left-outline'     },
  { id: 'Postflop', label: 'Postflop', icon: 'layers-outline'        },
  { id: 'Math',     label: 'Math',     icon: 'calculator-outline'    },
  { id: 'Charts',   label: 'Charts',   icon: 'stats-chart-outline'   },
  { id: 'Reading',  label: 'Reading',  icon: 'eye-outline'           },
  { id: 'Glossary', label: 'Glossary', icon: 'school-outline'        },
];

export default function App() {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold });
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [stats, setStats] = useState(INITIAL_STATS);

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

  const resetStats = useCallback(() => setStats(INITIAL_STATS), []);

  if (!fontsLoaded) return null;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return <DashboardScreen stats={stats} resetStats={resetStats} onNavigate={setCurrentScreen} />;
      case 'Play':
        return <PlayScreen recordResult={(d) => recordResult('play', d)} />;
      case 'Preflop':
        return <PreflopScreen recordResult={(d) => recordResult('preflop', d)} />;
      case 'Postflop':
        return <PostflopScreen recordResult={(d) => recordResult('postflop', d)} />;
      case 'Math':
        return <MathScreen recordResult={(d) => recordResult('math', d)} />;
      case 'Charts':
        return <ChartsScreen />;
      case 'Reading':
        return <ReadingScreen recordResult={(d) => recordResult('quiz', d)} />;
      case 'Glossary':
        return <GlossaryScreen />;
      default:
        return <DashboardScreen stats={stats} resetStats={resetStats} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        {/* Active screen — paddingBottom keeps content clear of trigger */}
        <View style={styles.screenWrap}>
          {renderScreen()}
        </View>

        {/* Radial spade menu — absolutely positioned overlay */}
        <SpadeMenu
          tabs={TABS}
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0F0F10' },
  screenWrap: { flex: 1, paddingBottom: 100 },
});
