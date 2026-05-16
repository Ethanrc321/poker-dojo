import { useState } from 'react';
import { POSTFLOP_SCENARIOS, getCbetRecommendation } from '../data/scenarios.js';

function Card({ card, small = false }) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  const size = small ? 'w-10 h-14 text-xs' : 'w-12 h-16 text-sm';
  return (
    <div className={`${size} bg-white rounded-lg border border-gray-200 flex flex-col justify-between p-1 shadow-lg`}>
      <div className={`font-black leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.rank}</div>
      <div className={`text-center leading-none text-xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.suit}</div>
      <div className={`font-black leading-none self-end rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.rank}</div>
    </div>
  );
}

const TEXTURE_COLORS = {
  Dry:       'text-green-400 bg-green-900/20',
  'Semi-Wet':'text-amber-400 bg-amber-900/20',
  Wet:       'text-blue-400 bg-blue-900/20',
  Paired:    'text-purple-400 bg-purple-900/20',
  Monotone:  'text-red-400 bg-red-900/20',
};

function PokerTable({ heroPos, villainPos, board, heroHand, heroHand2, street }) {
  return (
    <div className="relative bg-felt-800 border-4 border-felt-600 rounded-3xl p-6 shadow-2xl min-h-[180px]">
      {/* Felt texture overlay */}
      <div className="absolute inset-0 rounded-3xl opacity-20"
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(100,200,100,0.1) 0%, transparent 70%)' }} />

      {/* Positions */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">{villainPos}</div>
          <div className="flex gap-1">
            <div className="w-9 h-12 bg-blue-900 rounded-lg border border-blue-700 flex items-center justify-center text-blue-400 text-xs">?</div>
            <div className="w-9 h-12 bg-blue-900 rounded-lg border border-blue-700 flex items-center justify-center text-blue-400 text-xs">?</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Pot</div>
          <div className="text-amber-400 font-bold text-sm">see below</div>
        </div>

        <div className="text-center">
          <div className="text-xs text-green-400 font-semibold mb-1">YOU ({heroPos})</div>
          <div className="flex gap-1">
            <Card card={heroHand} small />
            <Card card={heroHand2} small />
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex justify-center gap-2 relative z-10">
        {board.map((c, i) => <Card key={i} card={c} />)}
        {board.length < 5 && (
          Array.from({ length: 5 - board.length }).map((_, i) => (
            <div key={`future-${i}`} className="w-12 h-16 rounded-lg border-2 border-dashed border-gray-600 opacity-30" />
          ))
        )}
      </div>

      {/* Street indicator */}
      <div className="text-center mt-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{street}</span>
      </div>
    </div>
  );
}

export default function PostflopTrainer({ recordResult }) {
  const [idx,         setIdx]         = useState(0);
  const [userChoice,  setUserChoice]  = useState(null);
  const [sessionStats,setSessionStats] = useState({ total: 0, correct: 0 });

  const scenario = POSTFLOP_SCENARIOS[idx];
  const rec = getCbetRecommendation(scenario.boardTexture, scenario.heroPosition === 'BTN' ? 'IP' : 'OOP');
  const textureStyle = TEXTURE_COLORS[scenario.boardTexture] || 'text-gray-400';

  const spr = scenario.spr ?? (scenario.effectiveStackBB / scenario.potBB).toFixed(1);

  function handleChoice(val) {
    if (userChoice !== null) return;
    const isCorrect = val === scenario.correctOption;
    setUserChoice(val);
    setSessionStats(prev => ({
      total:   prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
    }));
    recordResult({ correct: isCorrect });
  }

  function next() {
    setIdx(i => (i + 1) % POSTFLOP_SCENARIOS.length);
    setUserChoice(null);
  }

  const pct = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Postflop Trainer</h1>
          <p className="text-sm text-gray-400">Board texture analysis, SPR, c-bet decisions</p>
        </div>
        {pct !== null && (
          <div className={`text-lg font-bold ${pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {pct}%
          </div>
        )}
      </div>

      {/* Scenario header */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">{idx + 1}/{POSTFLOP_SCENARIOS.length}</span>
        <span className="text-gray-700">·</span>
        <span className="text-gray-300 font-medium">{scenario.title}</span>
      </div>

      {/* Table visual */}
      <PokerTable
        heroPos={scenario.heroPosition}
        villainPos={scenario.villainPosition}
        board={scenario.board}
        heroHand={scenario.heroHand}
        heroHand2={scenario.heroHand2}
        street={scenario.street}
      />

      {/* Situation stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="panel py-3">
          <div className="text-amber-400 font-bold text-lg">{scenario.potBB}bb</div>
          <div className="text-xs text-gray-500">Pot</div>
        </div>
        <div className="panel py-3">
          <div className="text-blue-400 font-bold text-lg">{spr}</div>
          <div className="text-xs text-gray-500">SPR</div>
        </div>
        <div className="panel py-3">
          <div className={`font-bold text-sm px-2 py-0.5 rounded ${textureStyle}`}>{scenario.boardTexture}</div>
          <div className="text-xs text-gray-500 mt-1">Board</div>
        </div>
      </div>

      {/* Question */}
      <div className="panel border border-gray-700">
        <div className="text-sm text-gray-200 mb-4 leading-relaxed font-medium">{scenario.question}</div>

        <div className="space-y-2">
          {scenario.options.map(opt => {
            const isSelected = userChoice === opt.value;
            const isCorrect  = opt.value === scenario.correctOption;
            let style = 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700';
            if (userChoice !== null) {
              if (isCorrect)  style = 'bg-green-900 border-green-600 text-green-200';
              else if (isSelected) style = 'bg-red-900 border-red-700 text-red-200';
              else style = 'bg-gray-800 border-gray-800 text-gray-500';
            }
            return (
              <button
                key={opt.value}
                onClick={() => handleChoice(opt.value)}
                disabled={userChoice !== null}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${style}`}
              >
                {isSelected && userChoice !== null && (isCorrect ? '✓ ' : '✗ ')}
                {!isSelected && userChoice !== null && isCorrect && '✓ '}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {userChoice !== null && (
        <div className={`panel border ${userChoice === scenario.correctOption ? 'border-green-700 bg-green-900/20' : 'border-amber-700 bg-amber-900/20'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-lg font-bold ${userChoice === scenario.correctOption ? 'text-green-400' : 'text-amber-400'}`}>
              {userChoice === scenario.correctOption ? '✓ Correct!' : '⚠ Not Optimal'}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed mb-3">{scenario.explanation}</p>
          <div className="bg-gray-800/60 rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-400 mb-1">Board Rec ({scenario.boardTexture}):</div>
            <div className="text-xs text-gray-400"><span className="text-amber-300">Frequency:</span> {rec.frequency}</div>
            <div className="text-xs text-gray-400"><span className="text-amber-300">Sizing:</span> {rec.sizing}</div>
          </div>
          <div className="mt-2 text-xs text-green-300 font-semibold">
            Key lesson: {scenario.keyLesson}
          </div>
        </div>
      )}

      {/* Next */}
      {userChoice !== null && (
        <button onClick={next} className="w-full btn-neutral py-3 font-semibold">
          Next Scenario →
        </button>
      )}
    </div>
  );
}
