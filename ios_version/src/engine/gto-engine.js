// GTO Poker Training Engine — ES Module
// Based on solver approximations (GTO Wizard / PioSolver, 8-max 100bb with ante)

// ── Section 1: Constants & Utilities ──────────────────────────

const RANK_VALUE = { A:14, K:13, Q:12, J:11, T:10, 9:9, 8:8, 7:7, 6:6, 5:5, 4:4, 3:3, 2:2 };
const SUITS_REF  = ['s','h','d','c'];
export const POSITIONS = ['UTG','HJ','CO','BTN','SB','BB'];

const COMBOS = { pair: 6, suited: 4, offsuit: 12 };
export const TOTAL_COMBOS = 1326;

export function parseCard(cardStr) {
  if (!cardStr || cardStr.length !== 2) throw new Error(`Invalid card: "${cardStr}"`);
  const rank = cardStr[0].toUpperCase();
  const suit  = cardStr[1].toLowerCase();
  if (!RANK_VALUE[rank]) throw new Error(`Invalid rank: "${rank}"`);
  if (!SUITS_REF.includes(suit)) throw new Error(`Invalid suit: "${suit}"`);
  return { rank, suit, value: RANK_VALUE[rank] };
}

export function canonicalizeHand(c1Str, c2Str) {
  const c1 = parseCard(c1Str), c2 = parseCard(c2Str);
  const [hi, lo] = c1.value >= c2.value ? [c1, c2] : [c2, c1];
  if (hi.rank === lo.rank) return `${hi.rank}${lo.rank}`;
  return `${hi.rank}${lo.rank}${hi.suit === lo.suit ? 's' : 'o'}`;
}

export function getComboCount(handStr) {
  if (handStr.length === 2) return COMBOS.pair;
  if (handStr.endsWith('s')) return COMBOS.suited;
  if (handStr.endsWith('o')) return COMBOS.offsuit;
  throw new Error(`Cannot determine hand type: "${handStr}"`);
}

function round(n, decimals = 4) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

// ── Section 2: Core GTO Math ───────────────────────────────────

export const MATH = {
  // Required equity to call: call / (pot + villainBet + call)
  potOdds(call, pot, villainBet = null) {
    const vb = villainBet !== null ? villainBet : call;
    if (call <= 0) throw new Error('Call must be positive');
    return round(call / (pot + vb + call));
  },

  // Min fold% for 0-equity bluff to break even: bet / (pot + bet)
  alpha(bet, pot) {
    if (bet <= 0) throw new Error('Bet must be positive');
    return round(bet / (pot + bet));
  },

  // Min defense fraction to deny auto-profit bluffs: pot / (pot + bet)
  // NOTE: signature is mdf(bet, pot) — bet first
  mdf(bet, pot) {
    if (bet <= 0) throw new Error('Bet must be positive');
    return round(pot / (pot + bet));
  },

  // GTO bluff fraction of betting range = villain's pot odds = bet / (pot + 2*bet)
  riverBluffFrequency(bet, pot) {
    if (bet <= 0) throw new Error('Bet must be positive');
    const bluffFreq  = round(bet / (pot + 2 * bet));
    const valueFreq  = round(1 - bluffFreq);
    const ratioValue = round(valueFreq / bluffFreq, 2);
    return { bluffFreq, valueFreq, ratio: `${ratioValue}:1 value-to-bluff` };
  },

  evBet(foldFreq, equity, pot, bet) {
    if (foldFreq < 0 || foldFreq > 1) throw new Error('foldFreq must be in [0,1]');
    if (equity < 0 || equity > 1) throw new Error('equity must be in [0,1]');
    const evFold = foldFreq * pot;
    const evCall = (1 - foldFreq) * (equity * (pot + bet) - (1 - equity) * bet);
    return round(evFold + evCall);
  },

  evBluff(foldFreq, pot, bet) {
    if (foldFreq < 0 || foldFreq > 1) throw new Error('foldFreq must be in [0,1]');
    return round(foldFreq * pot - (1 - foldFreq) * bet);
  },

  evCall(equity, pot, villainBet, call = null) {
    const callAmt = call !== null ? call : villainBet;
    if (equity < 0 || equity > 1) throw new Error('equity must be in [0,1]');
    return round(equity * (pot + villainBet + callAmt) - callAmt);
  },

  evCheckBack(equity, pot) {
    return round(equity * pot);
  },

  spr(effectiveStack, pot) {
    if (pot <= 0) throw new Error('Pot must be positive');
    return round(effectiveStack / pot);
  },

  sprGuidance(sprValue) {
    if (sprValue < 2)  return { threshold: 'Very Low (<2)',   guidance: 'Very low SPR: commit stack with top pair or better. Implied odds are minimal.',                        commitHands: ['Top pair any kicker','Two pair','Sets','Straights','Flushes'] };
    if (sprValue < 4)  return { threshold: 'Low (2–4)',       guidance: 'Low SPR: commit with TPGK or better. Weak top pair requires caution.',                                commitHands: ['Top pair good kicker+','Two pair','Sets','OESD+FD combo'] };
    if (sprValue < 8)  return { threshold: 'Medium (4–8)',    guidance: 'Medium SPR: two pair or better for full commitment. TPGK can take 2 streets.',                       commitHands: ['Strong TPGK (AK on A-high)','Two pair','Sets','Nut flush draw'] };
    if (sprValue < 13) return { threshold: 'High (8–13)',     guidance: 'High SPR: two pair or better typically required to commit. Strong implied odds for draws.',           commitHands: ['Two pair','Sets','Straights','Flushes'] };
    return              { threshold: 'Very High (>13)',        guidance: 'Very high SPR: strong made hands + strong draws with implied odds. Singles rarely committable.',      commitHands: ['Sets','Strong two pair','Straights','Flushes','Nut flush draw (implied)'] };
  },

  // Min fold% where betting > checking given equity: bet(1−2e) / (pot(1−e) + bet(1−2e))
  breakevenFoldEquity(equity, pot, bet) {
    if (equity < 0 || equity > 1) throw new Error('equity must be in [0,1]');
    const num = bet * (1 - 2 * equity);
    const den = pot * (1 - equity) + bet * (1 - 2 * equity);
    if (Math.abs(den) < 1e-9) return 0;
    return round(Math.max(0, num / den));
  },

  betSizingTable(pot = 100) {
    const sizes = [
      { label: '25% pot',  bet: pot * 0.25 },
      { label: '33% pot',  bet: pot * 0.33 },
      { label: '50% pot',  bet: pot * 0.50 },
      { label: '67% pot',  bet: pot * 0.67 },
      { label: '75% pot',  bet: pot * 0.75 },
      { label: '100% pot', bet: pot * 1.00 },
      { label: '125% pot', bet: pot * 1.25 },
      { label: '150% pot', bet: pot * 1.50 },
      { label: '200% pot', bet: pot * 2.00 },
    ];
    return sizes.map(({ label, bet }) => {
      const { bluffFreq, valueFreq, ratio } = this.riverBluffFrequency(bet, pot);
      return {
        label, bet: round(bet, 2),
        potOdds:          round(this.potOdds(bet, pot) * 100, 1) + '%',
        alpha:            round(this.alpha(bet, pot) * 100, 1) + '%',
        mdf:              round(this.mdf(bet, pot) * 100, 1) + '%',
        bluffFreqInRange: round(bluffFreq * 100, 1) + '%',
        valueFreqInRange: round(valueFreq * 100, 1) + '%',
        ratio,
      };
    });
  },
};

