// ============================================================
// GTO Preflop Ranges — 6-max, 100bb, ~5% rake
// Derived from spec: GTO Wizard / PioSolver calibrated data
// ============================================================

export const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

export const POSITIONS = ['UTG','HJ','CO','BTN','SB','BB'];

export const POSITION_LABELS = {
  UTG: 'Under the Gun',
  HJ:  'Hijack',
  CO:  'Cutoff',
  BTN: 'Button',
  SB:  'Small Blind',
  BB:  'Big Blind',
};

// ── UTG ──────────────────────────────────────────────────────
const UTG_RAISE = new Set([
  'AA','KK','QQ','JJ','TT','99','88','77','66',
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s',
  'KQs','KJs','KTs',
  'QJs','QTs',
  'JTs','T9s',
  'AKo','AQo','AJo','ATo',
  'KQo','KJo',
  'QJo',
]);
const UTG_MIX = new Set([
  '55','44','33','22',
  'A2s',
  'K9s','K8s',
  'Q9s',
  'J9s',
  '98s','87s',
]);

// ── HJ ───────────────────────────────────────────────────────
const HJ_RAISE = new Set([
  ...UTG_RAISE,
  '55','44','33',
  'A2s',
  'K9s','K8s','K7s','K6s',
  'Q9s','J9s',
  '98s','87s','76s',
  'KTo','QTo',
]);
const HJ_MIX = new Set([
  '22',
  '65s','54s',
  'K5s',
]);

// ── CO ───────────────────────────────────────────────────────
const CO_RAISE = new Set([
  ...HJ_RAISE,
  '22',
  'K5s','K4s','K3s',
  'Q8s','Q7s','Q6s',
  'J8s',
  'T8s','T7s',
  '97s','96s',
  '86s','85s',
  '75s',
  '65s','64s',
  'A9o','A8o',
  'JTo',
]);
const CO_MIX = new Set([
  '53s','43s',
  'K2s',
  'Q5s',
]);

// ── BTN ──────────────────────────────────────────────────────
const BTN_RAISE = new Set([
  ...CO_RAISE,
  // CO mix hands go pure
  '53s','43s','K2s','Q5s',
  // New suited hands
  'Q4s','Q3s','Q2s',
  'J7s','J6s','J5s','J4s',
  'T6s',
  // New offsuit hands
  'A7o','A6o','A5o','A4o',
  'K9o','K8o',
  'Q9o',
  'J9o',
  'T8o',
  '98o',
]);
const BTN_MIX = new Set([
  '32s','74s','63s',
]);

// ── SB RFI (vs all folds, open to 3bb) ──────────────────────
// SB range ≈ BTN + slightly wider suited aces/connectors
const SB_RAISE = new Set([
  ...BTN_RAISE,
  'A3o','A2o',   // additional offsuit aces vs only BB left
  'K7o','K6o',   // additional offsuit kings
  '87o','76o',   // suited-connector equivalents offsuit
  '52s','42s',   // weaker suited aces carry to SB
]);
const SB_MIX = new Set([
  '32s','74s','63s','53o','43o',
]);

// ── BB Defense (call ranges, keyed by opener position) ───────
// BB already invested 1bb → wider defense than any other seat.

const BB_3BET = new Set([
  'AA','KK','QQ','JJ',
  'AKs','AQs',
  'AKo',
  'A5s','A4s','A3s',  // blocker bluffs
]);

// BB call vs UTG open
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

// BB call vs BTN open (much wider — BTN opens ~43%)
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

// BB call vs CO
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

// BB call vs HJ
const BB_CALL_VS_HJ = new Set([
  ...BB_CALL_VS_UTG,
  'A2o','A3o',
  'K2o','K3o',
  '64s','53s',
  'J8o',
  'T8o',
]);

