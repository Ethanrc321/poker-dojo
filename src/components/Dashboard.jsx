import { POSITION_LABELS } from '../data/ranges.js';

const MODULES = [
  {
    id: 'handSimulator',
    icon: '🎮',
    title: 'Hand Simulator',
    desc: 'Play full hands against intelligent bots — TAG, LAG, calling station, and nit. Coach freezes the game after every decision to teach or commend.',
    gradient: 'linear-gradient(135deg, #0d2b1f 0%, #0a1a2e 100%)',
    accent: '#00FF88',
    border: 'rgba(0,255,136,0.2)',
    stat: null,
  },
  {
    id: 'preflopTrainer',
    icon: '♠',
    title: 'Preflop Trainer',
    desc: 'Practice open ranges, 3-bet spots, and BB defense across all positions. Tight-aggressive selection — no trash hand spam.',
    gradient: 'linear-gradient(135deg, #0d1f0d 0%, #0a1a0a 100%)',
    accent: '#4ade80',
    border: 'rgba(74,222,128,0.2)',
    stat: 'preflop',
  },
  {
    id: 'postflopTrainer',
    icon: '🃏',
    title: 'Postflop Trainer',
    desc: 'C-bet sizing, board texture analysis, turn/river decisions with SPR context.',
    gradient: 'linear-gradient(135deg, #0d1a2b 0%, #0a1220 100%)',
    accent: '#4B9AFF',
    border: 'rgba(75,154,255,0.2)',
    stat: 'postflop',
  },
  {
    id: 'mathDrills',
    icon: '🔢',
    title: 'Math Drills',
    desc: 'Rapid-fire pot odds, MDF, alpha, and EV calculations. Build the mental math that separates winners.',
    gradient: 'linear-gradient(135deg, #1a0d2b 0%, #120a20 100%)',
    accent: '#a78bfa',
    border: 'rgba(167,139,250,0.2)',
    stat: 'math',
  },
  {
    id: 'handCharts',
    icon: '📊',
    title: 'Hand Charts',
    desc: 'Full 13×13 range matrices for every position and scenario. Your reference for what to play from where.',
    gradient: 'linear-gradient(135deg, #1a150d 0%, #201500 100%)',
    accent: '#fbbf24',
    border: 'rgba(251,191,36,0.2)',
    stat: null,
  },
  {
    id: 'handReadingQuiz',
    icon: '🔍',
    title: 'Hand Reading Quiz',
    desc: "Analyze betting sequences and narrow down villain's range. The core skill that separates good players from great ones.",
    gradient: 'linear-gradient(135deg, #2b0d1a 0%, #200a12 100%)',
    accent: '#fb7185',
    border: 'rgba(251,113,133,0.2)',
    stat: 'quiz',
  },
  {
    id: 'glossary',
    icon: '📖',
    title: 'Glossary',
    desc: 'Every poker term you need — GTO, EV, SPR, MDF, polarized, merged, blockers, and more.',
    gradient: 'linear-gradient(135deg, #111 0%, #0d0d0d 100%)',
    accent: '#9ca3af',
    border: 'rgba(156,163,175,0.15)',
    stat: null,
  },
];

function StatBadge({ stats, statKey, accent }) {
  if (!statKey || !stats[statKey]) return null;
  const { total, correct } = stats[statKey];
  if (total === 0) return <span className="text-xs" style={{ color: '#444' }}>No data yet</span>;
  const pct = Math.round((correct / total) * 100);
  const color = pct >= 80 ? '#00FF88' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <span className="text-xs font-semibold font-mono" style={{ color }}>
      {pct}% <span style={{ color: '#555' }}>({total} hands)</span>
    </span>
  );
}

