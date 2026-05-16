// ─────────────────────────────────────────────────────────────────────────────
// pokerRanges.js  — Canonical frequency-based preflop range data
// 8-max, 100bb, ante in play.  Source: PokerCoaching.com GTO charts.
// Positions: UTG → UTG+1 → LJ (UTG+2) → HJ → CO → BTN → SB → BB
//
// @typedef {'raise'|'bluff'|'call'|'limp'|'fold'} PokerAction
// @typedef {{ primary: PokerAction, secondary: PokerAction, freq: number }} HandEntry
//   freq = frequency of `primary` action (0–1).  secondary fills the remainder.
//   e.g. pure raise  → { primary:'raise', secondary:'fold', freq:1.0 }
//   e.g. 50% mix     → { primary:'raise', secondary:'fold', freq:0.5 }
// @typedef {Record<string, HandEntry>} ScenarioMap
// ─────────────────────────────────────────────────────────────────────────────

// ── 169-hand grid ────────────────────────────────────────────────────────────
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

/** All 169 canonical hand combos (pairs, suited, offsuit). */
export function all169() {
  const out = [];
  for (let i = 0; i < 13; i++) {
    out.push(RANKS[i] + RANKS[i]);
    for (let j = i + 1; j < 13; j++) {
      out.push(RANKS[i] + RANKS[j] + 's');
      out.push(RANKS[i] + RANKS[j] + 'o');
    }
  }
  return out;
}

/** Combo count for a hand notation. */
export function comboCount(hand) {
  if (hand.length === 2)       return 6;   // pair
  if (hand.endsWith('s'))      return 4;   // suited
  if (hand.endsWith('o'))      return 12;  // offsuit
  return 0;
}

// ── Set-to-FreqMap builder ────────────────────────────────────────────────────
/**
 * Convert action Sets into a per-hand frequency map.
 * Priority: raiseSet > bluffSet > callSet > limpSet > mixSet > fold
 * mixSet  = { primary:'raise', freq:0.5 }  (50% raise / 50% fold by default)
 *
 * @param {{ raise?:Set, bluff?:Set, call?:Set, limp?:Set, mix?:Set, mixFreq?:number }} cfg
 * @returns {ScenarioMap}
 */
function buildFreqMap(cfg) {
  const { raise, bluff, call, limp, mix, mixFreq = 0.5 } = cfg;
  const map = {};
  for (const h of all169()) {
    if (raise?.has(h))      map[h] = { primary: 'raise', secondary: 'fold', freq: 1.0 };
    else if (bluff?.has(h)) map[h] = { primary: 'bluff', secondary: 'fold', freq: 1.0 };
    else if (call?.has(h))  map[h] = { primary: 'call',  secondary: 'fold', freq: 1.0 };
    else if (limp?.has(h))  map[h] = { primary: 'limp',  secondary: 'fold', freq: 1.0 };
    else if (mix?.has(h))   map[h] = { primary: 'raise', secondary: 'fold', freq: mixFreq };
    else                    map[h] = { primary: 'fold',  secondary: 'fold', freq: 1.0 };
  }
  return map;
}

// ══════════════════════════════════════════════════════════════════════════════
// RFI RANGES
// ══════════════════════════════════════════════════════════════════════════════

// ── UTG  (10.1% — 134 combos, pure raise/fold, no mix) ───────────────────────
const UTG_RAISE = new Set([
  'AA','KK','QQ','JJ','TT','99','88','77','66',
  'AKs','AQs','AJs','ATs','A9s','A5s',
  'KQs','KJs','KTs',
  'QJs','QTs',
  'JTs','T9s','98s',
  'AKo','AQo',
]);
const UTG_MIX = new Set([
  // No mix at UTG — pure raise or fold
]);

