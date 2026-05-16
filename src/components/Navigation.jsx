const NAV_ITEMS = [
  { id: 'dashboard',       label: '🏠 Home',        short: 'Home' },
  { id: 'handSimulator',   label: '🎮 Play Hands',   short: 'Play' },
  { id: 'preflopTrainer',  label: '♠ Preflop',      short: 'Preflop' },
  { id: 'postflopTrainer', label: '🃏 Postflop',     short: 'Postflop' },
  { id: 'mathDrills',      label: '🔢 Math Drills',  short: 'Math' },
  { id: 'handCharts',      label: '📊 Charts',       short: 'Charts' },
  { id: 'handReadingQuiz', label: '🔍 Hand Reading', short: 'Reading' },
  { id: 'glossary',        label: '📖 Glossary',     short: 'Glossary' },
];

export default function Navigation({ currentView, setView, stats }) {
  const totalCorrect = Object.values(stats).reduce((a, m) => a + (m.correct || 0), 0);
  const totalHands   = Object.values(stats).reduce((a, m) => a + (m.total   || 0), 0);
  const pct = totalHands > 0 ? Math.round((totalCorrect / totalHands) * 100) : null;

  return (
    <nav style={{ background: '#0d0d0d', borderBottom: '1px solid #1a1a1a' }} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 font-bold text-lg shrink-0 transition-opacity hover:opacity-80"
          >
            <span className="text-xl" style={{ color: '#00FF88' }}>♠</span>
            <span className="hidden sm:block text-white text-sm tracking-wide">TAG Trainer</span>
          </button>

          {/* Nav items */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
            {NAV_ITEMS.map(item => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150"
                  style={active
                    ? { background: 'rgba(0,255,136,0.12)', color: '#00FF88', boxShadow: '0 0 0 1px rgba(0,255,136,0.25)' }
                    : { color: '#666', background: 'transparent' }
                  }
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#ccc'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#666'; }}
                >
                  <span className="hidden lg:block">{item.label}</span>
                  <span className="block lg:hidden">{item.short}</span>
                </button>
              );
            })}
          </div>

          {/* Stats badge */}
          {pct !== null && (
            <div className="hidden md:flex items-center gap-1.5 text-xs shrink-0 ml-2" style={{ color: '#555' }}>
              <span style={{ color: pct >= 80 ? '#00FF88' : pct >= 60 ? '#f59e0b' : '#ef4444' }}>
                {pct}%
              </span>
              <span>({totalHands})</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
