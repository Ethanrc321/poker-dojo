// ============================================================
// GTO Preflop Ranges — 8-max, 100bb, ante in play
// Source: PokerCoaching.com charts (same as pokerRanges.js canonical data)
// ============================================================

export const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

// Simulator positions (6-max UI)
export const POSITIONS = ['UTG','HJ','CO','BTN','SB','BB'];

// All positions including 9-handed labels (used for charts / display)
export const POSITION_LABELS = {
  UTG:  'Under the Gun',
  UTG1: 'UTG+1',
  UTG2: 'UTG+2',
  LJ:   'Lojack',
  HJ:   'Hijack',
  CO:   'Cutoff',
  BTN:  'Button',
  SB:   'Small Blind',
  BB:   'Big Blind',
};

// ── UTG (10.1% — 134 combos, pure raise/fold, no mix) ────────
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

// ── HJ  (21.3% — 282 combos, pure raise/fold, no mix) ────────
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

// ── CO  (27.0% — 358 combos, pure raise/fold, no mix) ────────
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

// ── BTN  (51.1% — 678 combos, pure raise/fold, no mix) ───────
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

// ── SB RFI (vs all folds, open to 3bb) ──────────────────────
// SB uses a 4-action system (raise-value / raise-bluff / limp / fold)
// These sets are kept for RFI_RANGES.SB reference; coach logic uses
// getSBRFIAction() which reads SB_RAISE_VALUE/BLUFF/LIMP directly.
const SB_RAISE = new Set([
  'AA','KK','QQ','JJ','TT','99','88',
  'AKs','AQs','AJs','ATs','KQs','KJs','QJs',
  'AKo','AQo','AJo','ATo','KQo','KJo',
]);
const SB_MIX = new Set([
  // No mix — SB uses 4-action raise_value/raise_bluff/limp/fold system
]);

// ── BB Defense (call ranges, keyed by opener position) ───────
const BB_3BET = new Set([
  'AA','KK','QQ','JJ',
  'AKs','AQs',
  'AKo',
  'A5s','A4s','A3s',
]);

const BB_CALL_VS_UTG = new Set([
  '22','33','44','55','66','77','88','99','TT',
  'A2s','A3s','A4s','A5s','A6s','A7s','A8s','A9s',
  'K2s','K3s','K4s','K5s','K6s','K7s','K8s','K9s',
  'Q2s','Q3s','Q4s','Q5s','Q6s','Q7s','Q8s','Q9s',
  'J2s','J3s','J4s','J5s','J6s','J7s','J8s','J9s',
  'T8s','T9s','98s','97s','87s','86s','76s','65s','54s',
  'ATo','AJo',
  'KTo','KJo',
  'QTo','QJo',
  'JTo',
]);

const BB_CALL_VS_BTN = new Set([
  ...BB_CALL_VS_UTG,
  'A2o','A3o','A4o','A5o','A6o','A7o','A8o','A9o',
  'K2o','K3o','K4o','K5o','K6o','K7o','K8o','K9o',
  'Q2s','Q3s','Q4s','Q5s',
  '64s','53s','43s',
  'Q8o','Q9o',
  'J8o','J9o',
  'T7s','T8o','T9o',
  '97o','98o',
]);

const BB_CALL_VS_CO = new Set([
  ...BB_CALL_VS_UTG,
  'A2o','A3o','A4o','A5o',
  'K2o','K3o','K4o','K5o',
  '64s','53s','43s',
  'Q9o',
  'J8o','J9o',
  'T8o',
  '98o',
]);

const BB_CALL_VS_HJ = new Set([
  ...BB_CALL_VS_UTG,
  'A2o','A3o',
  'K2o','K3o',
  '64s','53s',
  'J8o',
  'T8o',
]);

const BB_CALL_VS_SB = new Set([
  ...BB_CALL_VS_BTN,
  'A2o','A3o','A4o','A5o','A6o','A7o','A8o','A9o',
  'K2o','K3o','K4o',
  'Q7o','Q8o','Q9o',
  'J7o','J8o',
  'T7o','T8o',
  '97o',
  '86o',
]);

export const BB_DEFENSE = {
  UTG: { call: BB_CALL_VS_UTG, threebet: BB_3BET },
  HJ:  { call: BB_CALL_VS_HJ,  threebet: BB_3BET },
  CO:  { call: BB_CALL_VS_CO,  threebet: BB_3BET },
  BTN: { call: BB_CALL_VS_BTN, threebet: BB_3BET },
  SB:  { call: BB_CALL_VS_SB,  threebet: new Set([...BB_3BET, 'KQs','QJs','JTs']) },
};