// ── Section 3: Preflop GTO Range Data ─────────────────────────
// Mixed frequencies: 1.0 = always raise, 0.0 = never raise, in-between = mixed

const GTO_OPEN_RANGES = {
  UTG: {
    AA:1.0, KK:1.0, QQ:1.0, JJ:1.0, TT:1.0,
    '99':1.0,'88':1.0,'77':1.0,'66':0.60,'55':0.25,'44':0.0,'33':0.0,'22':0.0,
    AKs:1.0, AQs:1.0, AJs:1.0, ATs:1.0, A9s:0.45, A8s:0.25,
    A7s:0.0, A6s:0.0, A5s:0.40, A4s:0.25, A3s:0.0, A2s:0.0,
    KQs:1.0, KJs:0.80, KTs:0.55, K9s:0.25, K8s:0.0, K7s:0.0, K6s:0.0, K5s:0.0, K4s:0.0, K3s:0.0, K2s:0.0,
    QJs:1.0, QTs:0.65, Q9s:0.20, Q8s:0.0,
    JTs:1.0, J9s:0.30, J8s:0.0,
    T9s:0.45, T8s:0.0,
    '98s':0.25,'87s':0.0,'76s':0.0,'65s':0.0,'54s':0.0,'43s':0.0,'32s':0.0,
    AKo:1.0, AQo:1.0, AJo:0.65, ATo:0.25, A9o:0.0,
    KQo:1.0, KJo:0.30, KTo:0.0,
    QJo:0.15, QTo:0.0,
    JTo:0.10,
  },
  HJ: {
    AA:1.0, KK:1.0, QQ:1.0, JJ:1.0, TT:1.0,
    '99':1.0,'88':1.0,'77':1.0,'66':1.0,'55':0.75,'44':0.35,'33':0.15,'22':0.0,
    AKs:1.0, AQs:1.0, AJs:1.0, ATs:1.0, A9s:0.80, A8s:0.55,
    A7s:0.30, A6s:0.15, A5s:0.80, A4s:0.65, A3s:0.35, A2s:0.15,
    KQs:1.0, KJs:1.0, KTs:0.90, K9s:0.55, K8s:0.20, K7s:0.0, K6s:0.0,
    QJs:1.0, QTs:0.95, Q9s:0.55, Q8s:0.15,
    JTs:1.0, J9s:0.70, J8s:0.20,
    T9s:0.85, T8s:0.30,
    '98s':0.70,'97s':0.20,'87s':0.50,'76s':0.20,'65s':0.0,
    AKo:1.0, AQo:1.0, AJo:1.0, ATo:0.75, A9o:0.30, A8o:0.0,
    KQo:1.0, KJo:0.85, KTo:0.40, K9o:0.0,
    QJo:0.60, QTo:0.20,
    JTo:0.45, J9o:0.0,
  },
  CO: {
    AA:1.0, KK:1.0, QQ:1.0, JJ:1.0, TT:1.0,
    '99':1.0,'88':1.0,'77':1.0,'66':1.0,'55':1.0,'44':0.80,'33':0.55,'22':0.30,
    AKs:1.0, AQs:1.0, AJs:1.0, ATs:1.0, A9s:1.0, A8s:0.90,
    A7s:0.70, A6s:0.55, A5s:1.0, A4s:0.90, A3s:0.75, A2s:0.55,
    KQs:1.0, KJs:1.0, KTs:1.0, K9s:0.90, K8s:0.65, K7s:0.40, K6s:0.20, K5s:0.0,
    QJs:1.0, QTs:1.0, Q9s:0.90, Q8s:0.55, Q7s:0.20,
    JTs:1.0, J9s:0.95, J8s:0.60, J7s:0.20,
    T9s:1.0, T8s:0.80, T7s:0.25,
    '98s':1.0,'97s':0.65,'96s':0.15,'87s':0.90,'86s':0.30,'76s':0.70,'75s':0.20,'65s':0.50,'54s':0.25,
    AKo:1.0, AQo:1.0, AJo:1.0, ATo:1.0, A9o:0.70, A8o:0.35, A7o:0.0,
    KQo:1.0, KJo:1.0, KTo:0.80, K9o:0.30, K8o:0.0,
    QJo:0.90, QTo:0.60, Q9o:0.20,
    JTo:0.80, J9o:0.40, J8o:0.0,
    T9o:0.45, T8o:0.0,
  },
  BTN: {
    AA:1.0, KK:1.0, QQ:1.0, JJ:1.0, TT:1.0,
    '99':1.0,'88':1.0,'77':1.0,'66':1.0,'55':1.0,'44':1.0,'33':1.0,'22':0.95,
    AKs:1.0, AQs:1.0, AJs:1.0, ATs:1.0, A9s:1.0, A8s:1.0,
    A7s:1.0, A6s:1.0, A5s:1.0, A4s:1.0, A3s:1.0, A2s:1.0,
    KQs:1.0, KJs:1.0, KTs:1.0, K9s:1.0, K8s:1.0, K7s:0.90, K6s:0.75, K5s:0.55, K4s:0.35, K3s:0.20, K2s:0.0,
    QJs:1.0, QTs:1.0, Q9s:1.0, Q8s:0.90, Q7s:0.70, Q6s:0.45, Q5s:0.20,
    JTs:1.0, J9s:1.0, J8s:0.95, J7s:0.65, J6s:0.25,
    T9s:1.0, T8s:1.0, T7s:0.75, T6s:0.30,
    '98s':1.0,'97s':0.95,'96s':0.55,'95s':0.20,
    '87s':1.0,'86s':0.75,'85s':0.30,
    '76s':1.0,'75s':0.65,'74s':0.20,
    '65s':0.90,'64s':0.40,
    '54s':0.80,'53s':0.30,
    '43s':0.50,'42s':0.0,'32s':0.25,
    AKo:1.0, AQo:1.0, AJo:1.0, ATo:1.0, A9o:1.0, A8o:0.90,
    A7o:0.75, A6o:0.55, A5o:0.40, A4o:0.25, A3o:0.10, A2o:0.0,
    KQo:1.0, KJo:1.0, KTo:1.0, K9o:0.90, K8o:0.65, K7o:0.35, K6o:0.15, K5o:0.0,
    QJo:1.0, QTo:1.0, Q9o:0.80, Q8o:0.45, Q7o:0.15,
    JTo:1.0, J9o:0.90, J8o:0.60, J7o:0.20,
    T9o:0.80, T8o:0.55, T7o:0.20,
    '98o':0.65,'97o':0.30,'87o':0.40,'86o':0.15,'76o':0.25,'65o':0.15,
  },
  SB: {
    AA:1.0, KK:1.0, QQ:1.0, JJ:1.0, TT:1.0,
    '99':1.0,'88':1.0,'77':1.0,'66':1.0,'55':1.0,'44':0.95,'33':0.85,'22':0.75,
    AKs:1.0, AQs:1.0, AJs:1.0, ATs:1.0, A9s:1.0, A8s:1.0,
    A7s:0.95, A6s:0.85, A5s:1.0, A4s:0.95, A3s:0.85, A2s:0.70,
    KQs:1.0, KJs:1.0, KTs:1.0, K9s:0.95, K8s:0.80, K7s:0.60, K6s:0.40, K5s:0.20, K4s:0.0,
    QJs:1.0, QTs:1.0, Q9s:0.95, Q8s:0.75, Q7s:0.45, Q6s:0.15,
    JTs:1.0, J9s:1.0, J8s:0.85, J7s:0.50, J6s:0.15,
    T9s:1.0, T8s:0.95, T7s:0.60, T6s:0.20,
    '98s':1.0,'97s':0.80,'96s':0.35,'87s':0.95,'86s':0.55,'76s':0.85,'75s':0.45,'65s':0.70,'64s':0.25,'54s':0.55,'53s':0.20,'43s':0.30,
    AKo:1.0, AQo:1.0, AJo:1.0, ATo:1.0, A9o:0.90, A8o:0.75,
    A7o:0.55, A6o:0.35, A5o:0.25, A4o:0.10, A3o:0.0,
    KQo:1.0, KJo:1.0, KTo:0.95, K9o:0.75, K8o:0.45, K7o:0.20, K6o:0.0,
    QJo:1.0, QTo:0.90, Q9o:0.65, Q8o:0.30, Q7o:0.0,
    JTo:0.95, J9o:0.75, J8o:0.40, J7o:0.10,
    T9o:0.70, T8o:0.40, T7o:0.10,
    '98o':0.55,'97o':0.20,'87o':0.30,'76o':0.15,
  },
};