// ── UTG+1  (14.3% — 190 combos, pure raise/fold, no mix) ─────────────────────
const UTG1_RAISE = new Set([
  'AA','KK','QQ','JJ','TT','99','88','77','66',
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s',
  'KQs','KJs','KTs','K9s',
  'QJs','QTs','Q9s',
  'JTs','J9s',
  'T9s',
  '98s',
  '87s',
  'AKo','AQo','AJo','KQo',
]);
const UTG1_MIX = new Set([
  // No mix at UTG+1 — pure raise or fold
]);

// ── UTG+2  (15.7% — 208 combos, pure raise/fold, no mix) ─────────────────────
const UTG2_RAISE = new Set([
  'AA','KK','QQ','JJ','TT','99','88','77','66','55',
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  'KQs','KJs','KTs','K9s',
  'QJs','QTs','Q9s',
  'JTs','J9s',
  'T9s',
  '98s',
  '87s',
  '76s',
  'AKo','AQo','AJo','KQo',
]);
const UTG2_MIX = new Set([
  // No mix at UTG+2 — pure raise or fold
]);

// ── LJ / Lojack  (18.3% — 242 combos, pure raise/fold, no mix) ───────────────
const LJ_RAISE = new Set([
  'AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  'KQs','KJs','KTs','K9s',
  'QJs','QTs','Q9s',
  'JTs','J9s',
  'T9s',
  '98s',
  '87s',
  '76s',
  '65s',
  'AKo','AQo','AJo','ATo','KQo','KJo',
]);
const LJ_MIX = new Set([
  // No mix at Lojack — pure raise or fold
]);

// ── HJ  (21.3% — 282 combos, pure raise/fold, no mix) ────────────────────────
const HJ_RAISE = new Set([
  'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  'KQs','KJs','KTs','K9s','K8s',
  'QJs','QTs','Q9s',
  'JTs','J9s',
  'T9s','T8s',
  '98s','97s',
  '87s',
  '76s',
  '65s',
  '54s',
  'AKo','AQo','AJo','ATo','KQo','KJo','QJo',
]);
const HJ_MIX = new Set([
  // No mix at HJ — pure raise or fold
]);

// ── CO  (27.0% — 358 combos, pure raise/fold, no mix) ────────────────────────
const CO_RAISE = new Set([
  'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  'KQs','KJs','KTs','K9s','K8s','K7s',
  'QJs','QTs','Q9s','Q8s',
  'JTs','J9s','J8s',
  'T9s','T8s',
  '98s','97s',
  '87s','86s',
  '76s','75s',
  '65s','64s',
  '54s','43s',
  'AKo','AQo','AJo','ATo','A9o',
  'KQo','KJo','KTo',
  'QJo','QTo',
  'JTo',
]);
const CO_MIX = new Set([
  // No mix at CO — pure raise or fold
]);

// ── BTN  (51.1% — 678 combos, pure raise/fold, no mix) ───────────────────────
const BTN_RAISE = new Set([
  // All pairs
  'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
  // All suited aces
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  // All suited kings
  'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
  // All suited queens
  'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s',
  // Suited jacks J6s+
  'JTs','J9s','J8s','J7s','J6s',
  // Suited tens T6s+
  'T9s','T8s','T7s','T6s',
  // Suited nines 96s+
  '98s','97s','96s',
  // Suited eights 86s+
  '87s','86s',
  // Suited sevens 75s+
  '76s','75s',
  // Suited sixes 64s+
  '65s','64s',
  // Suited fives 53s+
  '54s','53s',
  // Suited fours
  '43s',
  // All offsuit aces
  'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
  // Offsuit kings K4o+
  'KQo','KJo','KTo','K9o','K8o','K7o','K6o','K5o','K4o',
  // Offsuit queens Q8o+
  'QJo','QTo','Q9o','Q8o',
  // Offsuit jacks J8o+
  'JTo','J9o','J8o',
  // One-gap offsuit connectors
  'T9o','98o','87o','76o',
]);
const BTN_MIX = new Set([
  // No mix at BTN — pure raise or fold
]);

