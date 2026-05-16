import { useState, useEffect, useCallback } from 'react';

// ── Quiz data generators ──────────────────────────────────────

function potOddsQ() {
  const bets = [25,33,50,66,75,100,133,150];
  const answers = {25:16.7,33:20.0,50:25.0,66:28.6,75:30.0,100:33.3,133:40.0,150:42.9};
  const b = bets[Math.floor(Math.random() * bets.length)];
  const correct = answers[b];
  const pot = Math.floor(Math.random() * 8 + 2) * 10;
  const betAmt = Math.round(pot * b / 100);
  const totalPot = pot + betAmt * 2;
  const distractors = [correct - 5, correct + 5, correct - 10, correct + 8]
    .map(v => Math.round(v * 10) / 10)
    .filter(v => v > 0 && v !== correct)
    .slice(0, 3);
  const opts = shuffle([correct, ...distractors]).map(v => ({ label: v + '%', value: v }));
  return {
    type: 'potodds',
    question: `Pot: $${pot}. Villain bets $${betAmt} (${b}% pot). What is the minimum equity you need to profitably call?`,
    options: opts,
    correct,
    explanation: `Pot odds = Call ÷ (Call + Total Pot After Call) = ${betAmt} ÷ (${betAmt} + ${betAmt + pot}) = ${betAmt} ÷ ${betAmt * 2 + pot} = ${correct}%. You need at least ${correct}% equity.`,
    formula: 'Call ÷ (Call + Total Pot After Call)',
  };
}

function mdfQ() {
  const bets = [25,33,50,66,75,100,133];
  const answers = {25:80.0,33:75.0,50:66.7,66:60.2,75:57.1,100:50.0,133:42.9};
  const b = bets[Math.floor(Math.random() * bets.length)];
  const correct = answers[b];
  const pot = Math.floor(Math.random() * 8 + 2) * 10;
  const betAmt = Math.round(pot * b / 100);
  const distractors = [correct - 5, correct + 5, correct - 10, correct + 8]
    .map(v => Math.round(v * 10) / 10)
    .filter(v => v > 0 && v < 100 && v !== correct)
    .slice(0, 3);
  const opts = shuffle([correct, ...distractors]).map(v => ({ label: v + '%', value: v }));
  return {
    type: 'mdf',
    question: `Pot: $${pot}. Villain bets $${betAmt} (${b}% pot). What is the Minimum Defense Frequency (MDF) — how often must you continue to prevent profitable bluffs?`,
    options: opts,
    correct,
    explanation: `MDF = Pot ÷ (Pot + Bet) = ${pot} ÷ (${pot} + ${betAmt}) = ${pot} ÷ ${pot + betAmt} = ${correct}%. You must call or raise with at least ${correct}% of your range.`,
    formula: 'Pot ÷ (Pot + Bet)',
  };
}

function alphaQ() {
  const bets = [25,33,50,75,100,133];
  const answers = {25:20.0,33:25.0,50:33.3,75:42.9,100:50.0,133:57.1};
  const b = bets[Math.floor(Math.random() * bets.length)];
  const correct = answers[b];
  const pot = Math.floor(Math.random() * 8 + 2) * 10;
  const betAmt = Math.round(pot * b / 100);
  const distractors = [correct - 5, correct + 5, correct - 10, correct + 8]
    .map(v => Math.round(v * 10) / 10)
    .filter(v => v > 0 && v < 100 && v !== correct)
    .slice(0, 3);
  const opts = shuffle([correct, ...distractors]).map(v => ({ label: v + '%', value: v }));
  return {
    type: 'alpha',
    question: `Pot: $${pot}. You bet $${betAmt} (${b}% pot) as a bluff. What fold percentage (Alpha) makes your bluff immediately profitable?`,
    options: opts,
    correct,
    explanation: `Alpha = Bet ÷ (Bet + Pot) = ${betAmt} ÷ (${betAmt} + ${pot}) = ${betAmt} ÷ ${betAmt + pot} = ${correct}%. If villain folds more than ${correct}%, your bluff profits immediately.`,
    formula: 'Bet ÷ (Bet + Pot) — or simply 1 − MDF',
  };
}