const GTO_3BET_RANGES = {
  // [3bet_freq, call_freq]; fold = 1 − sum
  BTN_vs_CO: {
    AA:[1.0,0.0], KK:[1.0,0.0], QQ:[1.0,0.0], JJ:[0.70,0.30], AKs:[1.0,0.0], AKo:[1.0,0.0],
    TT:[0.30,0.70], AQs:[0.80,0.20], AQo:[0.35,0.65], AJs:[0.30,0.70], KQs:[0.25,0.75],
    A5s:[0.75,0.0], A4s:[0.65,0.0], A3s:[0.50,0.0], A2s:[0.30,0.0],
    '76s':[0.35,0.0],'65s':[0.30,0.0],'54s':[0.25,0.0],'87s':[0.25,0.0],'75s':[0.20,0.0],
  },
  SB_vs_BTN: {
    AA:[1.0,0.0], KK:[1.0,0.0], QQ:[1.0,0.0], JJ:[0.80,0.20], TT:[0.40,0.60],
    AKs:[1.0,0.0], AKo:[1.0,0.0], AQs:[0.70,0.30], AQo:[0.30,0.70],
    AJs:[0.25,0.75], KQs:[0.20,0.80],
    A5s:[0.90,0.0], A4s:[0.80,0.0], A3s:[0.65,0.0], A2s:[0.50,0.0],
    '54s':[0.40,0.0],'65s':[0.45,0.0],'76s':[0.50,0.0],'87s':[0.35,0.0],
    K5s:[0.25,0.0], K4s:[0.20,0.0],
  },
  BB_vs_BTN: {
    AA:[1.0,0.0], KK:[1.0,0.0], QQ:[0.85,0.15], JJ:[0.50,0.50], TT:[0.20,0.80], '99':[0.0,1.0],
    AKs:[1.0,0.0], AKo:[0.90,0.10], AQs:[0.60,0.40], AQo:[0.20,0.80], AJs:[0.15,0.85], ATs:[0.0,1.0],
    KQs:[0.15,0.85],
    A5s:[0.55,0.0], A4s:[0.50,0.0], A3s:[0.40,0.0], A2s:[0.30,0.0],
    '54s':[0.30,0.0],'65s':[0.35,0.0],'76s':[0.30,0.0],'75s':[0.20,0.0],'86s':[0.15,0.0],
  },
};

const BB_DEFENSE_VS_OPEN = {
  UTG: { total_defend: 0.45, three_bet: 0.04, call: 0.41 },
  HJ:  { total_defend: 0.50, three_bet: 0.05, call: 0.45 },
  CO:  { total_defend: 0.55, three_bet: 0.07, call: 0.48 },
  BTN: { total_defend: 0.62, three_bet: 0.09, call: 0.53 },
  SB:  { total_defend: 0.72, three_bet: 0.11, call: 0.61 },
};

export const RANGES = { GTO_OPEN_RANGES, GTO_3BET_RANGES, BB_DEFENSE_VS_OPEN };

// ── Section 4: Board Texture Analyzer ─────────────────────────