// BB call vs SB (SB opens 3bb but BB has position postflop)
const BB_CALL_VS_SB = new Set([
  ...BB_CALL_VS_BTN,
  // vs SB we defend slightly wider because we have position
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

// ── 3-Bet Ranges (from each position facing an open) ────────

export const THREE_BET_RANGES = {
  // SB vs any open: 3-bet or fold only
  SB_vs_any: {
    value:  new Set(['QQ','KK','AA','AKs','AKo']),
    bluff:  new Set(['A4s','A3s','A2s','KJs','QJs','JTs']),
  },
  // BTN vs any open
  BTN_vs_any: {
    value:  new Set(['JJ','QQ','KK','AA','AQs','AKs','AKo']),
    bluff:  new Set(['A5s','A4s','A3s','A2s','K9s','QJs','JTs','T9s','98s','87s']),
    call:   new Set(['22','33','44','55','66','77','88','99','TT','KQs','QTs','AJs','KQo']),
  },
  // CO vs UTG/HJ
  CO_vs_early: {
    value:  new Set(['TT','JJ','QQ','KK','AA','AQs','AKs','AKo','KQs']),
    bluff:  new Set(['A5s','A4s','A3s','KJs','QJs','JTs','T9s','98s']),
  },
  // HJ vs UTG
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

// ── Master range lookup ──────────────────────────────────────

export const RFI_RANGES = {
  UTG: { raise: UTG_RAISE, mix: UTG_MIX },
  HJ:  { raise: HJ_RAISE,  mix: HJ_MIX  },
  CO:  { raise: CO_RAISE,  mix: CO_MIX  },
  BTN: { raise: BTN_RAISE, mix: BTN_MIX },
  SB:  { raise: SB_RAISE,  mix: SB_MIX  },
};

// Get the correct action for a hand at a given position in RFI scenario
export function getRFIAction(hand, position) {
  if (position === 'BB') return null; // BB never RFI (it's the last preflop actor)
  const { raise, mix } = RFI_RANGES[position];
  if (raise.has(hand)) return 'raise';
  if (mix.has(hand))   return 'mix';
  return 'fold';
}

// ── EV Loss Classification ────────────────────────────────────
export function getEVLoss(correctAction, userAction) {
  if (correctAction === userAction) return { label: 'Correct', bb: 0, color: 'green' };
  if (correctAction === 'mix') {
    // Mix hands: small penalty for either raise or fold
    if (userAction === 'raise') return { label: 'Minor Leak', bb: -0.05, color: 'amber' };
    if (userAction === 'fold')  return { label: 'Minor Leak', bb: -0.05, color: 'amber' };
    if (userAction === 'call')  return { label: 'Medium Mistake', bb: -0.20, color: 'orange' };
  }
  if (correctAction === 'raise') {
    if (userAction === 'fold') {
      // How bad was the fold? Depends on hand quality
      return { label: 'Significant Mistake', bb: -0.50, color: 'red' };
    }
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

// Generate hand key from grid [row][col]
export function gridToHand(row, col) {
  if (row === col) return RANKS[row] + RANKS[col];
  if (row < col)  return RANKS[row] + RANKS[col] + 's';
  return RANKS[col] + RANKS[row] + 'o';
}

// Build weighted hand pool for trainer (smart — avoid trash hand spam)
export function buildTrainerPool(position, scenario = 'RFI') {
  if (scenario !== 'RFI') return [];

  const { raise, mix } = RFI_RANGES[position] || {};
  if (!raise) return [];

  const pool = [];

  // Add raise hands (high weight — these are the core plays to reinforce)
  for (const h of raise) {
    pool.push({ hand: h, action: 'raise', weight: 3 });
  }

  // Add mix hands (medium weight — edge cases)
  for (const h of mix) {
    pool.push({ hand: h, action: 'mix', weight: 3 });
  }

  // Add instructive fold hands (not random trash — chosen to teach)
  const instructiveFolds = getInstructiveFolds(position);
  for (const h of instructiveFolds) {
    pool.push({ hand: h, action: 'fold', weight: 2 });
  }

  // Expand by weight
  const expanded = [];
  for (const item of pool) {
    for (let i = 0; i < item.weight; i++) expanded.push(item);
  }
  return expanded;
}

// Hands that are instructive to practice folding — commonly misplayed
function getInstructiveFolds(position) {
  const folds = {
    UTG: [
      // Weak aces — very commonly overplayed UTG
      'A2o','A3o','A4o','A5o','A6o','A7o','A8o','A9o',
      // Weak kings
      'K2o','K3o','K4o','K5o','K6o','K7o',
      // Offsuit broadways just outside range
      'KTo','QTo','JTo',  // wait, KTo is in HJ raise... let me check
      // Actually KTo is NOT in UTG raise. KJo is, but KTo is not.
      // Suited hands just outside range
      'K5s','K4s','K3s','K2s',
      'Q8s','Q7s','Q6s','Q5s',
      'J8s','J7s',
      'T8s','T7s','T6s',
      '97s','86s','75s','64s','53s',
      '76o','65o','54o',
    ],
    HJ: [
      'A2o','A3o','A4o','A5o','A6o','A7o','A8o',
      'K2o','K3o','K4o','K5o','K6o',
      'K3s','K2s',
      'Q8s','Q7s','Q5s',
      'J8s','J7s',
      'T7s','T6s',
      '97s','86s','75s','64s','53s',
      '65o','54o',
    ],
    CO: [
      'A2o','A3o','A4o','A5o','A6o','A7o',
      'K2o','K3o','K4o',
      'Q5o','Q4o',
      'J7s','J6s','J5s',
      'T6s','T5s',
      '85o','75o',
      '42s','32s',
    ],
    BTN: [
      // BTN is wide — show near-edge folds
      'A3o','A2o',
      'K7o','K6o','K5o',
      'J3s','J2s',
      'T5s','T4s','T3s','T2s',
      '95s','84s','73s',
      '52s',
      '62s',
    ],
    SB: [
      'K5o','K4o','K3o','K2o',
      'Q6o','Q5o','Q4o',
      'J6o','J5o','J4o',
      'T5o','T4o',
      '84o','73o',
    ],
  };
  return folds[position] || [];
}

// Explanation for each action at each position
export function getActionExplanation(hand, position, correctAction) {
  const isSuited = hand.endsWith('s');
  const isOffsuit = hand.endsWith('o');
  const isPair = hand.length === 2 && hand[0] === hand[1];

  const positionContext = {
    UTG: 'UTG acts first with 5 players behind. Only open premium hands that can withstand 3-bets.',
    HJ:  'HJ has 4 players behind. Slightly wider than UTG, but still tight and aggressive.',
    CO:  'CO has 3 players behind (BTN, SB, BB). Opens can include many suited hands and pairs.',
    BTN: 'BTN is the most profitable seat — position on everyone postflop. Open ~43% of hands.',
    SB:  'SB faces only the BB. Wide range is profitable, but use 3bb open to deny BB a good price.',
    BB:  'BB defends very wide due to favorable pot odds (already invested 1bb).',
  };

  const tagPrinciple = correctAction === 'raise'
    ? 'TAG principle: When you play a hand, enter the pot with a raise — never limp.'
    : correctAction === 'fold'
    ? 'TAG principle: Play tight preflop. Fold hands that cannot profitably play against re-raises or multiway.'
    : 'TAG principle: This is a borderline hand. A mix of raising and folding is correct — lean toward raising if you are tilted toward LAG, fold if you are new to the position.';

  return `${positionContext[position]} ${tagPrinciple}`;
}