// ── 3-Bet Ranges ─────────────────────────────────────────────
export const THREE_BET_RANGES = {
  SB_vs_any: {
    value:  new Set(['QQ','KK','AA','AKs','AKo']),
    bluff:  new Set(['A4s','A3s','A2s','KJs','QJs','JTs']),
  },
  BTN_vs_any: {
    value:  new Set(['JJ','QQ','KK','AA','AQs','AKs','AKo']),
    bluff:  new Set(['A5s','A4s','A3s','A2s','K9s','QJs','JTs','T9s','98s','87s']),
    call:   new Set(['22','33','44','55','66','77','88','99','TT','KQs','QTs','AJs','KQo']),
  },
  CO_vs_early: {
    value:  new Set(['TT','JJ','QQ','KK','AA','AQs','AKs','AKo','KQs']),
    bluff:  new Set(['A5s','A4s','A3s','KJs','QJs','JTs','T9s','98s']),
  },
  HJ_vs_UTG: {
    value:  new Set(['TT','JJ','QQ','KK','AA','AQs','AKs','AKo']),
    bluff:  new Set(['A5s','A4s','A3s','A2s','KJs','QJs','JTs','T9s']),
  },
};

// ── 4-Bet Ranges ─────────────────────────────────────────────
export const FOUR_BET_RANGES = {
  value: new Set(['AA','KK','QQ','AKs','AKo']),
  bluff: new Set(['A5s','A4s','KQs']),
};

