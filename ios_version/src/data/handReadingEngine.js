// =============================================================================
// handReadingEngine.js — Dynamic Hand Reading Question Generator
// =============================================================================
//
// Every call to generateHandReadingQuestion() produces a unique question by
// randomising positions, board cards, bet sizes, and pot sizes across 8
// distinct archetypes. No fixed question bank — infinite variety.
//
// Each returned object:
//   { scenario: string, options: [{label, value}], correct: string, explanation: string }
//
// `correct` always matches the `value` field of the correct option.
// =============================================================================

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Realistic poker pot sizes
const POTS_SRP    = [4, 5, 6, 7, 8, 10, 11, 12];   // single raised pot (bb)
const POTS_3BP    = [14, 17, 18, 20, 21, 24, 25, 28]; // 3-bet pot (bb)
const BET_SMALLS  = [25, 28, 30, 33];
const BET_MEDIUMS = [45, 50, 55];
const BET_LARGES  = [65, 67, 70, 75];
const BET_OVERBETS= [90, 100, 110, 125];

const OPEN_SIZES = { UTG: '2.5bb', HJ: '2.5bb', CO: '2.5bb', BTN: '2.5bb', SB: '3bb' };

// ─── Board generation ─────────────────────────────────────────────────────────

const ALL_RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const ALL_SUITS = ['♠','♥','♦','♣'];
const RANK_VAL  = {A:14,K:13,Q:12,J:11,T:10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2};

function dealCards(n, excluded = []) {
  const deck = [];
  for (const r of ALL_RANKS) for (const s of ALL_SUITS) deck.push({ rank: r, suit: s });
  const avail = deck.filter(c => !excluded.some(e => e.rank === c.rank && e.suit === c.suit));
  const result = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * avail.length);
    result.push(...avail.splice(idx, 1));
  }
  return result;
}

function cardStr(c)  { return `${c.rank}${c.suit}`; }
function boardStr(b) { return b.map(cardStr).join(' '); }

function classifyTexture(cards) {
  const suits  = cards.map(c => c.suit);
  const vals   = cards.map(c => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const isPaired    = new Set(cards.map(c => c.rank)).size < cards.length;
  const isMonotone  = new Set(suits).size === 1;
  const isTwoTone   = new Set(suits).size === 2;
  const span        = vals[0] - vals[vals.length - 1];
  const connected   = span <= 4;
  if (isPaired)              return 'Paired';
  if (isMonotone)            return 'Monotone';
  if (connected && isTwoTone) return 'Wet';
  if (connected || isTwoTone) return 'Semi-Wet';
  return 'Dry';
}

// Generate a board of a specific texture type
function boardOfTexture(type) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const cards = dealCards(3);
    if (classifyTexture(cards) === type) return cards;
  }
  return dealCards(3); // fallback
}

// ─── Option builder ───────────────────────────────────────────────────────────

// Build 4 shuffled options where the correct one has value 'correct'.
function buildOptions(correctLabel, wrongLabels) {
  return shuffle([
    { label: correctLabel, value: 'correct' },
    ...wrongLabels.map((l, i) => ({ label: l, value: `wrong${i}` })),
  ]);
}

// ─── Archetype 1: C-bet sizing tells ─────────────────────────────────────────
// What does opener's c-bet size reveal about their range?