export const BOARD = {
  parseBoard(cards) {
    if (!Array.isArray(cards) || cards.length < 3 || cards.length > 5)
      throw new Error('Board must have 3–5 cards');
    return cards.map(parseCard);
  },

  flushTexture(parsed) {
    const sc = {};
    for (const c of parsed) sc[c.suit] = (sc[c.suit] || 0) + 1;
    const max = Math.max(...Object.values(sc));
    const dom = Object.keys(sc).find(s => sc[s] === max) || null;
    const n = parsed.length;
    if (n === 3) {
      if (max === 3) return { type: 'monotone',   count: 3, suit: dom, hasFlushDraw: true,  isMonotone: true  };
      if (max === 2) return { type: 'two-tone',    count: 2, suit: dom, hasFlushDraw: true,  isMonotone: false };
      return              { type: 'rainbow',      count: 1, suit: null, hasFlushDraw: false, isMonotone: false };
    }
    if (n === 4) {
      if (max >= 4) return { type: 'monotone',    count: max, suit: dom, hasFlushDraw: true,  isMonotone: true  };
      if (max === 3) return { type: 'flush-heavy', count: 3,  suit: dom, hasFlushDraw: true,  isMonotone: false };
      return              { type: 'two-tone',     count: 2,   suit: dom, hasFlushDraw: false, isMonotone: false };
    }
    if (max >= 3) return { type: 'flush-on-board', count: max, suit: dom, hasFlushDraw: false, isMonotone: max >= 5 };
    return              { type: 'no-flush',       count: max, suit: null, hasFlushDraw: false, isMonotone: false };
  },

  straightTexture(parsed) {
    const vals  = [...new Set(parsed.map(c => c.value))].sort((a, b) => a - b);
    const hasAce = vals.includes(14);
    const ext  = hasAce ? [1, ...vals] : [...vals];
    const uniq = [...new Set(ext)].sort((a, b) => a - b);
    let maxInWindow = 0, minGap = Infinity;
    for (let i = 0; i < uniq.length; i++) {
      let cnt = 1;
      for (let j = i + 1; j < uniq.length; j++) {
        if (uniq[j] - uniq[i] <= 4) { cnt++; } else break;
      }
      maxInWindow = Math.max(maxInWindow, cnt);
    }
    for (let i = 0; i < ext.length; i++) {
      for (let j = i + 1; j < ext.length; j++) {
        if (ext[j] - ext[i] <= 4) {
          const range   = ext[j] - ext[i] + 1;
          const missing = range - (j - i + 1);
          if (missing < minGap) minGap = missing;
        }
      }
    }
    const connected  = maxInWindow >= 3;
    const openEnded  = maxInWindow >= 4 && minGap <= 1;
    const gutshot    = maxInWindow >= 4 && minGap === 1;
    return { connected, openEnded, gutshot, maxCardsInWindow: maxInWindow, minGap: isFinite(minGap) ? minGap : 0 };
  },

  boardPairing(parsed) {
    const rc = {};
    for (const c of parsed) rc[c.rank] = (rc[c.rank] || 0) + 1;
    const pairs = Object.entries(rc).filter(([, v]) => v >= 2);
    const trips = pairs.filter(([, v]) => v >= 3);
    return { isPaired: pairs.length > 0, isTripped: trips.length > 0, pairCount: pairs.length, pairedRank: pairs.length > 0 ? pairs[0][0] : null };
  },

  rangeAdvantage(parsed) {
    const sv = parsed.map(c => c.value).sort((a, b) => b - a);
    const hi = sv[0], sec = sv[1] || 0;
    if (hi >= 13) return { advantage: 'pfr',    highestCard: hi, reasoning: `${hi === 14 ? 'Ace' : 'King'}-high board strongly favors the preflop raiser.` };
    if (hi >= 11) return { advantage: 'pfr',    highestCard: hi, reasoning: `${hi === 12 ? 'Queen' : 'Jack'}-high board moderately favors the preflop raiser.` };
    if (hi <= 8 && sec <= 6) return { advantage: 'caller',  highestCard: hi, reasoning: 'Low board favors the caller who defends many low pairs and connectors.' };
    return               { advantage: 'neutral', highestCard: hi, reasoning: 'Middle-range board. Range advantage is contested.' };
  },

  classify(boardCards) {
    const parsed   = this.parseBoard(boardCards);
    const flush    = this.flushTexture(parsed);
    const straight = this.straightTexture(parsed);
    const pairing  = this.boardPairing(parsed);
    const advantage = this.rangeAdvantage(parsed);

    let wetnessScore = 0;
    if (flush.isMonotone) wetnessScore += 3;
    else if (flush.hasFlushDraw) wetnessScore += 2;
    if (straight.openEnded) wetnessScore += 2;
    else if (straight.gutshot || straight.connected) wetnessScore += 1;
    if (pairing.isPaired) wetnessScore -= 1;

    const wetness = wetnessScore >= 4 ? 'very_wet' : wetnessScore >= 2 ? 'wet' : wetnessScore === 1 ? 'semi_wet' : 'dry';
    const sizing  = this.recommendedBetSizing(wetness, pairing, advantage, parsed.length);
    return { cards: boardCards, wetness, wetnessScore, flush, straight, pairing, rangeAdvantage: advantage, recommendedSizing: sizing };
  },

  recommendedBetSizing(wetness, pairing, advantage, boardLength) {
    if (pairing.isTripped) return { recommended: '0% or 100% pot', cbet_freq: '30-50%', reasoning: 'Tripled board: very few hands interact. Polarize or check.' };
    if (pairing.isPaired)  return { recommended: '50-75% pot',     cbet_freq: '40-55%', reasoning: 'Paired board: preflop raiser has nut advantage. Use medium-large sizing selectively.' };
    switch (wetness) {
      case 'dry':      return { recommended: '55-75% pot',  cbet_freq: advantage.advantage === 'pfr' ? '65-80%' : '45-65%', reasoning: 'Dry board. Larger sizing extracts value and denies equity cheaply.' };
      case 'semi_wet': return { recommended: '33-50% pot',  cbet_freq: '55-70%', reasoning: 'Semi-wet texture. Medium sizing keeps pot manageable.' };
      case 'wet':      return { recommended: '25-40% pot',  cbet_freq: '40-60%', reasoning: 'Wet board: draws are numerous. Small sizing applies pressure cheaply.' };
      case 'very_wet': return { recommended: '25-33% pot',  cbet_freq: '30-50%', reasoning: 'Very wet/monotone board. Small or check. Avoid building large pots without nuts.' };
      default:         return { recommended: '33-50% pot',  cbet_freq: '50-60%', reasoning: 'Default medium sizing.' };
    }
  },
};

// ── Section 5: Postflop Strategy Guidelines ───────────────────

export const POSTFLOP = {
  cbetGuidelines(boardAnalysis, position, potType) {
    const { wetness, rangeAdvantage: { advantage }, pairing } = boardAnalysis;
    const potMult = potType === '3bp' ? 1.15 : 1.0;
    const base = { dry: { ip: 0.72, oop: 0.58 }, semi_wet: { ip: 0.62, oop: 0.50 }, wet: { ip: 0.48, oop: 0.38 }, very_wet: { ip: 0.38, oop: 0.28 } }[wetness] || { ip: 0.55, oop: 0.45 };
    let freq = base[position] * potMult;
    if (advantage === 'caller') freq *= 0.80;
    if (advantage === 'pfr')    freq *= 1.10;
    if (pairing.isPaired)       freq *= 0.85;
    freq = Math.min(0.90, Math.max(0.25, freq));
    return { freq: (freq * 100).toFixed(0) + '%', sizing: boardAnalysis.recommendedSizing.recommended, rationale: boardAnalysis.recommendedSizing.reasoning };
  },

  turnBarrelGuidelines(flopAnalysis, turnCardStr, position) {
    const turnCard = parseCard(turnCardStr);
    const isHighTurn = turnCard.value >= 11;
    const favorable  = isHighTurn && flopAnalysis.rangeAdvantage.advantage !== 'caller';
    return {
      freq: favorable ? '60-75%' : '35-55%',
      sizing: favorable ? '60-80% pot' : '50-67% pot',
      type: favorable ? 'favorable_turn' : 'neutral_or_unfavorable_turn',
      reasoning: favorable
        ? `High turn (${turnCard.rank}) improves PFR's range advantage. Increase bet frequency.`
        : `Turn doesn't strongly improve PFR's range. Check more; bet top of range and equity-heavy draws.`,
    };
  },

  pushFoldRange(effectiveBB) {
    const ranges = [
      { maxBB: 3,  range: 'Any two cards (100%)',                                      notes: 'Always shove.' },
      { maxBB: 4,  range: '~85%: all pairs, Ax, Kx, Qx, Jx, suited connectors 54s+',  notes: 'Fold only trash.' },
      { maxBB: 5,  range: '~70%: all pairs, A2+, K5+, Q7+, J8+, suited connectors',   notes: '' },
      { maxBB: 7,  range: '~55%: 22+, A2s+, A4o+, K8s+, KTo+, Q9s+, JTs, T9s',       notes: '' },
      { maxBB: 10, range: '~40%: 33+, A2s+, A7o+, K9s+, KJo+, QTs+, JTs',            notes: 'Standard 10bb shove.' },
      { maxBB: 13, range: '~30%: 55+, A2s+, A9o+, KTs+, KQo, QJs, JTs',              notes: '' },
      { maxBB: 15, range: '~22%: 66+, A2s+, ATo+, KTs+, KQo, QJs',                   notes: 'Standard 15bb shove.' },
      { maxBB: 20, range: '~16%: 77+, A2s+, AJo+, KQs',                              notes: 'At 20bb many hands are better as open-raises.' },
    ];
    const match = ranges.find(r => effectiveBB <= r.maxBB);
    return match || { range: '<10%: QQ+, AKs, AKo only', notes: 'Deep stack — open-raise instead of jam.' };
  },
};

// ── Section 6: Scenario Evaluator ─────────────────────────────