// ── SB  (4-action: raise-value / raise-bluff / limp / fold) ──────────────────
// Verified: PokerCoaching.com 8-max GTO chart
// raise-value=142 combos (10.7%), raise-bluff=172 (13.0%), limp=632 (47.7%), fold=380 (28.7%)
const SB_RAISE_VALUE = new Set([
  // Pairs AA–88
  'AA','KK','QQ','JJ','TT','99','88',
  // Suited
  'AKs','AQs','AJs','ATs',
  'KQs','KJs',
  'QJs',
  // Offsuit
  'AKo','AQo','AJo','ATo',
  'KQo','KJo',
]);
const SB_RAISE_BLUFF = new Set([
  // Suited — low Jacks, low Tens, mid-low connectors
  'J4s','J3s','J2s',
  'T5s','T4s',
  '95s','94s',
  '85s','84s',
  '74s',
  '63s',
  '53s',
  '43s',
  // Offsuit — low gap hands / low Broadway blockers
  'J6o',
  'T6o',
  '96o',
  '86o',
  'Q5o','Q4o','Q3o','Q2o',
  'K3o','K2o',
]);
const SB_LIMP = new Set([
  // Pairs 77–22
  '77','66','55','44','33','22',
  // Suited aces A9s–A2s
  'A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  // Suited kings KTs–K2s
  'KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
  // Suited queens QTs–Q2s
  'QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s',
  // Suited jacks JTs–J5s
  'JTs','J9s','J8s','J7s','J6s','J5s',
  // Suited tens T9s–T6s
  'T9s','T8s','T7s','T6s',
  // Suited nines 98s–96s
  '98s','97s','96s',
  // Suited eights 87s–86s
  '87s','86s',
  // Suited sevens 76s–75s
  '76s','75s',
  // Suited sixes 65s–64s
  '65s','64s',
  // Suited fives
  '54s',
  // Suited threes
  '32s',
  // Offsuit aces A9o–A2o
  'A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
  // Offsuit kings KTo–K4o
  'KTo','K9o','K8o','K7o','K6o','K5o','K4o',
  // Offsuit queens QJo–Q6o
  'QJo','QTo','Q9o','Q8o','Q7o','Q6o',
  // Offsuit jacks JTo–J7o
  'JTo','J9o','J8o','J7o',
  // Offsuit tens T9o–T7o
  'T9o','T8o','T7o',
  // Offsuit nines
  '98o','97o',
  // Offsuit eights
  '87o',
  // Offsuit sevens
  '76o',
  // Offsuit sixes
  '65o',
]);

// ── Build RFI frequency maps ──────────────────────────────────────────────────

/** @type {ScenarioMap} */
export const UTG_RFI_MAP = buildFreqMap({ raise: UTG_RAISE, mix: UTG_MIX });

/** @type {ScenarioMap} */
export const UTG1_RFI_MAP = buildFreqMap({ raise: UTG1_RAISE, mix: UTG1_MIX });

/** @type {ScenarioMap} */
export const UTG2_RFI_MAP = buildFreqMap({ raise: UTG2_RAISE, mix: UTG2_MIX });

/** @type {ScenarioMap} */
export const LJ_RFI_MAP = buildFreqMap({ raise: LJ_RAISE, mix: LJ_MIX });

/** @type {ScenarioMap} — placeholder until verified chart provided */
export const HJ_RFI_MAP = buildFreqMap({ raise: HJ_RAISE, mix: HJ_MIX });

/** @type {ScenarioMap} */
export const CO_RFI_MAP = buildFreqMap({ raise: CO_RAISE, mix: CO_MIX });

/** @type {ScenarioMap} */
export const BTN_RFI_MAP = buildFreqMap({ raise: BTN_RAISE, mix: BTN_MIX });

/**
 * SB is built manually: raise_value → 'raise', raise_bluff → 'bluff', limp → 'limp'.
 * @type {ScenarioMap}
 */
