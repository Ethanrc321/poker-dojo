// ============================================================
// Bot AI + Coach Analysis Engine
// ============================================================

import { RANK_VAL, getBestHand, getDraws, relativeStrength, approxEquity } from './handEval.js';
import { getRFIAction, RFI_RANGES, BB_DEFENSE } from '../data/ranges.js';

// ── Bot profiles ─────────────────────────────────────────────
export const BOT_PROFILES = [
  { id: 'tag',    name: 'TAG Pro',        style: 'Tight-Aggressive',  color: 'text-blue-400',   bgColor: 'bg-blue-900/30',  desc: 'Solid GTO player. Opens correct ranges, c-bets selectively, rarely makes big mistakes.' },
  { id: 'caller', name: 'Loose Larry',    style: 'Calling Station',   color: 'text-yellow-400', bgColor: 'bg-yellow-900/30',desc: 'Calls too much, rarely raises. Never folds top pair. Easy to value-bet.' },
  { id: 'lag',    name: 'Aggressive Alex',style: 'Loose-Aggressive',  color: 'text-red-400',    bgColor: 'bg-red-900/30',   desc: 'Wide range, frequent bluffs. Can be trapped. Call down lighter vs this player.' },
  { id: 'nit',    name: 'Tight Tim',      style: 'Nit',               color: 'text-gray-400',   bgColor: 'bg-gray-800/50',  desc: 'Only plays premium hands. Fold to his raises — they\'re always real.' },
];

// ── Preflop hand strength (for bot decisions) ─────────────────
function pfStrength(cards) {
  const [c1, c2] = cards;
  const r1 = RANK_VAL[c1.rank], r2 = RANK_VAL[c2.rank];
  const hi = Math.max(r1, r2), lo = Math.min(r1, r2);
  const suited = c1.suit === c2.suit;
  const pair = r1 === r2;
  const gap = hi - lo;

  if (pair && r1 >= 12) return 10;   // QQ+
  if (pair && r1 >= 9)  return 8;    // 99-JJ
  if (pair && r1 >= 6)  return 6;    // 66-88
  if (pair)              return 4;    // 22-55
  if (hi === 14 && lo >= 13) return 10; // AK
  if (hi === 14 && lo >= 11) return 8;  // AJ+
  if (hi === 14 && lo >= 9 && suited) return 7; // A9s+
  if (hi === 14 && lo >= 11) return 7;  // AJo+
  if (hi === 14 && suited) return 5;    // A2s-A8s
  if (hi === 13 && lo >= 11 && suited) return 7; // KQs, KJs
  if (hi === 13 && lo === 12) return 6; // KQo
  if (suited && gap === 1 && hi >= 9) return 6; // suited connectors 9T+
  if (suited && gap === 1 && hi >= 6) return 5; // suited connectors 67-89
  if (hi >= 11 && lo >= 10) return 5; // broadway
  if (suited && gap <= 2 && hi >= 7) return 4; // suited one-gappers
  return 2;
}

// Bot preflop decision
export function getBotPreflopAction(bot, gameState) {
  const { facingBet, betToCall, pot, bb, position, raisedPot } = gameState;
  const str = pfStrength(bot.cards);
  const p = bot.personality;

  // ── Facing a 3-bet ──
  if (raisedPot && facingBet) {
    if (str >= 9) return { action: 'raise', amount: betToCall * 3, label: '4-bets' };
    if (str >= 7 && p === 'LAG') return { action: 'raise', amount: betToCall * 3, label: '4-bets' };
    if (str >= 7) return { action: 'call', label: 'calls the 3-bet' };
    if (str >= 5 && p === 'CALLER') return { action: 'call', label: 'calls' };
    return { action: 'fold', label: 'folds' };
  }

  // ── Facing a raise (open) ──
  if (facingBet && !raisedPot) {
    if (str >= 9) return { action: 'raise', amount: betToCall * 3, label: '3-bets' };
    if (str >= 7 && p === 'LAG') return { action: 'raise', amount: betToCall * 3, label: '3-bets' };
    if (str >= 7) return { action: 'call', label: 'calls' };
    if (str >= 5 && p === 'CALLER') return { action: 'call', label: 'calls' };
    if (str >= 4 && p === 'LAG') return { action: 'call', label: 'calls' };
    if (str >= 3 && p === 'CALLER') return { action: 'call', label: 'calls' };
    return { action: 'fold', label: 'folds' };
  }

  // ── RFI (first to act) ──
  // Early positions require stronger hands; late positions open wider
  const openThreshold = { TAG: 6, LAG: 4, CALLER: 5, NIT: 8 };
  const posBonus = { 'UTG': 3, 'UTG+1': 2, 'MP': 1, 'HJ': 0, 'CO': -1, 'BTN': -2, 'SB': 0, 'BB': -1 };
  const threshold = Math.max(2, (openThreshold[p] || 6) + (posBonus[position] || 0));
  if (str >= threshold) {
    const raiseAmt = bb * (position === 'SB' ? 3 : position === 'BTN' ? 2.5 : 2.5);
    return { action: 'raise', amount: raiseAmt, label: 'raises to ' + raiseAmt.toFixed(1) + 'bb' };
  }
  // BB check (no raise)
  if (position === 'BB' && !facingBet) return { action: 'check', label: 'checks' };
  return { action: 'fold', label: 'folds' };
}