export const EVALUATOR = {
  evalPreflopRFI(handStr, position, userAction) {
    const range = GTO_OPEN_RANGES[position];
    if (!range) throw new Error(`Unknown position: ${position}`);
    const gtoFreq  = range[handStr] ?? 0;
    const gtoAction = gtoFreq >= 0.5 ? 'raise' : 'fold';
    const isMixed   = gtoFreq > 0.1 && gtoFreq < 0.9;
    const isCorrect = userAction === gtoAction || (isMixed && gtoFreq >= 0.35 && userAction === 'raise');

    let evLossMBB = 0;
    if (!isCorrect) {
      if (gtoFreq >= 0.9 && userAction === 'fold')      evLossMBB = gtoFreq * 15;
      else if (gtoFreq <= 0.1 && userAction === 'raise') evLossMBB = (1 - gtoFreq) * 10;
      else                                               evLossMBB = Math.abs(gtoFreq - 0.5) * 8;
    }

    const pct = round(gtoFreq * 100, 0);
    let feedback;
    if (isMixed) {
      feedback = `${handStr} from ${position} is a MIXED strategy hand (GTO raises ${pct}%). ${userAction === 'raise' ? 'Raising is acceptable — just don\'t always raise it.' : 'Folding is also acceptable — maintain mixed frequency.'}`;
    } else if (gtoFreq >= 0.90) {
      feedback = userAction === 'raise'
        ? `Correct. ${handStr} from ${position} is a mandatory open (${pct}%). Always raise.`
        : `Mistake. ${handStr} from ${position} is a mandatory open (${pct}%). Folding loses significant EV.`;
    } else if (gtoFreq <= 0.10) {
      feedback = userAction === 'fold'
        ? `Correct. ${handStr} is outside the GTO ${position} range (${pct}%).`
        : `Mistake. ${handStr} is outside the ${position} GTO range (${pct}%). Raising loses EV at 100bb.`;
    } else {
      feedback = `${handStr} from ${position} raises ${pct}% — borderline. ${userAction === 'raise' ? 'Raising is the slight preference.' : 'Folding is the slight preference.'}`;
    }

    return { hand: handStr, position, userAction, gtoFreq, gtoAction, isMixed, isCorrect, evLossMBB: round(evLossMBB, 1), feedback };
  },

  evalPotOddsDecision(equity, pot, villainBet, userAction) {
    const requiredEquity = MATH.potOdds(villainBet, pot);
    const evCall   = MATH.evCall(equity, pot, villainBet);
    const gtoAction = equity >= requiredEquity ? 'call' : 'fold';
    const isCorrect = userAction === gtoAction;
    const margin    = round((equity - requiredEquity) * 100, 1);
    return {
      equity, requiredEquity, pot, villainBet,
      potOdds: round(requiredEquity * 100, 1) + '%',
      equityVsPotOdds: round(equity * 100, 1) + '%',
      margin: margin + '% edge',
      evCall: round(evCall, 2),
      gtoAction, userAction, isCorrect,
      isMarginal: Math.abs(margin) < 3,
      feedback: isCorrect
        ? `Correct. Your equity (${round(equity*100,1)}%) ${equity >= requiredEquity ? 'exceeds' : 'is below'} required pot odds (${round(requiredEquity*100,1)}%). EV of calling: ${round(evCall,2)}.`
        : `Incorrect. Equity (${round(equity*100,1)}%) vs pot odds (${round(requiredEquity*100,1)}%) → should ${gtoAction}. EV of calling: ${round(evCall,2)}.`,
    };
  },

  evalMDFDecision(pot, villainBet, rangeDefended) {
    const mdf     = MATH.mdf(villainBet, pot);
    const alpha   = MATH.alpha(villainBet, pot);
    const isUnder = rangeDefended < mdf;
    const isOver  = rangeDefended > mdf;
    const deficit = round((mdf - rangeDefended) * 100, 1);
    return {
      pot, villainBet,
      mdf:          round(mdf * 100, 1) + '%',
      alpha:        round(alpha * 100, 1) + '%',
      rangeDefended: round(rangeDefended * 100, 1) + '%',
      status: isOver ? 'over-defending' : isUnder ? 'under-defending' : 'optimal',
      deficit: deficit + '%',
      feedback: isUnder
        ? `Under-defending by ${deficit}%. Villain can profitably bluff any two cards. Defend at least ${round(mdf*100,1)}% of your range.`
        : isOver
        ? `Over-defending. You're making villain's value bets more profitable. Tighten your defense.`
        : `Optimal MDF defense. Villain's pure bluffs are exactly 0EV.`,
    };
  },

  evalBluffRatio(pot, betChosen, valueHands, bluffHands) {
    const { bluffFreq, valueFreq, ratio } = MATH.riverBluffFrequency(betChosen, pot);
    const total     = valueHands + bluffHands;
    const actual    = total > 0 ? bluffHands / total : 0;
    const diff      = round((actual - bluffFreq) * 100, 1);
    const isOver    = actual > bluffFreq + 0.05;
    const isUnder   = actual < bluffFreq - 0.05;
    return {
      pot, betChosen,
      gtoBluffFreq: round(bluffFreq * 100, 1) + '%',
      gtoValueFreq: round(valueFreq * 100, 1) + '%',
      gtoRatio: ratio,
      actualBluffFreq: round(actual * 100, 1) + '%',
      deviation: diff + '%',
      status: isOver ? 'too-bluff-heavy' : isUnder ? 'too-value-heavy' : 'balanced',
      feedback: isOver
        ? `Over-bluffing by ${Math.abs(diff)}%. GTO bluff ratio for this sizing is ${round(bluffFreq*100,1)}%.`
        : isUnder
        ? `Under-bluffing by ${Math.abs(diff)}%. Villain can profitably fold all bluff-catchers.`
        : `Balanced betting range for this sizing. Villain is indifferent with bluff-catchers.`,
    };
  },
};

// ── Section 7: Quiz Generator ─────────────────────────────────

// Returns a grammatically correct position context string for quiz questions.
// UTG is first to act — nothing has folded to them. Other positions get
// position-appropriate prepositions ("on the BTN", "in the SB", etc.).
function positionContext(pos) {
  if (pos === 'UTG') return 'You are opening from UTG (first to act)';
  if (pos === 'BTN') return 'Action folds to you on the BTN';
  if (pos === 'SB')  return 'Action folds to you in the SB';
  return `Action folds to you in the ${pos}`;
}