function cbetSizingQuestion() {
  const opener  = pick(['BTN', 'CO', 'HJ', 'UTG']);
  const caller  = opener === 'BTN' ? 'BB' : pick(['BTN', 'BB']);
  const sizePct = pick([...BET_SMALLS, ...BET_MEDIUMS, ...BET_LARGES, ...BET_OVERBETS]);
  const pot     = pick(POTS_SRP);
  const bet     = Math.round(pot * sizePct / 100);
  const board   = dealCards(3);
  const texture = classifyTexture(board);

  let correctLabel, wrongs, explanation;

  if (sizePct <= 33) {
    correctLabel = `A range bet — ${opener} bets their entire range: strong hands, draws, and air`;
    wrongs = [
      'Pure value — small bets are always made with the nuts',
      'Pure bluff — a small bet is a steal attempt with nothing',
      'Only medium-strength hands protecting their range',
    ];
    explanation = `A ${sizePct}% pot c-bet is a "range bet." ${opener} is betting their entire range — top pair, sets, flush draws, AND air. On a dry board this is especially effective: with no draws to worry about, ${opener} can bet cheaply across all hands and force ${caller} to defend precisely.`;
  } else if (sizePct <= 60) {
    correctLabel = `Balanced — ${opener} bets strong made hands and semi-bluffs, checks medium-strength hands`;
    wrongs = [
      `A range bet including all hands — ${opener} bets everything at 50%`,
      'Pure bluffs — medium sizing tries to steal with air',
      'Only the nuts — medium bet is a blocking bet with the best hand',
    ];
    explanation = `A ${sizePct}% pot c-bet is a balanced polarising size. ${opener} bets with strong value (top pair+, sets) AND semi-bluffs (flush draws, combo draws). Medium-strength hands (second pair, weak top pair) are checked to protect the checking range and avoid tough spots.`;
  } else if (sizePct <= 90) {
    correctLabel = `Polarised — ${opener} holds strong made hands or bluffs/draws, not medium-strength hands`;
    wrongs = [
      'A range bet including all hands — large bets are always with everything',
      'Exclusively value hands — no one bluffs large',
      'Pot-control with medium-strength hands like second pair',
    ];
    explanation = `A ${sizePct}% pot c-bet is polarising. ${opener} has either strong value (two pair, sets, overpairs) OR strong semi-bluffs (flush draws, combo draws) — NOT medium-strength hands. On a ${texture.toLowerCase()} board like ${boardStr(board)}, medium hands check to avoid being blown off their equity.`;
  } else {
    correctLabel = `Extremely polarised — ${opener} has a near-nut hand or a pure bluff; medium hands never overbet`;
    wrongs = [
      'A range bet — overbets are used with every hand type',
      'Medium-strength hands extracting thin value',
      'Always a bluff — nobody overbets for value',
    ];
    explanation = `An overbet (${sizePct}% pot) is the most polar sizing available. ${opener} holds the near-nuts (set, two pair, top pair top kicker) OR a pure bluff leveraging fold equity. Medium-strength hands NEVER overbet — the risk/reward only makes sense at the extremes of a range.`;
  }

  return {
    scenario: `${opener} opens to ${OPEN_SIZES[opener]}, ${caller} calls. Flop: ${boardStr(board)} (${texture}). Pot: ${pot}bb. ${opener} bets ${bet}bb (${sizePct}% pot). What does this bet represent?`,
    options: buildOptions(correctLabel, wrongs),
    correct: 'correct',
    explanation,
  };
}

// ─── Archetype 2: 3-bet pot range analysis ────────────────────────────────────
// What does the 3-bettor's range look like on the flop?

function threeBetPotQuestion() {
  const bttor  = pick(['BTN', 'CO', 'SB', 'BB']);
  const opener = pick(['UTG', 'HJ', 'CO', 'BTN'].filter(p => p !== bttor));
  const pot    = pick(POTS_3BP);
  const sizePct= pick([...BET_SMALLS, ...BET_MEDIUMS, ...BET_LARGES]);
  const bet    = Math.round(pot * sizePct / 100);
  const texture= pick(['Dry', 'Semi-Wet', 'Wet', 'Paired', 'Monotone']);
  const board  = boardOfTexture(texture);

  const correctLabel = `Polarised: premium made hands (AA, KK, AK) PLUS bluff combos (Ax suited, small suited connectors)`;
  const wrongs = [
    'Only the absolute nuts — 3-bettors never bluff',
    'A wide merged range — 3-bettors play any two cards profitably',
    'Exclusively drawing hands — 3-betting is only done with draws',
  ];

  return {
    scenario: `${opener} opens to 2.5bb. ${bttor} 3-bets to ${Math.round(pot * 0.35)}bb. ${opener} calls. Pot: ${pot}bb. Flop: ${boardStr(board)} (${texture}). ${bttor} bets ${bet}bb (${sizePct}% pot). What does ${bttor}'s range look like?`,
    options: buildOptions(correctLabel, wrongs),
    correct: 'correct',
    explanation: `3-betting pre-flop builds a polarised range: ${bttor} holds premiums (AA, KK, QQ, AKs) for value, PLUS "bluff" 3-bets with blocker hands like A5s, A4s (ace blocks villain's AA/AK) and sometimes suited connectors with playability. On the flop, ${bttor} c-bets both the value end and the bluff end — medium hands like JJ, TT that 3-bet for value but missed the board are often checked.`,
  };
}

// ─── Archetype 3: Check-raise analysis ───────────────────────────────────────
// What does a check-raise mean for villain's range?