export const SB_RFI_MAP = (() => {
  const map = {};
  for (const h of all169()) {
    if (SB_RAISE_VALUE.has(h))      map[h] = { primary: 'raise', secondary: 'fold', freq: 1.0 };
    else if (SB_RAISE_BLUFF.has(h)) map[h] = { primary: 'bluff', secondary: 'fold', freq: 1.0 };
    else if (SB_LIMP.has(h))        map[h] = { primary: 'limp',  secondary: 'fold', freq: 1.0 };
    else                            map[h] = { primary: 'fold',  secondary: 'fold', freq: 1.0 };
  }
  return map;
})();

/** Lookup by position string (9-handed order: UTG→UTG1→UTG2→LJ→HJ→CO→BTN→SB). */
export const RFI_MAPS = {
  UTG:  UTG_RFI_MAP,
  UTG1: UTG1_RFI_MAP,
  UTG2: UTG2_RFI_MAP,
  LJ:   LJ_RFI_MAP,
  HJ:   HJ_RFI_MAP,
  CO:   CO_RFI_MAP,
  BTN:  BTN_RFI_MAP,
  SB:   SB_RFI_MAP,
};

// ══════════════════════════════════════════════════════════════════════════════
// FACING RFI RANGES  (hero response to a single open raise)
// threebet = bluff/value 3-bet, call = flat call, fold = everything else
// ══════════════════════════════════════════════════════════════════════════════

const FACING_RFI_SETS = {
  UTG: {
    HJ:  { threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','A5s','A4s']),
           call:     new Set(['TT','99','AQs','KQs']) },
    CO:  { threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs','A5s','A4s']),
           call:     new Set(['TT','99','88','AQo','AJs','KQs','KJs','QJs','JTs','T9s']) },
    BTN: { threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs','AJs','A5s','A4s','A3s']),
           call:     new Set(['TT','99','88','77','AQo','AJo','KQs','KJs','KTs','QJs','JTs','T9s','98s','87s']) },
    SB:  { threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','A5s','A4s']),
           call:     new Set(['TT','99','AQs','KQs']) },
    BB:  { threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs','A5s','A4s','A3s','A2s']),
           call:     new Set(['TT','99','88','77','66','55','44','33','22','AQo','AJo','ATs',
                              'KQs','KJs','KTs','KQo','QJs','JTs','T9s','98s','87s','76s','65s','54s']) },
  },
  HJ: {
    CO:  { threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs','A5s','A4s']),
           call:     new Set(['TT','99','88','77','AQo','AJs','ATs','KQs','KJs','QJs','JTs','T9s','98s']) },
    BTN: { threebet: new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AJs','KQs','A5s','A4s','A3s']),
           call:     new Set(['99','88','77','AQo','AJo','ATs','KJs','KTs','KQo','QJs','QTs','JTs','T9s','98s','87s','76s']) },
    SB:  { threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','A5s','A4s','A3s']),
           call:     new Set(['TT','99','88','AQs','KQs']) },
    BB:  { threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs','A5s','A4s','A3s','A2s']),
           call:     new Set(['TT','99','88','77','66','55','44','33','22','AQo','AJo','ATs','A9s',
                              'KQs','KJs','KTs','KQo','QJs','QTs','JTs','T9s','98s','87s','76s','65s','54s']) },
  },
  CO: {
    BTN: { threebet: new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AJs','KQs','A5s','A4s','A3s']),
           call:     new Set(['99','88','77','66','55','AQo','AJo','ATs','A9s','KJs','KTs','KJo','KQo',
                              'QJs','QTs','QJo','JTs','T9s','98s','87s','76s','65s']) },
    SB:  { threebet: new Set(['AA','KK','QQ','JJ','TT','99','AKs','AKo','AQs','AJs','ATs',
                              'A5s','A4s','A3s','A2s','KQs','QJs','JTs','T9s','98s']),
           call:     new Set([]) },                        // 0% call — 3-bet or fold
    BB:  { threebet: new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AJs','A5s','A4s','A3s','A2s']),
           call:     new Set(['99','88','77','66','55','44','33','22','AQo','AJo','ATs','A9s','A8s',
                              'KQs','KJs','KTs','K9s','KQo','QJs','QTs','JTs','T9s','98s','87s','76s','65s','54s']) },
  },
  BTN: {
    SB:  { threebet: new Set(['AA','KK','QQ','JJ','TT','99','88','AKs','AKo','AQs','AJs','ATs','KQs','KJs',
                              'A5s','A4s','A3s','A2s','QJs','JTs','T9s','98s','87s','76s','K9s','Q9s']),
           call:     new Set([]) },                        // 0% call — 3-bet or fold
    BB:  { threebet: new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AJs','KQs','A5s','A4s','A3s','A2s']),
           call:     new Set(['99','88','77','66','55','44','33','22','AQo','AJo','ATs','A9s','A8s','A7s',
                              'KJs','KTs','K9s','K8s','KQo','QJs','QTs','JTs','T9s','98s','87s','76s','65s','54s','43s']) },
  },
  SB: {
    BB:  { threebet: new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AJs','KQs','A5s','A4s','A3s']),
           call:     new Set(['99','88','77','66','55','44','33','22','AQo','AJo','ATs','A9s',
                              'KJs','KTs','KQo','QJs','QTs','JTs','T9s','98s','87s','76s','65s']) },
  },
};