export default function Dashboard({ stats, setView, resetStats }) {
  const preflopByPos = stats.preflop?.byPosition || {};
  const totalHands   = Object.values(stats).reduce((a, m) => a + (m.total   || 0), 0);
  const totalCorrect = Object.values(stats).reduce((a, m) => a + (m.correct || 0), 0);
  const overallPct   = totalHands > 0 ? Math.round((totalCorrect / totalHands) * 100) : null;

  return (
    <div className="space-y-8">

      {/* Hero */}
      <div className="text-center py-10">
        <div className="text-5xl mb-4 tracking-widest" style={{ filter: 'drop-shadow(0 0 12px rgba(0,255,136,0.3))' }}>♠♥♦♣</div>
        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">TAG Poker Trainer</h1>
        <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: '#666' }}>
          Master <span className="font-semibold" style={{ color: '#00FF88' }}>Tight-Aggressive</span> strategy —
          the most profitable long-term approach in 6-max cash games.
          GTO-calibrated ranges, real hand scenarios, instant feedback.
        </p>
      </div>

      {/* Overall stats */}
      {totalHands > 0 && (
        <div className="panel grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { label: 'Overall Accuracy', value: `${overallPct}%`, color: overallPct >= 80 ? '#00FF88' : overallPct >= 60 ? '#f59e0b' : '#ef4444' },
            { label: 'Total Hands', value: totalHands, color: '#fff' },
            { label: 'Correct', value: totalCorrect, color: '#00FF88' },
            { label: 'Mistakes', value: totalHands - totalCorrect, color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
              <div className="text-xs mt-1" style={{ color: '#555' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Module grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULES.map(mod => (
          <button
            key={mod.id}
            onClick={() => setView(mod.id)}
            className="panel text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
            style={{ background: mod.gradient, border: `1px solid ${mod.border}`, padding: '20px' }}
          >
            <div className="text-2xl mb-3" style={{ filter: `drop-shadow(0 0 8px ${mod.accent}40)` }}>{mod.icon}</div>
            <h2 className="text-base font-bold text-white mb-1.5">{mod.title}</h2>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#777' }}>{mod.desc}</p>
            <div className="flex items-center justify-between">
              <StatBadge stats={stats} statKey={mod.stat} accent={mod.accent} />
              <span
                className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-opacity group-hover:opacity-90"
                style={{ background: `${mod.accent}1a`, color: mod.accent, border: `1px solid ${mod.accent}33` }}
              >
                Open →
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Position breakdown */}
      {Object.keys(preflopByPos).length > 0 && (
        <div className="panel">
          <h3 className="text-base font-bold text-white mb-4">Preflop Accuracy by Position</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {['UTG','HJ','CO','BTN','SB','BB'].map(pos => {
              const d = preflopByPos[pos];
              if (!d || d.total === 0) return (
                <div key={pos} className="text-center">
                  <div className="text-xl font-bold" style={{ color: '#2a2a2a' }}>—</div>
                  <div className="text-xs mt-0.5" style={{ color: '#333' }}>{pos}</div>
                </div>
              );
              const p = Math.round((d.correct / d.total) * 100);
              const color = p >= 80 ? '#00FF88' : p >= 60 ? '#f59e0b' : '#ef4444';
              return (
                <div key={pos} className="text-center">
                  <div className="text-xl font-bold font-mono" style={{ color }}>{p}%</div>
                  <div className="text-xs font-semibold mt-0.5 text-white">{pos}</div>
                  <div className="text-xs" style={{ color: '#555' }}>{d.total} hands</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAG Principles */}
      <div className="panel" style={{ border: '1px solid rgba(0,255,136,0.12)', background: 'linear-gradient(135deg, #0a1a0f 0%, #0a0a0a 100%)' }}>
        <h3 className="text-base font-bold mb-4" style={{ color: '#00FF88' }}>♠ Tight-Aggressive (TAG) Principles</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            ['Tight Preflop', 'Open only quality hands from each position. UTG plays ~17%, BTN up to ~43%. Resist the urge to play junk.'],
            ['Aggressive Entry', 'When you play a hand, raise. Never open-limp. Limping surrenders initiative and creates a weak, exploitable range.'],
            ['Position Awareness', 'Your playable range expands with position. BTN can play 2.5× more hands than UTG because it acts last postflop.'],
            ['C-bet with Purpose', 'C-bet on boards where you have range/nut advantage. Dry boards: small, frequent. Wet boards: large, selective.'],
            ['Fold to Resistance', 'Without a strong hand or draw, fold to significant aggression. Marginal hands lose money by calling down.'],
            ['Value Bet Relentlessly', "When you have a strong hand, bet for value across all streets. Don't slowplay — extract maximum EV."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="font-semibold text-xs mb-1" style={{ color: '#00cc6a' }}>{title}</div>
              <div className="text-xs leading-relaxed" style={{ color: '#666' }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      {totalHands > 0 && (
        <div className="text-center pb-4">
          <button
            onClick={() => { if (confirm('Reset all stats? This cannot be undone.')) resetStats(); }}
            className="text-xs transition-colors"
            style={{ color: '#333' }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#333'}
          >
            Reset all stats
          </button>
        </div>
      )}
    </div>
  );
}