export const QUIZZES = {
  generateRangeQuiz() {
    const positions = Object.keys(GTO_OPEN_RANGES);
    const position  = positions[Math.floor(Math.random() * positions.length)];
    const range     = GTO_OPEN_RANGES[position];
    const hands     = Object.keys(range);
    const hand      = hands[Math.floor(Math.random() * hands.length)];
    const gtoFreq   = range[hand];
    const gtoAction = gtoFreq >= 0.5 ? 'raise' : 'fold';
    const isMixed   = gtoFreq > 0.1 && gtoFreq < 0.9;
    return {
      id: `range_${position}_${hand}_${Date.now()}`,
      type: 'preflop_range',
      question: `${positionContext(position)}. You hold ${hand}. Do you raise or fold?`,
      hand, position,
      choices: ['raise', 'fold'],
      correctAnswer: gtoAction,
      isMixed,
      gtoFreq,
      explanation: isMixed
        ? `${hand} from ${position} is a mixed strategy hand (GTO raise frequency: ${round(gtoFreq*100,0)}%). Both raise and fold are acceptable.`
        : `${hand} from ${position}: GTO raise frequency = ${round(gtoFreq*100,0)}%. The correct action is ${gtoAction}.`,
      difficulty: isMixed ? 'hard' : gtoFreq > 0.9 || gtoFreq < 0.1 ? 'easy' : 'medium',
    };
  },

  generatePotOddsQuiz() {
    const pots  = [80, 100, 120, 150, 200];
    const bets  = [25, 33, 50, 67, 75, 100];
    const pot   = pots[Math.floor(Math.random() * pots.length)];
    const bet   = bets[Math.floor(Math.random() * bets.length)];
    const po    = MATH.potOdds(bet, pot);
    const poPct = round(po * 100, 1);
    const choices = [poPct + '%', round(bet/pot*100,1)+'%', round(bet/(pot+bet)*100,1)+'%', round((pot+bet)/(pot+2*bet)*100,1)+'%']
      .filter((v,i,a) => a.indexOf(v) === i).sort(() => Math.random() - 0.5).slice(0,4);
    if (!choices.includes(poPct + '%')) { choices[0] = poPct + '%'; }
    return {
      id: `potodds_${Date.now()}`, type: 'pot_odds',
      question: `Pot is ${pot}bb. Villain bets ${bet}bb. What are your pot odds (required equity to call)?`,
      pot, bet,
      choices: choices.sort(() => Math.random() - 0.5),
      correctAnswer: poPct + '%',
      explanation: `Pot odds = call / (pot + villain_bet + call) = ${bet} / (${pot} + ${bet} + ${bet}) = ${bet}/${pot + 2*bet} = ${poPct}%.\nYou need at least ${poPct}% equity to call profitably.`,
      formula: 'pot_odds = call / (pot + villain_bet + call)',
      difficulty: 'easy',
    };
  },

  generateMDFQuiz() {
    const pots = [80, 100, 120, 150, 200];
    const bets = [25, 33, 50, 67, 75, 100];
    const pot  = pots[Math.floor(Math.random() * pots.length)];
    const bet  = bets[Math.floor(Math.random() * bets.length)];
    const mdf  = MATH.mdf(bet, pot);
    const mdfPct = round(mdf * 100, 1);
    return {
      id: `mdf_${Date.now()}`, type: 'mdf',
      question: `Pot is ${pot}bb. Villain bets ${bet}bb. What is the Minimum Defense Frequency (MDF)?`,
      pot, bet,
      choices: [mdfPct+'%', round(bet/(pot+bet)*100,1)+'%', round(pot/(2*pot+bet)*100,1)+'%', round((pot+bet)/(pot+2*bet)*100,1)+'%'].sort(() => Math.random() - 0.5),
      correctAnswer: mdfPct + '%',
      explanation: `MDF = pot / (pot + bet) = ${pot} / (${pot} + ${bet}) = ${pot}/${pot+bet} = ${mdfPct}%.\nDefend at least ${mdfPct}% of your range to prevent villain's 0-equity bluffs from being profitable.`,
      formula: 'MDF = pot / (pot + bet)',
      difficulty: 'medium',
    };
  },

  generateBluffFreqQuiz() {
    const pots = [80, 100, 120, 150];
    const bets = [25, 33, 50, 67, 75, 100];
    const pot  = pots[Math.floor(Math.random() * pots.length)];
    const bet  = bets[Math.floor(Math.random() * bets.length)];
    const { bluffFreq } = MATH.riverBluffFrequency(bet, pot);
    const bfPct = round(bluffFreq * 100, 1);
    return {
      id: `blufffreq_${Date.now()}`, type: 'bluff_frequency',
      question: `You bet ${bet}bb into a ${pot}bb pot on the river. What fraction of your betting range should be bluffs (GTO)?`,
      pot, bet,
      choices: [bfPct+'%', round(bet/(pot+bet)*100,1)+'%', round(pot/(pot+2*bet)*100,1)+'%', round(bet/(pot+1.5*bet)*100,1)+'%'].sort(() => Math.random() - 0.5),
      correctAnswer: bfPct + '%',
      explanation: `River bluff frequency = bet / (pot + 2×bet) = ${bet} / (${pot} + ${2*bet}) = ${bet}/${pot+2*bet} = ${bfPct}%.\nThis equals the pot odds you lay villain — making bluff-catchers indifferent.`,
      formula: 'bluff% = bet / (pot + 2×bet)',
      difficulty: 'medium',
    };
  },

  generateEVQuiz() {
    const pot      = [80, 100, 120][Math.floor(Math.random() * 3)];
    const bet      = [25, 33, 50][Math.floor(Math.random() * 3)];
    const foldFreq = [0.40, 0.50, 0.60][Math.floor(Math.random() * 3)];
    const equity   = [0.30, 0.40, 0.50][Math.floor(Math.random() * 3)];
    const ev       = MATH.evBet(foldFreq, equity, pot, bet);
    const evRounded = round(ev, 1);
    return {
      id: `ev_${Date.now()}`, type: 'ev_calculation',
      question: `You bet ${bet}bb into ${pot}bb. Villain folds ${round(foldFreq*100,0)}%. When called your equity is ${round(equity*100,0)}%. EV of betting?`,
      pot, bet, foldFreq, equity,
      correctAnswer: evRounded + ' chips',
      choices: [evRounded, round(ev*1.2,1), round(ev-pot*0.05,1), round(ev+bet*0.1,1)].map(v => v+' chips').sort(() => Math.random()-0.5),
      explanation: `EV(bet) = fold%×pot + call%×[equity×(pot+bet) − (1−equity)×bet]\n= ${foldFreq}×${pot} + ${round(1-foldFreq,2)}×[${equity}×${pot+bet} − ${round(1-equity,2)}×${bet}]\n= ${evRounded} chips`,
      formula: 'EV(bet) = fold%×pot + call%×[equity×(pot+bet) − (1−equity)×bet]',
      difficulty: 'hard',
    };
  },

  generateBoardTextureQuiz() {
    const boards = [
      { cards: ['Ah','Kd','2c'], expected: 'dry'      },
      { cards: ['Jh','Th','9h'], expected: 'very_wet' },
      { cards: ['Qd','Js','8h'], expected: 'wet'      },
      { cards: ['Kc','Kd','7h'], expected: 'dry'      },
      { cards: ['7s','6s','5d'], expected: 'wet'      },
      { cards: ['As','9s','4s'], expected: 'very_wet' },
      { cards: ['Ks','Qh','2d'], expected: 'dry'      },
      { cards: ['8h','7c','6h'], expected: 'very_wet' },
      { cards: ['Ah','Td','6s'], expected: 'dry'      },
      { cards: ['Jd','Ts','8s'], expected: 'wet'      },
    ];
    const sel      = boards[Math.floor(Math.random() * boards.length)];
    const analysis = BOARD.classify(sel.cards);
    const cbetInfo = POSTFLOP.cbetGuidelines(analysis, 'ip', 'srp');
    const qTypes   = ['wetness', 'sizing', 'cbet'];
    const qType    = qTypes[Math.floor(Math.random() * qTypes.length)];

    if (qType === 'wetness') {
      return {
        id: `texture_${Date.now()}`, type: 'board_texture',
        question: `Board: ${sel.cards.join(' ')}. How would you classify this board texture?`,
        board: sel.cards,
        choices: ['dry','semi_wet','wet','very_wet'],
        correctAnswer: analysis.wetness,
        explanation: `Board: ${sel.cards.join(' ')}.\nFlush: ${analysis.flush.type}\nStraight: ${analysis.straight.connected ? 'connected' : 'disconnected'}${analysis.straight.openEnded ? ', open-ended' : ''}\nPairing: ${analysis.pairing.isPaired ? 'paired' : 'unpaired'}\nWetness score: ${analysis.wetnessScore} → ${analysis.wetness}`,
        analysis, difficulty: 'medium',
      };
    }
    if (qType === 'sizing') {
      return {
        id: `texture_sizing_${Date.now()}`, type: 'board_texture',
        question: `You raised preflop and flop is ${sel.cards.join(' ')}. IP preflop raiser, single-raised pot. Appropriate c-bet sizing?`,
        board: sel.cards,
        choices: ['25-33% pot','33-50% pot','55-75% pot','100%+ pot'],
        correctAnswer: analysis.wetness === 'dry' ? '55-75% pot' : analysis.wetness === 'very_wet' ? '25-33% pot' : '33-50% pot',
        explanation: `Board texture: ${analysis.wetness}. ${analysis.recommendedSizing.reasoning}`,
        analysis, difficulty: 'medium',
      };
    }
    return {
      id: `texture_cbet_${Date.now()}`, type: 'board_texture',
      question: `Board: ${sel.cards.join(' ')}. IP preflop raiser, single-raised pot. What fraction of your range should you c-bet?`,
      board: sel.cards,
      choices: ['25-40%','40-55%','55-70%','70-85%'],
      correctAnswer: cbetInfo.freq.includes('7') || cbetInfo.freq.includes('8') ? '70-85%' : cbetInfo.freq.includes('6') ? '55-70%' : cbetInfo.freq.includes('4') || cbetInfo.freq.includes('5') ? '40-55%' : '25-40%',
      explanation: `Texture: ${analysis.wetness}. Recommended c-bet frequency: ${cbetInfo.freq}.\n${cbetInfo.rationale}`,
      analysis, difficulty: 'hard',
    };
  },

  generate3BetQuiz() {
    const spots = [
      { position: 'BTN', vsPosition: 'CO', rangeKey: 'BTN_vs_CO' },
      { position: 'SB',  vsPosition: 'BTN', rangeKey: 'SB_vs_BTN' },
      { position: 'BB',  vsPosition: 'BTN', rangeKey: 'BB_vs_BTN' },
    ];
    const spot   = spots[Math.floor(Math.random() * spots.length)];
    const range  = GTO_3BET_RANGES[spot.rangeKey];
    const hands  = Object.keys(range);
    const hand   = hands[Math.floor(Math.random() * hands.length)];
    const [tbFreq, callFreq] = range[hand];
    const foldFreq = round(1 - tbFreq - callFreq, 2);
    const gtoAction = tbFreq >= 0.5 ? '3-bet' : callFreq >= 0.5 ? 'call' : 'fold';
    return {
      id: `threebet_${spot.rangeKey}_${hand}_${Date.now()}`, type: 'three_bet',
      question: `${spot.vsPosition} opens to 2.5bb. You are on the ${spot.position} with ${hand}. Optimal action?`,
      hand, position: spot.position, vsPosition: spot.vsPosition,
      choices: ['3-bet','call','fold'],
      correctAnswer: gtoAction,
      gtoFreqs: { '3-bet': round(tbFreq*100,0)+'%', call: round(callFreq*100,0)+'%', fold: round(foldFreq*100,0)+'%' },
      explanation: `${hand} on ${spot.position} vs ${spot.vsPosition}: 3-bet ${round(tbFreq*100,0)}%, call ${round(callFreq*100,0)}%, fold ${round(foldFreq*100,0)}%.\nGTO action: ${gtoAction}.`,
      difficulty: tbFreq > 0.8 || tbFreq < 0.1 ? 'easy' : 'hard',
    };
  },

  generateSPRQuiz() {
    const scenarios = [
      { stack: 90,  pot: 30, hand: 'Top pair top kicker (TPTK)'        },
      { stack: 200, pot: 30, hand: 'Overpair (KK on Q72r)'             },
      { stack: 60,  pot: 30, hand: 'Middle pair (77 on KQ7)'           },
      { stack: 240, pot: 30, hand: 'Set (bottom set on a wet board)'   },
      { stack: 120, pot: 40, hand: 'Top pair weak kicker (TPWK)'       },
    ];
    const s        = scenarios[Math.floor(Math.random() * scenarios.length)];
    const sprVal   = MATH.spr(s.stack, s.pot);
    const guidance = MATH.sprGuidance(sprVal);
    let answer;
    if (sprVal < 2)                                                   answer = 'yes';
    else if (sprVal < 4 && (s.hand.includes('TPTK') || s.hand.includes('Set') || s.hand.includes('Overpair'))) answer = 'yes';
    else if (sprVal >= 4 && sprVal < 8 && s.hand.includes('Set'))    answer = 'yes';
    else if (sprVal >= 4 && s.hand.includes('TPWK'))                 answer = 'no';
    else if (sprVal >= 8 && !s.hand.includes('Set'))                 answer = 'no';
    else                                                              answer = 'marginal';
    return {
      id: `spr_${Date.now()}`, type: 'spr_commitment',
      question: `Stack: ${s.stack}bb. Flop pot: ${s.pot}bb. SPR = ${sprVal}. You hold ${s.hand}. Play for stacks?`,
      stack: s.stack, pot: s.pot, spr: sprVal, hand: s.hand,
      choices: ['yes','no','marginal'],
      correctAnswer: answer,
      explanation: `SPR = ${s.stack}/${s.pot} = ${sprVal}. ${guidance.guidance}\nCommit with: ${guidance.commitHands.join(', ')}.\nAnswer: ${answer.toUpperCase()}.`,
      difficulty: sprVal < 2 || sprVal > 10 ? 'easy' : 'medium',
    };
  },

  getRandomQuiz() {
    const generators = [
      { fn: () => this.generateRangeQuiz(),        weight: 30 },
      { fn: () => this.generatePotOddsQuiz(),      weight: 20 },
      { fn: () => this.generateMDFQuiz(),          weight: 15 },
      { fn: () => this.generateBluffFreqQuiz(),    weight: 15 },
      { fn: () => this.generateBoardTextureQuiz(), weight: 10 },
      { fn: () => this.generate3BetQuiz(),         weight: 5  },
      { fn: () => this.generateSPRQuiz(),          weight: 5  },
    ];
    const total = generators.reduce((s, g) => s + g.weight, 0);
    let rand = Math.random() * total;
    for (const g of generators) { rand -= g.weight; if (rand <= 0) return g.fn(); }
    return generators[0].fn();
  },
};