/**
 * Build a frequency map for a facing-RFI scenario.
 * threebet → 'bluff' color (blue), call → 'call' color (purple).
 * @param {string} openerPos
 * @param {string} heroPos
 * @returns {ScenarioMap | null}
 */
export function getFacingRFIMap(openerPos, heroPos) {
  const scenario = FACING_RFI_SETS[openerPos]?.[heroPos];
  if (!scenario) return null;
  return buildFreqMap({ bluff: scenario.threebet, call: scenario.call });
}

/** All valid [openerPos, heroPos] pairs for facing-RFI scenarios. */
export const FACING_RFI_POSITIONS = Object.entries(FACING_RFI_SETS).flatMap(
  ([opener, heroes]) => Object.keys(heroes).map(hero => ({ openerPos: opener, heroPos: hero }))
);

/** Whether SB calling is valid (0% call rate vs BTN/CO). */
export function sbCallAllowed(openerPos) {
  return !['BTN', 'CO'].includes(openerPos);
}

// ══════════════════════════════════════════════════════════════════════════════
// RFI vs 3-BET  (open-raiser's response to a 3-bet)
// 4-bet value → 'raise', 4-bet bluff → 'bluff', call → 'call'
// ══════════════════════════════════════════════════════════════════════════════

const VS_3BET_SETS = {
  UTG: {
    vs_tight: {
      fourBetValue: new Set(['AA','KK','AKs','AKo']),
      fourBetBluff: new Set(['A5s','A4s','A3s','A2s']),
      call:         new Set(['QQ','JJ','TT','99','AQs','KQs','AQo']),
    },
    vs_late: {
      fourBetValue: new Set(['AA','KK','AKs','AKo']),
      fourBetBluff: new Set(['A5s','A4s','A3s','A2s']),
      call:         new Set(['QQ','JJ','TT','99','88','AQs','KQs','AQo','AJs']),
    },
  },
  HJ: {
    vs_tight: {
      fourBetValue: new Set(['AA','KK','AKs','AKo']),
      fourBetBluff: new Set(['A5s','A4s','A3s']),
      call:         new Set(['QQ','JJ','TT','99','AQs','KQs']),
    },
    vs_late: {
      fourBetValue: new Set(['AA','KK','QQ','AKs','AKo']),
      fourBetBluff: new Set(['A5s','A4s','A3s','A2s']),
      call:         new Set(['JJ','TT','99','88','77','AQs','AJs','KQs','QJs','JTs','T9s']),
    },
  },
  CO: {
    vs_BTN_SB: {
      fourBetValue: new Set(['AA','KK','QQ','AKs','AKo']),
      fourBetBluff: new Set(['A5s','A4s','A3s','A2s','KQs']),
      call:         new Set(['JJ','TT','99','88','77','AQs','AJs','KJs','QJs','JTs','T9s','98s']),
    },
    vs_BB: {
      fourBetValue: new Set(['AA','KK','QQ','AKs','AKo']),
      fourBetBluff: new Set(['A5s','A4s','A3s','A2s','KQs']),
      call:         new Set(['JJ','TT','99','88','77','AQs','AJs','KJs','QJs','JTs','T9s','98s']),
    },
  },
  BTN: {
    vs_SB_BB: {
      fourBetValue: new Set(['AA','KK','QQ','JJ','AKs','AKo']),
      fourBetBluff: new Set(['A5s','A4s','A3s','A2s','K9s','QJs']),
      call:         new Set(['TT','99','88','77','66','AQs','AJs','ATs','KQs','KJs','JTs','T9s','98s','87s']),
    },
  },
  SB: {
    vs_BB: {
      // AA/KK/AKo limped pre — different 4-bet construct
      fourBetValue: new Set(['QQ','JJ','AKs']),
      fourBetBluff: new Set(['A5s','A4s','KJs']),
      call:         new Set(['TT','99','88','AQs','AJs','KQs']),
    },
  },
};

