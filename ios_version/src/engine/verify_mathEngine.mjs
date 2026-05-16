// =============================================================================
// verify_mathEngine.mjs — Verification script for mathEngine.js
// =============================================================================
// Run from the project root:
//   node src/engine/verify_mathEngine.mjs
//
// Expected output: all tests PASS. No app, no React, no simulator needed.
// =============================================================================

import {
  calculatePotOdds,
  calculateMDF,
  calculateAlpha,
  calculateSPR,
  calculateEV,
  generateQuestion,
  DRILL_TYPES,
  POT_ODDS_TABLE,
  MDF_TABLE,
  ALPHA_TABLE,
} from './mathEngine.js';

let passed = 0;
let failed = 0;

function test(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.log(`  ❌  ${label}`);
    console.log(`       expected: ${JSON.stringify(expected)}`);
    console.log(`       received: ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── POT ODDS ─────────────────────────────────────────────────────');
// Pot: $100. Villain bets $50 (50% pot). Call $50 into $200 total = 25%
test('50% pot bet → 25% equity needed',  calculatePotOdds(50, 150),  25);
// Pot: $100. Villain bets $100 (100% pot). Call $100 into $300 total = 33%
test('100% pot bet → 33% equity needed', calculatePotOdds(100, 200), 33);
// Pot: $100. Villain bets $33 (33% pot). Call $33 into $166 total = 20%
test('33% pot bet → 20% equity needed',  calculatePotOdds(33, 133),  20);
// Edge: zero inputs return 0
test('zero call → 0',  calculatePotOdds(0, 100), 0);
test('zero pot → 0',   calculatePotOdds(50, 0),  0);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── MDF ──────────────────────────────────────────────────────────');
// Pot $100, bet $50 (50% pot) → MDF = 100/(100+50) = 67%
test('50% pot bet → MDF 67%',  calculateMDF(100, 50),  67);
// Pot $100, bet $100 (100% pot) → MDF = 100/200 = 50%
test('100% pot bet → MDF 50%', calculateMDF(100, 100), 50);
// Pot $100, bet $25 (25% pot) → MDF = 100/125 = 80%
test('25% pot bet → MDF 80%',  calculateMDF(100, 25),  80);
// Relationship: MDF + Alpha should always equal 100
const mdf = calculateMDF(100, 75);
const alpha = calculateAlpha(75, 100);
test('MDF + Alpha = 100 (75% pot bet)', mdf + alpha, 100);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── ALPHA ────────────────────────────────────────────────────────');
// Bet $50 into $100 → Alpha = 50/(50+100) = 33%
test('$50 into $100 → Alpha 33%', calculateAlpha(50, 100),  33);
// Bet $100 into $100 → Alpha = 100/200 = 50%
test('pot-size bet → Alpha 50%',  calculateAlpha(100, 100), 50);
// Bet $25 into $100 → Alpha = 25/125 = 20%
test('$25 into $100 → Alpha 20%', calculateAlpha(25, 100),  20);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── SPR ──────────────────────────────────────────────────────────');
test('stack 100, pot 20 → Medium SPR 5.0',
  calculateSPR(100, 20),
  { ratio: 5, label: 'Medium SPR 3–6', stackOffRequirement: 'Two pair or better' }
);
test('stack 30, pot 50 → Committed (< 1) SPR 0.6',
  calculateSPR(30, 50),
  { ratio: 0.6, label: 'Committed (< 1)', stackOffRequirement: 'Any pair or better' }
);
test('stack 200, pot 20 → High SPR 10.0',
  calculateSPR(200, 20),
  { ratio: 10, label: 'High SPR 6–13', stackOffRequirement: 'Sets, straights, or flushes' }
);
test('stack 300, pot 10 → Very Deep SPR 30.0',
  calculateSPR(300, 10),
  { ratio: 30, label: 'Very Deep (> 13)', stackOffRequirement: 'Nutted hands only' }
);
test('stack 50, pot 30 → Low SPR 1.7',
  calculateSPR(50, 30),
  { ratio: 1.7, label: 'Low SPR 1–3', stackOffRequirement: 'Top Pair Top Kicker or better' }
);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── EV ───────────────────────────────────────────────────────────');
// 35% equity, total pot $200, call $50 → EV = (0.35 × 200) − 50 = 70 − 50 = $20 positive
test('35% eq, pot $200, call $50 → +EV $20',
  calculateEV(35, 200, 50),
  { ev: 20, isPositive: true, decision: 'Call (positive EV)' }
);
// 20% equity, total pot $150, call $50 → EV = (0.20 × 150) − 50 = 30 − 50 = -$20 negative
test('20% eq, pot $150, call $50 → -EV -$20',
  calculateEV(20, 150, 50),
  { ev: -20, isPositive: false, decision: 'Fold (negative EV)' }
);
// 33% equity, total pot $150, call $50 → EV = (0.33 × 150) − 50 = 49.5 − 50 = -$0.5 (just below break-even)
test('33% eq, pot $150, call $50 → slightly -EV',
  calculateEV(33, 150, 50).isPositive,
  false
);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── REFERENCE TABLES (spot-check values match formulas) ──────────');
// Verify every row of POT_ODDS_TABLE matches calculatePotOdds()
let tableOk = true;
for (const row of POT_ODDS_TABLE) {
  const betAmt = Math.round(100 * row.betPct / 100);
  const computed = calculatePotOdds(betAmt, 100 + betAmt);
  if (computed !== row.equityNeeded) { tableOk = false; break; }
}
test('All POT_ODDS_TABLE rows match calculatePotOdds()', tableOk, true);

// Verify every row of MDF_TABLE matches calculateMDF()
let mdfOk = true;
for (const row of MDF_TABLE) {
  const betAmt = Math.round(100 * row.betPct / 100);
  const computed = calculateMDF(100, betAmt);
  if (computed !== row.mdf) { mdfOk = false; break; }
}
test('All MDF_TABLE rows match calculateMDF()', mdfOk, true);

// Verify every row of ALPHA_TABLE matches calculateAlpha()
let alphaOk = true;
for (const row of ALPHA_TABLE) {
  const betAmt = Math.round(100 * row.betPct / 100);
  const computed = calculateAlpha(betAmt, 100);
  if (computed !== row.alpha) { alphaOk = false; break; }
}
test('All ALPHA_TABLE rows match calculateAlpha()', alphaOk, true);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── QUESTION GENERATOR ───────────────────────────────────────────');
// Run each drill type 10 times and verify structure
const TYPES = ['potodds', 'mdf', 'alpha', 'spr', 'ev', 'all'];
let genOk = true;
let genError = '';
for (const type of TYPES) {
  for (let i = 0; i < 10; i++) {
    try {
      const q = generateQuestion(type);
      if (!q.type || !q.question || !q.options || q.correct === undefined || !q.explanation || !q.formula) {
        genOk = false;
        genError = `Missing field in ${type} question: ${JSON.stringify(Object.keys(q))}`;
        break;
      }
      if (!q.options.some(o => String(o.value) === String(q.correct))) {
        genOk = false;
        genError = `Correct answer "${q.correct}" not found in options for type "${type}"`;
        break;
      }
    } catch (e) {
      genOk = false;
      genError = `${type}: ${e.message}`;
      break;
    }
  }
  if (!genOk) break;
}
test('generateQuestion() produces valid objects for all types (10 runs each)', genOk, true);
if (!genOk) console.log(`       Error: ${genError}`);

test('DRILL_TYPES has 6 entries', DRILL_TYPES.length, 6);
test('DRILL_TYPES all have id + label', DRILL_TYPES.every(d => d.id && d.label), true);

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✅  mathEngine.js is verified — all calculations correct.\n');
} else {
  console.log('❌  Some tests failed. Review output above.\n');
  process.exit(1);
}