function sprQ() {
  const pots   = [10, 15, 20, 30, 40, 50];
  const stacks = [30, 50, 80, 100, 150, 200, 300];
  const pot   = pots[Math.floor(Math.random() * pots.length)];
  const stack = stacks[Math.floor(Math.random() * stacks.length)];
  const spr = Math.round((stack / pot) * 10) / 10;

  const thresholds = {
    'Committed (< 1)': spr < 1,
    'Low SPR 1–3': spr >= 1 && spr < 3,
    'Medium SPR 3–6': spr >= 3 && spr < 6,
    'High SPR 6–13': spr >= 6 && spr <= 13,
    'Very Deep (> 13)': spr > 13,
  };
  const correct = Object.keys(thresholds).find(k => thresholds[k]);
  const opts = shuffle(Object.keys(thresholds)).map(v => ({ label: v, value: v }));
  return {
    type: 'spr',
    question: `Effective stack: $${stack}. Pot on the flop: $${pot}. Calculate the SPR and classify it.`,
    options: opts,
    correct,
    spr,
    explanation: `SPR = Stack ÷ Pot = ${stack} ÷ ${pot} = ${spr}. Classification: ${correct}. ${spr < 1 ? 'You are committed — virtually any pair is a stack-off hand.' : spr < 3 ? 'Low SPR: TPTK or better is comfortable to stack off.' : spr < 6 ? 'Medium SPR: Two pair or better to stack off. Common cash game scenario.' : spr < 13 ? 'High SPR: Sets and straights to stack off. Implied odds matter significantly.' : 'Very deep: Only nutted hands justify stacking off.'}`,
    formula: 'Effective Stack ÷ Pot Size on Flop',
  };
}

