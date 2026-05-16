import { useState, useEffect } from 'react';
import { createDeck, getBestHand, RANK_VAL } from '../utils/handEval.js';
import { BOT_PROFILES, getBotPreflopAction, getBotPostflopAction, analyzeAction, MODULE_NAMES } from '../utils/gameCoach.js';

// ── Style / theme constants ────────────────────────────────────
const POS_COLOR = {
  UTG:    { bg:'#7f1d1d', text:'#fca5a5' },
  'UTG+1':{ bg:'#7c2d12', text:'#fdba74' },
  MP:     { bg:'#713f12', text:'#fde68a' },
  HJ:     { bg:'#14532d', text:'#86efac' },
  CO:     { bg:'#134e4a', text:'#5eead4' },
  BTN:    { bg:'#92400e', text:'#fcd34d' },
  SB:     { bg:'#1e3a8a', text:'#93c5fd' },
  BB:     { bg:'#4a1d96', text:'#c4b5fd' },
};
// One emoji avatar per bot slot — 5 bots for 6-max
const BOT_AVATARS = ['🧑‍🦰', '😎', '🐰', '🐻', '🦊'];
const PERSONA_RING = { TAG:'#4B9AFF', CALLER:'#a78bfa', LAG:'#ef4444', NIT:'#9ca3af' };
const QS = {
  good:       'border-[#00FF88] bg-[#00FF88]/5',
  minor:      'border-amber-500 bg-amber-900/10',
  mistake:    'border-orange-500 bg-orange-900/10',
  big_mistake:'border-red-500 bg-red-900/10',
  neutral:    'border-gray-700 bg-gray-900/20',
};
const QT = { good:'text-[#00FF88]', minor:'text-amber-400', mistake:'text-orange-400', big_mistake:'text-red-400', neutral:'text-gray-300' };
const PMAP = { tag:'TAG', caller:'CALLER', lag:'LAG', nit:'NIT' };

// ── 6-max positions ────────────────────────────────────────────
const POSITIONS    = ['UTG','HJ','CO','BTN','SB','BB'];
const PREFLOP_ORD  = ['UTG','HJ','CO','BTN','SB','BB'];
const POSTFLOP_ORD = ['SB','BB','UTG','HJ','CO','BTN'];
const ALL_PIDS     = ['player','bot0','bot1','bot2','bot3','bot4'];
const NORM_POS     = {};
const BOT_TMPLS    = [0,1,2,3,0].map(i => BOT_PROFILES[i]);
const n1 = x => Math.round(x * 10) / 10;

// ── Card back — circular radial pattern matching reference ─────
function CardBack({ size = 'md' }) {
  const sz = { xs:'w-6 h-9', sm:'w-9 h-13', md:'w-14 h-20', lg:'w-[4.5rem] h-[6.5rem]', xl:'w-24 h-36' }[size] || 'w-14 h-20';
  return (
    <div className={`${sz} rounded-2xl relative overflow-hidden select-none flex-shrink-0`}
      style={{ background: 'linear-gradient(145deg, #5B9AFF 0%, #3B7ADF 100%)', boxShadow: '0 4px 16px rgba(75,154,255,0.3)' }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 60 90" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
        {/* Radiating lines */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1="30" y1="45"
            x2={30 + Math.cos(a) * 55} y2={45 + Math.sin(a) * 55}
            stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />;
        })}
        {/* Concentric circles */}
        {[10, 18, 26, 35, 44].map(r => (
          <circle key={r} cx="30" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
        ))}
        {/* Center dot */}
        <circle cx="30" cy="45" r="3" fill="rgba(255,255,255,0.35)" />
        {/* Dots at circle/line intersections */}
        {[10, 18, 26].map(r => Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <circle key={`${r}-${i}`} cx={30 + Math.cos(a) * r} cy={45 + Math.sin(a) * r} r="1" fill="rgba(255,255,255,0.2)" />;
        }))}
      </svg>
    </div>
  );
}

