import { useState, useEffect, useCallback } from 'react';
import {
  RANKS, POSITIONS, POSITION_LABELS, RFI_RANGES, BB_DEFENSE,
  getRFIAction, getEVLoss, getNickname, getActionExplanation, buildTrainerPool,
} from '../data/ranges.js';

const SUITS = ['♠','♥','♦','♣'];
const SUIT_COLOR = { '♠':'text-gray-900','♥':'text-red-600','♦':'text-red-600','♣':'text-gray-900' };

// Parse hand string into two cards with random suits
function parseHand(hand) {
  const isPair    = hand.length === 2 && !hand.endsWith('s') && !hand.endsWith('o');
  const isSuited  = hand.endsWith('s');
  const isOffsuit = hand.endsWith('o');

  const r1 = hand[0];
  const r2 = isPair ? hand[0] : hand[1];

  if (isPair) {
    const s = shuffle([...SUITS]);
    return [{ rank: r1, suit: s[0] }, { rank: r2, suit: s[1] }];
  }
  if (isSuited) {
    const suit = SUITS[Math.floor(Math.random() * 4)];
    return [{ rank: r1, suit }, { rank: r2, suit }];
  }
  // offsuit
  const s = shuffle([...SUITS]);
  return [{ rank: r1, suit: s[0] }, { rank: r2, suit: s[1] !== s[0] ? s[1] : s[2] }];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function PlayingCard({ card, faceDown = false }) {
  if (faceDown) {
    return (
      <div className="w-16 h-24 bg-blue-800 rounded-xl border-2 border-blue-600 flex items-center justify-center shadow-xl">
        <div className="text-blue-400 text-2xl">?</div>
      </div>
    );
  }
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <div className={`w-16 h-24 bg-white rounded-xl border-2 border-gray-200 flex flex-col justify-between p-1.5 shadow-xl select-none`}>
      <div className={`text-lg font-black leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.rank}</div>
      <div className={`text-3xl text-center leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.suit}</div>
      <div className={`text-lg font-black leading-none self-end rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.rank}</div>
    </div>
  );
}

const POSITION_DESCRIPTIONS = {
  UTG: 'First to act. 5 players behind. Play only premium hands that can withstand 3-bets.',
  HJ:  'Second to act. 4 players behind. Slightly wider than UTG.',
  CO:  'Cutoff. 3 players behind. Wide range, position is valuable.',
  BTN: 'Button. Acts last postflop. Most profitable seat — open ~43% of hands.',
  SB:  'Small Blind. Only BB behind. Use 3bb open. OOP vs BB postflop.',
  BB:  'Big Blind. Already invested 1bb. Defend wide, 3-bet strong hands.',
};

const ACTION_CONFIG = {
  raise: { label: 'Raise', short: 'R', style: 'btn-raise', key: 'r' },
  call:  { label: 'Call',  short: 'C', style: 'btn-call',  key: 'c' },
  fold:  { label: 'Fold',  short: 'F', style: 'btn-fold',  key: 'f' },
};

const FEEDBACK_STYLES = {
  correct:   { bg: 'bg-green-900/80 border-green-600',   text: 'text-green-300',  label: '✓ Correct!' },
  minor:     { bg: 'bg-amber-900/80 border-amber-600',   text: 'text-amber-300',  label: '~ Minor Leak' },
  medium:    { bg: 'bg-orange-900/80 border-orange-600', text: 'text-orange-300', label: '⚠ Medium Mistake' },
  major:     { bg: 'bg-red-900/80 border-red-700',       text: 'text-red-300',    label: '✗ Significant Mistake' },
};

function getFeedbackStyle(evLoss) {
  if (evLoss.bb === 0) return FEEDBACK_STYLES.correct;
  if (Math.abs(evLoss.bb) <= 0.1) return FEEDBACK_STYLES.minor;
  if (Math.abs(evLoss.bb) <= 0.3) return FEEDBACK_STYLES.medium;
  return FEEDBACK_STYLES.major;
}

const SCENARIOS = ['RFI'];  // future: 'vs_raise', 'vs_3bet'
const POSITIONS_SELECTABLE = ['UTG','HJ','CO','BTN','SB'];

export default function PreflopTrainer({ recordResult }) {
  const [selectedPos, setSelectedPos] = useState(null); // null = random
  const [currentPos,  setCurrentPos]  = useState('BTN');
  const [currentHand, setCurrentHand] = useState(null);
  const [cards,       setCards]       = useState([]);
  const [correctAction, setCorrectAction] = useState(null);
  const [userAction,  setUserAction]  = useState(null);
  const [streak,      setStreak]      = useState(0);
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 });
  const [pool,        setPool]        = useState([]);
  const [timedMode,   setTimedMode]   = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(5);
  const [timerActive, setTimerActive] = useState(false);

  // Build pool when position changes
  useEffect(() => {
    const pos = selectedPos || 'BTN';
    const p = buildTrainerPool(pos, 'RFI');
    setPool(p);
  }, [selectedPos]);

  // Draw a new hand
  const drawHand = useCallback(() => {
    const pos = selectedPos || (['UTG','HJ','CO','BTN','SB'][Math.floor(Math.random() * 5)]);
    setCurrentPos(pos);

    const p = buildTrainerPool(pos, 'RFI');
    if (p.length === 0) return;
    const item = p[Math.floor(Math.random() * p.length)];
    const hand = item.hand;
    const action = getRFIAction(hand, pos) || item.action;
    const parsed = parseHand(hand);

    setCurrentHand(hand);
    setCards(parsed);
    setCorrectAction(action);
    setUserAction(null);
    if (timedMode) {
      setTimeLeft(5);
      setTimerActive(true);
    }
  }, [selectedPos, timedMode]);

  // Initial draw
  useEffect(() => { drawHand(); }, []);

  // Timer
  useEffect(() => {
    if (!timedMode || !timerActive || userAction !== null) return;
    if (timeLeft <= 0) {
      handleAction('fold'); // auto-fold on timeout
      return;
    }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, timedMode, timerActive, userAction]);

  function handleAction(action) {
    if (userAction !== null) return;
    setUserAction(action);
    setTimerActive(false);

    const evLoss = getEVLoss(correctAction, action);
    const isCorrect = evLoss.bb === 0 || Math.abs(evLoss.bb) <= 0.05; // correct or minor = "correct" for stats

    setSessionStats(prev => ({
      total:   prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
    }));
    setStreak(prev => isCorrect ? prev + 1 : 0);
    recordResult({ correct: isCorrect, position: currentPos });
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const k = e.key.toLowerCase();
      if (userAction === null) {
        if (k === 'r') handleAction('raise');
        if (k === 'c') handleAction('call');
        if (k === 'f') handleAction('fold');
      } else {
        if (k === 'n' || k === ' ' || k === 'enter') {
          e.preventDefault();
          drawHand();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userAction, correctAction, handleAction, drawHand]);

  const evLoss    = userAction ? getEVLoss(correctAction, userAction) : null;
  const fbStyle   = evLoss ? getFeedbackStyle(evLoss) : null;
  const nickname  = currentHand ? getNickname(currentHand) : null;
  const pct       = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : null;

  const ACTION_ORDER_RFI = ['raise', 'fold']; // No call in RFI

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Preflop Trainer</h1>
          <p className="text-sm text-gray-400 mt-0.5">RFI — Raise First In. Decide to Raise or Fold. [R] [F] [N=Next]</p>
        </div>
        <div className="text-right">
          {pct !== null && (
            <div className={`text-lg font-bold ${pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {pct}%
            </div>
          )}
          {streak >= 3 && <div className="text-xs text-amber-400">{streak}🔥 streak</div>}
        </div>
      </div>

      {/* Settings bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <span>Position:</span>
          <select
            value={selectedPos || 'random'}
            onChange={e => setSelectedPos(e.target.value === 'random' ? null : e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm"
          >
            <option value="random">Random</option>
            {POSITIONS_SELECTABLE.map(p => (
              <option key={p} value={p}>{p} — {POSITION_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={timedMode}
            onChange={e => setTimedMode(e.target.checked)}
            className="accent-green-500"
          />
          Timed (5s)
        </label>
        {sessionStats.total > 0 && (
          <span className="text-xs text-gray-500">{sessionStats.total} hands this session</span>
        )}
      </div>

      {/* Main training card */}
      <div className="panel border border-gray-700 relative">
        {/* Position badge */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Position</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black text-amber-400">{currentPos}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400 text-sm">{POSITION_LABELS[currentPos]}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{POSITION_DESCRIPTIONS[currentPos]}</p>
          </div>
          {timedMode && timerActive && (
            <div className={`text-3xl font-black tabular-nums ${timeLeft <= 2 ? 'text-red-400' : 'text-amber-400'}`}>
              {timeLeft}
            </div>
          )}
        </div>

        {/* Cards display */}
        <div className="flex justify-center gap-4 my-6">
          {cards.map((card, i) => <PlayingCard key={i} card={card} />)}
        </div>

        {/* Hand name */}
        <div className="text-center mb-6">
          <span className="text-lg font-bold text-white">{currentHand}</span>
          {nickname && <span className="text-gray-500 text-sm ml-2">"{nickname}"</span>}
          <div className="text-xs text-gray-600 mt-1">
            {currentHand?.endsWith('s') ? 'Suited' : currentHand?.endsWith('o') ? 'Off-suit' : 'Pair'}
          </div>
        </div>

        {/* Action buttons */}
        {userAction === null ? (
          <div className="flex gap-3 justify-center">
            <button onClick={() => handleAction('raise')} className="btn-raise flex-1 max-w-[140px]">
              Raise <kbd className="text-xs opacity-60 ml-1">[R]</kbd>
            </button>
            <button onClick={() => handleAction('fold')} className="btn-fold flex-1 max-w-[140px]">
              Fold <kbd className="text-xs opacity-60 ml-1">[F]</kbd>
            </button>
          </div>
        ) : (
          <div className={`rounded-xl border p-4 ${fbStyle.bg}`}>
            <div className="flex items-start justify-between mb-2">
              <span className={`text-lg font-bold ${fbStyle.text}`}>{fbStyle.label}</span>
              <span className={`text-sm font-semibold ${evLoss.bb < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {evLoss.bb < 0 ? evLoss.bb + ' bb' : 'No EV loss'}
              </span>
            </div>

            <div className="text-sm text-gray-300 mb-2">
              <span className="text-gray-500">Correct action: </span>
              <span className={`font-bold ${
                correctAction === 'raise' ? 'text-green-400' :
                correctAction === 'fold'  ? 'text-red-400' : 'text-amber-400'
              }`}>
                {correctAction === 'mix' ? 'Raise ~50% / Fold ~50% (MIX)' : correctAction.toUpperCase()}
              </span>
              {' '}<span className="text-gray-500">· You chose: </span>
              <span className="text-white font-semibold">{userAction.toUpperCase()}</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              {getActionExplanation(currentHand, currentPos, correctAction)}
            </p>

            {/* TAG reminder for folds */}
            {correctAction === 'fold' && userAction === 'raise' && (
              <div className="mt-2 text-xs text-amber-300 bg-amber-900/30 rounded p-2">
                ⚠ TAG discipline: This hand is below the {currentPos} opening range. Even though it has some value, opening it creates a leaky range that gets exploited by 3-bets from late position.
              </div>
            )}
            {correctAction === 'raise' && userAction === 'fold' && (
              <div className="mt-2 text-xs text-blue-300 bg-blue-900/30 rounded p-2">
                ℹ TAG means playing strong hands aggressively. This hand is in the {currentPos} range — folding surrenders EV you should be capturing.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next button */}
      {userAction !== null && (
        <button
          onClick={drawHand}
          className="w-full btn-neutral py-3 text-base font-semibold"
        >
          Next Hand <kbd className="text-xs opacity-60 ml-1">[N / Space]</kbd>
        </button>
      )}

      {/* Quick reference */}
      <details className="panel cursor-pointer">
        <summary className="text-sm font-semibold text-gray-400 select-none">
          Quick Range Reference — {currentPos}
        </summary>
        <div className="mt-3 text-xs text-gray-500 space-y-2">
          {currentPos !== 'BB' && (
            <>
              <div>
                <span className="text-green-400 font-semibold">Raise (always): </span>
                {[...RFI_RANGES[currentPos].raise].slice(0, 20).join(', ')}{RFI_RANGES[currentPos].raise.size > 20 ? '...' : ''}
              </div>
              <div>
                <span className="text-amber-400 font-semibold">Mix (~50%): </span>
                {[...RFI_RANGES[currentPos].mix].join(', ')}
              </div>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