// Bot postflop decision
export function getBotPostflopAction(bot, gameState) {
  const { community, pot, facingBet, betToCall, effectiveStack, street } = gameState;
  if (!community || community.length === 0) return { action: 'check', label: 'checks' };

  const best = getBestHand(bot.cards, community);
  const draws = getDraws(bot.cards, community);
  const strength = best?.cat || 0;
  const p = bot.personality;

  // Pot odds
  const potOdds = facingBet ? betToCall / (pot + betToCall) : 0;

  // ── Facing a bet ──
  if (facingBet) {
    if (strength >= 5) return { action: 'raise', amount: betToCall * 3, label: 'raises!' };
    if (strength >= 3) {
      if (p === 'CALLER') return { action: 'call', label: 'calls' };
      if (p === 'TAG' && street !== 'river') return { action: 'call', label: 'calls' };
      if (p === 'LAG') return Math.random() < 0.4
        ? { action: 'raise', amount: betToCall * 3, label: 'check-raises!' }
        : { action: 'call', label: 'calls' };
      return { action: 'call', label: 'calls' };
    }
    if (strength >= 2) {
      if (p === 'CALLER') return { action: 'call', label: 'calls' };
      const eq = approxEquity(strength, draws, community);
      if (eq / 100 > potOdds * 1.1) return { action: 'call', label: 'calls' };
      if (p === 'LAG' && Math.random() < 0.25) return { action: 'raise', amount: betToCall * 2.5, label: 'check-raises (bluff)!' };
      return p === 'CALLER' ? { action: 'call', label: 'calls' } : { action: 'fold', label: 'folds' };
    }
    // Draws
    if (draws.includes('flush_draw') || draws.includes('oesd')) {
      if (p === 'CALLER') return { action: 'call', label: 'calls' };
      const eq = approxEquity(strength, draws, community);
      return eq / 100 > potOdds ? { action: 'call', label: 'calls' } : { action: 'fold', label: 'folds' };
    }
    if (p === 'CALLER' && strength >= 1) return { action: 'call', label: 'calls' };
    return { action: 'fold', label: 'folds' };
  }

  // ── First to bet / check ──
  const betSize = Math.round(pot * (street === 'flop' ? 0.5 : street === 'turn' ? 0.6 : 0.7));

  if (strength >= 5) return { action: 'bet', amount: betSize, label: `bets ${betSize}bb` };
  if (strength >= 3) {
    if (p === 'LAG') return { action: 'bet', amount: betSize, label: `bets ${betSize}bb` };
    if (p === 'TAG' && Math.random() < 0.6) return { action: 'bet', amount: betSize, label: `bets ${betSize}bb` };
    if (p === 'CALLER' && Math.random() < 0.4) return { action: 'bet', amount: betSize, label: `bets ${betSize}bb` };
    return { action: 'check', label: 'checks' };
  }
  if (strength >= 2) {
    if (p === 'LAG' && Math.random() < 0.55) return { action: 'bet', amount: Math.round(pot * 0.45), label: `bets ${Math.round(pot * 0.45)}bb` };
    if (p === 'TAG' && Math.random() < 0.35) return { action: 'bet', amount: Math.round(pot * 0.4), label: `bets ${Math.round(pot * 0.4)}bb` };
    return { action: 'check', label: 'checks' };
  }
  // Air / draws — sometimes bluff
  if (p === 'LAG' && Math.random() < 0.4) return { action: 'bet', amount: Math.round(pot * 0.6), label: `bets ${Math.round(pot * 0.6)}bb (bluff)` };
  if (p === 'TAG' && draws.length > 0 && Math.random() < 0.3) return { action: 'bet', amount: Math.round(pot * 0.5), label: `bets ${Math.round(pot * 0.5)}bb` };
  return { action: 'check', label: 'checks' };
}

// ── Pot odds helper ───────────────────────────────────────────
export function potOddsNeeded(call, totalPotAfterCall) {
  return Math.round((call / totalPotAfterCall) * 1000) / 10;
}

// ── Coach Analysis ────────────────────────────────────────────

export function analyzeAction(gameState) {
  const {
    street, playerCards, community, pot, callAmount, currentBet,
    playerAction, playerPosition, playerIsAggressor, villainBetSize,
    villainBetPct, facingRaise, facingBet, bbAmount, raisedPot,
    effectiveStack, botPersonality,
  } = gameState;

  if (street === 'preflop') return analyzePreflopAction(gameState);
  return analyzePostflopAction(gameState);
}