// ── Face card ──────────────────────────────────────────────────
function Card({ card, faceDown, size = 'md' }) {
  if (faceDown) return <CardBack size={size} />;
  const dims = {
    xs: { outer: 'w-6 h-9',          font: 'text-[8px]',  suit: 'text-[7px]',  pad: 'p-0.5' },
    sm: { outer: 'w-9 h-[3.25rem]',  font: 'text-[10px]', suit: 'text-[9px]',  pad: 'p-0.5' },
    md: { outer: 'w-14 h-20',        font: 'text-sm',     suit: 'text-xs',     pad: 'p-1'   },
    lg: { outer: 'w-[4.5rem] h-[6.5rem]', font: 'text-base', suit: 'text-sm',  pad: 'p-1'   },
    xl: { outer: 'w-24 h-36',        font: 'text-2xl',    suit: 'text-xl',     pad: 'p-1.5' },
  }[size] || { outer:'w-14 h-20', font:'text-sm', suit:'text-xs', pad:'p-1' };

  const isRed = card.suit === '♥' || card.suit === '♦';
  const color = isRed ? '#e11d48' : '#111827';
  return (
    <div className={`${dims.outer} ${dims.pad} bg-white rounded-2xl select-none flex flex-col justify-between flex-shrink-0`}
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)', border: '1px solid rgba(0,0,0,0.08)' }}>
      <div className={`${dims.font} font-bold leading-tight`} style={{ color }}>
        <div>{card.rank}</div>
        <div className={dims.suit}>{card.suit}</div>
      </div>
      <div className={`${dims.font} font-bold leading-tight rotate-180 self-end`} style={{ color }}>
        <div>{card.rank}</div>
        <div className={dims.suit}>{card.suit}</div>
      </div>
    </div>
  );
}

// ── Game logic — UNCHANGED ─────────────────────────────────────
function buildHand(hc, prevStacks) {
  const stacks = {};
  ALL_PIDS.forEach(p => {
    const prev = prevStacks?.[p] ?? 100;
    stacks[p] = prev < 8 ? 100 : prev;
  });
  const bots = {};
  ['bot0','bot1','bot2','bot3','bot4'].forEach((bid, i) => {
    const t = BOT_TMPLS[i];
    bots[bid] = { ...t, personality: PMAP[t.id] };
  });
  const pos = {};
  ALL_PIDS.forEach((pid, i) => { pos[pid] = POSITIONS[(i + hc) % POSITIONS.length]; });
  const sbP = ALL_PIDS.find(p => pos[p] === 'SB');
  const bbP = ALL_PIDS.find(p => pos[p] === 'BB');
  const deck = createDeck();
  const hands = {};
  ALL_PIDS.forEach((pid, i) => {
    hands[pid] = [deck[i * 2], deck[i * 2 + 1]];
    if (pid !== 'player') bots[pid].cards = hands[pid];
  });
  const ns = { ...stacks };
  ns[sbP] = n1(stacks[sbP] - 0.5);
  ns[bbP] = n1(stacks[bbP] - 1.0);
  const sb = Object.fromEntries(ALL_PIDS.map(p => [p, 0]));
  sb[sbP] = 0.5; sb[bbP] = 1.0;
  const streetOrder = PREFLOP_ORD.map(p => ALL_PIDS.find(pid => pos[pid] === p));
  // deck.slice(12) — 6 players × 2 cards
  return {
    phase: 'preflop', deck: deck.slice(12), hands, community: [],
    positions: pos, bots, stacks: ns, pot: 1.5,
    streetBets: sb, currentBetLevel: 1.0,
    activePlayers: [...ALL_PIDS], streetOrder,
    toAct: [...streetOrder], currentActor: streetOrder[0],
    raisedPot: false, playerIsAggressor: false,
    handOver: false, showdown: false, showCoach: false, coaching: null,
    log: [`Hand #${hc + 1}  ·  You: ${pos.player}`],
  };
}