function evQ() {
  const equities = [25, 30, 35, 40, 45, 50];
  const calls    = [20, 30, 40, 50, 60];
  const pots     = [80, 100, 120, 150, 200];
  const eq  = equities[Math.floor(Math.random() * equities.length)];
  const pot = pots[Math.floor(Math.random() * pots.length)];
  const call= calls[Math.floor(Math.random() * calls.length)];
  const totalPot = pot + call;
  const ev  = Math.round(((eq / 100) * totalPot - call) * 100) / 100;
  const isPositive = ev > 0;
  const correct = isPositive ? 'Call (positive EV)' : 'Fold (negative EV)';
  const opts = shuffle([
    { label: 'Call (positive EV)', value: 'Call (positive EV)' },
    { label: 'Fold (negative EV)', value: 'Fold (negative EV)' },
  ]);
  return {
    type: 'ev',
    question: `You have ${eq}% equity. Pot: $${pot}. Villain bets $${call}. You must call $${call}. EV = (${eq}% × $${totalPot}) − $${call}. Should you call or fold?`,
    options: opts,
    correct,
    ev,
    explanation: `EV = (Equity × Total Pot) − Call = (${eq/100} × $${totalPot}) − $${call} = $${Math.round(eq/100 * totalPot * 100)/100} − $${call} = $${ev}. This is a ${isPositive ? 'POSITIVE' : 'NEGATIVE'} EV call — you should ${isPositive ? 'CALL' : 'FOLD'}.`,
    formula: 'EV = (Equity × Total Pot) − Call Amount',
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DRILL_TYPES = [
  { id: 'all',     label: 'All Drills' },
  { id: 'potodds', label: 'Pot Odds' },
  { id: 'mdf',     label: 'MDF' },
  { id: 'alpha',   label: 'Alpha' },
  { id: 'spr',     label: 'SPR' },
  { id: 'ev',      label: 'EV' },
];

const DRILL_GENERATORS = { potodds: potOddsQ, mdf: mdfQ, alpha: alphaQ, spr: sprQ, ev: evQ };

function generateQ(type) {
  if (type === 'all') {
    const gens = Object.values(DRILL_GENERATORS);
    return gens[Math.floor(Math.random() * gens.length)]();
  }
  return DRILL_GENERATORS[type]?.();
}

const TYPE_COLORS = {
  potodds: 'text-green-400 bg-green-900/20',
  mdf:     'text-blue-400 bg-blue-900/20',
  alpha:   'text-rose-400 bg-rose-900/20',
  spr:     'text-amber-400 bg-amber-900/20',
  ev:      'text-purple-400 bg-purple-900/20',
};
const TYPE_LABELS = { potodds:'Pot Odds', mdf:'MDF', alpha:'Alpha', spr:'SPR', ev:'EV Call' };

export default function MathDrills({ recordResult }) {
  const [drillType, setDrillType] = useState('all');
  const [question,  setQuestion]  = useState(null);
  const [chosen,    setChosen]    = useState(null);
  const [streak,    setStreak]    = useState(0);
  const [stats,     setStats]     = useState({ total: 0, correct: 0 });

  const nextQ = useCallback(() => {
    setQuestion(generateQ(drillType));
    setChosen(null);
  }, [drillType]);

  useEffect(() => { nextQ(); }, [drillType]);

  useEffect(() => {
    function onKey(e) {
      if (chosen !== null && (e.key === 'n' || e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        nextQ();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chosen, nextQ]);

  function handleAnswer(val) {
    if (chosen !== null) return;
    setChosen(val);
    const isCorrect = String(val) === String(question.correct);
    setStats(s => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
    setStreak(s => isCorrect ? s + 1 : 0);
    recordResult({ correct: isCorrect });
  }

  if (!question) return null;

  const isCorrect = chosen !== null && String(chosen) === String(question.correct);
  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;
  const typeColor = TYPE_COLORS[question.type] || 'text-gray-400';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Math Drills</h1>
          <p className="text-sm text-gray-400">Pot odds · MDF · Alpha · SPR · EV</p>
        </div>
        <div className="text-right">
          {pct !== null && (
            <div className={`text-lg font-bold ${pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {pct}%
            </div>
          )}
          {streak >= 3 && <div className="text-xs text-amber-400">{streak}🔥</div>}
        </div>
      </div>

      {/* Type selector */}
      <div className="flex flex-wrap gap-2">
        {DRILL_TYPES.map(dt => (
          <button
            key={dt.id}
            onClick={() => setDrillType(dt.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              drillType === dt.id ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* Question card */}
      <div className="panel border border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${typeColor}`}>
            {TYPE_LABELS[question.type]}
          </span>
          {stats.total > 0 && (
            <span className="text-xs text-gray-500">{stats.total} answered this session</span>
          )}
        </div>

        <p className="text-gray-200 text-sm leading-relaxed mb-1 font-medium">{question.question}</p>
        <div className="text-xs text-gray-500 mb-4">Formula: <span className="text-amber-300">{question.formula}</span></div>

        <div className="space-y-2">
          {question.options.map((opt, i) => {
            const isSel = chosen !== null && String(opt.value) === String(chosen);
            const isRight = String(opt.value) === String(question.correct);
            let style = 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700';
            if (chosen !== null) {
              if (isRight) style = 'bg-green-900 border-green-600 text-green-200';
              else if (isSel) style = 'bg-red-900 border-red-700 text-red-200';
              else style = 'bg-gray-800 border-gray-800 text-gray-500';
            }
            return (
              <button
                key={i}
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
        <div className={`panel border ${isCorrect ? 'border-green-700 bg-green-900/20' : 'border-red-700 bg-red-900/20'}`}>
          <div className={`font-bold mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'} {question.spr !== undefined && `SPR = ${question.spr}`}
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {chosen !== null && (
        <button onClick={nextQ} className="w-full btn-neutral py-3 font-semibold">
          Next Question <kbd className="text-xs opacity-60">[N / Space]</kbd>
        </button>
      )}

      {/* Reference cards */}
      <details className="panel cursor-pointer">
        <summary className="text-sm font-semibold text-gray-400 select-none">Quick Reference Formulas</summary>
        <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
          {[
            ['Pot Odds', 'Call ÷ (Call + Pot After Call)', 'green'],
            ['MDF', 'Pot ÷ (Pot + Bet)', 'blue'],
            ['Alpha', 'Bet ÷ (Bet + Pot) = 1 − MDF', 'rose'],
            ['SPR', 'Effective Stack ÷ Flop Pot', 'amber'],
            ['EV (Call)', '(Equity × Total Pot) − Call', 'purple'],
            ['EV (Bluff)', '(Fold% × Pot) − (Call% × Bet)', 'purple'],
          ].map(([name, formula, color]) => (
            <div key={name} className="bg-gray-800/60 rounded p-2">
              <div className={`font-semibold text-${color}-400 mb-0.5`}>{name}</div>
              <div className="text-gray-400 font-mono">{formula}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
