// =============================================================================
// mathEngine.js — Poker Math Engine
// =============================================================================
//
// PURPOSE:
//   Pure poker mathematics. No React, no UI, no imports from screens or
//   components. Every function takes plain numbers and returns plain numbers
//   or plain objects.
//
// CONSUMERS (who imports this):
//   - screens/MathScreen.js      → drill question generation
//   - engine/coachEngine.js      → real-time pot odds checks during coaching
//   - (future) engine/gameEngine → pot-odds display overlay during simulator
//
// API SUMMARY:
//   Core formulas:
//     calculatePotOdds(call, pot)         → equity % needed to break even
//     calculateMDF(pot, bet)              → minimum defend frequency %
//     calculateAlpha(bet, pot)            → fold % for bluff to profit
//     calculateSPR(effectiveStack, pot)   → stack-to-pot ratio + classification
//     calculateEV(equityPct, totalPot, call) → expected value in $ or bb
//
//   Quiz generation (used by MathScreen):
//     generateQuestion(drillType)         → full question object ready to render
//     DRILL_TYPES                         → array of { id, label } for UI pills
//
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: CORE FORMULA FUNCTIONS
// These are the true engine. They work on raw numbers with no game context.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pot Odds — the minimum equity percentage you need to profitably call a bet.
 *
 * Formula:  Call ÷ (Call + Total Pot After Call)
 * Example:  Pot $100, villain bets $50 → call $50 into $200 total → 25% equity needed
 *
 * @param {number} call   - Amount you must put in to call (e.g. 50)
 * @param {number} pot    - Pot size BEFORE the call (e.g. 150 = original pot + villain's bet)
 * @returns {number}      - Equity % needed, rounded to nearest integer (e.g. 25)
 */
export function calculatePotOdds(call, pot) {
  if (call <= 0 || pot <= 0) return 0;
  const totalPotAfterCall = pot + call;
  return Math.round((call / totalPotAfterCall) * 100);
}

/**
 * MDF (Minimum Defense Frequency) — how often you must continue vs a bet to
 * prevent villain from profitably bluffing ANY two cards.
 *
 * Formula:  Pot ÷ (Pot + Bet)
 * Example:  Pot $100, villain bets $50 → 100/150 = 67% — fold more than 33%
 *           and every bluff is instantly profitable for them.
 *
 * @param {number} pot  - Pot size before villain's bet (e.g. 100)
 * @param {number} bet  - Villain's bet size (e.g. 50)
 * @returns {number}    - Minimum defend frequency %, rounded (e.g. 67)
 */
export function calculateMDF(pot, bet) {
  if (pot <= 0 || bet <= 0) return 0;
  return Math.round((pot / (pot + bet)) * 100);
}

/**
 * Alpha — the fold frequency your bluff needs to be immediately profitable.
 * This is exactly 1 − MDF.
 *
 * Formula:  Bet ÷ (Bet + Pot)   (equivalently: 1 − MDF)
 * Example:  You bet $50 into $100 → 50/150 = 33% — if villain folds 33%+, profit.
 *
 * @param {number} bet  - Your bet size (e.g. 50)
 * @param {number} pot  - Pot size before your bet (e.g. 100)
 * @returns {number}    - Required fold % for bluff to profit, rounded (e.g. 33)
 */
export function calculateAlpha(bet, pot) {
  if (bet <= 0 || pot <= 0) return 0;
  return Math.round((bet / (bet + pot)) * 100);
}

/**
 * SPR (Stack-to-Pot Ratio) — how deep you are relative to the pot.
 * Determines commitment thresholds for different hand strengths.
 *
 * Formula:  Effective Stack ÷ Pot Size on Flop
 *
 * Classification:
 *   < 1    → Committed (any top pair is a stack-off)
 *   1–3    → Low SPR  (TPTK+ to stack off)
 *   3–6    → Medium   (Two pair+ to stack off — most common cash game scenario)
 *   6–13   → High SPR (Sets/straights to stack off)
 *   > 13   → Very Deep (Nutted hands only)
 *
 * @param {number} effectiveStack - Smaller of the two stacks (e.g. 100)
 * @param {number} pot            - Pot size on the flop (e.g. 20)
 * @returns {{ ratio: number, label: string, stackOffRequirement: string }}
 */
export function calculateSPR(effectiveStack, pot) {
  if (effectiveStack <= 0 || pot <= 0) return { ratio: 0, label: 'Committed (< 1)', stackOffRequirement: 'Any pair' };
  const ratio = Math.round((effectiveStack / pot) * 10) / 10;

  if (ratio < 1)  return { ratio, label: 'Committed (< 1)',  stackOffRequirement: 'Any pair or better' };
  if (ratio < 3)  return { ratio, label: 'Low SPR 1–3',      stackOffRequirement: 'Top Pair Top Kicker or better' };
  if (ratio < 6)  return { ratio, label: 'Medium SPR 3–6',   stackOffRequirement: 'Two pair or better' };
  if (ratio <= 13) return { ratio, label: 'High SPR 6–13',   stackOffRequirement: 'Sets, straights, or flushes' };
  return             { ratio, label: 'Very Deep (> 13)',      stackOffRequirement: 'Nutted hands only' };
}

/**
 * EV (Expected Value) of a call decision.
 *
 * Formula:  (Equity × Total Pot After Call) − Call Amount
 * Positive result → call is profitable. Negative → fold is better.
 *
 * @param {number} equityPct  - Your equity as a percentage (e.g. 35 for 35%)
 * @param {number} totalPot   - Total pot AFTER you call (original pot + villain bet + your call)
 * @param {number} call       - Amount you must put in (e.g. 50)
 * @returns {{ ev: number, isPositive: boolean, decision: string }}
 */
export function calculateEV(equityPct, totalPot, call) {
  const ev = Math.round(((equityPct / 100) * totalPot - call) * 100) / 100;
  return {
    ev,
    isPositive: ev > 0,
    decision: ev > 0 ? 'Call (positive EV)' : 'Fold (negative EV)',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: REFERENCE TABLES
// Pre-computed answers for common bet sizes. Used by quiz generators and
// the quick-reference table in MathScreen.
// ─────────────────────────────────────────────────────────────────────────────

// Pot Odds: equity needed to call a bet of X% pot
// Formula verified: betAmt / (pot + 2*betAmt)  [pot + bet + call]
export const POT_ODDS_TABLE = [
  { betPct: 25,  equityNeeded: 17 },  // 25 ÷ 150
  { betPct: 33,  equityNeeded: 20 },  // 33 ÷ 166
  { betPct: 50,  equityNeeded: 25 },  // 50 ÷ 200
  { betPct: 67,  equityNeeded: 29 },  // 67 ÷ 234
  { betPct: 75,  equityNeeded: 30 },  // 75 ÷ 250
  { betPct: 100, equityNeeded: 33 },  // 100 ÷ 300
  { betPct: 125, equityNeeded: 36 },  // 125 ÷ 350
  { betPct: 150, equityNeeded: 38 },  // 150 ÷ 400
];

// MDF: how often you must continue vs a bet of X% pot
// Formula verified: 100 / (100 + betPct)
export const MDF_TABLE = [
  { betPct: 25,  mdf: 80 },  // 100 ÷ 125
  { betPct: 33,  mdf: 75 },  // 100 ÷ 133
  { betPct: 50,  mdf: 67 },  // 100 ÷ 150
  { betPct: 67,  mdf: 60 },  // 100 ÷ 167
  { betPct: 75,  mdf: 57 },  // 100 ÷ 175
  { betPct: 100, mdf: 50 },  // 100 ÷ 200
  { betPct: 125, mdf: 44 },  // 100 ÷ 225
  { betPct: 150, mdf: 40 },  // 100 ÷ 250
];

// Alpha: fold frequency required for a bluff of X% pot to immediately profit
// Formula verified: betPct / (100 + betPct)  = 1 - MDF
export const ALPHA_TABLE = [
  { betPct: 25,  alpha: 20 },
  { betPct: 33,  alpha: 25 },
  { betPct: 50,  alpha: 33 },
  { betPct: 67,  alpha: 40 },
  { betPct: 75,  alpha: 43 },
  { betPct: 100, alpha: 50 },
  { betPct: 125, alpha: 56 },
  { betPct: 150, alpha: 60 },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: QUIZ GENERATION
// Produces self-contained question objects. Each object has everything needed
// to display a question and evaluate an answer — no UI logic inside.
// ─────────────────────────────────────────────────────────────────────────────

/** Randomly reorders an array. Pure — returns a new array. */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks 3 wrong-answer distractors from a reference table that are at least
 * `minGap` percentage points away from the correct answer.
 * Falls back to a set of well-spaced anchors if the table doesn't have enough.
 *
 * @param {Array<{ans?: number, equityNeeded?: number, mdf?: number, alpha?: number}>} table
 * @param {number} correctAns
 * @param {number} minGap
 * @returns {number[]} - Array of 3 distractor values
 */
function pickDistractors(table, correctAns, minGap = 8) {
  // Normalise: each row may use .ans (legacy) or the named field
  const values = table.map(r => r.ans ?? r.equityNeeded ?? r.mdf ?? r.alpha);
  const far = shuffle(values.filter(v => Math.abs(v - correctAns) >= minGap));
  const result = far.slice(0, 3);
  const fallbacks = [10, 17, 20, 25, 30, 33, 40, 43, 50, 57, 60, 67, 75, 80];
  for (const v of fallbacks) {
    if (result.length >= 3) break;
    if (v !== correctAns && Math.abs(v - correctAns) >= minGap && !result.includes(v)) result.push(v);
  }
  return result.slice(0, 3);
}

/**
 * @typedef {Object} DrillQuestion
 * @property {'potodds'|'mdf'|'alpha'|'spr'|'ev'} type
 * @property {string}  question     - Full question text shown to user
 * @property {Array<{label: string, value: number|string}>} options - Shuffled answer choices
 * @property {number|string} correct - The correct answer value (matches one option's .value)
 * @property {string}  explanation  - Full worked explanation shown after answering
 * @property {string}  formula      - Short formula string for the quick-reference strip
 * @property {number}  [spr]        - SPR value (only present on 'spr' questions)
 * @property {number}  [ev]         - EV value in $ (only present on 'ev' questions)
 */

/**
 * Generates a randomised Pot Odds drill question.
 * @returns {DrillQuestion}
 */
function potOddsQuestion() {
  const row    = POT_ODDS_TABLE[Math.floor(Math.random() * POT_ODDS_TABLE.length)];
  const correct = row.equityNeeded;
  const pot    = [20, 30, 40, 50, 60, 80, 100][Math.floor(Math.random() * 7)];
  const betAmt = Math.round(pot * row.betPct / 100);
  const totalPot = pot + betAmt * 2;
  const options  = shuffle([correct, ...pickDistractors(POT_ODDS_TABLE, correct)]).map(v => ({ label: v + '%', value: v }));

  return {
    type: 'potodds',
    question: `Pot: $${pot}. Villain bets $${betAmt} (${row.betPct}% pot).\nWhat equity do you need to call?`,
    options,
    correct,
    explanation: `Pot Odds = Call ÷ (Call + Total Pot) = ${betAmt} ÷ ${totalPot} ≈ ${correct}%.\nYou need at least ${correct}% equity to break even.`,
    formula: 'Call ÷ (Call + Total Pot After Call)',
  };
}

/**
 * Generates a randomised MDF drill question.
 * @returns {DrillQuestion}
 */
function mdfQuestion() {
  const row    = MDF_TABLE[Math.floor(Math.random() * MDF_TABLE.length)];
  const correct = row.mdf;
  const pot    = [20, 30, 40, 50, 60, 80, 100][Math.floor(Math.random() * 7)];
  const betAmt = Math.round(pot * row.betPct / 100);
  const options  = shuffle([correct, ...pickDistractors(MDF_TABLE, correct)]).map(v => ({ label: v + '%', value: v }));

  return {
    type: 'mdf',
    question: `Pot: $${pot}. Villain bets $${betAmt} (${row.betPct}% pot).\nHow often must you continue (MDF) to deny a profitable bluff?`,
    options,
    correct,
    explanation: `MDF = Pot ÷ (Pot + Bet) = ${pot} ÷ ${pot + betAmt} ≈ ${correct}%.\nFolding more than ${100 - correct}% makes every bluff profitable for villain.`,
    formula: 'Pot ÷ (Pot + Bet)',
  };
}

/**
 * Generates a randomised Alpha drill question.
 * @returns {DrillQuestion}
 */
function alphaQuestion() {
  const row    = ALPHA_TABLE[Math.floor(Math.random() * ALPHA_TABLE.length)];
  const correct = row.alpha;
  const pot    = [20, 30, 40, 50, 60, 80, 100][Math.floor(Math.random() * 7)];
  const betAmt = Math.round(pot * row.betPct / 100);
  const options  = shuffle([correct, ...pickDistractors(ALPHA_TABLE, correct)]).map(v => ({ label: v + '%', value: v }));

  return {
    type: 'alpha',
    question: `Pot: $${pot}. You bet $${betAmt} (${row.betPct}% pot) as a bluff.\nWhat fold frequency (Alpha) makes this bet immediately profitable?`,
    options,
    correct,
    explanation: `Alpha = Bet ÷ (Bet + Pot) = ${betAmt} ÷ ${betAmt + pot} ≈ ${correct}%.\nAlternatively: Alpha = 1 − MDF. If villain folds more than ${correct}%, the bluff is instantly profitable.`,
    formula: 'Bet ÷ (Bet + Pot)   ·   or: 1 − MDF',
  };
}

/**
 * Generates a randomised SPR classification drill question.
 * @returns {DrillQuestion}
 */
function sprQuestion() {
  const POTS   = [10, 15, 20, 30, 40, 50];
  const STACKS = [30, 50, 80, 100, 150, 200, 300];
  const pot    = POTS[Math.floor(Math.random() * POTS.length)];
  const stack  = STACKS[Math.floor(Math.random() * STACKS.length)];
  const { ratio: spr, label: correct, stackOffRequirement } = calculateSPR(stack, pot);

  const allLabels = [
    'Committed (< 1)', 'Low SPR 1–3', 'Medium SPR 3–6', 'High SPR 6–13', 'Very Deep (> 13)',
  ];
  const options = shuffle(allLabels).map(v => ({ label: v, value: v }));

  return {
    type: 'spr',
    question: `Effective stack: $${stack}. Pot on the flop: $${pot}. Calculate the SPR and classify it.`,
    options,
    correct,
    spr,
    explanation: `SPR = Stack ÷ Pot = ${stack} ÷ ${pot} = ${spr}. Classification: ${correct}. Stack off with: ${stackOffRequirement}.`,
    formula: 'Effective Stack ÷ Pot Size on Flop',
  };
}

/**
 * Generates a randomised EV (call vs fold) drill question.
 * @returns {DrillQuestion}
 */
function evQuestion() {
  const EQUITIES = [25, 30, 35, 40, 45, 50];
  const CALLS    = [20, 30, 40, 50, 60];
  const POTS     = [80, 100, 120, 150, 200];
  const eq   = EQUITIES[Math.floor(Math.random() * EQUITIES.length)];
  const pot  = POTS[Math.floor(Math.random() * POTS.length)];
  const call = CALLS[Math.floor(Math.random() * CALLS.length)];

  const totalPot = pot + call;
  const { ev, decision: correct } = calculateEV(eq, totalPot, call);

  const options = shuffle([
    { label: 'Call (positive EV)', value: 'Call (positive EV)' },
    { label: 'Fold (negative EV)', value: 'Fold (negative EV)' },
  ]);

  return {
    type: 'ev',
    question: `You have ${eq}% equity. Pot: $${pot}. Villain bets $${call}. You must call $${call}.\nEV = (${eq}% × $${totalPot}) − $${call}. Should you call or fold?`,
    options,
    correct,
    ev,
    explanation: `EV = (Equity × Total Pot) − Call = (${eq / 100} × $${totalPot}) − $${call} = $${Math.round(eq / 100 * totalPot * 100) / 100} − $${call} = $${ev}.\nThis is a ${ev > 0 ? 'POSITIVE' : 'NEGATIVE'} EV call — you should ${ev > 0 ? 'CALL' : 'FOLD'}.`,
    formula: 'EV = (Equity × Total Pot) − Call Amount',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: PUBLIC API — DRILL GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/** Maps each drill type id to its generator function. */
const DRILL_GENERATORS = {
  potodds: potOddsQuestion,
  mdf:     mdfQuestion,
  alpha:   alphaQuestion,
  spr:     sprQuestion,
  ev:      evQuestion,
};

/**
 * All supported drill types. Safe to iterate in UI for pill/tab rendering.
 * @type {Array<{id: string, label: string}>}
 */
export const DRILL_TYPES = [
  { id: 'all',     label: 'All Drills' },
  { id: 'potodds', label: 'Pot Odds'   },
  { id: 'mdf',     label: 'MDF'        },
  { id: 'alpha',   label: 'Alpha'      },
  { id: 'spr',     label: 'SPR'        },
  { id: 'ev',      label: 'EV'         },
];

/**
 * Generates a randomised drill question of the specified type.
 * Pass 'all' to get a random drill type each call.
 *
 * @param {'all'|'potodds'|'mdf'|'alpha'|'spr'|'ev'} drillType
 * @returns {DrillQuestion}
 */
export function generateQuestion(drillType) {
  if (drillType === 'all') {
    const generators = Object.values(DRILL_GENERATORS);
    return generators[Math.floor(Math.random() * generators.length)]();
  }
  const gen = DRILL_GENERATORS[drillType];
  if (!gen) throw new Error(`mathEngine: unknown drill type "${drillType}"`);
  return gen();
}

/**
 * Quick-reference formula sheet. Used by the collapsible reference panel in
 * MathScreen. No quiz logic — just display strings.
 * @type {Array<{name: string, formula: string, colorKey: string}>}
 */
export const FORMULA_REFERENCE = [
  { name: 'Pot Odds', formula: 'Call ÷ (Call + Pot After Call)',      colorKey: 'green'  },
  { name: 'MDF',      formula: 'Pot ÷ (Pot + Bet)',                    colorKey: 'blue'   },
  { name: 'Alpha',    formula: 'Bet ÷ (Bet + Pot)  =  1 − MDF',       colorKey: 'red'    },
  { name: 'SPR',      formula: 'Effective Stack ÷ Flop Pot',           colorKey: 'amber'  },
  { name: 'EV (Call)','formula': '(Equity × Total Pot) − Call',        colorKey: 'purple' },
  { name: 'EV (Bluff)','formula':'(Fold% × Pot) − (Call% × Bet)',      colorKey: 'purple' },
];