function applyAction(gs, actor, action, amount) {
  const { pot, stacks, streetBets, currentBetLevel, toAct, activePlayers, streetOrder } = gs;
  let nPot = pot, nSt = { ...stacks }, nBets = { ...streetBets };
  let nToAct = [...toAct], nAct = [...activePlayers];
  let newLvl = currentBetLevel, newRaised = gs.raisedPot, logMsg = '';
  const name = actor === 'player' ? 'You' : gs.bots[actor]?.name;
  const v = actor !== 'player' ? 's' : '';
  if (action === 'fold') {
    nAct = nAct.filter(p => p !== actor);
    nToAct = nToAct.filter(p => p !== actor);
    logMsg = `${name} fold${v}`;
  } else if (action === 'check') {
    nToAct = nToAct.filter(p => p !== actor);
    logMsg = `${name} check${v}`;
  } else if (action === 'call') {
    const amt = n1(Math.min(currentBetLevel - (streetBets[actor] || 0), stacks[actor]));
    nSt[actor] = n1(stacks[actor] - amt);
    nBets[actor] = n1((streetBets[actor] || 0) + amt);
    nPot = n1(pot + amt);
    nToAct = nToAct.filter(p => p !== actor);
    logMsg = `${name} call${v} ${amt}bb`;
  } else if (action === 'raise' || action === 'bet') {
    const add = n1(amount - (streetBets[actor] || 0));
    nSt[actor] = n1(stacks[actor] - add);
    nBets[actor] = amount;
    nPot = n1(pot + add);
    newLvl = amount; newRaised = true;
    nToAct = streetOrder.filter(p => p !== actor && nAct.includes(p));
    logMsg = `${name} raise${v} to ${amount}bb`;
  } else if (action === 'allin') {
    const all = stacks[actor], total = n1((streetBets[actor] || 0) + all);
    nSt[actor] = 0; nBets[actor] = total; nPot = n1(pot + all);
    if (total > newLvl) {
      newLvl = total; newRaised = true;
      nToAct = streetOrder.filter(p => p !== actor && nAct.includes(p));
    } else {
      nToAct = nToAct.filter(p => p !== actor);
    }
    logMsg = `${name} ALL-IN (${all}bb)`;
  }
  return {
    ...gs, pot: nPot, stacks: nSt, streetBets: nBets, currentBetLevel: newLvl,
    activePlayers: nAct, toAct: nToAct, currentActor: nToAct[0] || null,
    raisedPot: newRaised, log: [...gs.log, logMsg],
  };
}

function nextStreet(gs) {
  const { phase, activePlayers, positions, deck, community, stacks, pot, bots, hands } = gs;
  if (activePlayers.length <= 1) {
    const w = activePlayers[0];
    if (!w) return { ...gs, handOver: true };
    const wn = w === 'player' ? 'You win' : `${bots[w]?.name} wins`;
    return { ...gs, stacks: { ...stacks, [w]: n1(stacks[w] + pot) }, pot: 0, handOver: true, showdown: true, log: [...gs.log, `─── ${wn} ${pot}bb ───`] };
  }
  const np = { preflop:'flop', flop:'turn', turn:'river', river:'showdown' }[phase];
  if (np === 'showdown') {
    const results = activePlayers
      .map(pid => ({ pid, best: getBestHand(hands[pid], community) }))
      .sort((a, b) => (b.best?.score || 0) - (a.best?.score || 0));
    const w = results[0].pid;
    const wn = w === 'player' ? 'You' : bots[w]?.name;
    const sdLog = results.map(r => {
      const n = r.pid === 'player' ? 'You' : bots[r.pid]?.name;
      return `${n}: ${hands[r.pid].map(c => c.rank + c.suit).join('')}  (${r.best?.desc || '?'})`;
    });
    return { ...gs, phase:'showdown', stacks:{ ...stacks, [w]: n1(stacks[w] + pot) }, pot:0, handOver:true, showdown:true, log:[...gs.log,'─── SHOWDOWN ───',...sdLog,`${wn} wins!`] };
  }
  let nd = [...deck], nc = [...community];
  for (let i = 0; i < (np === 'flop' ? 3 : 1); i++) nc.push(nd.shift());
  const pfo = POSTFLOP_ORD
    .map(p => ALL_PIDS.find(pid => positions[pid] === p))
    .filter(p => p && activePlayers.includes(p));
  return {
    ...gs, phase: np, deck: nd, community: nc,
    streetBets: Object.fromEntries(ALL_PIDS.map(p => [p, 0])),
    currentBetLevel: 0, streetOrder: pfo, toAct: [...pfo], currentActor: pfo[0] || null,
    log: [...gs.log, `─── ${np.toUpperCase()} ───`],
  };
}