// ── Section 8: Spaced Repetition (SM-2) ───────────────────────

export const SRS = {
  createCard(id) {
    return { id, interval: 1, repetitions: 0, easinessFactor: 2.5, nextReviewDate: new Date().toISOString(), lastReviewDate: null, totalReviews: 0, correctStreak: 0 };
  },

  scheduleNextReview(card, quality) {
    if (quality < 0 || quality > 5) throw new Error('Quality must be 0–5');
    const c = { ...card };
    c.totalReviews++;
    c.lastReviewDate = new Date().toISOString();
    if (quality >= 3) {
      c.interval      = c.repetitions === 0 ? 1 : c.repetitions === 1 ? 6 : Math.round(c.interval * c.easinessFactor);
      c.repetitions++;
      c.correctStreak++;
    } else {
      c.interval = 1; c.repetitions = 0; c.correctStreak = 0;
    }
    c.easinessFactor = Math.max(1.3, c.easinessFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    const next = new Date(); next.setDate(next.getDate() + c.interval);
    c.nextReviewDate = next.toISOString();
    return c;
  },

  rateResponse(isCorrect, responseTimeMs) {
    if (!isCorrect) return responseTimeMs < 3000 ? 2 : 1;
    if (responseTimeMs < 3000)  return 5;
    if (responseTimeMs < 8000)  return 4;
    return 3;
  },

  getDueCards(cards, now = new Date()) {
    return cards.filter(c => new Date(c.nextReviewDate) <= now).sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate));
  },

  deckSummary(cards) {
    const now      = new Date();
    const due      = cards.filter(c => new Date(c.nextReviewDate) <= now).length;
    const mastered = cards.filter(c => c.interval >= 21 && c.easinessFactor >= 2.0).length;
    const learning = cards.filter(c => c.repetitions > 0 && c.interval < 21).length;
    const newCards = cards.filter(c => c.repetitions === 0).length;
    const avgEF    = cards.length > 0 ? round(cards.reduce((s, c) => s + c.easinessFactor, 0) / cards.length, 2) : 0;
    return { total: cards.length, due, mastered, learning, newCards, avgEF };
  },
};

