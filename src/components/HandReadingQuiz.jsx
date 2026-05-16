import { useState, useEffect } from 'react';
import { HAND_READING_QUIZZES } from '../data/scenarios.js';

export default function HandReadingQuiz({ recordResult }) {
  const [idx,    setIdx]    = useState(0);
  const [chosen, setChosen] = useState(null);
  const [stats,  setStats]  = useState({ total: 0, correct: 0 });

  const total = HAND_READING_QUIZZES.length;
  const q = HAND_READING_QUIZZES[idx];

  useEffect(() => {
    function onKey(e) {
      if (chosen !== null && (e.key === 'n' || e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chosen, idx]);

  function handleAnswer(val) {
    if (chosen !== null) return;
    setChosen(val);
    const isCorrect = val === q.correct;
    setStats(s => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
    recordResult({ correct: isCorrect });
  }

  function next() {
    setIdx(i => (i + 1) % total);
    setChosen(null);
  }

  const isCorrect = chosen !== null && chosen === q.correct;
  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hand Reading Quiz</h1>
          <p className="text-sm text-gray-400">Analyze betting sequences · Narrow villain's range</p>
        </div>
        {pct !== null && (
          <div className={`text-lg font-bold ${pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {pct}%
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{idx + 1} / {total}</span>
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-600 transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
      </div>

      {/* Scenario */}
      <div className="panel border border-gray-700">
        <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Scenario</div>
          <p className="text-gray-200 text-sm leading-relaxed">{q.scenario}</p>
        </div>

        <div className="text-sm font-semibold text-white mb-3">What is the most accurate assessment?</div>

        <div className="space-y-2">
          {q.options.map(opt => {
            const isSel = chosen !== null && chosen === opt.value;
            const isRight = opt.value === q.correct;
            let style = 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700';
            if (chosen !== null) {
              if (isRight) style = 'bg-green-900 border-green-600 text-green-200';
              else if (isSel) style = 'bg-red-900 border-red-700 text-red-200';
              else style = 'bg-gray-800 border-gray-800 text-gray-500';
            }
            return (
              <button
                key={opt.value}
                onClick={() => handleAnswer(opt.value)}
                disabled={chosen !== null}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${style}`}
              >
                {isSel && isRight && '✓ '}
                {isSel && !isRight && '✗ '}
                {!isSel && chosen !== null && isRight && '✓ '}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      {chosen !== null && (
        <div className={`panel border ${isCorrect ? 'border-green-700 bg-green-900/20' : 'border-amber-700 bg-amber-900/20'}`}>
          <div className={`font-bold text-lg mb-2 ${isCorrect ? 'text-green-400' : 'text-amber-400'}`}>
            {isCorrect ? '✓ Correct!' : '⚠ Not Quite'}
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {chosen !== null && (
        <button onClick={next} className="w-full btn-neutral py-3 font-semibold">
          Next Scenario <kbd className="text-xs opacity-60">[N / Space]</kbd>
        </button>
      )}

      {/* Range Reading Tips */}
      <details className="panel cursor-pointer">
        <summary className="text-sm font-semibold text-gray-400 select-none">Hand Reading Fundamentals</summary>
        <div className="mt-3 space-y-3 text-sm text-gray-400">
          {[
            ['Start with preflop action', 'A UTG raiser has a ~17% range. A BTN 3-bettor after a CO open has a polarized range. Always begin by filtering based on preflop action.'],
            ['Narrow on each street', 'Every bet, check, or raise narrows the range. A check on the flop removes most premium made hands unless the player is trapping.'],
            ['Look for blockers', 'If you hold an ace, villain is less likely to have AA/AK. If you hold the K♥, they can\'t have K♥ in a flush-chasing range.'],
            ['Consider bet sizing', 'Large bets on the river are polarized (nuts or bluff). Small bets are often thin value or blocking bets. Sizing is a massive range tell.'],
            ['The merged vs. polarized question', 'On early streets, ranges are more merged (many hands). On the river, ranges should be polarized (value or air). A medium-sized river bet from a balanced player is unusual.'],
          ].map(([title, text]) => (
            <div key={title} className="bg-gray-800/50 rounded-lg p-3">
              <div className="font-semibold text-green-300 mb-1">{title}</div>
              <div>{text}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