function analyzePreflopAction(gs) {
  const { playerCards, playerAction, playerPosition, facingBet, facingRaise,
    callAmount, pot, bbAmount, raisedPot, botPersonality } = gs;

  const hand = cardPairToString(playerCards);
  const gtoAction = getRFIAction(hand, playerPosition);

  // ── RFI scenario (no prior raises) ──
  if (!facingBet) {
    if (playerAction === 'raise') {
      if (gtoAction === 'raise') {
        return good('✓ Correct Open Raise', `${hand} in ${playerPosition} is solidly in your opening range. You chose aggression — the TAG way. Never limp with a hand worth playing.`,
          null, null, `TAG Principle: Enter the pot with a raise or stay out.`);
      }
      if (gtoAction === 'mix') {
        return good('✓ Raise is Fine Here', `${hand} is a mix hand at ${playerPosition} (raise ~50% of the time). Your raise is defensible — you're not punished for it.`,
          null, null, `Mix hands are raise or fold. Calling is never the answer.`);
      }
      // Should fold
      return mistake(`⚠ Opening Too Wide`, `${hand} is below your ${playerPosition} opening range. Opening weak hands creates a leaky, exploitable range that gets attacked by 3-bets you can't defend.`,
        'preflopTrainer', `Practice ${playerPosition} opens in the Preflop Trainer. Focus on knowing exactly where your range ends.`,
        '−0.3bb', `TAG Principle: Open tight, especially from early position. Fold or raise — never drift into marginal opens.`);
    }
    if (playerAction === 'fold') {
      if (gtoAction === 'fold') {
        return good('✓ Correct Fold', `${hand} is outside your ${playerPosition} range. Clean discipline — folding garbage preflop is the foundation of TAG play.`,
          null, null, `TAG Principle: Tight preflop selection is the most important skill in cash games.`);
      }
      if (gtoAction === 'raise') {
        return mistake('⚠ Folding a Playable Hand', `${hand} in ${playerPosition} should be a raise. Folding it costs you real EV — you're giving up a profitable open.`,
          'preflopTrainer', `Practice ${playerPosition} opens in the Preflop Trainer. Drill until you know the full range by memory.`,
          '−0.4bb', `TAG Principle: When a hand is in your range, enter aggressively — don't timidly fold.`);
      }
      if (gtoAction === 'mix') {
        return minor('~ Fold is OK, Raise is Slightly Better', `${hand} is a mix hand at ${playerPosition} — raising ~50% of the time is slightly better. Folding isn't a disaster, but you're leaving a little EV on the table.`,
          null, null, `Mix hands can go either way. When in doubt, lean toward raising in position, folding OOP.`);
      }
    }
    if (playerAction === 'call') {
      return bigMistake('✗ Open-Limping!', `NEVER limp open. Calling the big blind with no raise surrenders initiative, creates a weak undefendable range, and invites the BB to see a cheap flop with any two cards.`,
        'preflopTrainer', `Do the Preflop Trainer immediately. Burn "raise or fold" into your instincts — calling is almost never the answer preflop.`,
        '−0.8bb', `TAG Cardinal Rule: Raise first in or fold. Limping is the sign of a recreational player.`);
    }
  }

  // ── Facing a raise ──
  if (facingBet && !raisedPot) {
    if (playerAction === 'call') {
      const isIP = ['BTN', 'CO'].includes(playerPosition);
      if (isIP) {
        return minor('~ Flat Call In Position', `Calling a raise in position with ${hand} is acceptable when IP, though a 3-bet is often better. You preserve some positional advantage but create a squeezable range.`,
          'handCharts', `Study the 3-Bet Ranges chart to see when to 3-bet vs flat-call from BTN/CO.`,
          '−0.1bb', `Being IP allows occasional flat-calls with suited connectors and pocket pairs. OOP, it's almost always 3-bet or fold.`);
      } else {
        return mistake('⚠ Calling OOP Creates Problems', `Calling a raise out of position with ${hand} creates a weak, squeezable range that's very hard to play profitably. GTO recommends 3-bet or fold from OOP seats.`,
          'handCharts', `Study "Facing a Raise" in Hand Charts. Practice the 3-Bet Ranges for SB and BB.`,
          '−0.3bb', `TAG Principle: Avoid calling raises OOP. 3-bet with strong hands, fold everything else.`);
      }
    }
    if (playerAction === 'raise') {
      // 3-bet
      const premiums = new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs']);
      const bluffHands = new Set(['A5s','A4s','A3s','A2s','KJs','QJs','JTs','T9s']);
      if (premiums.has(hand)) {
        return good('✓ 3-Bet for Value', `${hand} is a premium 3-bet hand. You're building the pot with the best of it and pricing out speculative hands. Perfect.`,
          null, null, `Premium hands 3-bet to build pots. Don't slowplay preflop — let them call or fold, either way you win.`);
      }
      if (bluffHands.has(hand)) {
        return good('✓ 3-Bet Bluff/Semi-Bluff', `${hand} is a quality 3-bet bluff: it has playability when called (flush potential, strong draws) and blocks some of villain's strong range. Well-chosen.`,
          null, null, `Balanced 3-bet ranges include blockers (A5s-A2s block AA) and hands with nut potential when called.`);
      }
      return good('✓ Aggressive 3-Bet', `3-betting with ${hand} shows initiative. Make sure you have a clear reason — either it's value, or it's a blocker bluff with equity.`,
        null, null, `3-bet ranges should be polarized: premium value hands + low-kicker suited aces (blockers). Avoid 3-betting hands that can't fold out better or win at showdown.`);
    }
    if (playerAction === 'fold') {
      return good('✓ Disciplined Fold', `Folding ${hand} to a raise is correct here. Not every hand deserves to be played, especially facing early position raises.`,
        null, null, `TAG Principle: Folding is free. Calling with weak hands against raised pots is how money leaks out.`);
    }
  }

  // ── Facing a 3-bet ──
  if (raisedPot && facingBet) {
    if (playerAction === 'fold') {
      return good('✓ Fold to 3-Bet', `Folding ${hand} to a 3-bet is usually correct. 3-bet pots are expensive and require strong hands or good reasons to continue.`,
        null, null, `Against 3-bets, lean toward fold or 4-bet. Calling builds a bloated OOP pot that's very hard to win.`);
    }
    if (playerAction === 'raise') {
      return good('✓ 4-Bet!', `4-betting ${hand} shows commitment and forces villain into a tough spot. Be sure you have either a premium value hand or a blocker bluff (A5s, KQs) to justify it.`,
        null, null, `4-bet ranges: AA/KK/QQ/AK for value. A5s/A4s as bluffs (hold the ace blocker). Sizing: 2.3–2.75× the 3-bet.`);
    }
    if (playerAction === 'call') {
      return minor('~ Calling a 3-Bet', `Calling a 3-bet with ${hand} creates a 3-bet pot with a lower SPR. Only do this IP with strong playable hands (TT-QQ, AQs, KQs, suited connectors).`,
        'handCharts', `Review "Calling a 3-Bet" in the Hand Charts. Only call 3-bets in position with hands that can play postflop.`,
        '−0.1bb', `Calling 3-bets OOP is a significant EV loss. IP with good hands, it's fine. OOP, fold or 4-bet.`);
    }
  }

  return neutral('Action noted.', '');
}