// ── Coach overlay ──────────────────────────────────────────────
function CoachOverlay({ coaching, onContinue, handOver, setView }) {
  const qs = QS[coaching.quality] || QS.neutral;
  const qt = QT[coaching.quality] || QT.neutral;
  const accent = { good:'#00FF88', minor:'#f59e0b', mistake:'#f97316', big_mistake:'#ef4444', neutral:'#9ca3af' }[coaching.quality] || '#9ca3af';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-8"
      style={{ background:'rgba(0,0,0,0.88)', backdropFilter:'blur(10px)' }}>
      <div className={`w-full max-w-lg rounded-3xl border p-6 space-y-4 ${qs}`}
        style={{ background:'#0f0f0f' }}>
        <div className={`text-xl font-bold ${qt}`}>{coaching.title}</div>
        <p className="text-sm leading-relaxed" style={{ color:'#bbb' }}>{coaching.explanation}</p>
        {coaching.tagPrinciple && (
          <div className="rounded-2xl p-3.5" style={{ background:'rgba(0,255,136,0.06)', borderLeft:'2px solid #00FF88' }}>
            <div className="text-xs font-semibold mb-1" style={{ color:'#00FF88' }}>TAG Principle</div>
            <p className="text-xs leading-relaxed" style={{ color:'#888' }}>{coaching.tagPrinciple}</p>
          </div>
        )}
        {coaching.evImpact && (
          <div className="text-xs font-semibold" style={{ color:'#ef4444' }}>EV Impact: {coaching.evImpact}</div>
        )}
        {coaching.practiceModule && (
          <div className="rounded-2xl p-3.5 space-y-2" style={{ background:'#1a1a1a', border:'1px solid #2a2a2a' }}>
            <div className="text-xs font-semibold" style={{ color:'#f59e0b' }}>Practice Recommendation</div>
            <p className="text-xs leading-relaxed" style={{ color:'#777' }}>{coaching.practiceNote}</p>
            {setView && (
              <button onClick={() => { setView(coaching.practiceModule); onContinue(); }}
                className="text-xs px-3 py-1.5 rounded-xl transition-colors"
                style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', color:'#f59e0b' }}>
                Go to {MODULE_NAMES[coaching.practiceModule] || coaching.practiceModule} →
              </button>
            )}
          </div>
        )}
        <button onClick={onContinue}
          className="w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
          style={accent === '#00FF88'
            ? { background:'linear-gradient(135deg,#00FF88,#00cc6a)', color:'#050a07', boxShadow:'0 4px 20px rgba(0,255,136,0.3)' }
            : { background:`${accent}20`, color:accent, border:`1px solid ${accent}40` }}>
          {handOver ? 'Deal Next Hand →' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function HandSimulator({ setView }) {
  const [gs, setGs]             = useState(null);
  const [hc, setHc]             = useState(0);
  const [raiseAmt, setRaiseAmt] = useState(2.5);

  useEffect(() => { setGs(buildHand(0)); }, []);

  useEffect(() => {
    if (!gs) return;
    const lvl  = gs.currentBetLevel || 0;
    const call = n1(Math.max(0, lvl - (gs.streetBets?.player || 0)));
    const potR = n1(gs.pot + call * 2 + call);
    const max  = n1((gs.stacks?.player || 0) + (gs.streetBets?.player || 0));
    setRaiseAmt(Math.round(Math.min(Math.max(potR, lvl * 2 || 2.5), max) * 2) / 2);
  }, [gs?.phase, gs?.currentBetLevel]);

  useEffect(() => {
    if (!gs || gs.showCoach || gs.handOver) return;
    const { currentActor, phase } = gs;
    if (!currentActor || currentActor === 'player') return;
    const t = setTimeout(() => {
      setGs(prev => {
        if (!prev || prev.currentActor !== currentActor || prev.phase !== phase || prev.showCoach || prev.handOver) return prev;
        const bot    = { ...prev.bots[currentActor], cards: prev.hands[currentActor] };
        const callAmt = n1(Math.max(0, prev.currentBetLevel - (prev.streetBets[currentActor] || 0)));
        const facing  = callAmt > 0;
        let res;
        if (prev.phase === 'preflop') {
          res = getBotPreflopAction(bot, { facingBet:facing, betToCall:callAmt, pot:prev.pot, bb:1, position:prev.positions[currentActor], raisedPot:prev.raisedPot });
        } else {
          res = getBotPostflopAction(bot, { community:prev.community, pot:prev.pot, facingBet:facing, betToCall:callAmt, effectiveStack:Math.min(prev.stacks[currentActor], prev.stacks.player || 100), street:prev.phase });
        }
        let act = res.action, amt = 0;
        if (act === 'raise' || act === 'bet') {
          amt = n1(Math.min(res.amount || prev.currentBetLevel * 2.5, prev.stacks[currentActor] + (prev.streetBets[currentActor] || 0)));
          if (amt <= prev.currentBetLevel) act = 'call';
        }
        if (act === 'call' && callAmt === 0) act = 'check';
        if ((act === 'raise' || act === 'bet') && amt >= prev.stacks[currentActor] + (prev.streetBets[currentActor] || 0)) act = 'allin';
        let ng = applyAction(prev, currentActor, act, amt);
        if (ng.toAct.length === 0) ng = nextStreet(ng);
        return ng;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [gs?.currentActor, gs?.showCoach, gs?.handOver, gs?.phase]);

  function handlePlayerAction(action, amount) {
    if (!gs || gs.currentActor !== 'player' || gs.showCoach || gs.handOver) return;
    const callAmt  = n1(Math.max(0, gs.currentBetLevel - (gs.streetBets.player || 0)));
    const normPos  = NORM_POS[gs.positions.player] || gs.positions.player;
    const botStacks = ['bot0','bot1','bot2','bot3','bot4'].map(b => gs.stacks[b] || 0);
    const coaching = analyzeAction({
      street:gs.phase, playerCards:gs.hands.player, community:gs.community,
      pot:gs.pot, callAmount:callAmt, currentBet:gs.currentBetLevel,
      playerAction:action, playerPosition:normPos,
      playerIsAggressor:gs.playerIsAggressor, facingBet:callAmt > 0,
      facingRaise:gs.raisedPot && callAmt > 0, raisedPot:gs.raisedPot,
      bbAmount:1, effectiveStack:Math.min(gs.stacks.player, Math.max(...botStacks)),
      villainBetSize:gs.currentBetLevel,
      villainBetPct:gs.pot > 0 ? Math.round((gs.currentBetLevel / gs.pot) * 100) : 0,
      botPersonality:Object.values(gs.bots)[0]?.personality, raiseAmount:amount,
    });
    let ng = applyAction(gs, 'player', action, amount);
    if (action === 'raise' || action === 'bet') ng = { ...ng, playerIsAggressor:true };
    if (action === 'fold') {
      // End the hand immediately when hero folds — no bot-only streets
      setGs({ ...ng, handOver:true, showCoach:true, coaching });
      return;
    }
    if (ng.toAct.length === 0) ng = nextStreet(ng);
    setGs({ ...ng, showCoach:true, coaching });
  }

  function handleContinue() {
    if (!gs) return;
    if (gs.handOver) { const n = hc + 1; setHc(n); setGs(buildHand(n, gs.stacks)); }
    else { setGs(g => ({ ...g, showCoach:false })); }
  }

  if (!gs) return (
    <div className="flex items-center justify-center h-64" style={{ color:'#444' }}>Dealing…</div>
  );

  const { phase, hands, community, pot, stacks, positions, bots,
    activePlayers, currentActor, currentBetLevel, streetBets,
    showCoach, coaching, handOver, showdown, log } = gs;

  const callAmt   = n1(Math.max(0, currentBetLevel - (streetBets.player || 0)));
  const isMyTurn  = currentActor === 'player' && !showCoach && !handOver && activePlayers.includes('player');
  const canCheck  = callAmt === 0;
  const maxRaise  = n1(stacks.player + (streetBets.player || 0));
  const minRaise  = n1(Math.min(currentBetLevel * 2 || 2.5, maxRaise));
  const safeRaise = Math.min(Math.max(raiseAmt, minRaise), maxRaise);
  const activeCnt = activePlayers.length;
  const heroPos   = positions.player;
  const posStyle  = POS_COLOR[heroPos] || { bg:'#374151', text:'#d1d5db' };

  const phaseAccent = { preflop:'#fbbf24', flop:'#00FF88', turn:'#4B9AFF', river:'#a78bfa', showdown:'#fff' }[phase] || '#fff';
  const phaseLabel  = { preflop:'PREFLOP', flop:'FLOP', turn:'TURN', river:'RIVER', showdown:'SHOWDOWN' }[phase] || phase.toUpperCase();

  const betPills = [
    { label:'1BB', val:n1(Math.max(minRaise, 2.5)) },
    { label:'½P',  val:n1(Math.min(pot * 0.5 + callAmt, maxRaise)) },
    { label:'⅔P',  val:n1(Math.min(pot * 0.67 + callAmt, maxRaise)) },
    { label:'Pot', val:n1(Math.min(pot + callAmt * 2 + callAmt, maxRaise)) },
    { label:'2×',  val:n1(Math.min((pot + callAmt * 2 + callAmt) * 2, maxRaise)) },
  ].filter(p => p.val >= minRaise);

  const heroHandStrength = community.length > 0 && activePlayers.includes('player')
    ? getBestHand(hands.player, community)
    : null;

  const BOT_IDS = ['bot0','bot1','bot2','bot3','bot4'];

  return (
    <div className="max-w-lg mx-auto flex flex-col" style={{ background:'#000', minHeight:'100%', color:'#fff' }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div>
          <span className="text-xs font-mono" style={{ color:'#444' }}>Hand #{hc + 1}</span>
        </div>
        <div className="text-xs font-bold tracking-[0.15em]" style={{ color: phaseAccent }}>{phaseLabel}</div>
        <div className="text-xs font-mono" style={{ color:'#444' }}>{activeCnt} active</div>
      </div>

      {/* ── Opponent row — 5 bots, evenly spaced ───────────── */}
      <div className="flex justify-between px-4 py-3">
        {BOT_IDS.map((pid, i) => {
          const bot    = bots[pid];
          const folded = !activePlayers.includes(pid);
          const acting = currentActor === pid && !showCoach && !handOver;
          const p      = positions[pid];
          const isBtn  = p === 'BTN';
          const ring   = PERSONA_RING[bot?.personality] || '#4B9AFF';
          const bet    = streetBets[pid] || 0;

          return (
            <div key={pid} className="flex flex-col items-center gap-1.5 transition-opacity duration-300"
              style={{ opacity: folded ? 0.22 : 1, flex: 1 }}>

              {/* Avatar */}
              <div className="relative flex justify-center">
                {acting && (
                  <div className="absolute -inset-2 rounded-full animate-pulse"
                    style={{ background:`${ring}28`, zIndex:0 }} />
                )}
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl relative z-10"
                  style={{
                    background:'#1c1c1e',
                    border: acting ? `2px solid ${ring}` : '2px solid #2c2c2e',
                    boxShadow: acting ? `0 0 16px ${ring}70` : 'none',
                  }}>
                  {BOT_AVATARS[i]}
                </div>

                {/* Dealer button */}
                {isBtn && (
                  <div className="absolute -bottom-1 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center z-20 font-bold"
                    style={{ background:'#fbbf24', color:'#000', fontSize:9 }}>D</div>
                )}

                {/* Hole card pips */}
                {!folded && (
                  <div className="absolute -top-1 -right-0.5 flex gap-0.5 z-20">
                    {showdown
                      ? hands[pid].map((c, ci) => <Card key={ci} card={c} size="xs" />)
                      : [0,1].map(ci => (
                          <div key={ci} className="w-3 h-4 rounded-sm"
                            style={{ background:'linear-gradient(145deg,#5B9AFF,#3B7ADF)', border:'1px solid rgba(255,255,255,0.2)', boxShadow:'0 1px 6px rgba(75,154,255,0.5)' }} />
                        ))
                    }
                  </div>
                )}
              </div>

              {/* Name */}
              <span className="text-xs font-semibold text-white leading-none">{bot.name.split(' ').pop()}</span>

              {/* Position badge */}
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold leading-none"
                style={{ background: POS_COLOR[p]?.bg || '#374151', color: POS_COLOR[p]?.text || '#d1d5db' }}>
                {p}
              </span>

              {/* Stack + bet */}
              <span className="text-[10px] font-mono leading-none" style={{ color:'#555' }}>{stacks[pid]}bb</span>
              {bet > 0 && <span className="text-[10px] font-mono font-bold leading-none" style={{ color:'#fbbf24' }}>{bet}bb</span>}
            </div>
          );
        })}
      </div>

      {/* ── Community cards ──────────────────────────────────── */}
      <div className="flex flex-col items-center px-5 py-4 gap-3">
        <div className="flex gap-2 justify-center">
          {community.map((c, i) => <Card key={i} card={c} size="md" />)}
          {Array.from({ length: 5 - community.length }).map((_, i) => <CardBack key={i} size="md" />)}
        </div>

        {/* Pot */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full chip-float"
            style={{ background:'radial-gradient(circle, #fbbf24, #d97706)', boxShadow:'0 0 8px rgba(251,191,36,0.6)' }} />
          <span className="text-3xl font-bold font-mono">{pot}</span>
          <span className="text-sm" style={{ color:'#444' }}>bb</span>
          {activeCnt <= 3 && phase !== 'preflop' && (
            <span className="text-xs" style={{ color:'#555' }}>{activeCnt === 2 ? '· HU' : `· ${activeCnt}-way`}</span>
          )}
        </div>
      </div>

      {/* ── Hero area ────────────────────────────────────────── */}
      <div className="flex items-end gap-3 px-5 pb-4">

        {/* Hole cards — overlapping like reference */}
        <div className="flex relative" style={{ marginRight: 8 }}>
          {activePlayers.includes('player')
            ? hands.player.map((c, i) => (
                <div key={i} style={{ marginLeft: i > 0 ? -18 : 0, zIndex: i }}>
                  <Card card={c} size="xl" />
                </div>
              ))
            : [0,1].map(i => (
                <div key={i} style={{ marginLeft: i > 0 ? -18 : 0, zIndex: i, opacity: 0.3 }}>
                  <Card card={hands.player[i]} size="xl" />
                </div>
              ))
          }
        </div>

        {/* Info panel */}
        <div className="flex-1 rounded-3xl p-4 flex flex-col items-center gap-1"
          style={{ background:'#1c1c1e', minHeight: 144 }}>

          {heroHandStrength
            ? <span className="text-xs font-semibold" style={{ color:'#00FF88' }}>{heroHandStrength.desc}</span>
            : <span className="text-xs" style={{ color:'#555' }}>
                {gs.raisedPot ? '3-bet pot' : 'SRP'} · {heroPos}
              </span>
          }

          {/* Hero avatar */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-4xl my-1"
            style={{ background:'linear-gradient(135deg,#00FF8820,#00cc6a10)', border:'2px solid #00FF8840' }}>
            🫵
          </div>

          {/* Stack */}
          <span className="text-2xl font-bold font-mono text-white">{stacks.player}</span>
          <span className="text-[10px]" style={{ color:'#555' }}>bb · {heroPos}</span>

          {/* Situation */}
          <div className="flex gap-1 mt-1 flex-wrap justify-center">
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: posStyle.bg, color: posStyle.text }}>{heroPos}</span>
            {gs.raisedPot && (
              <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background:'rgba(249,115,22,0.2)', color:'#f97316' }}>3-bet pot</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Action buttons ───────────────────────────────────── */}
      {isMyTurn && (
        <div className="px-5 pb-5 space-y-3">

          {/* Context hint */}
          <div className="text-center text-[10px] font-mono" style={{ color:'#555' }}>
            {callAmt > 0
              ? `call ${callAmt}bb · need ${Math.round(callAmt / (pot + callAmt) * 100)}% equity`
              : `first to act · ${heroPos}`}
          </div>

          {/* 3 main buttons — match reference style */}
          <div className="grid grid-cols-3 gap-2.5">
            <button onClick={() => handlePlayerAction('fold')}
              className="py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
              style={{ background:'#1c1c1e', color:'#ff453a' }}>
              Fold
            </button>
            <button onClick={() => handlePlayerAction(canCheck ? 'check' : 'call')}
              className="py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
              style={{ background:'#1c1c1e', color:'#fff' }}>
              {canCheck ? 'Check' : `Call ${callAmt}bb`}
            </button>
            <button onClick={() => handlePlayerAction(canCheck ? 'bet' : 'raise', safeRaise)}
              className="py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
              style={{ background:'#1c1c1e', color:'#00FF88' }}>
              <span className="text-lg leading-none">↑</span>
              <span className="text-xs leading-none">{canCheck ? 'Bet' : 'Raise'}</span>
              <span className="text-[10px] leading-none font-mono">{safeRaise}bb</span>
            </button>
          </div>

          {/* All-in — subtle, below main buttons */}
          <button onClick={() => handlePlayerAction('allin')}
            className="w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95"
            style={{ background:'#1c1c1e', color:'#ff453a66', border:'1px solid #ff453a22' }}>
            All-In · {maxRaise}bb
          </button>

          {/* Quick bet size pills */}
          <div className="flex gap-2 flex-wrap justify-center">
            {betPills.map(({ label, val }) => {
              const active = Math.abs(safeRaise - val) < 0.1;
              return (
                <button key={label} onClick={() => setRaiseAmt(val)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={active
                    ? { background:'#00FF88', color:'#000' }
                    : { background:'#1c1c1e', color:'#666' }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Slider */}
          <div className="flex items-center gap-3">
            <input type="range" min={minRaise} max={maxRaise} step={0.5}
              value={Math.min(Math.max(raiseAmt, minRaise), maxRaise)}
              onChange={e => setRaiseAmt(+e.target.value)}
              className="flex-1" />
            <span className="text-xs font-mono w-14 text-right" style={{ color:'#fff' }}>{safeRaise}bb</span>
          </div>
        </div>
      )}

      {/* ── Deal next hand ───────────────────────────────────── */}
      {handOver && !showCoach && (
        <div className="px-5 pb-5">
          <button onClick={() => { const n = hc + 1; setHc(n); setGs(buildHand(n, gs.stacks)); }}
            className="w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98]"
            style={{ background:'linear-gradient(135deg,#00FF88,#00cc6a)', color:'#050a07', boxShadow:'0 4px 24px rgba(0,255,136,0.35)' }}>
            Deal Next Hand →
          </button>
        </div>
      )}

      {/* ── Action log ───────────────────────────────────────── */}
      <div className="px-5 pb-6">
        <details className="overflow-hidden rounded-2xl" style={{ background:'#0d0d0d' }}>
          <summary className="px-4 py-3 text-xs font-semibold cursor-pointer select-none" style={{ color:'#444' }}>
            ▾ Action Log
          </summary>
          <div className="px-4 pb-3 max-h-28 overflow-y-auto space-y-0.5 font-mono">
            {[...log].reverse().map((e, i) => (
              <div key={i} className="text-[10px]" style={{
                color: e.startsWith('─') ? '#333' : e.startsWith('You') ? '#00FF88' : '#555'
              }}>{e}</div>
            ))}
          </div>
        </details>
      </div>

      {/* ── Coach overlay ────────────────────────────────────── */}
      {showCoach && coaching && (
        <CoachOverlay coaching={coaching} onContinue={handleContinue} handOver={handOver} setView={setView} />
      )}
    </div>
  );
}