function checkRaiseQuestion() {
  const aggressor = pick(['BTN', 'CO', 'HJ']);
  const defender  = 'BB';
  const street    = pick(['Flop', 'Turn']);
  const pot       = street === 'Flop' ? pick(POTS_SRP) : pick(POTS_SRP).valueOf() * 2 + 5;
  const cbet      = Math.round(pot * pick([33, 50, 67]) / 100);
  const raise     = Math.round(cbet * pick([2.5, 3, 3.5]));
  const texture   = pick(['Wet', 'Semi-Wet', 'Monotone']);
  const board     = boardOfTexture(texture);

  const correctLabel = `Strong made hands (sets, two pair) AND strong draws (combo draws, flush draws) — a polarised check-raising range`;
  const wrongs = [
    'Exclusively the nuts — check-raises are only made with straights and flushes',
    'Bluffs only — villain check-raises to fold out every hand',
    'Medium-strength hands trying to thin the field',
  ];

  return {
    scenario: `${aggressor} opens, ${defender} calls. ${street}: ${boardStr(board)} (${texture}). ${defender} checks. ${aggressor} bets ${cbet}bb into ${pot}bb pot. ${defender} check-raises to ${raise}bb. What is ${defender}'s check-raising range?`,
    options: buildOptions(correctLabel, wrongs),
    correct: 'correct',
    explanation: `A check-raise on a ${texture.toLowerCase()} board like ${boardStr(board)} is a strong action. ${defender}'s range contains: (1) Nutted made hands — sets, two pair, straights, flushes. (2) Strong semi-bluffs — flush draws with extra equity, combo draws (15 outs). Pure air check-raises exist but are rare and require precise blockers. When you see a check-raise, assign your opponent the nut end of their range and the top of their draw equity.`,
  };
}

// ─── Archetype 4: Blocker 4-bet bluff ────────────────────────────────────────
// Why are certain hands ideal 4-bet bluffs?

function blockerBluffQuestion() {
  const hand    = pick(['A5s', 'A4s', 'A3s', 'A2s', 'K5s', 'K4s', 'KJo']);
  const heroPos = pick(['BTN', 'CO', 'SB']);
  const villainPos = pick(['BB', 'UTG', 'HJ'].filter(p => p !== heroPos));
  const isAce   = hand.startsWith('A');
  const isKing  = hand.startsWith('K');

  const correctLabel = isAce
    ? `${hand} blocks AA and AK — villain is less likely to have the hands that crush a 4-bet bluff`
    : `${hand} blocks KK and AK — reducing the combos villain holds that dominate your equity`;
  const wrongs = [
    `${hand} is a value 4-bet — it's stronger than it looks`,
    '4-betting is only done with nut hands — any bluff here is a mistake',
    `${hand} has enough raw equity to call a 3-bet instead of 4-betting`,
  ];
  const blockExplain = isAce
    ? `Holding an ace removes one combo of AA (6→3 combos if you hold one ace) and two combos of AK from villain's range. This makes it significantly less likely villain holds the hands that have you crushed. Additionally, ${hand} retains playability if called — you can flop a nut flush draw or nut-flush-draw equity.`
    : `Holding a king removes combos of KK and AK from villain's 3-bet range. ${hand} also has backdoor flush potential and straight equity if called. The blocker effect is the primary reason to 4-bet; the playability is the secondary benefit.`;

  return {
    scenario: `${villainPos} opens 2.5bb. Folds to ${heroPos}. ${heroPos} 3-bets. ${villainPos} 3-bets again. ${heroPos} is considering a 4-bet bluff with ${hand}. Why is ${hand} a better 4-bet bluff than, say, 87s?`,
    options: buildOptions(correctLabel, wrongs),
    correct: 'correct',
    explanation: blockExplain,
  };
}

// ─── Archetype 5: River bet polarisation ──────────────────────────────────────
// What does a large vs small river bet mean?