function analyzePostflopAction(gs) {
  const {
    playerCards, community, pot, playerAction, playerPosition,
    playerIsAggressor, callAmount, currentBet, street,
    facingBet, villainBetSize, villainBetPct, effectiveStack,
    botPersonality, raiseAmount,
  } = gs;

  const rel = relativeStrength(playerCards, community);
  const best = getBestHand(playerCards, community);
  const draws = getDraws(playerCards, community);
  const handCat = best?.cat || 0;
  const handDesc = best?.desc || 'nothing';
  const equity = approxEquity(handCat, draws, community);
  const boardTexture = getBoardTexture(community);

  // ── Player checks when first to act ──
  if (playerAction === 'check' && !facingBet) {
    if (rel === 'nutted' || rel === 'very_strong') {
      return minor('~ Checking Strong Hand', `You checked with ${handDesc}. Slow-playing a strong hand can be fine occasionally for deception, but on a ${boardTexture.label} board, betting for value is usually better — especially if draws are present.`,
        'postflopTrainer', `Practice "Board Texture" scenarios in the Postflop Trainer. Learn when to slow-play vs. bet for protection.`,
        '−0.15bb', `Slowplaying on wet boards costs equity. Bet strong hands when the board is dynamic.`);
    }
    if ((rel === 'tptk' || rel === 'tpgk') && playerIsAggressor) {
      if (boardTexture.wet) {
        return mistake('⚠ Check Behind on Wet Board', `Checking TPTK (${handDesc}) on a wet board as the aggressor gives free equity. C-bet here — charge the draws.`,
          'postflopTrainer', `Practice c-betting decisions in the Postflop Trainer. Wet boards require betting strong hands for protection.`,
          '−0.3bb', `On wet boards, strong made hands need protection. Don't give free cards to flush/straight draws.`);
      }
      return minor('~ Check with TPTK', `Checking TPTK on a ${boardTexture.label} board can work as a balance move, but c-betting 50–70% of the time is more profitable against most opponents.`,
        null, null, `C-betting TPTK with a 33–50% sizing is standard on most boards. Checking mixes your range but gives up EV vs. calling stations.`);
    }
    if (rel === 'air' && playerIsAggressor) {
      if (boardTexture.dry) {
        return mistake('⚠ Missed C-Bet on Dry Board', `You have ${boardTexture.label} board and are the preflop aggressor. Even with nothing, this board favors your range — a 33% pot c-bet here folds out ~40% of villain's range immediately.`,
          'postflopTrainer', `Study Dry Board c-bet scenarios in the Postflop Trainer.`,
          '−0.25bb', `Dry boards are where the preflop raiser has range advantage. Small, frequent c-bets are highly profitable here.`);
      }
      return good('✓ Checking Air on Wet Board', `Checking air on a ${boardTexture.label} board is correct. Your bluffs don't have enough fold equity here, and checking protects your range.`,
        null, null, `On wet boards, be selective with c-bets. Don't bluff into multiple draws — wait for better spots.`);
    }
    // Medium-strength hands checking
    if (rel === 'solid' || rel === 'tptk' || rel === 'tpgk') {
      return minor('~ Checking Medium-Strength Hand', `Checking ${handDesc} on the ${street} is a reasonable slow-play or pot-control line. As the ${playerIsAggressor ? 'preflop aggressor' : 'caller'}, consider whether villain will bet behind — if they will, checking to induce is fine. If they check back, you gave up value.`,
        null, null, `Pot-control by checking medium hands prevents building a pot you can't comfortably stack off. It's a valid line, but don't make it a habit — it becomes exploitable if you never bet these hands.`);
    }
    if (rel === 'middle_pair' || rel === 'bottom_pair') {
      return good('✓ Good Pot Control', `Checking ${handDesc} on the ${street} is solid pot control. With a vulnerable pair, checking keeps the pot small and avoids building a big pot out of position or against an aggressor.`,
        null, null, `Middle and bottom pair are "bluff catchers" — check to keep the pot small, then decide whether to call a bet based on pot odds and villain's range.`);
    }
    if (rel === 'tp_weak') {
      return minor('~ Weak Top Pair — Check or Small Bet', `Top pair with a weak kicker (${handDesc}) is tricky. Checking is fine for pot control; a small bet (25–33% pot) is also reasonable to extract value from worse pairs. Just don't build a huge pot with it.`,
        null, null, `Weak top pair doesn't want a big pot. Keep sizing small or check — you're often in a thin value vs. bluff-catcher spot.`);
    }
    return good('✓ Check is Fine', `Checking on the ${street} with ${handDesc} is a reasonable line. Not every hand needs to be bet — checking with marginal holdings controls pot size and can induce bluffs from worse hands.`,
      null, null, `Mixing checks into your range with medium hands makes you harder to read. TAG play means betting strong hands aggressively, but checking marginal ones is correct pot control.`);
  }

  // ── Player bets ──
  if ((playerAction === 'bet' || playerAction === 'raise') && !facingBet) {
    const betPct = raiseAmount ? Math.round((raiseAmount / pot) * 100) : 0;

    if (rel === 'nutted' || rel === 'very_strong') {
      const sizingFeedback = boardTexture.wet
        ? (betPct >= 60 ? '✓ Good large sizing on a wet board.' : '⚠ Size up — use 67–100%+ on wet boards with the nuts.')
        : (betPct <= 50 ? '✓ Good small sizing on a dry board.' : 'Slight overbet — 33–50% is usually enough on dry boards.');
      return good('✓ Value Bet with Strong Hand', `Betting ${handDesc} for value. ${sizingFeedback}`,
        null, null, `Value bet relentlessly with strong hands. Tailor sizing to board texture — small on dry, large on wet.`);
    }
    if (rel === 'tptk' || rel === 'tpgk') {
      return good('✓ Value Bet TPTK', `C-betting ${handDesc} is correct. You have the best hand vs villain's range — charge them for draws and worse pairs.`,
        null, null, `TPTK is a value hand in most spots. Bet 40–60% pot to keep villain's range wide.`);
    }
    if (rel === 'air' || rel === 'weak_draw') {
      if (boardTexture.dry && playerIsAggressor) {
        return good('✓ Well-Timed Bluff', `C-betting as a bluff on a ${boardTexture.label} board. Your range has advantage here — villain will fold often enough for this to profit.`,
          null, null, `C-bet bluffs work when: (1) you have range advantage, (2) board is dry, (3) you have fold equity. All boxes checked.`);
      }
      if (boardTexture.wet) {
        return minor('~ Bluffing on Wet Board', `Bluffing on a ${boardTexture.label} board is riskier. Villain's range connects here too, so fold equity is lower. Make sure you have a draw to fall back on.`,
          'postflopTrainer', `Study wet board decisions in the Postflop Trainer. Bluffs need equity backup on dynamic boards.`,
          '−0.15bb', `On wet boards, semi-bluff with draws — not pure air. "No equity bluffs" work best on dry boards.`);
      }
    }
    if (rel === 'strong_draw' || rel === 'combo_draw') {
      return good('✓ Semi-Bluff with Draw!', `Betting a ${rel === 'combo_draw' ? 'combo draw' : 'strong draw'} is excellent. You have ~${equity}% equity — you can win immediately (folds) OR at showdown when you hit.`,
        null, null, `Semi-bluffs are the highest EV bluffs: you profit when they fold AND when you hit. Combo draws (flush+straight) have ~50%+ equity.`);
    }
    // Medium-strength hands betting
    if (rel === 'solid' || rel === 'tptk' || rel === 'tpgk' || rel === 'tp_weak') {
      const sizing = betPct >= 66 ? 'large' : betPct >= 40 ? 'standard' : 'small';
      const sizingNote = betPct >= 66 ? 'Large sizing polarizes your range — make sure you can follow through on turns.' : betPct <= 30 ? 'Small sizing is fine to keep villain\'s range wide and extract thin value.' : '';
      return good(`✓ Value Bet — ${handDesc}`, `Betting your ${handDesc} for value is correct. Your hand likely beats villain's calling range. ${sizingNote}`.trim(),
        null, null, `Bet made hands for value on most boards. ${boardTexture.wet ? 'On this wet board, consider sizing up to charge draws.' : 'On this dry board, a smaller sizing keeps villain calling with more of their range.'}`);
    }
    if (rel === 'middle_pair' || rel === 'bottom_pair') {
      return minor('~ Thin Value / Risky Bet', `Betting ${handDesc} on the ${street} is thin. You may be value-betting into hands that beat you (overcards, better pairs) while the hands you beat may fold. Consider checking for pot control — you can still call a reasonable bet.`,
        'postflopTrainer', `Work on hand-strength evaluation in the Postflop Trainer. Learn when middle/bottom pair is a bet vs. a bluff catcher.`,
        '−0.1bb', `Middle and bottom pair are usually bluff catchers, not value bets. Check and call rather than build a pot you can't be comfortable in.`);
    }
    return good('✓ Bet is Reasonable', `Betting on the ${street} with ${handDesc} takes the initiative. Make sure you have a clear reason — value (you beat villain's call range) or a semi-bluff with equity to fall back on.`,
      null, null, `Every bet should have a purpose: value (bet to be called by worse) or bluff (bet to fold out better). If neither applies, check instead.`);
  }

  // ── Player calls a bet ──
  if (playerAction === 'call' && facingBet) {
    const potOdds = potOddsHelper(callAmount, pot);
    const needsPct = Math.round(callAmount / (pot + callAmount) * 100);

    if (equity >= needsPct + 5) {
      return good('✓ Profitable Call', `Your equity (~${equity}%) exceeds the pot odds needed (~${needsPct}%). This is a +EV call — you have enough equity to make it profitable long-term.`,
        null, null, `Pot Odds formula: Call ÷ (Call + Total Pot). If your equity > pot odds needed, call. If not, fold.`);
    }
    if (equity >= needsPct - 5) {
      return minor('~ Break-Even Call', `Your equity (~${equity}%) is roughly equal to the pot odds needed (~${needsPct}%). This is a marginal call. Against aggressive opponents, leaning toward fold; vs. bluff-heavy opponents, call.`,
        'mathDrills', `Practice Pot Odds drills in Math Drills to sharpen these calculations at the table.`,
        '~0bb', `Break-even calls are fine — you're not losing money. But consider: will you realize your equity fully? OOP = fold more. IP = call more.`);
    }
    // Bad call
    if (rel === 'air' || rel === 'bottom_pair') {
      return bigMistake('✗ Calling with No Equity', `Villain bet ${villainBetPct || '?'}% pot. You needed ~${needsPct}% equity to call. With ${handDesc}, you have ~${equity}%. This is a significantly losing call.`,
        'mathDrills', `Work on Pot Odds + MDF drills in Math Drills. Practice folding to bets when equity doesn't justify calling.`,
        `−${Math.round((needsPct - equity) / 20 * 100) / 100}bb`, `MDF principle: You DON'T have to call every bet. Fold when equity < pot odds needed.`);
    }
    return minor('~ Marginal Call', `With ${handDesc} (~${equity}% equity) you needed ~${needsPct}% to call. This may be slightly –EV. Consider the villain's betting range and your position.`,
      'mathDrills', `Refine pot odds calculations in Math Drills.`,
      '−0.1bb', `Against aggressive opponents, call more often. Against tight opponents, fold more. Adjust to tendencies.`);
  }

  // ── Player folds to a bet ──
  if (playerAction === 'fold' && facingBet) {
    const potOdds = potOddsHelper(callAmount, pot);
    const needsPct = Math.round(callAmount / (pot + callAmount) * 100);

    if (equity > needsPct + 10) {
      return mistake('⚠ Over-Folding — You Had Equity!', `You folded ${handDesc} (~${equity}% equity) but only needed ~${needsPct}% to call profitably. This fold cost you EV.`,
        'mathDrills', `Practice Pot Odds and MDF drills. Learning when folding is too tight is as important as knowing when to fold weak hands.`,
        `−${Math.round((equity - needsPct) / 15 * 100) / 100}bb`, `MDF tells you how often you MUST defend. Over-folding lets opponents bluff any two cards profitably against you.`);
    }
    if (rel === 'nutted' || rel === 'very_strong') {
      return bigMistake('✗ Folding a Strong Hand!', `You folded ${handDesc} — a very strong holding! Never fold the nuts or near-nuts. Villain is betting; you should raise or call.`,
        'postflopTrainer', `Review Hand Strength scenarios in the Postflop Trainer. Practice recognizing when you have a monster.`,
        '−2bb+', `This is one of the biggest mistakes in poker — folding strong hands. Bet/call with all hands in the top 10% of your range.`);
    }
    if (rel === 'strong_draw' || rel === 'combo_draw') {
      return mistake('⚠ Folding a Strong Draw', `You folded with ${draws.join(' + ')}. A ${rel === 'combo_draw' ? 'combo draw' : 'flush/straight draw'} has ~${equity}% equity — enough to call or raise here.`,
        'postflopTrainer', `Practice draw decisions in the Postflop Trainer. Combo draws are often semi-bluff raises, not folds.`,
        `−0.4bb`, `Strong draws (flush draw, OESD) have 30–50%+ equity. Never fold them to a single bet unless the sizing is huge relative to stack.`);
    }
    return good('✓ Correct Fold', `You folded ${handDesc} with ~${equity}% equity vs. a pot requiring ~${needsPct}%. Good discipline — don't call bets you can't beat.`,
      null, null, `TAG Principle: Folding weak hands to aggression protects your bankroll. Every saved bet is profit.`);
  }

  // ── Player raises a bet (check-raise) ──
  if (playerAction === 'raise' && facingBet) {
    if (rel === 'nutted' || rel === 'very_strong' || rel === 'strong') {
      return good('✓ Value Check-Raise!', `Excellent! Check-raising ${handDesc} builds a large pot with the best hand. This is how you maximize value from strong holdings.`,
        null, null, `Check-raises with strong hands are one of the highest EV plays in poker. They force villain to either pay a big price or fold.`);
    }
    if (rel === 'combo_draw' || rel === 'strong_draw') {
      return good('✓ Semi-Bluff Check-Raise!', `Check-raising with a ${rel === 'combo_draw' ? 'combo draw (~50% equity)' : 'strong draw (~35% equity)'} is a powerful play. You generate immediate fold equity AND have strong equity when called.`,
        null, null, `Semi-bluff check-raises are the highest EV plays with drawing hands. Standard size: 2.5–3× the bet.`);
    }
    if (rel === 'air' || rel === 'bottom_pair') {
      return minor('~ Bluff Check-Raise', `Check-raising with ${handDesc} as a bluff. This can work, but make sure: (1) you have blockers to strong hands, (2) villain can fold, (3) board texture favors you.`,
        'postflopTrainer', `Study bluff check-raise spots in the Postflop Trainer and Hand Charts.`,
        '−0.1bb', `Bluff check-raises need fold equity. They're most effective on boards where your range is strong and villain has many mediocre hands.`);
    }
    // Medium hands check-raising
    if (rel === 'tptk' || rel === 'tpgk' || rel === 'solid') {
      return good('✓ Check-Raise for Value', `Check-raising ${handDesc} builds the pot with a strong holding. This is a valid value line — you induce a bet then raise to get more money in as a favorite.`,
        null, null, `Check-raising strong-but-not-nutted hands like TPTK is an advanced line. It balances your check-raise range (not just draws and nuts) and extracts max value.`);
    }
    if (rel === 'middle_pair' || rel === 'tp_weak') {
      return minor('~ Check-Raise with Vulnerable Hand', `Check-raising ${handDesc} is aggressive. Your hand has value but is also vulnerable — if called, you could be behind or face tough decisions. Make sure villain's folding range is wide enough to justify the risk.`,
        'postflopTrainer', `Study check-raise sizing and spot selection in the Postflop Trainer.`,
        '−0.1bb', `Don't build huge pots with middle pair or weak top pair unless the SPR is very low. These hands prefer smaller pots.`);
    }
    return minor('~ Check-Raise — Verify Your Reasoning', `You check-raised on the ${street} with ${handDesc}. Check-raises commit more money — be sure you're doing it for value (you beat villain's betting range) or as a semi-bluff (strong draw). Avoid check-raising purely to "see where you're at."`,
      'postflopTrainer', `Review check-raise criteria in the Postflop Trainer.`,
      null, `Check-raises say "I have a very strong hand or a very strong draw." Make sure your hand fits one of those categories.`);
  }

  // ── All-in ──
  if (playerAction === 'allin') {
    const spr = effectiveStack / pot;
    if (spr <= 2 && (rel === 'tptk' || rel === 'tpgk' || rel === 'nutted' || rel === 'very_strong' || rel === 'strong')) {
      return good('✓ Correct Jam!', `With SPR ≤ 2, you're committed with ${handDesc}. Jamming is the right play — get the money in as a favorite.`,
        null, null, `SPR under 2 = committed. Any top pair or better is a jam at low SPR.`);
    }
    if (spr > 4 && (rel === 'air' || rel === 'bottom_pair')) {
      return bigMistake('✗ Overcommitting with Weak Hand', `Jamming ${handDesc} at SPR ${spr.toFixed(1)} is a massive mistake. You're risking many BBs with a hand that rarely wins at showdown.`,
        'mathDrills', `Study the SPR chart in Math Drills and Hand Charts. Learn commitment thresholds for every hand type.`,
        '−3bb+', `SPR principle: High SPR = need premium hands to stack off. Low SPR = lower threshold. Never jam air at deep stacks.`);
    }
    if (rel === 'nutted' || rel === 'very_strong') {
      return good('✓ Value Jam!', `Jamming with ${handDesc} is correct. Maximum value with a dominant hand.`,
        null, null, `Nut hands jam or call jams at any SPR. Get the money in when you're a massive favorite.`);
    }
    return minor('~ All-In Decision', `Jamming with ${handDesc} at SPR ${spr.toFixed(1)}. Make sure the SPR justifies committing your stack — refer to the SPR guide in Hand Charts.`,
      'handCharts', `Review the SPR table in Hand Charts → Math Tables.`,
      null, `SPR guide: Stack off with TPTK at SPR ≤ 3, two-pair at SPR ≤ 6, sets at any SPR.`);
  }

  // Final catch-all — give general feedback based on action and hand
  const actionWord = playerAction === 'check' ? 'checked' : playerAction === 'call' ? 'called' : playerAction === 'bet' ? 'bet' : playerAction === 'raise' ? 'raised' : playerAction;
  return minor(`~ ${handDesc} on ${street.charAt(0).toUpperCase() + street.slice(1)}`, `You ${actionWord} with ${handDesc} (~${equity}% equity) on a ${boardTexture.label} board. Think about whether your hand is strong enough to bet for value, weak enough to check/fold, or a draw worth semi-bluffing. Every action should fit one of those categories.`,
    'postflopTrainer', `Work through postflop scenarios to sharpen hand-strength decisions.`,
    null, `Postflop decision tree: (1) Strong hand → bet/raise for value. (2) Draw → semi-bluff. (3) Air → bluff only with fold equity. (4) Marginal hand → check to control pot size.`);
}