// ── SB RFI: 4-action strategy (raise value / raise bluff / limp / fold) ──
export const SB_RAISE_VALUE = new Set([
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

export const SB_RAISE_BLUFF = new Set([
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

export const SB_LIMP = new Set([
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

export function getSBRFIAction(hand) {
  if (SB_RAISE_VALUE.has(hand)) return 'raise_value';
  if (SB_RAISE_BLUFF.has(hand)) return 'raise_bluff';
  if (SB_LIMP.has(hand))        return 'limp';
  return 'fold';
}

// ── RFI vs 3-bet: what to do when you opened and face a 3-bet ────────────
export const RFI_VS_3BET = {
  UTG: {
    vs_tight: { // vs UTG+1 or UTG+2 3-bet (UTG vs UTG+1 3bet from chart)
      fourBetValue: new Set(['AA','KK','AKs','AKo']),
      fourBetBluff: new Set(['A5s','A4s','A3s','A2s']),
      call:         new Set(['QQ','JJ','TT','99','AQs','KQs','AQo']),
    },
    vs_late: { // vs CO/BTN or SB/BB 3-bet
      fourBetValue: new Set(['AA','KK','AKs','AKo']),
      fourBetBluff: new Set(['A5s','A4s','A3s','A2s']),
      call:         new Set(['QQ','JJ','TT','99','88','AQs','KQs','AQo','AJs']),
    },
  },
  HJ: {
    vs_tight: { // vs UTG or LJ
      fourBetValue: new Set(['AA','KK','AKs','AKo']),
      fourBetBluff: new Set(['A5s','A4s','A3s']),
      call:         new Set(['QQ','JJ','TT','99','AQs','KQs']),
    },
    vs_late: { // vs CO/BTN/SB/BB
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
      // AA/KK/AKo were limped — 3-bet or fold different here
      fourBetValue: new Set(['QQ','JJ','AKs']),
      fourBetBluff: new Set(['A5s','A4s','KJs']),
      call:         new Set(['TT','99','88','AQs','AJs','KQs']),
    },
  },
};

export function getVs3BetRange(openPos, threeBetPos) {
  const posMap = RFI_VS_3BET[openPos];
  if (!posMap) return null;
  if (openPos === 'UTG') {
    const tight = ['HJ','CO'].includes(threeBetPos) ? posMap.vs_tight : posMap.vs_late;
    return tight || posMap.vs_late;
  }
  if (openPos === 'HJ') {
    return ['UTG','LJ'].includes(threeBetPos) ? posMap.vs_tight : posMap.vs_late;
  }
  if (openPos === 'CO') {
    return threeBetPos === 'BB' ? posMap.vs_BB : posMap.vs_BTN_SB;
  }
  if (openPos === 'BTN') return posMap.vs_SB_BB;
  if (openPos === 'SB')  return posMap.vs_BB;
  return null;
}

// ── Master range lookup ──────────────────────────────────────
export const RFI_RANGES = {
  UTG: { raise: UTG_RAISE, mix: UTG_MIX },
  HJ:  { raise: HJ_RAISE,  mix: HJ_MIX  },
  CO:  { raise: CO_RAISE,  mix: CO_MIX  },
  BTN: { raise: BTN_RAISE, mix: BTN_MIX },
  SB:  { raise: SB_RAISE,  mix: SB_MIX  },
};

export function getRFIAction(hand, position) {
  if (position === 'BB') return null;
  if (position === 'SB') return getSBRFIAction(hand);
  const { raise, mix } = RFI_RANGES[position];
  if (raise.has(hand)) return 'raise';
  if (mix.has(hand))   return 'mix';
  return 'fold';
}

// ── EV Loss Classification ────────────────────────────────────
export function getEVLoss(correctAction, userAction) {
  if (correctAction === userAction) return { label: 'Correct', bb: 0, color: 'green' };

  // SB 4-action system
  if (correctAction === 'raise_value') {
    if (userAction === 'raise') return { label: 'Correct', bb: 0, color: 'green' };
    if (userAction === 'limp')  return { label: 'Significant Mistake', bb: -1.00, color: 'red' };
    if (userAction === 'fold')  return { label: 'Significant Mistake', bb: -0.80, color: 'red' };
  }
  if (correctAction === 'raise_bluff') {
    if (userAction === 'raise') return { label: 'Correct', bb: 0, color: 'green' };
    if (userAction === 'limp')  return { label: 'Medium Mistake', bb: -0.25, color: 'orange' };
    if (userAction === 'fold')  return { label: 'Minor Leak', bb: -0.10, color: 'amber' };
  }
  if (correctAction === 'limp') {
    if (userAction === 'raise') return { label: 'Minor Leak', bb: -0.10, color: 'amber' };
    if (userAction === 'fold')  return { label: 'Medium Mistake', bb: -0.20, color: 'orange' };
  }

  if (correctAction === 'mix') {
    if (userAction === 'raise') return { label: 'Minor Leak', bb: -0.05, color: 'amber' };
    if (userAction === 'fold')  return { label: 'Minor Leak', bb: -0.05, color: 'amber' };
    if (userAction === 'call')  return { label: 'Medium Mistake', bb: -0.20, color: 'orange' };
  }
  if (correctAction === 'raise') {
    if (userAction === 'fold') return { label: 'Significant Mistake', bb: -0.50, color: 'red' };
    if (userAction === 'call') return { label: 'Medium Mistake', bb: -0.25, color: 'orange' };
  }
  if (correctAction === 'fold') {
    if (userAction === 'raise') return { label: 'Significant Mistake', bb: -0.50, color: 'red' };
    if (userAction === 'call')  return { label: 'Medium Mistake', bb: -0.20, color: 'orange' };
  }
  return { label: 'Mistake', bb: -0.30, color: 'orange' };
}

// ── Hand nicknames ────────────────────────────────────────────
export const NICKNAMES = {
  AA:'Pocket Rockets', KK:'Cowboys', QQ:'Ladies', JJ:'Fishhooks',
  TT:'Dimes', '99':'Nines', '88':'Snowmen', '77':'Walking Sticks',
  '66':'Route 66', '55':'Speed Limit', '44':'Sailboats', '33':'Crabs',
  '22':'Ducks',
  AK:'Big Slick', AQ:'Big Chick', AJ:'Ajax', KQ:'Marriage',
  QJ:'Quack', JT:'Jackrabbit', T9:'Countdown', '98':'Oldsmobile',
  '87':'Snowshoes', '76':'Union Oil', '65':'Ken Warren', '54':'Jessie James',
};

export function getNickname(hand) {
  const base = hand.replace(/[so]$/, '');
  return NICKNAMES[base] || null;
}

// ── Hand generation helpers ───────────────────────────────────
export function gridToHand(row, col) {
  if (row === col) return RANKS[row] + RANKS[col];
  if (row < col)  return RANKS[row] + RANKS[col] + 's';
  return RANKS[col] + RANKS[row] + 'o';
}

export function buildTrainerPool(position, scenario = 'RFI') {
  if (scenario !== 'RFI') return [];

  const pool = [];

  if (position === 'SB') {
    for (const h of SB_RAISE_VALUE) pool.push({ hand: h, action: 'raise_value', weight: 3 });
    for (const h of SB_RAISE_BLUFF) pool.push({ hand: h, action: 'raise_bluff', weight: 2 });
    for (const h of SB_LIMP)        pool.push({ hand: h, action: 'limp',        weight: 2 });
    for (const h of getInstructiveFolds('SB')) pool.push({ hand: h, action: 'fold', weight: 2 });
  } else {
    const { raise, mix } = RFI_RANGES[position] || {};
    if (!raise) return [];
    for (const h of raise) pool.push({ hand: h, action: 'raise', weight: 3 });
    for (const h of mix)   pool.push({ hand: h, action: 'mix',   weight: 3 });
    for (const h of getInstructiveFolds(position)) pool.push({ hand: h, action: 'fold', weight: 2 });
  }

  const expanded = [];
  for (const item of pool) {
    for (let i = 0; i < item.weight; i++) expanded.push(item);
  }
  return expanded;
}

function getInstructiveFolds(position) {
  const folds = {
    UTG: [
      // Offsuit aces — too weak to open UTG
      'A2o','A3o','A4o','A5o','A6o','A7o','A8o','A9o',
      // Offsuit broadways — dominated too often
      'K2o','K3o','K4o','K5o','K6o','K7o',
      'KTo','QTo','JTo',
      // Weak suited hands
      'K5s','K4s','K3s','K2s',
      'Q8s','Q7s','Q6s','Q5s',
      'J8s','J7s',
      'T8s','T7s','T6s',
      '97s','86s','75s','64s','53s',
      '76o','65o','54o',
    ],
    HJ: [
      // HJ opens 21.3% — offsuit hands below ATo/KJo/QJo are folds
      'A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
      'K9o','K8o','K7o','K6o',
      'Q9o','Q8o','JTo','J9o',
      // Suited hands below the HJ cutoffs
      'K7s','K6s','K5s','K4s','K3s','K2s',
      'Q8s','Q7s','Q6s',
      'J8s','J7s',
      'T7s','T6s',
      '96s','86s','75s','64s','53s','43s',
    ],
    CO: [
      // CO opens 27% — folds below A9o, KTo, QTo, JTo
      'A8o','A7o','A6o','A5o','A4o','A3o','A2o',
      'K9o','K8o','K7o',
      'Q9o','Q8o',
      'J9o','J8o',
      // Suited hands below CO cutoffs
      'K6s','K5s','K4s','K3s','K2s',
      'Q7s','Q6s','Q5s','Q4s',
      'J7s','J6s','J5s',
      'T7s','T6s',
      '96s','85s','74s','63s','53s','52s',
    ],
    BTN: [
      // BTN opens 51.1% — folds below K4o, Q8o, J8o, T9o
      'K3o','K2o',
      'Q7o','Q6o','Q5o','J7o','J6o',
      'T8o','T7o',
      '97o','96o','86o','75o','65o',
      // Suited folds
      'J5s','J4s','J3s','J2s',
      'T5s','T4s','T3s','T2s',
      '95s','93s','85s','84s','74s','73s','63s','62s','52s','42s','32s',
    ],
    SB: [
      // SB uses 4-action system; most hands are raise/bluff/limp
      // True folds: very weak offsuit hands with no limp value
      'J5o','J4o','J3o','J2o',
      'T5o','T4o','T3o','T2o',
      '95o','94o','93o','92o',
      '85o','84o','83o','82o',
      '75o','74o','73o','72o',
      '64o','63o','62o',
      '53o','52o','43o',
      'T3s','T2s','93s','92s','83s','82s','73s','72s','62s','52s','42s',
    ],
  };
  return folds[position] || [];
}

export function getActionExplanation(hand, position, correctAction) {
  const positionContext = {
    UTG: 'UTG acts first with 5 players behind. Only open premium hands that can withstand 3-bets.',
    HJ:  'HJ has 4 players behind. Slightly wider than UTG, but still tight and aggressive.',
    CO:  'CO has 3 players behind (BTN, SB, BB). Opens can include many suited hands and pairs.',
    BTN: 'BTN is the most profitable seat — position on everyone postflop. Open ~51% of hands.',
    SB:  'SB faces only the BB. Use a 4-action strategy: raise value hands, raise-bluff polarized, limp playable hands, fold the rest.',
    BB:  'BB defends very wide due to favorable pot odds (already invested 1bb).',
  };

  const tagPrinciple = (correctAction === 'raise' || correctAction === 'raise_value')
    ? 'TAG principle: When you play a hand, enter the pot with a raise — never limp.'
    : correctAction === 'raise_bluff'
    ? 'SB principle: Raise as a bluff to balance your raising range. This hand has good blocker value or equity to continue if called.'
    : correctAction === 'limp'
    ? 'SB principle: This hand is in the SB limp range — it has playability but not enough equity/nut potential to raise profitably. Limp and see a cheap flop.'
    : correctAction === 'fold'
    ? 'TAG principle: Play tight preflop. Fold hands that cannot profitably play against re-raises or multiway.'
    : 'TAG principle: This is a borderline hand. A mix of raising and folding is correct — lean toward raising if you are tilted toward LAG, fold if you are new to the position.';

  return `${positionContext[position]} ${tagPrinciple}`;
}