function riverPolarisationQuestion() {
  const hero    = pick(['BTN', 'CO', 'SB', 'BB']);
  const villain = hero === 'BB' ? 'BTN' : 'BB';
  const sizePct = pick([...BET_SMALLS, ...BET_LARGES, ...BET_OVERBETS]);
  const pot     = pick([18, 20, 22, 25, 28, 30, 35, 40, 45, 50, 55, 60]);
  const bet     = Math.round(pot * sizePct / 100);
  const board   = dealCards(5);

  let correctLabel, wrongs, explanation;

  if (sizePct <= 35) {
    correctLabel = 'Thin value or a blocker bet — villain is not polarised; they likely have a medium-strength hand';
    wrongs = [
      'The absolute nuts — small river bets are always the strongest hands',
      'A pure bluff — only air bets small on the river',
      'Pot control with a monster — trapping by betting small',
    ];
    explanation = `A ${sizePct}% river bet is a "blocking bet" or thin value bet. Villain has a medium-strength hand (second pair, weak top pair, missed draw with showdown value) and bets small to (1) prevent a larger bet and (2) extract thin value. Polarised hands (nuts or bluffs) prefer larger sizes to maximise EV.`;
  } else if (sizePct <= 80) {
    correctLabel = 'A value bet — villain bets for value, wanting to get called by one-pair hands or weaker';
    wrongs = [
      'Always a bluff — large river bets are rarely for value',
      'A blocking bet — villain is uncertain of their hand strength',
      'Pure nuts only — you never value bet the second-best hand',
    ];
    explanation = `A ${sizePct}% river bet is a strong value bet. Villain believes their hand is best and wants to extract maximum value from weaker holdings like one-pair hands, missed draws that picked up a pair, or weak two-pair. This size also accommodates strong bluffs — the bet is balanced but leans toward value.`;
  } else {
    correctLabel = 'Highly polarised — villain holds the nuts or a complete bluff; no medium hands overbet the river';
    wrongs = [
      'Thin value — overbets are fine with any showdown-worthy hand',
      'Always the nuts — overbets are never bluffs',
      'A mistake — overbetting the river is always incorrect',
    ];
    explanation = `An overbet (${sizePct}% pot) is the most polarised river action. Villain holds EITHER a very strong hand (straight, flush, full house) OR a complete bluff taking maximum fold equity. Medium-strength hands never overbet the river — the risk/reward is only +EV at the extremes of the range. When facing a river overbet, you're being forced to decide between the nut range and the air range.`;
  }

  return {
    scenario: `${hero} and ${villain} see a five-card board: ${boardStr(board)}. Pot is ${pot}bb. ${villain} bets ${bet}bb (${sizePct}% pot) on the river. What does this bet sizing tell you about ${villain}'s range?`,
    options: buildOptions(correctLabel, wrongs),
    correct: 'correct',
    explanation,
  };
}

// ─── Archetype 6: Multiway range advantage ────────────────────────────────────
// Who has range/nut advantage on a given board in a multiway pot?

function multiwayRangeQuestion() {
  const opener  = pick(['UTG', 'HJ', 'CO']);
  const nCallers= pick([2, 3, 4]);
  const pot     = nCallers * 2.5 + 1;
  const betPct  = pick([...BET_SMALLS, ...BET_MEDIUMS]);
  const bet     = Math.round(pot * betPct / 100);
  const texture = pick(['Dry', 'Paired']);
  const board   = boardOfTexture(texture);

  const correctLabel = `${opener} — tight opening range gives nut advantage; bet frequency drops but betting has more credibility`;
  const wrongs = [
    `Any caller — callers see more flops and hit boards more often`,
    `No one has an advantage multiway — it's completely even`,
    `The player in position — positional advantage overrides range advantage`,
  ];

  return {
    scenario: `${opener} opens 2.5bb, ${nCallers} players call. Pot: ${Math.round(pot)}bb. Flop: ${boardStr(board)} (${texture}). ${opener} bets ${bet}bb (${betPct}% pot). Why does this bet carry more credibility than it would heads-up?`,
    options: buildOptions(correctLabel, wrongs),
    correct: 'correct',
    explanation: `Multiway, the original raiser — ${opener} with a tight UTG/HJ/CO range — has the strongest nut advantage. Their range contains the most premiums (AA, KK, AK, AQ) that crush a board like ${boardStr(board)}. Callers have wider, more speculative ranges. A ${betPct}% bet multiway is credible because ${opener} must bet only strong hands — bluff frequency drops dramatically (more players = lower fold equity). The credibility of the bet increases even as its frequency decreases.`,
  };
}

// ─── Archetype 7: Donk betting ────────────────────────────────────────────────
// What does it mean when OOP player donk-bets into the preflop raiser?