// ── Section 9: Session Tracker ────────────────────────────────

export const SESSION = {
  createSession(userId = 'default') {
    return {
      id: `session_${Date.now()}`, userId,
      startTime: new Date().toISOString(), endTime: null,
      answers: [], totalQuestions: 0, correctAnswers: 0,
      categoryBreakdown: {
        preflop_range: { correct: 0, total: 0 },
        pot_odds:      { correct: 0, total: 0 },
        mdf:           { correct: 0, total: 0 },
        bluff_frequency: { correct: 0, total: 0 },
        board_texture: { correct: 0, total: 0 },
        three_bet:     { correct: 0, total: 0 },
        spr_commitment: { correct: 0, total: 0 },
        ev_calculation: { correct: 0, total: 0 },
      },
    };
  },

  recordAnswer(session, quiz, userAnswer, isCorrect, responseTimeMs) {
    const s = { ...session, answers: [...session.answers] };
    s.answers.push({ quizId: quiz.id, quizType: quiz.type, userAnswer, correctAnswer: quiz.correctAnswer, isCorrect, responseTimeMs, timestamp: new Date().toISOString() });
    s.totalQuestions++;
    if (isCorrect) s.correctAnswers++;
    const cat = s.categoryBreakdown[quiz.type];
    if (cat) { cat.total++; if (isCorrect) cat.correct++; }
    return s;
  },

  endSession(session) {
    const s        = { ...session, endTime: new Date().toISOString() };
    const durMs    = new Date(s.endTime) - new Date(s.startTime);
    const accuracy = s.totalQuestions > 0 ? round(s.correctAnswers / s.totalQuestions * 100, 1) : 0;
    const avgMs    = s.answers.length > 0 ? round(s.answers.reduce((t, a) => t + a.responseTimeMs, 0) / s.answers.length) : 0;

    const weakSpots = Object.entries(s.categoryBreakdown)
      .filter(([, v]) => v.total >= 2 && v.correct / v.total < 0.60)
      .map(([k, v]) => ({ category: k, accuracy: round(v.correct / v.total * 100, 1) + '%', correct: v.correct, total: v.total }))
      .sort((a, b) => parseFloat(a.accuracy) - parseFloat(b.accuracy));

    const strongSpots = Object.entries(s.categoryBreakdown)
      .filter(([, v]) => v.total >= 2 && v.correct / v.total >= 0.80)
      .map(([k, v]) => ({ category: k, accuracy: round(v.correct / v.total * 100, 1) + '%' }));

    return {
      ...s, durationMs: durMs,
      durationFormatted: `${Math.floor(durMs / 60000)}m ${Math.round((durMs % 60000) / 1000)}s`,
      accuracy: accuracy + '%', avgResponseMs: avgMs, weakSpots, strongSpots,
      recommendation: weakSpots.length > 0
        ? `Focus next session on: ${weakSpots.map(w => w.category.replace(/_/g, ' ')).join(', ')}.`
        : 'Great session! Maintain range variety and work on harder scenarios.',
    };
  },

  aggregateProgress(sessionReports) {
    if (sessionReports.length === 0) return { message: 'No sessions recorded yet.' };
    const totalQ   = sessionReports.reduce((s, r) => s + r.totalQuestions, 0);
    const totalC   = sessionReports.reduce((s, r) => s + r.correctAnswers, 0);
    const overall  = round(totalC / totalQ * 100, 1);
    const catTotals = {};
    for (const rep of sessionReports)
      for (const [cat, data] of Object.entries(rep.categoryBreakdown)) {
        if (!catTotals[cat]) catTotals[cat] = { correct: 0, total: 0 };
        catTotals[cat].correct += data.correct;
        catTotals[cat].total   += data.total;
      }
    const catAcc = Object.entries(catTotals)
      .filter(([, v]) => v.total > 0)
      .map(([k, v]) => ({ category: k.replace(/_/g, ' '), accuracy: round(v.correct / v.total * 100, 1) + '%', questionsAnswered: v.total }))
      .sort((a, b) => parseFloat(a.accuracy) - parseFloat(b.accuracy));
    const first5   = sessionReports.slice(0, 5), last5 = sessionReports.slice(-5);
    const firstAcc = first5.reduce((s, r) => s + r.correctAnswers, 0) / first5.reduce((s, r) => s + r.totalQuestions, 0);
    const lastAcc  = last5.reduce((s, r) => s + r.correctAnswers, 0) / last5.reduce((s, r) => s + r.totalQuestions, 0);
    const trend    = lastAcc > firstAcc + 0.05 ? 'improving' : lastAcc < firstAcc - 0.05 ? 'declining' : 'stable';
    return {
      sessionsCompleted: sessionReports.length, totalQuestionsAnswered: totalQ,
      overallAccuracy: overall + '%', trend,
      improvementPct: round((lastAcc - firstAcc) * 100, 1) + '%',
      categoryAccuracy: catAcc,
      weakestCategory:  catAcc[0]?.category || 'n/a',
      strongestCategory: catAcc[catAcc.length - 1]?.category || 'n/a',
    };
  },
};

// ── Quick Reference ────────────────────────────────────────────

export const QUICK_REFERENCE = {
  BET_SIZING_TABLE: MATH.betSizingTable(100),
  POSITION_RANGE_WIDTHS: { UTG: '~14%', HJ: '~21%', CO: '~28%', BTN: '~44%', SB: '~41% (vs BB)', BB: 'Defend ~62% vs BTN open' },
  THREE_BET_SIZING: { in_position: '2.5x–3x the open', out_of_position: '3x–4x the open', short_stack_under_40bb: '2.2x–2.5x', vs_fish_who_calls: '3.5x–4x (size up for value)' },
  CBET_FREQUENCY: {
    'Dry, high-card (AKx rainbow)':    { ip: '70-80%', oop: '55-65%', sizing: '55-75% pot' },
    'Semi-dry (KQ5 rainbow)':          { ip: '60-70%', oop: '50-60%', sizing: '45-65% pot' },
    'Coordinated (JT8 two-tone)':      { ip: '45-55%', oop: '35-45%', sizing: '25-40% pot' },
    'Monotone (any 3 same suit)':      { ip: '30-40%', oop: '25-35%', sizing: '25-33% pot' },
    'Paired (KK7)':                    { ip: '40-55%', oop: '35-50%', sizing: '50-75% pot (polarized)' },
  },
  SPR_THRESHOLDS: {
    '<2':   'Stack off with TP+. Any pair can commit.',
    '2–4':  'Stack off with TPGK+. Weak TP needs caution.',
    '4–8':  'Two pair or better to commit. TPGK takes 2 streets.',
    '8–13': 'Sets and two pair to commit. Singles lose value.',
    '>13':  'Sets/nut draws for implied odds. Singles rarely commit.',
  },
};
