import { useState, useEffect } from 'react';
import Navigation from './components/Navigation.jsx';
import Dashboard from './components/Dashboard.jsx';
import PreflopTrainer from './components/PreflopTrainer.jsx';
import PostflopTrainer from './components/PostflopTrainer.jsx';
import MathDrills from './components/MathDrills.jsx';
import HandCharts from './components/HandCharts.jsx';
import HandReadingQuiz from './components/HandReadingQuiz.jsx';
import Glossary from './components/Glossary.jsx';
import HandSimulator from './components/HandSimulator.jsx';

const STORAGE_KEY = 'poker_trainer_stats';

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function defaultStats() {
  return {
    preflop:  { total: 0, correct: 0, byPosition: {} },
    postflop: { total: 0, correct: 0 },
    math:     { total: 0, correct: 0 },
    quiz:     { total: 0, correct: 0 },
  };
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [stats, setStats] = useState(() => loadStats() || defaultStats());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  function recordResult(module, correct, extra = {}) {
    setStats(prev => {
      const next = { ...prev };
      const m = { ...next[module] };
      m.total   = (m.total   || 0) + 1;
      m.correct = (m.correct || 0) + (correct ? 1 : 0);

      if (module === 'preflop' && extra.position) {
        const byPos = { ...(m.byPosition || {}) };
        const pos = byPos[extra.position] || { total: 0, correct: 0 };
        byPos[extra.position] = {
          total:   pos.total + 1,
          correct: pos.correct + (correct ? 1 : 0),
        };
        m.byPosition = byPos;
      }
      next[module] = m;
      return next;
    });
  }

  function resetStats() {
    const fresh = defaultStats();
    setStats(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }

  const views = {
    dashboard:     <Dashboard stats={stats} setView={setView} resetStats={resetStats} />,
    preflopTrainer: <PreflopTrainer recordResult={r => recordResult('preflop', r.correct, { position: r.position })} />,
    postflopTrainer: <PostflopTrainer recordResult={r => recordResult('postflop', r.correct)} />,
    mathDrills:    <MathDrills recordResult={r => recordResult('math', r.correct)} />,
    handCharts:    <HandCharts />,
    handReadingQuiz: <HandReadingQuiz recordResult={r => recordResult('quiz', r.correct)} />,
    glossary:      <Glossary />,
    handSimulator: <HandSimulator setView={setView} />,
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navigation currentView={view} setView={setView} stats={stats} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {views[view]}
      </main>
      <footer className="text-center py-4 text-gray-600 text-xs border-t border-gray-800">
        TAG Poker Trainer · 6-max · 100bb · GTO-calibrated ranges
      </footer>
    </div>
  );
}