// ── Helpers ───────────────────────────────────────────────────

function cardPairToString(cards) {
  if (!cards || cards.length < 2) return '??';
  const [c1, c2] = cards;
  const r1 = RANK_VAL[c1.rank], r2 = RANK_VAL[c2.rank];
  const hi = r1 >= r2 ? c1 : c2;
  const lo = r1 < r2 ? c1 : c2;
  if (c1.rank === c2.rank) return c1.rank + c2.rank;
  const suffix = c1.suit === c2.suit ? 's' : 'o';
  return hi.rank + lo.rank + suffix;
}

function getBoardTexture(community) {
  if (!community || community.length === 0) return { label: 'board', dry: true, wet: false };
  const suits = community.map(c => c.suit);
  const vals = community.map(c => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const uniqueSuits = new Set(suits).size;
  const span = vals[0] - (vals[vals.length - 1] || vals[0]);
  const paired = vals.length !== new Set(vals).size;

  if (paired) return { label: 'paired', dry: true, wet: false };
  if (uniqueSuits === 1) return { label: 'monotone', dry: false, wet: true };
  const connected = span <= 4;
  const twoTone = uniqueSuits === 2;
  if (connected && twoTone) return { label: 'wet', dry: false, wet: true };
  if (connected || twoTone) return { label: 'semi-wet', dry: false, wet: true };
  return { label: 'dry', dry: true, wet: false };
}

function potOddsHelper(call, pot) {
  return Math.round((call / (call + pot)) * 1000) / 10;
}

// ── Coach result builders ─────────────────────────────────────
function good(title, explanation, practiceModule, practiceNote, tagPrinciple) {
  return { quality: 'good', title, explanation, practiceModule, practiceNote, tagPrinciple, evImpact: null };
}
function minor(title, explanation, practiceModule, practiceNote, evImpact, tagPrinciple) {
  return { quality: 'minor', title, explanation, practiceModule, practiceNote, tagPrinciple, evImpact };
}
function mistake(title, explanation, practiceModule, practiceNote, evImpact, tagPrinciple) {
  return { quality: 'mistake', title, explanation, practiceModule, practiceNote, tagPrinciple, evImpact };
}
function bigMistake(title, explanation, practiceModule, practiceNote, evImpact, tagPrinciple) {
  return { quality: 'big_mistake', title, explanation, practiceModule, practiceNote, tagPrinciple, evImpact };
}
function neutral(title, explanation) {
  return { quality: 'neutral', title, explanation, practiceModule: null, practiceNote: null, tagPrinciple: null, evImpact: null };
}

// Module name map (for linking to the right nav section)
export const MODULE_NAMES = {
  preflopTrainer:  '♠ Preflop Trainer',
  postflopTrainer: '🃏 Postflop Trainer',
  mathDrills:      '🔢 Math Drills',
  handCharts:      '📊 Hand Charts',
  handReadingQuiz: '🔍 Hand Reading Quiz',
};