/**
 * Build a frequency map for an RFI vs 3-bet scenario.
 * 4-bet value → 'raise', 4-bet bluff → 'bluff', call → 'call'.
 * @param {string} openPos
 * @param {string} threeBetPos
 * @returns {ScenarioMap | null}
 */
export function getVs3BetMap(openPos, threeBetPos) {
  const posMap = VS_3BET_SETS[openPos];
  if (!posMap) return null;

  let scenario;
  if (openPos === 'UTG') {
    scenario = ['HJ','CO'].includes(threeBetPos) ? posMap.vs_tight : posMap.vs_late;
  } else if (openPos === 'HJ') {
    scenario = ['UTG'].includes(threeBetPos) ? posMap.vs_tight : posMap.vs_late;
  } else if (openPos === 'CO') {
    scenario = threeBetPos === 'BB' ? posMap.vs_BB : posMap.vs_BTN_SB;
  } else if (openPos === 'BTN') {
    scenario = posMap.vs_SB_BB;
  } else if (openPos === 'SB') {
    scenario = posMap.vs_BB;
  }
  if (!scenario) return null;

  return buildFreqMap({
    raise: scenario.fourBetValue,
    bluff: scenario.fourBetBluff,
    call:  scenario.call,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Count combos and play percentage for a scenario map.
 *
 * Two measures returned:
 * - `rangeCombos`  / `rangePct`    — unweighted: every non-fold hand counts at full combo value.
 *   This is the standard way to report opening range size (e.g. "BTN opens 51.1%").
 * - `weightedCombos` / `weightedPct` — frequency-weighted: mix hands count at their freq.
 *   Reflects the actual EV-weighted play frequency.
 *
 * @param {ScenarioMap} map
 * @returns {{ rangeCombos:number, rangePct:string, weightedCombos:number, weightedPct:string }}
 */
export function validateScenario(map) {
  let rangeC = 0, weightedC = 0;
  for (const [hand, entry] of Object.entries(map)) {
    const c = comboCount(hand);
    if (entry.primary !== 'fold') {
      rangeC    += c;
      weightedC += c * entry.freq;
    }
  }
  return {
    rangeCombos:    rangeC,
    rangePct:       (rangeC    / 1326 * 100).toFixed(2) + '%',
    weightedCombos: Math.round(weightedC),
    weightedPct:    (weightedC / 1326 * 100).toFixed(2) + '%',
  };
}

/** Run validation on all RFI scenarios and return a summary string. */
export function runRFIValidation() {
  const positions = ['UTG','HJ','CO','BTN','SB'];
  return positions.map(pos => {
    const v = validateScenario(RFI_MAPS[pos]);
    return `${pos.padEnd(3)}: ${String(v.rangeCombos).padStart(3)} combos (${v.rangePct} range  |  ${v.weightedPct} weighted)`;
  }).join('\n');
}