function donkBetQuestion() {
  const raiser  = pick(['BTN', 'CO', 'HJ']);
  const oop     = 'BB';
  const texture = pick(['Wet', 'Semi-Wet', 'Monotone']);
  const board   = boardOfTexture(texture);
  const pot     = pick(POTS_SRP);
  const betPct  = pick([25, 33, 40, 50]);
  const bet     = Math.round(pot * betPct / 100);

  const correctLabel = `Strong made hands or strong draws — ${oop} is donk-betting to build the pot and deny ${raiser} a free card`;
  const wrongs = [
    `Air and missed hands — donk-betting is always a bluff on a wet board`,
    `Weak pairs — ${oop} wants to see where they are`,
    `Nothing specific — donk-betting is random and tells you little`,
  ];

  return {
    scenario: `${raiser} opens, ${oop} calls. Flop: ${boardStr(board)} (${texture}). ${oop} leads out with a donk-bet of ${bet}bb into ${pot}bb. What does this tell you about ${oop}'s hand?`,
    options: buildOptions(correctLabel, wrongs),
    correct: 'correct',
    explanation: `A donk-bet (leading into the preflop raiser out of position) is typically a strong action. ${oop} denies ${raiser} a free card and builds the pot with hands like two pair, sets, strong flush draws, or combo draws on this ${texture.toLowerCase()} board (${boardStr(board)}). Pure bluff donk-bets exist but are risky OOP — most players donk primarily for value or with strong semi-bluffs. It is NOT typically a "see where I am" bet — that approach is exploitative and costly.`,
  };
}

// ─── Archetype 8: Board texture and range benefit ─────────────────────────────
// Which player's range benefits more from a given flop?

function rangeBenefitQuestion() {
  const opener  = pick(['BTN', 'CO', 'HJ', 'UTG']);
  const caller  = 'BB';
  const texture = pick(['Dry', 'Paired', 'Wet', 'Monotone']);
  const board   = boardOfTexture(texture);
  const topRank = board.reduce((best, c) => RANK_VAL[c.rank] > RANK_VAL[best.rank] ? c : best, board[0]);
  const isHighBoard = RANK_VAL[topRank.rank] >= 11; // J+

  let correctLabel, wrongs, explanation;

  if (isHighBoard && (texture === 'Dry' || texture === 'Paired')) {
    correctLabel = `${opener} — high dry boards like ${boardStr(board)} heavily favour the preflop raiser's tight range`;
    wrongs = [
      `${caller} — BB's wide range hits all boards equally`,
      'Neither player — range advantage depends only on position',
      `${caller} — BB defended wide so hits more card combinations`,
    ];
    explanation = `${opener}'s tight opening range contains many top pairs and overpairs on a high dry board. ${caller}'s wider defence range has more speculative hands (low suited connectors, weak Ax) that miss high, dry boards. The nut advantage belongs to ${opener} — they hold more AA, KK, AK, AQ combos that dominate this texture.`;
  } else if (texture === 'Wet' || texture === 'Monotone') {
    correctLabel = `${caller} — ${caller}'s wide range includes more suited connectors and draws that hit wet boards`;
    wrongs = [
      `${opener} — preflop raiser always has the advantage`,
      'Neither player — wet boards are always balanced',
      `${opener} — tight range means more made hands on wet boards too`,
    ];
    explanation = `${caller}'s wide defensive range contains many suited connectors (87s, 76s, T9s) and suited aces that generate flush draws and straight draws on a ${texture.toLowerCase()} board like ${boardStr(board)}. ${opener}'s tighter range has fewer of these draw-heavy hands. ${caller} has better equity realisation here even though they lack nut advantage.`;
  } else {
    correctLabel = `${opener} — their tighter range has more strong pairs and overpairs that perform well here`;
    wrongs = [
      `${caller} — wider ranges always do better on low boards`,
      'Neither player — board advantage is always equal',
      `${caller} — BB always benefits from calling wide`,
    ];
    explanation = `On ${boardStr(board)}, ${opener}'s tight range has better equity concentration. Overpairs and top pairs make up a larger portion of their range than ${caller}'s, even on a lower board. ${caller}'s wide range often means many hands with low equity here (weak aces, offsuit connectors that missed).`;
  }

  return {
    scenario: `${opener} opens ${OPEN_SIZES[opener] || '2.5bb'}, ${caller} calls. Flop: ${boardStr(board)} (${texture}). Before anyone acts — which player's range benefits more from this board?`,
    options: buildOptions(correctLabel, wrongs),
    correct: 'correct',
    explanation,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

const ARCHETYPES = [
  cbetSizingQuestion,
  threeBetPotQuestion,
  checkRaiseQuestion,
  blockerBluffQuestion,
  riverPolarisationQuestion,
  multiwayRangeQuestion,
  donkBetQuestion,
  rangeBenefitQuestion,
];

/**
 * Generates a unique hand reading question each call.
 * Randomly selects one of 8 archetypes and fills it with fresh random parameters.
 * @returns {{ scenario: string, options: Array<{label,value}>, correct: string, explanation: string }}
 */
export function generateHandReadingQuestion() {
  const gen = pick(ARCHETYPES);
  return gen();
}
