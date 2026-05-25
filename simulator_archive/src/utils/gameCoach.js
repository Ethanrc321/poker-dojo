// ============================================================
// Bot AI + Coach Analysis Engine
// ============================================================

import { RANK_VAL, getBestHand, getDraws, relativeStrength, approxEquity } from './handEval.js';
import { getRFIAction, RFI_RANGES, BB_DEFENSE, THREE_BET_RANGES, FOUR_BET_RANGES,
         getSBRFIAction, SB_RAISE_VALUE, SB_RAISE_BLUFF, SB_LIMP } from '../data/ranges.js';
import { EVALUATOR, RANGES } from '../engine/gto-engine.js';

// ── Bot profiles ─────────────────────────────────────────────
export const BOT_PROFILES = [
  { id: 'tag',    name: 'TAG Pro',        style: 'Tight-Aggressive',  desc: 'Solid GTO player. Opens correct ranges, c-bets selectively, rarely makes big mistakes.' },
  { id: 'caller', name: 'Loose Larry',    style: 'Calling Station',   desc: 'Calls too much, rarely raises. Never folds top pair. Easy to value-bet.' },
  { id: 'lag',    name: 'Aggressive Alex',style: 'Loose-Aggressive',  desc: 'Wide range, frequent bluffs. Can be trapped. Call down lighter vs this player.' },
  { id: 'nit',    name: 'Tight Tim',      style: 'Nit',               desc: 'Only plays premium hands. Fold to his raises — they\'re always real.' },
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

function get3BetRange(heroPosition) {
  if (heroPosition === 'SB')  return THREE_BET_RANGES.SB_vs_any;
  if (heroPosition === 'BTN') return THREE_BET_RANGES.BTN_vs_any;
  if (heroPosition === 'CO')  return THREE_BET_RANGES.CO_vs_early;
  if (heroPosition === 'HJ')  return THREE_BET_RANGES.HJ_vs_UTG;
  if (heroPosition === 'BB')  return { value: BB_DEFENSE.BTN.threebet, bluff: new Set(['A5s','A4s','A3s']) };
  // UTG — very tight, only premiums
  return { value: new Set(['AA','KK','QQ','AKs','AKo']), bluff: new Set(['A5s','A4s']) };
}

function analyzePreflopAction(gs) {
  const { playerCards, playerAction, playerPosition, facingBet, facingRaise,
    callAmount, pot, bbAmount, raisedPot, playerIsAggressor, botPersonality } = gs;

  const hand = cardPairToString(playerCards);
  const gtoAction = getRFIAction(hand, playerPosition);

  // ── RFI scenario: nobody has voluntarily raised yet ──
  // Use !raisedPot (not !facingBet) — the BB's forced 1bb makes callAmt > 0 even on a fresh
  // RFI street, so facingBet is always true preflop and is useless as the RFI gate.
  if (!raisedPot) {

    // ── SB special: 4-action strategy (raise value / raise bluff / limp / fold) ──
    if (playerPosition === 'SB') {
      const sbAction = getSBRFIAction(hand);
      if (playerAction === 'call') { // = limp from SB
        if (sbAction === 'limp') {
          return good('Correct Limp from SB', `${hand} is in the SB limp range. From the SB you play the entire hand OOP, so limping wide and controlling pot size with medium-strength hands is correct. Only raise premiums (value) or polarized bluffs.`,
            null, null, `SB Strategy: Raise for Value (~9%) · Raise as Bluff (~13%) · Limp (~49%) · Fold (~29%). Never fold your limp range — you're getting great odds vs only the BB.`);
        }
        if (sbAction === 'raise_value') {
          return mistake('Should Raise — Premium Hand!', `${hand} is a raise-for-value hand from SB. Limping with this hand gives BB a cheap look and misses significant value. Open to 3bb and build the pot.`,
            'preflopTrainer', `Study SB RFI in the Charts tab. Identify your raise-for-value hands vs limp hands.`,
            '-0.4bb', `From SB, always raise premium hands. Limping them lets the BB see a flop for free and destroys your preflop equity.`);
        }
        if (sbAction === 'raise_bluff') {
          return mistake('Should Raise — Bluff Candidate', `${hand} is a raise-as-bluff hand from SB. These hands have the right profile to raise (fold equity vs BB + equity when called), not limp. Raising also denies BB a cheap flop.`,
            'preflopTrainer', `Review SB raise-as-bluff range in the Charts tab. These hands raise to deny BB equity, not for pure value.`,
            '-0.2bb', `SB bluff-raises are profitable because they pressure the BB to fold or defend from a disadvantaged position.`);
        }
        // sbAction === 'fold': limping a hand you should fold
        return mistake('Limping Too Wide', `${hand} is in SB's fold range. Even limping this hand is -EV — it plays poorly multiway, has no clear equity path, and makes your limping range weaker overall.`,
          'preflopTrainer', `Practice SB RFI in the Preflop Trainer. Learn exactly which hands to limp vs fold.`,
          '-0.15bb', `Limp the right hands from SB — suited connectors, pocket pairs, playable broadways. Pure garbage belongs in the muck.`);
      }
      if (playerAction === 'raise') {
        if (sbAction === 'raise_value') {
          return good('Raise for Value from SB', `${hand} is a value raise from SB — use 3bb (not 2.5bb) to deny BB a profitable price. You're betting a hand with clear equity advantage.`,
            null, null, `SB raise sizing: 3bb to deny BB pot odds. Postflop you'll be OOP, so charge them preflop.`);
        }
        if (sbAction === 'raise_bluff') {
          return good('Raise as Bluff from SB', `${hand} is a well-structured bluff-raise from SB. It denies BB equity, pressures their range, and has reasonable playability when called.`,
            null, null, `SB bluff-raises deny the BB a cheap flop and fold out many of their weaker hands before the flop.`);
        }
        if (sbAction === 'limp') {
          return minor('Should Limp — Not Raise', `${hand} is in the SB limp range, not the raise range. Raising it inflates the pot with a hand that isn't strong enough to play for a big pot OOP. Limp and see a cheap flop.`,
            'preflopTrainer', `Study SB RFI ranges in Charts. Distinguish raise-for-value vs limp-to-play hands.`,
            '-0.1bb', `SB limp hands (medium pairs, suited connectors, weak broadways) are better played for pot control. Raising them makes you difficult to balance and overcommits to a hand.`);
        }
        // fold hand raised
        return bigMistake('Opening Too Wide from SB', `${hand} is below SB's playable range. Even limping this hand is marginal — raising it creates a bloated pot OOP with no equity edge.`,
          'preflopTrainer', `Study SB opening ranges in the Preflop Trainer. SB folds ~30% of hands preflop.`,
          '-0.4bb', `SB opens ~71% of hands total, but only raises ~22%. The remaining 49% limp and 29% fold. Don't raise with fold-territory hands.`);
      }
      if (playerAction === 'fold') {
        if (sbAction === 'fold') {
          return good('Correct Fold from SB', `${hand} is outside SB's playable range. Clean discipline — folding this saves chips for better spots.`,
            null, null, `SB folds ~29% of hands. Garbage folds are free and keep your limping range strong.`);
        }
        if (sbAction === 'limp') {
          return minor('Fold is OK, Limp is Better', `${hand} is in SB's limp range. You're leaving a small amount of EV on the table — you get a great price to see a flop from SB vs only the BB.`,
            null, null, null, `SB limp range gets pot odds around 3:1. Playable hands should limp in.`);
        }
        // should raise
        return mistake('Folding a Profitable Hand', `${hand} in SB should be a raise (${sbAction === 'raise_value' ? 'for value' : 'as a bluff'}). Folding it forfeits real EV.`,
          'preflopTrainer', `Review SB raise ranges in Charts. Don't fold hands that belong in the raise range.`,
          '-0.3bb', `SB raises both value hands and polarized bluffs. Folding them surrenders EV and makes your raise range stronger for opponents to read.`);
      }
    }

    // ── BB special: checking option or iso-raising with no prior raise ──
    if (playerPosition === 'BB') {
      if (playerAction === 'check') {
        return good('BB Option — Free Flop', `Checking your option from the BB with ${hand} is standard. No one raised, so you're getting a free flop — take it. There's no need to inflate the pot with a marginal hand.`,
          null, null, `BB check-behind is often the highest-EV play with speculative hands. See a free flop and react to the board.`);
      }
      if (playerAction === 'raise') {
        // ISO-raise from BB over limpers — use rough hand-strength tiers
        const str = pfStrength(playerCards);
        if (str >= 8) {
          return good('BB Iso-Raise — Value', `Raising from the BB with ${hand} is excellent. You have a premium hand and should build the pot. ISO to 3-4bb to put maximum pressure on limpers.`,
            null, null, `BB iso-raises with premium hands deny the table a cheap multiway flop. Charge them.`);
        }
        if (str >= 6) {
          return minor('BB Iso-Raise — Playable', `Raising from the BB with ${hand} is reasonable. You have a solid hand and position to punish limpers. Size to 3-4bb and be prepared to c-bet most flops.`,
            null, null, null, `ISO-raising medium hands from the BB is fine when the limpers are weak. Keep sizing correct and play straightforwardly postflop.`);
        }
        return minor('BB Iso-Raise — Thin', `Raising from the BB with ${hand} is marginal. You'll be OOP for the whole hand and ${hand} doesn't have the equity to comfortably build a big pot. Checking is also fine here.`,
          null, null, '-0.1bb', `BB iso-raises work best with hands that flop well or have strong equity. Marginal holdings often do better checking and seeing a free flop.`);
      }
      if (playerAction === 'fold') {
        return good('BB Fold', `Folding from the BB with no raise is unusual but technically fine if you know you're in a bad spot. Normally you'd check for free.`,
          null, null, `If there's no raise, the BB should almost always check. Folding gives up a free flop.`);
      }
    }

    // ── All other positions: use GTO engine for mixed-frequency feedback ──
    if (playerAction === 'call') {
      return bigMistake('Open-Limping!', `NEVER limp open from ${playerPosition}. Calling the big blind with no raise surrenders initiative, creates a weak undefendable range, and invites the BB to see a cheap flop with any two cards.`,
        'preflopTrainer', `Do the Preflop Trainer immediately. Burn "raise or fold" into your instincts — calling is almost never the answer preflop.`,
        '-0.8bb', `TAG Cardinal Rule: Raise first in or fold. Limping from any position except SB is the sign of a recreational player.`);
    }
    {
      // evalPreflopRFI uses GTO_OPEN_RANGES with mixed frequencies for richer feedback
      const gtoPos = playerPosition === 'UTG+1' ? 'HJ' : playerPosition;
      const gtoRanges = RANGES.GTO_OPEN_RANGES;
      const evalAction = playerAction === 'raise' ? 'raise' : 'fold';
      let evalResult = null;
      if (gtoRanges[gtoPos]) {
        try { evalResult = EVALUATOR.evalPreflopRFI(hand, gtoPos, evalAction); } catch (_) {}
      }
      if (evalResult) {
        const evStr = evalResult.evLossMBB > 0 ? `-${evalResult.evLossMBB}mbb` : null;
        if (evalResult.isCorrect) {
          return good(
            evalResult.isMixed ? 'Raise is Fine Here' : playerAction === 'raise' ? 'Correct Open Raise' : 'Correct Fold',
            evalResult.feedback,
            null, null,
            evalResult.isMixed
              ? `Mixed-frequency hand. Either action is acceptable — balance your frequency over time.`
              : playerAction === 'raise'
              ? `TAG Principle: Enter the pot with a raise or stay out.`
              : `TAG Principle: Tight preflop selection is the most important skill in cash games.`
          );
        }
        return playerAction === 'raise'
          ? mistake(`Opening Too Wide`, evalResult.feedback, 'preflopTrainer',
              `Practice ${playerPosition} opens in the Preflop Trainer. GTO frequency: ${Math.round(evalResult.gtoFreq * 100)}%.`,
              evStr || '-0.3bb',
              `TAG Principle: Open tight, especially from early position. Fold or raise — never drift into marginal opens.`)
          : minor('Folding a Playable Hand', evalResult.feedback, 'preflopTrainer',
              `Practice ${playerPosition} opens. GTO raises ${Math.round(evalResult.gtoFreq * 100)}% of the time with ${hand}.`,
              evStr || '-0.3bb',
              `TAG Principle: When a hand is in your range, enter aggressively.`);
      }
      // Fallback to old binary logic if position not in GTO ranges (e.g. UTG+1 edge case)
      if (playerAction === 'raise') {
        if (gtoAction === 'raise') return good('Correct Open Raise', `${hand} in ${playerPosition} is solidly in your opening range.`, null, null, `TAG Principle: Enter the pot with a raise or stay out.`);
        if (gtoAction === 'mix')   return good('Raise is Fine Here', `${hand} is a mix hand at ${playerPosition}.`, null, null, `Mix hands are raise or fold.`);
        return mistake(`Opening Too Wide`, `${hand} is below your ${playerPosition} opening range.`, 'preflopTrainer', `Practice ${playerPosition} opens.`, '-0.3bb', `Open tight from early position.`);
      }
      if (playerAction === 'fold') {
        if (gtoAction === 'fold')  return good('Correct Fold', `${hand} is outside your ${playerPosition} range.`, null, null, `Tight preflop selection is the most important skill.`);
        if (gtoAction === 'raise') return mistake('Folding a Playable Hand', `${hand} in ${playerPosition} should be a raise.`, 'preflopTrainer', `Practice ${playerPosition} opens.`, '-0.4bb', `When a hand is in your range, enter aggressively.`);
        return minor('Fold is OK, Raise is Slightly Better', `${hand} is a mix hand at ${playerPosition}.`, null, null, null, `Mix hands can go either way.`);
      }
    }
  }

  // ── Facing an open raise (opponent raised, player had not yet entered the pot) ──
  if (raisedPot && !playerIsAggressor && callAmount > 0) {
    if (playerAction === 'call') {
      // ── BB defense: best pot odds at the table, wide defense range ──
      if (playerPosition === 'BB') {
        const str = pfStrength(playerCards);
        if (str >= 8) {
          return good('BB 3-Bet or Call — Premium', `${hand} from the BB facing a raise is strong enough to 3-bet or call. Calling is fine — you keep the pot manageable and trap — but a 3-bet for value is often higher EV. Either way, continuing is correct.`,
            null, null, `BB can call a raise with premium hands to balance its defending range and keep villain guessing.`);
        }
        if (str >= 6) {
          return good('BB Defend — Solid Hand', `${hand} is a strong BB defend. You're getting great pot odds and the hand has solid playability across most flop textures. Calling is correct GTO BB defense.`,
            null, null, `BB defends more widely than any other position because of the discounted price. Strong Broadway hands, suited connectors, and pairs are all clean defends.`);
        }
        if (str >= 4) {
          return minor('BB Defend — Marginal', `${hand} is in the BB defense gray zone. You're getting favorable odds, but the hand is speculative. Calling is acceptable, though you should be prepared to fold to heavy postflop pressure with no improvement.`,
            'handCharts', `Practice BB defense range in Hand Charts to sharpen which hands to call vs fold.`,
            '-0.1bb', `BB can call with a wider range than other positions due to price, but speculative hands need strong implied odds or a clean read.`);
        }
        return mistake('BB Fold — Defend With Better', `${hand} is too weak to defend the BB here. Even at a discounted price, hands this weak face too many dominated spots and clean continuation bet situations. Find a fold and wait for better.`,
          'handCharts', `Study BB defense ranges — hands below the defend threshold cost money over time even at good odds.`,
          '-0.2bb', `Pot odds don't justify every defend. ${hand} doesn't flop well enough to call profitably against a raise.`);
      }
      const isIP = ['BTN', 'CO', 'HJ'].includes(playerPosition);
      const isSBvsCO_BTN = playerPosition === 'SB' && ['CO', 'BTN'].includes(botPersonality?.position || '');
      if (isSBvsCO_BTN) {
        return mistake('SB vs CO/BTN: 3-Bet or Fold', `Calling a raise from the SB vs CO or BTN is a significant mistake. The chart shows 0% call rate — this spot is strictly 3-bet or fold. Calling creates an undefendable OOP range that's easy to exploit on every street.`,
          'handCharts', `Check "Facing RFI: SB vs CO/BTN" in Hand Charts. It's a pure 3-bet-or-fold situation.`,
          '-0.4bb', `SB has no flat-call range vs CO or BTN. The positional disadvantage is too severe — either 3-bet to win the pot or fold.`);
      }
      if (isIP) {
        return minor('Flat Call In Position', `Calling a raise in position with ${hand} is acceptable when IP, though a 3-bet is often better. You preserve some positional advantage but create a squeezable range.`,
          'handCharts', `Study the 3-Bet Ranges chart to see when to 3-bet vs flat-call from BTN/CO.`,
          '-0.1bb', `Being IP allows flat-calls with suited connectors and pocket pairs. OOP, it's almost always 3-bet or fold.`);
      } else {
        return mistake('Calling OOP Creates Problems', `Calling a raise out of position with ${hand} creates a weak, squeezable range that's very hard to play profitably. The chart recommends 3-bet or fold from OOP seats.`,
          'handCharts', `Study "Facing a Raise" in Hand Charts. Practice the 3-Bet Ranges for SB and BB.`,
          '-0.3bb', `TAG Principle: Avoid calling raises OOP. 3-bet with strong hands, fold everything else.`);
      }
    }
    if (playerAction === 'raise') {
      const range3b = get3BetRange(playerPosition);
      if (range3b.value.has(hand)) {
        return good('3-Bet for Value', `${hand} is a value 3-bet from ${playerPosition}. You're building the pot with the best of it and pricing out speculative hands. Perfect.`,
          null, null, `Premium hands 3-bet to build pots. Don't slowplay preflop — let them call or fold, either way you win.`);
      }
      if (range3b.bluff.has(hand)) {
        return good('3-Bet Bluff/Semi-Bluff', `${hand} is a quality 3-bet bluff from ${playerPosition}: it blocks strong hands (ace blockers reduce AA/AK combinations) and has playability when called. Well-chosen.`,
          null, null, `Balanced 3-bet ranges include blockers (A5s-A2s block AA) and hands with nut potential when called.`);
      }
      return mistake('3-Bet Out of Range', `${hand} is not in your 3-bet range from ${playerPosition}. This is a speculative hand that doesn't fit the polarized 3-bet structure — it's not strong enough to 3-bet for value and doesn't have the right blocker profile for a bluff. The correct play is call (if in position) or fold.`,
        'handCharts', `Study 3-Bet Ranges in Hand Charts for ${playerPosition}. Drill until you know exactly which hands 3-bet, call, and fold.`,
        '-0.5bb', `TAG 3-bet ranges are polarized: premium value hands (QQ+/AK) + suited ace bluffs (A5s-A2s). Hands in between — KJs, QTs, TT — either call or fold. Never 3-bet them out of position.`);
    }
    if (playerAction === 'fold') {
      if (playerPosition === 'BB') {
        const str = pfStrength(playerCards);
        if (str >= 6) {
          return mistake('BB Fold — Should Defend', `Folding ${hand} from the BB to a raise is a mistake. You're getting the best pot odds at the table and ${hand} is strong enough to defend. Call to see a flop in a single-raised pot — you have position information and a real hand.`,
            'handCharts', `Study BB defense ranges. Strong hands should rarely fold to a single raise from the BB.`,
            '-0.3bb', `BB getting a discounted price with a quality hand — this is a clear defend. Folding strong hands leaves you exploitable.`);
        }
      }
      return good('Disciplined Fold', `Folding ${hand} to a raise is correct here. Not every hand deserves to be played, especially facing early position raises.`,
        null, null, `TAG Principle: Folding is free. Calling with weak hands against raised pots is how money leaks out.`);
    }
  }

  // ── Facing a 3-bet (player opened, opponent re-raised) ──
  if (raisedPot && playerIsAggressor && callAmount > 0) {
    if (playerAction === 'fold') {
      return good('Fold to 3-Bet', `Folding ${hand} to a 3-bet is usually correct. 3-bet pots are expensive and require strong hands or good reasons to continue.`,
        null, null, `Against 3-bets, lean toward fold or 4-bet. Calling builds a bloated OOP pot that's very hard to win.`);
    }
    if (playerAction === 'raise') {
      if (FOUR_BET_RANGES.value.has(hand)) {
        return good('4-Bet for Value!', `${hand} is a premium 4-bet. You're building a massive pot as a huge equity favourite — villain must fold, call committed, or 5-bet shove. Get the money in.`,
          null, null, `4-bet value range: AA/KK/QQ/AKs/AKo. These hands are too strong to fold to a 3-bet and too strong to just call.`);
      }
      if (FOUR_BET_RANGES.bluff.has(hand)) {
        return good('4-Bet Bluff!', `${hand} is a well-chosen 4-bet bluff — it holds an ace blocker (reducing villain's AA/AK combinations) and has reasonable equity when called. This is exactly the structure of a balanced 4-bet range.`,
          null, null, `4-bet bluff range: A5s/A4s (ace blockers + equity) and KQs. These hands make villain's strong range less likely while having outs if called.`);
      }
      return mistake('4-Bet Out of Range', `${hand} should not 4-bet here. 4-bet ranges are extremely narrow — only AA/KK/QQ/AKs/AKo for value and A5s/A4s/KQs as bluffs. ${hand} is either better played as a call (TT-QQ, AQs) or a fold. 4-betting it creates a bloated pot with a hand that's not strong enough to stack off and not structured for a bluff.`,
        'handCharts', `Review 4-Bet ranges in Hand Charts. 4-betting non-premium hands is a common but expensive mistake.`,
        '-1bb+', `4-bet or fold decisions: value 4-bet (AA/KK/QQ/AKs/AKo), bluff 4-bet (A5s/A4s/KQs), call (TT-QQ, AQs, KQs in position), fold everything else.`);
    }
    if (playerAction === 'call') {
      return minor('Calling a 3-Bet', `Calling a 3-bet with ${hand} creates a 3-bet pot with a lower SPR. Only do this IP with strong playable hands (TT-QQ, AQs, KQs, suited connectors).`,
        'handCharts', `Review "Calling a 3-Bet" in the Hand Charts. Only call 3-bets in position with hands that can play postflop.`,
        '-0.1bb', `Calling 3-bets OOP is a significant EV loss. IP with good hands, it's fine. OOP, fold or 4-bet.`);
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
  const boardTexture = getBoardTexture(community);

  // Board-pair equity is much lower than a real pair — everyone shares the pair.
  // Override approxEquity so pot-odds advice stays accurate.
  let equity = approxEquity(handCat, draws, community);
  if (rel === 'board_pair_top_kicker') equity = 40;
  else if (rel === 'board_pair_mid_kicker') equity = 30;
  else if (rel === 'board_pair_no_kicker') equity = 20;

  // Convenience: detect any board-pair scenario for shared messaging
  const isBoardPair = rel === 'board_pair_top_kicker' || rel === 'board_pair_mid_kicker' || rel === 'board_pair_no_kicker';
  const boardPairKickerDesc = rel === 'board_pair_top_kicker' ? 'A/K kicker' : rel === 'board_pair_mid_kicker' ? 'medium kicker' : 'low kicker';

  // Position context — drives fundamentally different advice
  const isIP  = ['BTN', 'CO', 'HJ'].includes(playerPosition);
  const posCtx = isIP ? 'in position (last to act)' : 'out of position';

  // ── Player checks when first to act ──
  if (playerAction === 'check' && !facingBet) {
    if (rel === 'nutted' || rel === 'very_strong') {
      return minor('Checking Strong Hand', `You checked with ${handDesc}. Slow-playing a strong hand can be fine occasionally for deception, but on a ${boardTexture.label} board, betting for value is usually better — especially if draws are present.`,
        'postflopTrainer', `Practice "Board Texture" scenarios in the Postflop Trainer. Learn when to slow-play vs. bet for protection.`,
        '-0.15bb', `Slowplaying on wet boards costs equity. Bet strong hands when the board is dynamic.`);
    }
    if ((rel === 'tptk' || rel === 'tpgk') && playerIsAggressor) {
      if (boardTexture.wet) {
        // IP or OOP: wet board + TPTK + aggressor → always a mistake to give free card
        return mistake('Check Behind on Wet Board', `Checking TPTK (${handDesc}) ${posCtx} on a wet board as the aggressor gives away free equity to flush and straight draws. Bet here — 50-66% pot charges the draws and protects your hand.`,
          'postflopTrainer', `Practice c-betting decisions in the Postflop Trainer. Wet boards require betting strong hands for protection regardless of position.`,
          '-0.3bb', `On wet boards, strong made hands need protection. Don't give free cards to flush/straight draws — even IP.`);
      }
      if (isIP) {
        // IP + dry board + TPTK: checking back is a deliberate balance/trap line — minor at worst
        return minor('Check-Back TPTK In Position', `Checking back TPTK ${posCtx} on a ${boardTexture.label} board is a valid balance move. You control the pot, see a free turn card, and can still bet/raise on later streets. C-betting 40-60% of the time is slightly more profitable, but this check is fine.`,
          null, null, `IP check-backs with TPTK balance your range — villain can't exploit you if you sometimes bet and sometimes check this hand. Just don't make it your default line.`);
      }
      return minor('Check with TPTK', `Checking TPTK ${posCtx} on a ${boardTexture.label} board. As the aggressor OOP, c-betting 50-70% of the time is more profitable — villain could bet behind and charge you for draws.`,
        null, null, `C-betting TPTK with a 33-50% sizing is standard OOP. Checking mixes your range but leaves you guessing on future streets.`);
    }
    if (rel === 'air' && playerIsAggressor) {
      if (boardTexture.dry) {
        return mistake('Missed C-Bet on Dry Board', `You have ${boardTexture.label} board and are the preflop aggressor. Even with nothing, this board favors your range — a 33% pot c-bet here folds out ~40% of villain's range immediately.`,
          'postflopTrainer', `Study Dry Board c-bet scenarios in the Postflop Trainer.`,
          '-0.25bb', `Dry boards are where the preflop raiser has range advantage. Small, frequent c-bets are highly profitable here.`);
      }
      return good('Checking Air on Wet Board', `Checking air on a ${boardTexture.label} board is correct. Your bluffs don't have enough fold equity here, and checking protects your range.`,
        null, null, `On wet boards, be selective with c-bets. Don't bluff into multiple draws — wait for better spots.`);
    }
    if (rel === 'solid' || rel === 'tptk' || rel === 'tpgk') {
      if (isIP) {
        return minor('Check-Back with Medium Hand', `Checking back ${handDesc} ${posCtx} is a valid pot-control line. You acted last this street — the pot stays small and you see a free card. Betting 40-55% pot was also fine to extract value, but this check is a reasonable balance move.`,
          null, null, `IP check-backs with medium-strong hands are normal: they protect against check-raise bluffs and keep your range balanced. Don't always bet — mixing in checks makes you harder to read.`);
      }
      return minor('Checking Medium-Strength Hand OOP', `Checking ${handDesc} ${posCtx} on the ${street} is a reasonable line. As the ${playerIsAggressor ? 'preflop aggressor' : 'caller'} OOP, consider whether villain will bet behind — if so, checking to induce is fine. If they check back, you gave up some value.`,
        null, null, `OOP pot-control with medium hands is valid, but don't overdo it — if you never bet these hands you become exploitable.`);
    }
    if (rel === 'middle_pair' || rel === 'bottom_pair') {
      if (isIP) {
        return good('Good Check-Back In Position', `Checking back ${handDesc} ${posCtx} is clean pot control. You see a free turn card, you still act last on future streets, and you avoid building a big pot with a vulnerable pair. This is the standard IP line with middle/bottom pair.`,
          null, null, `IP with middle/bottom pair: check back to keep the pot small and re-evaluate on the turn. You don't need to build a pot — let the turn card define your hand.`);
      }
      return good('Good Pot Control', `Checking ${handDesc} ${posCtx} on the ${street} is solid. With a vulnerable pair OOP, checking keeps the pot manageable and lets you act on more information.`,
        null, null, `OOP with middle/bottom pair: check and use pot odds to decide whether to call a bet. These hands are bluff catchers, not value hands.`);
    }
    if (rel === 'tp_weak') {
      return minor('Weak Top Pair — Check or Small Bet', `Top pair with a weak kicker (${handDesc}) is tricky. Checking is fine for pot control; a small bet (25-33% pot) is also reasonable to extract value from worse pairs. Just don't build a huge pot with it.`,
        null, null, null, `Weak top pair doesn't want a big pot. Keep sizing small or check — you're often in a thin value vs. bluff-catcher spot.`);
    }
    if (isBoardPair) {
      if (rel === 'board_pair_top_kicker') {
        return good('Good Check — Paired Board Kicker Battle', `The board is paired so everyone at the table shares that "pair." With your ${boardPairKickerDesc} you have an edge in kicker battles, but you don't have a real hand advantage. Checking to control the pot is correct — you want to get to showdown cheaply, not build a big pot.`,
          null, null, `On paired boards the pair belongs to everyone. Your A/K kicker wins kicker battles but loses badly to anyone who holds the paired rank (trips) or paired their hole card with the board. Keep the pot small.`);
      }
      return good('Correct Check — Board Pair is Shared', `The board is paired, meaning everyone has that pair — you're not ahead of the field. With a ${boardPairKickerDesc} you're at best winning a kicker battle. Checking to showdown or folding to aggression is the right approach.`,
        null, null, `Paired boards flatten hand values. Don't bet/call big with just a kicker — anyone holding the paired rank has trips and crushes you.`);
    }
    return good('Check is Fine', `Checking on the ${street} with ${handDesc} is a reasonable line. Not every hand needs to be bet — checking with marginal holdings controls pot size and can induce bluffs from worse hands.`,
      null, null, `Mixing checks into your range with medium hands makes you harder to read. TAG play means betting strong hands aggressively, but checking marginal ones is correct pot control.`);
  }

  // ── Player bets ──
  if ((playerAction === 'bet' || playerAction === 'raise') && !facingBet) {
    const betPct = raiseAmount ? Math.round((raiseAmount / pot) * 100) : 0;

    if (rel === 'nutted' || rel === 'very_strong') {
      const sizingFeedback = boardTexture.wet
        ? (betPct >= 60 ? 'Good large sizing on a wet board.' : 'Size up — use 67-100%+ on wet boards with the nuts.')
        : (betPct <= 50 ? 'Good small sizing on a dry board.' : 'Slight overbet — 33-50% is usually enough on dry boards.');
      return good('Value Bet with Strong Hand', `Betting ${handDesc} for value. ${sizingFeedback}`,
        null, null, `Value bet relentlessly with strong hands. Tailor sizing to board texture — small on dry, large on wet.`);
    }
    if (rel === 'tptk' || rel === 'tpgk') {
      return good('Value Bet TPTK', `C-betting ${handDesc} is correct. You have the best hand vs villain's range — charge them for draws and worse pairs.`,
        null, null, `TPTK is a value hand in most spots. Bet 40-60% pot to keep villain's range wide.`);
    }
    if (rel === 'air' || rel === 'weak_draw') {
      if (boardTexture.dry && playerIsAggressor) {
        return good('Well-Timed Bluff', `C-betting as a bluff on a ${boardTexture.label} board. Your range has advantage here — villain will fold often enough for this to profit.`,
          null, null, `C-bet bluffs work when: (1) you have range advantage, (2) board is dry, (3) you have fold equity. All boxes checked.`);
      }
      if (boardTexture.wet) {
        return minor('Bluffing on Wet Board', `Bluffing on a ${boardTexture.label} board is riskier. Villain's range connects here too, so fold equity is lower. Make sure you have a draw to fall back on.`,
          'postflopTrainer', `Study wet board decisions in the Postflop Trainer. Bluffs need equity backup on dynamic boards.`,
          '-0.15bb', `On wet boards, semi-bluff with draws — not pure air. "No equity bluffs" work best on dry boards.`);
      }
    }
    if (rel === 'strong_draw' || rel === 'combo_draw') {
      return good('Semi-Bluff with Draw!', `Betting a ${rel === 'combo_draw' ? 'combo draw' : 'strong draw'} is excellent. You have ~${equity}% equity — you can win immediately (folds) OR at showdown when you hit.`,
        null, null, `Semi-bluffs are the highest EV bluffs: you profit when they fold AND when you hit. Combo draws (flush+straight) have ~50%+ equity.`);
    }
    if (rel === 'solid' || rel === 'tptk' || rel === 'tpgk' || rel === 'tp_weak') {
      const sizing = betPct >= 66 ? 'large' : betPct >= 40 ? 'standard' : 'small';
      const sizingNote = betPct >= 66 ? 'Large sizing polarizes your range — make sure you can follow through on turns.' : betPct <= 30 ? 'Small sizing is fine to keep villain\'s range wide and extract thin value.' : '';
      return good(`Value Bet — ${handDesc}`, `Betting your ${handDesc} for value is correct. Your hand likely beats villain's calling range. ${sizingNote}`.trim(),
        null, null, `Bet made hands for value on most boards. ${boardTexture.wet ? 'On this wet board, consider sizing up to charge draws.' : 'On this dry board, a smaller sizing keeps villain calling with more of their range.'}`);
    }
    if (rel === 'middle_pair' || rel === 'bottom_pair') {
      if (isIP) {
        return minor('Thin Bet In Position', `Betting ${handDesc} ${posCtx} is risky — villain's calling range has you beat much of the time. Since you acted last, you could have checked back for free to see the next card and re-evaluate. A check-back IP with middle/bottom pair is usually higher EV: it keeps the pot small, gives you a free card to improve, and lets you make a better decision on the turn.`,
          'postflopTrainer', `Study middle pair decisions in the Postflop Trainer. IP with a vulnerable pair, the default is check-back — not bet.`,
          '-0.1bb', `IP + middle/bottom pair = check back. You have positional control, so use it. Save bets for hands that actually want a big pot.`);
      }
      return minor('Thin Value / Risky Bet', `Betting ${handDesc} ${posCtx} is thin. You may be value-betting into hands that beat you while the hands you beat fold. OOP with a vulnerable pair, checking is usually better — it keeps the pot small and you can call a reasonable bet if villain stabs.`,
        'postflopTrainer', `Work on hand-strength evaluation in the Postflop Trainer. OOP with middle/bottom pair, checking is the default.`,
        '-0.1bb', `OOP + middle/bottom pair: check to control pot size, then use pot odds to decide whether to call. Don't lead bet — you're in a difficult spot if raised.`);
    }
    if (isBoardPair) {
      if (rel === 'board_pair_top_kicker') {
        return minor('Over-Betting a Paired Board', `The board pair belongs to everyone — you don't have a real made hand, just a ${boardPairKickerDesc} in a kicker battle. Betting here builds a pot where you lose to any opponent who holds the paired rank (trips beats you badly) and only beats hands with a worse kicker. A small stab (25-33% pot) is the most you should risk; prefer checking.`,
          'postflopTrainer', `Study paired board scenarios in the Postflop Trainer. Kicker battles on paired boards should be played in small pots.`,
          '-0.15bb', `On a paired board, your "top pair" is an illusion — it's shared by the whole table. Size down or check.`);
      }
      return mistake('Betting Dead Money on Paired Board', `The board pair is shared by all players. With only a ${boardPairKickerDesc}, you're effectively bluffing with minimal equity — you lose to trips, any better kicker, and likely most of villain's calling range. Check instead and get to showdown cheaply.`,
        'postflopTrainer', `Practice paired board decisions in the Postflop Trainer. The board pair is not your pair.`,
        '-0.2bb', `Paired boards require real hand improvement (trips, full house, strong kicker) to bet for value. With just a weak kicker, you're investing chips with almost no value advantage.`);
    }
    return good('Bet is Reasonable', `Betting on the ${street} with ${handDesc} takes the initiative. Make sure you have a clear reason — value (you beat villain's call range) or a semi-bluff with equity to fall back on.`,
      null, null, `Every bet should have a purpose: value (bet to be called by worse) or bluff (bet to fold out better). If neither applies, check instead.`);
  }

  // ── Player calls a bet ──
  if (playerAction === 'call' && facingBet) {
    const potOddsVal = potOddsHelper(callAmount, pot);
    const needsPct = Math.round(callAmount / (pot + callAmount) * 100);

    if (equity >= needsPct + 5) {
      const raiseNote = isIP && (rel === 'tptk' || rel === 'tpgk' || rel === 'solid' || rel === 'strong')
        ? ' Since you\'re in position with a strong hand, raising for value is also worth considering.'
        : '';
      return good('Profitable Call', `Your equity (~${equity}%) exceeds the pot odds needed (~${needsPct}%). This is a +EV call.${raiseNote}`,
        null, null, `Pot Odds formula: Call / (Call + Total Pot). If your equity > pot odds needed, call. ${isIP ? 'IP calls realize more equity — you act last on every future street.' : 'OOP calls need a higher equity cushion to account for positional disadvantage.'}`);
    }
    if (equity >= needsPct - 5) {
      return minor('Break-Even Call', `Your equity (~${equity}%) is roughly equal to the pot odds needed (~${needsPct}%). This is a marginal call. ${isIP ? 'Being in position improves your equity realization — lean toward calling since you can make better decisions on later streets.' : 'OOP these spots are closer to folds — you\'ll face more difficult decisions on future streets.'}`,
        'mathDrills', `Practice Pot Odds drills in Math Drills to sharpen these calculations at the table.`,
        '~0bb', `Break-even calls: IP = lean call (positional advantage improves equity realization). OOP = lean fold (harder to realize equity).`);
    }
    if (isBoardPair) {
      const boardPairNeedsPct = Math.round(callAmount / (pot + callAmount) * 100);
      if (rel === 'board_pair_top_kicker') {
        if (equity >= boardPairNeedsPct) {
          return minor('Thin Call on Paired Board', `With a ${boardPairKickerDesc} on a paired board you're calling a kicker battle — you can beat worse kickers but lose to trips and better kickers. Your ~${equity}% equity roughly meets pot odds here, but be cautious: be ready to give up on most runouts.`,
            null, null, `Board pair calls with A/K kicker are breakeven at best. Villain's betting range likely includes trips (which crushes you) more often than you'd like.`);
        }
        return mistake('Over-Calling Paired Board', `The board pair belongs to everyone. You have a ${boardPairKickerDesc} advantage, but villain's bet range includes trips that have you drawing thin. With ~${equity}% equity needing ~${boardPairNeedsPct}%, this call is -EV.`,
          'mathDrills', `Practice pot odds on paired board scenarios. The board pair inflates your apparent hand strength but not your real equity.`,
          `-0.2bb`, `On paired boards: call small bets with a top kicker, fold to large bets — you can't build a big pot when you might be drawing to just 3 outs.`);
      }
      return mistake('Calling with Shared Pair', `The board pair is everyone's pair. With a ${boardPairKickerDesc} you're ~${equity}% equity — this call needs ~${boardPairNeedsPct}%. You lose to trips, any better kicker, and most value-betting ranges. Fold.`,
        'mathDrills', `Study paired board pot odds in Math Drills. Board pairs create kicker-dominated spots that look better than they are.`,
        `-0.25bb`, `Paired board + weak kicker = bluff catcher at best. Fold to significant bets; calling builds a pot you almost never win outright.`);
    }
    if (rel === 'air' || rel === 'bottom_pair') {
      return bigMistake('Calling with No Equity', `Villain bet ${villainBetPct || '?'}% pot. You needed ~${needsPct}% equity to call. With ${handDesc}, you have ~${equity}%. This is a significantly losing call.`,
        'mathDrills', `Work on Pot Odds + MDF drills in Math Drills. Practice folding to bets when equity doesn't justify calling.`,
        `-${Math.round((needsPct - equity) / 20 * 100) / 100}bb`, `MDF principle: You DON'T have to call every bet. Fold when equity < pot odds needed.`);
    }
    return minor('Marginal Call', `With ${handDesc} (~${equity}% equity) you needed ~${needsPct}% to call. This is slightly -EV. ${isIP ? 'Being in position helps equity realization, so this call is closer than it looks — but be ready to fold to heavy turn action.' : 'OOP these marginal spots should lean toward folds — you\'ll face difficult decisions on later streets without the last-action advantage.'}`,
      'mathDrills', `Refine pot odds calculations in Math Drills.`,
      '-0.1bb', `${isIP ? 'IP: marginal calls are defensible because positional advantage helps you realize equity.' : 'OOP: marginal calls become losing calls over time. Tighten up.'}`);
  }

  // ── Player folds to a bet ──
  if (playerAction === 'fold' && facingBet) {
    const potOddsVal = potOddsHelper(callAmount, pot);
    const needsPct = Math.round(callAmount / (pot + callAmount) * 100);

    if (equity > needsPct + 10) {
      return mistake('Over-Folding — You Had Equity!', `You folded ${handDesc} (~${equity}% equity) but only needed ~${needsPct}% to call profitably. This fold cost you EV.`,
        'mathDrills', `Practice Pot Odds and MDF drills. Learning when folding is too tight is as important as knowing when to fold weak hands.`,
        `-${Math.round((equity - needsPct) / 15 * 100) / 100}bb`, `MDF tells you how often you MUST defend. Over-folding lets opponents bluff any two cards profitably against you.`);
    }
    if (isBoardPair) {
      const boardPairFoldNeedsPct = Math.round(callAmount / (pot + callAmount) * 100);
      if (equity > boardPairFoldNeedsPct + 8 && rel === 'board_pair_top_kicker') {
        return minor('Marginal Fold on Paired Board', `You folded with a ${boardPairKickerDesc} on a paired board (~${equity}% equity vs ~${boardPairFoldNeedsPct}% needed). The pot odds were close. Against a small bet, calling to win kicker battles is defensible — but folding to larger sizing is correct because villain's range includes trips.`,
          null, null, `On paired boards: call small bets with top kicker, fold medium/large bets. The board pair flattens your equity advantage.`);
      }
      return good('Correct Fold on Paired Board', `Good discipline. The board pair belongs to everyone — with only a ${boardPairKickerDesc} you're in a kicker battle that easily loses to trips or better kickers. Folding to aggression here saves chips.`,
        null, null, `Paired boards punish players who over-value their kicker. Trips (a single card held matching the board pair) crush any kicker hand.`);
    }
    if (rel === 'nutted' || rel === 'very_strong') {
      return bigMistake('Folding a Strong Hand!', `You folded ${handDesc} — a very strong holding! Never fold the nuts or near-nuts. Villain is betting; you should raise or call.`,
        'postflopTrainer', `Review Hand Strength scenarios in the Postflop Trainer. Practice recognizing when you have a monster.`,
        '-2bb+', `This is one of the biggest mistakes in poker — folding strong hands. Bet/call with all hands in the top 10% of your range.`);
    }
    if (rel === 'strong_draw' || rel === 'combo_draw') {
      return mistake('Folding a Strong Draw', `You folded with ${draws.join(' + ')}. A ${rel === 'combo_draw' ? 'combo draw' : 'flush/straight draw'} has ~${equity}% equity — enough to call or raise here.`,
        'postflopTrainer', `Practice draw decisions in the Postflop Trainer. Combo draws are often semi-bluff raises, not folds.`,
        '-0.4bb', `Strong draws (flush draw, OESD) have 30-50%+ equity. Never fold them to a single bet unless the sizing is huge relative to stack.`);
    }
    return good('Correct Fold', `You folded ${handDesc} with ~${equity}% equity vs. a pot requiring ~${needsPct}%. Good discipline — don't call bets you can't beat.`,
      null, null, `TAG Principle: Folding weak hands to aggression protects your bankroll. Every saved bet is profit.`);
  }

  // ── Player raises a bet (check-raise) ──
  if (playerAction === 'raise' && facingBet) {
    if (rel === 'nutted' || rel === 'very_strong' || rel === 'strong') {
      return good('Value Check-Raise!', `Excellent! Check-raising ${handDesc} builds a large pot with the best hand. This is how you maximize value from strong holdings.`,
        null, null, `Check-raises with strong hands are one of the highest EV plays in poker. They force villain to either pay a big price or fold.`);
    }
    if (rel === 'combo_draw' || rel === 'strong_draw') {
      return good('Semi-Bluff Check-Raise!', `Check-raising with a ${rel === 'combo_draw' ? 'combo draw (~50% equity)' : 'strong draw (~35% equity)'} is a powerful play. You generate immediate fold equity AND have strong equity when called.`,
        null, null, `Semi-bluff check-raises are the highest EV plays with drawing hands. Standard size: 2.5-3x the bet.`);
    }
    if (rel === 'air' || rel === 'bottom_pair') {
      return minor('Bluff Check-Raise', `Check-raising with ${handDesc} as a bluff. This can work, but make sure: (1) you have blockers to strong hands, (2) villain can fold, (3) board texture favors you.`,
        'postflopTrainer', `Study bluff check-raise spots in the Postflop Trainer and Hand Charts.`,
        '-0.1bb', `Bluff check-raises need fold equity. They're most effective on boards where your range is strong and villain has many mediocre hands.`);
    }
    if (rel === 'tptk' || rel === 'tpgk' || rel === 'solid') {
      return good('Check-Raise for Value', `Check-raising ${handDesc} builds the pot with a strong holding. This is a valid value line — you induce a bet then raise to get more money in as a favorite.`,
        null, null, `Check-raising strong-but-not-nutted hands like TPTK is an advanced line. It balances your check-raise range (not just draws and nuts) and extracts max value.`);
    }
    if (rel === 'middle_pair' || rel === 'tp_weak') {
      return minor('Check-Raise with Vulnerable Hand', `Check-raising ${handDesc} is aggressive. Your hand has value but is also vulnerable — if called, you could be behind or face tough decisions. Make sure villain's folding range is wide enough to justify the risk.`,
        'postflopTrainer', `Study check-raise sizing and spot selection in the Postflop Trainer.`,
        '-0.1bb', `Don't build huge pots with middle pair or weak top pair unless the SPR is very low. These hands prefer smaller pots.`);
    }
    if (isBoardPair) {
      return mistake('Check-Raise on Paired Board with Weak Hand', `Check-raising on a paired board with only a ${boardPairKickerDesc} is a significant over-bluff. You have ~${equity}% equity — if called, you're almost certainly behind. On paired boards, villain's betting and calling range is heavily weighted toward trips (one card that matches the board pair). Fold or call small; do not raise.`,
        'postflopTrainer', `Study paired board aggression in the Postflop Trainer. Check-raises need real equity.`,
        '-0.4bb', `Bluff check-raises on paired boards fail: villain's range that bets AND calls a raise is trip-heavy. Your kicker can't win those showdowns.`);
    }
    return minor('Check-Raise — Verify Your Reasoning', `You check-raised on the ${street} with ${handDesc}. Check-raises commit more money — be sure you're doing it for value (you beat villain's betting range) or as a semi-bluff (strong draw). Avoid check-raising purely to "see where you're at."`,
      'postflopTrainer', `Review check-raise criteria in the Postflop Trainer.`,
      null, `Check-raises say "I have a very strong hand or a very strong draw." Make sure your hand fits one of those categories.`);
  }

  // ── All-in ──
  if (playerAction === 'allin') {
    const spr = effectiveStack / pot;
    if (isBoardPair) {
      return bigMistake('Jamming a Paired Board with Kicker', `Going all-in with only a ${boardPairKickerDesc} on a paired board is a major mistake. The board pair belongs to everyone — your hand is a kicker at best. Anyone calling your jam holds trips or a better kicker and you're a large underdog. Even at low SPR, this hand does not justify stacking off.`,
        'mathDrills', `Review SPR and commitment thresholds in Math Drills. Paired boards require trips or better to stack off.`,
        `-${(spr * 0.6).toFixed(1)}bb`, `Paired board jam threshold: trips or better only. A kicker advantage alone is never worth your stack.`);
    }
    if (spr <= 2 && (rel === 'tptk' || rel === 'tpgk' || rel === 'nutted' || rel === 'very_strong' || rel === 'strong')) {
      return good('Correct Jam!', `With SPR <= 2, you're committed with ${handDesc}. Jamming is the right play — get the money in as a favorite.`,
        null, null, `SPR under 2 = committed. Any top pair or better is a jam at low SPR.`);
    }
    if (spr > 4 && (rel === 'air' || rel === 'bottom_pair')) {
      return bigMistake('Overcommitting with Weak Hand', `Jamming ${handDesc} at SPR ${spr.toFixed(1)} is a massive mistake. You're risking many BBs with a hand that rarely wins at showdown.`,
        'mathDrills', `Study the SPR chart in Math Drills and Hand Charts. Learn commitment thresholds for every hand type.`,
        '-3bb+', `SPR principle: High SPR = need premium hands to stack off. Low SPR = lower threshold. Never jam air at deep stacks.`);
    }
    if (rel === 'nutted' || rel === 'very_strong') {
      return good('Value Jam!', `Jamming with ${handDesc} is correct. Maximum value with a dominant hand.`,
        null, null, `Nut hands jam or call jams at any SPR. Get the money in when you're a massive favorite.`);
    }
    return minor('All-In Decision', `Jamming with ${handDesc} at SPR ${spr.toFixed(1)}. Make sure the SPR justifies committing your stack — refer to the SPR guide in Hand Charts.`,
      'handCharts', `Review the SPR table in Hand Charts -> Math Tables.`,
      null, `SPR guide: Stack off with TPTK at SPR <= 3, two-pair at SPR <= 6, sets at any SPR.`);
  }

  const actionWord = playerAction === 'check' ? 'checked' : playerAction === 'call' ? 'called' : playerAction === 'bet' ? 'bet' : playerAction === 'raise' ? 'raised' : playerAction;
  return minor(`${handDesc} on ${street.charAt(0).toUpperCase() + street.slice(1)}`, `You ${actionWord} with ${handDesc} (~${equity}% equity) on a ${boardTexture.label} board. Think about whether your hand is strong enough to bet for value, weak enough to check/fold, or a draw worth semi-bluffing. Every action should fit one of those categories.`,
    'postflopTrainer', `Work through postflop scenarios to sharpen hand-strength decisions.`,
    null, `Postflop decision tree: (1) Strong hand -> bet/raise for value. (2) Draw -> semi-bluff. (3) Air -> bluff only with fold equity. (4) Marginal hand -> check to control pot size.`);
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

export const MODULE_NAMES = {
  preflopTrainer:  'Preflop Trainer',
  postflopTrainer: 'Postflop Trainer',
  mathDrills:      'Math Drills',
  handCharts:      'Hand Charts',
  handReadingQuiz: 'Hand Reading Quiz',
};
