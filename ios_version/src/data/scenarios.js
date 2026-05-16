// ============================================================
// Postflop Training Scenarios
// ============================================================

export const BOARD_TEXTURES = {
  DRY:      'Dry',
  SEMI_WET: 'Semi-Wet',
  WET:      'Wet',
  PAIRED:   'Paired',
  MONOTONE: 'Monotone',
};

export function classifyBoard(cards) {
  const ranks = cards.map(c => c.rank);
  const suits = cards.map(c => c.suit);
  const uniqueSuits = new Set(suits).size;

  if (ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]) {
    return BOARD_TEXTURES.PAIRED;
  }

  const rankValues = { A:14,K:13,Q:12,J:11,T:10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2 };
  const vals = ranks.map(r => rankValues[r]).sort((a,b) => b-a);
  const span = vals[0] - vals[2];

  const isFlush = uniqueSuits === 1;
  const isTwoTone = uniqueSuits === 2;

  if (isFlush) return BOARD_TEXTURES.MONOTONE;

  const connected = span <= 4;

  if (connected && isTwoTone) return BOARD_TEXTURES.WET;
  if (connected && !isTwoTone) return BOARD_TEXTURES.SEMI_WET;
  if (!connected && isTwoTone) return BOARD_TEXTURES.SEMI_WET;
  return BOARD_TEXTURES.DRY;
}

export function getCbetRecommendation(texture, position, potType = 'SRP') {
  const recs = {
    Dry: {
      frequency: '65-80%',
      sizing: '33% pot',
      reasoning: 'Dry board locks in your range advantage. Bet frequently with a small size — no need to protect, no draws to price out.',
    },
    'Semi-Wet': {
      frequency: '45-60%',
      sizing: '50% pot',
      reasoning: 'Some draws present. Use medium sizing to extract value and charge draws. Check medium-strength hands to protect your checking range.',
    },
    Wet: {
      frequency: '35-50%',
      sizing: '67-75% pot',
      reasoning: 'Many draws and made hands for both ranges. Bet large with strong hands and semi-bluffs. Check the middle of your range to balance.',
    },
    Paired: {
      frequency: '75-90%',
      sizing: '25-33% pot',
      reasoning: 'Paired boards heavily favor the preflop raiser (monopoly on trips/full house). Bet frequently with a small size across your entire range.',
    },
    Monotone: {
      frequency: '25-40%',
      sizing: '50-67% pot',
      reasoning: 'Monotone board: players without a flush draw have weak equity. Bet only strong flush draws and strong made hands. Check everything else.',
    },
  };

  const base = recs[texture] || recs.Dry;

  if (position === 'OOP') {
    return {
      ...base,
      frequency: 'Reduce by 15-20% — check more to protect your checking range OOP',
    };
  }
  return base;
}

export const POSTFLOP_SCENARIOS = [
  {
    id: 1,
    title: 'BTN vs BB — Ace-high dry flop',
    heroPosition: 'BTN',
    villainPosition: 'BB',
    potType: 'SRP',
    heroHand: { rank: 'K', suit: '♠' },
    heroHand2: { rank: 'Q', suit: '♠' },
    board: [
      { rank: 'A', suit: '♠' },
      { rank: '7', suit: '♦' },
      { rank: '2', suit: '♣' },
    ],
    potBB: 5.5,
    effectiveStackBB: 97,
    street: 'Flop',
    question: 'You are BTN. You raised preflop, BB called. Flop is A♠7♦2♣. Action checks to you. What do you do?',
    options: [
      { label: 'Bet 33% pot (~1.8bb)', value: 'bet_small' },
      { label: 'Bet 67% pot (~3.7bb)', value: 'bet_big' },
      { label: 'Check back', value: 'check' },
    ],
    correctOption: 'bet_small',
    explanation: 'Ace-high dry rainbow: You have KQs with no pair but backdoor flush draw and two overcards. On A72r, BTN has a significant range advantage (more aces, more overpairs). C-bet 33% frequently with your entire range — including KQs as a semi-bluff. The dry texture means low risk of being check-raised with draws.',
    spr: null,
    boardTexture: 'Dry',
    keyLesson: 'C-bet small on dry boards with range advantage, even without made hands.',
  },
  {
    id: 2,
    title: 'BTN vs BB — Wet connected flop',
    heroPosition: 'BTN',
    villainPosition: 'BB',
    potType: 'SRP',
    heroHand: { rank: 'A', suit: '♥' },
    heroHand2: { rank: 'K', suit: '♥' },
    board: [
      { rank: 'J', suit: '♥' },
      { rank: 'T', suit: '♠' },
      { rank: '9', suit: '♥' },
    ],
    potBB: 5.5,
    effectiveStackBB: 97,
    street: 'Flop',
    question: 'JT9 with two hearts. You have AhKh (gutshot straight draw to KQ + nut flush draw). Action checks to you. What do you do?',
    options: [
      { label: 'Bet 33% pot (~1.8bb)', value: 'bet_small' },
      { label: 'Bet 75% pot (~4.1bb)', value: 'bet_big' },
      { label: 'Check back', value: 'check' },
    ],
    correctOption: 'bet_big',
    explanation: 'AhKh on JT9hh is a monster semi-bluff — you have the nut flush draw AND a gutshot to the Broadway straight. On this wet board, use a large sizing (67-75%+) to build the pot with your strong equity (around 54% vs villain\'s range). Wet boards demand large bets with strong draws.',
    spr: null,
    boardTexture: 'Wet',
    keyLesson: 'Bet big on wet boards with strong semi-bluffs. Size matters — small bets get called too cheaply.',
  },
  {
    id: 3,
    title: 'BB vs BTN — OOP on paired board',
    heroPosition: 'BB',
    villainPosition: 'BTN',
    potType: 'SRP',
    heroHand: { rank: '8', suit: '♣' },
    heroHand2: { rank: '7', suit: '♦' },
    board: [
      { rank: 'K', suit: '♠' },
      { rank: 'K', suit: '♦' },
      { rank: '4', suit: '♣' },
    ],
    potBB: 5.5,
    effectiveStackBB: 97,
    street: 'Flop',
    question: 'You are BB. Flop is KK4r. You have 87o. BTN bets 1.8bb (~33% pot). What do you do?',
    options: [
      { label: 'Call', value: 'call' },
      { label: 'Raise', value: 'raise' },
      { label: 'Fold', value: 'fold' },
    ],
    correctOption: 'fold',
    explanation: 'KK4 rainbow: Paired board heavily favors BTN (preflop raiser). BTN has AA, QQ, JJ, AK, KQs, all of which are strong here. Your 87o has ~22% equity but needs 25% to call profitably. The real problem: you have no draws, no pair, no blockers. This is a pure fold at MDF 75% (facing 33% bet). 87 is near the bottom of your range.',
    spr: null,
    boardTexture: 'Paired',
    keyLesson: 'Paired boards heavily favor the preflop raiser. Fold low unconnected hands facing any bet.',
  },
  {
    id: 4,
    title: 'CO vs BB — Turn double barrel',
    heroPosition: 'CO',
    villainPosition: 'BB',
    potType: 'SRP',
    heroHand: { rank: 'A', suit: '♦' },
    heroHand2: { rank: 'Q', suit: '♦' },
    board: [
      { rank: 'Q', suit: '♠' },
      { rank: '7', suit: '♣' },
      { rank: '3', suit: '♥' },
      { rank: '5', suit: '♦' },
    ],
    potBB: 12,
    effectiveStackBB: 88,
    street: 'Turn',
    question: 'You c-bet flop, BB called. Turn is 5♦. Pot is 12bb. BB checks. You have TPTK (AQ on Q73). What do you do?',
    options: [
      { label: 'Bet 50% pot (~6bb)', value: 'bet_medium' },
      { label: 'Bet 75% pot (~9bb)', value: 'bet_large' },
      { label: 'Check back', value: 'check' },
    ],
    correctOption: 'bet_medium',
    explanation: 'AQ (TPTK) on Q735 — The turn is a blank. Bet 50% to continue value betting. SPR is ~7.3, so stacking off with TPTK is borderline — pot control is reasonable. A 50% turn bet builds the pot while keeping BB\'s range somewhat wide. Double-barrel the turn with TPTK on blank cards.',
    spr: 7.3,
    boardTexture: 'Dry',
    keyLesson: 'Double-barrel blank turns with TPTK. Use 50% sizing to keep villain\'s calling range wide.',
  },
  {
    id: 5,
    title: 'SB vs BTN — 3-bet pot, dry flop',
    heroPosition: 'SB',
    villainPosition: 'BTN',
    potType: '3BP',
    heroHand: { rank: 'A', suit: '♠' },
    heroHand2: { rank: 'A', suit: '♥' },
    board: [
      { rank: 'K', suit: '♣' },
      { rank: '6', suit: '♦' },
      { rank: '2', suit: '♠' },
    ],
    potBB: 21,
    effectiveStackBB: 79,
    street: 'Flop',
    question: 'SB 3-bet, BTN called. Flop K62r. Pot 21bb, SPR ~3.8. You have AA. Action is on you. What do you do?',
    options: [
      { label: 'Bet 33% pot (~7bb)', value: 'bet_small' },
      { label: 'Bet 67% pot (~14bb)', value: 'bet_large' },
      { label: 'Check (trap)', value: 'check' },
    ],
    correctOption: 'bet_small',
    explanation: 'AA on K62r in a 3-bet pot (SPR ~3.8): With SPR under 4, you are committed to stacking off with an overpair. Bet small (~33%) to keep villain\'s calling range wide — they\'ll call with KQ, KJ, KT, pocket pairs. Don\'t over-bet; a small bet builds the pot while looking weak. At SPR ~4, you can comfortably get all-in by the river.',
    spr: 3.8,
    boardTexture: 'Dry',
    keyLesson: 'In 3-bet pots with low SPR (<4), overpairs are stack-off hands. Bet small to keep villain in.',
  },
  {
    id: 6,
    title: 'BTN vs BB — Set on wet board',
    heroPosition: 'BTN',
    villainPosition: 'BB',
    potType: 'SRP',
    heroHand: { rank: '7', suit: '♣' },
    heroHand2: { rank: '7', suit: '♦' },
    board: [
      { rank: '9', suit: '♥' },
      { rank: '8', suit: '♥' },
      { rank: '7', suit: '♥' },
    ],
    potBB: 5.5,
    effectiveStackBB: 97,
    street: 'Flop',
    question: '987 monotone (all hearts). You flopped bottom set of 7s (no heart). BB leads with a donk bet of 4bb. What do you do?',
    options: [
      { label: 'Call', value: 'call' },
      { label: 'Raise to ~14bb', value: 'raise' },
      { label: 'Fold', value: 'fold' },
    ],
    correctOption: 'raise',
    explanation: 'You have bottom set on a very wet board (98♥7♥). While a flush is already possible, your set gives you a full house draw (6 outs) plus is currently ahead of most of villain\'s range. Raise here for protection and value. Calling risks giving villain a free card to hit a straight or flush that beats your full house draws. Set the price now.',
    spr: null,
    boardTexture: 'Monotone',
    keyLesson: 'With sets on dangerous wet boards, raise for protection. Don\'t slowplay when the board threatens to run away.',
  },
  {
    id: 7,
    title: 'River value bet decision',
    heroPosition: 'BTN',
    villainPosition: 'BB',
    potType: 'SRP',
    heroHand: { rank: 'A', suit: '♦' },
    heroHand2: { rank: 'J', suit: '♣' },
    board: [
      { rank: 'J', suit: '♦' },
      { rank: '8', suit: '♠' },
      { rank: '3', suit: '♣' },
      { rank: '2', suit: '♦' },
      { rank: 'K', suit: '♥' },
    ],
    potBB: 25,
    effectiveStackBB: 75,
    street: 'River',
    question: 'River K. Pot 25bb. BB checks. You have TPGK (AJ on J832K). What do you do?',
    options: [
      { label: 'Bet 33% pot (~8bb)', value: 'bet_small' },
      { label: 'Bet 67% pot (~17bb)', value: 'bet_large' },
      { label: 'Check back', value: 'check' },
    ],
    correctOption: 'bet_small',
    explanation: 'AJ on J832K river: You have top pair good kicker, but the K on the river improves villain\'s range (KQ, KJ, K8 hit the board). Your hand is TPGK but no longer top pair — K is now the top card. Thin value bet small (~33%) to extract from worse Jx hands and pocket pairs. Checking is also acceptable. Do NOT bet large — you can\'t comfortably call a check-raise.',
    spr: null,
    boardTexture: 'Dry',
    keyLesson: 'Thin river value bets use small sizing. This allows you to fold to a raise without losing too much.',
  },
  {
    id: 8,
    title: 'Facing a check-raise on wet flop',
    heroPosition: 'CO',
    villainPosition: 'BB',
    potType: 'SRP',
    heroHand: { rank: 'T', suit: '♣' },
    heroHand2: { rank: '9', suit: '♣' },
    board: [
      { rank: 'J', suit: '♠' },
      { rank: '8', suit: '♣' },
      { rank: '6', suit: '♣' },
    ],
    potBB: 5.5,
    effectiveStackBB: 97,
    street: 'Flop',
    question: 'J8♣6♣: You have T9♣ (open-ended straight draw + flush draw). You c-bet 3.7bb, BB check-raises to 12bb. What do you do?',
    options: [
      { label: 'Call', value: 'call' },
      { label: '3-bet jam (all-in ~97bb)', value: 'raise' },
      { label: 'Fold', value: 'fold' },
    ],
    correctOption: 'call',
    explanation: 'T9♣ has a flush draw (9 outs) + OESD (8 outs) — roughly 15 clean outs = ~54% equity on the flop! You are actually a slight FAVORITE. However, a massive 3-bet jam with 100bb effective here is too aggressive. Call the check-raise and see a turn. If you fold you lose massive EV. If you jam, villain rarely folds sets/two-pair which are ahead of you. Call and realize your equity.',
    spr: null,
    boardTexture: 'Wet',
    keyLesson: 'With a combo draw (15 outs), you have enough equity to call even large raises. Avoid over-spewing with a jam unless shallow SPR.',
  },
  {
    id: 9,
    title: 'BB defense: facing a turn bet',
    heroPosition: 'BB',
    villainPosition: 'BTN',
    potType: 'SRP',
    heroHand: { rank: 'Q', suit: '♥' },
    heroHand2: { rank: 'T', suit: '♠' },
    board: [
      { rank: 'Q', suit: '♣' },
      { rank: '9', suit: '♦' },
      { rank: '4', suit: '♠' },
      { rank: '2', suit: '♥' },
    ],
    potBB: 12,
    effectiveStackBB: 88,
    street: 'Turn',
    question: 'Turn 2. Villain bets 75% pot (~9bb) into 12bb pot. You have top pair with QT. Call or fold?',
    options: [
      { label: 'Call', value: 'call' },
      { label: 'Raise', value: 'raise' },
      { label: 'Fold', value: 'fold' },
    ],
    correctOption: 'call',
    explanation: 'QT on Q942 facing a 75% pot turn bet: You have top pair with a mediocre kicker (T). Pot odds require 42.9% equity. QT vs BTN\'s turn betting range (sets, two pair, AQ, KQ, and some bluffs) — you have roughly 45-50% equity. This is a profitable call. Raising is too aggressive — your kicker is weak. Folding forfeits significant equity.',
    spr: null,
    boardTexture: 'Dry',
    keyLesson: 'Top pair is often a call vs a large bet but usually not a raise without a strong kicker. Compare your equity to the pot odds required.',
  },
  {
    id: 10,
    title: 'Check-raise as a bluff on turn',
    heroPosition: 'BB',
    villainPosition: 'BTN',
    potType: 'SRP',
    heroHand: { rank: '6', suit: '♥' },
    heroHand2: { rank: '5', suit: '♥' },
    board: [
      { rank: '8', suit: '♥' },
      { rank: '7', suit: '♠' },
      { rank: '2', suit: '♦' },
      { rank: '4', suit: '♥' },
    ],
    potBB: 14,
    effectiveStackBB: 86,
    street: 'Turn',
    question: 'Turn 4♥. You have 65h (open-ended straight draw + flush draw now). Villain bets 50% (~7bb). What do you do?',
    options: [
      { label: 'Call', value: 'call' },
      { label: 'Check-raise to ~22bb', value: 'raise' },
      { label: 'Fold', value: 'fold' },
    ],
    correctOption: 'raise',
    explanation: '65h on 8724 with two hearts: You have an OESD (3 and 9 complete) + a flush draw = monster draw with ~15 outs (~54% equity!). Check-raising here as a semi-bluff is excellent. You can win immediately if villain folds, or win at showdown when you hit. The turn check-raise with a combo draw is a powerful play. Size to ~3x the bet.',
    spr: null,
    boardTexture: 'Semi-Wet',
    keyLesson: 'Semi-bluff check-raises with combo draws are high-EV plays. You generate fold equity while still having strong draw equity if called.',
  },
];

// ── Math drill data ──────────────────────────────────────────

export const POT_ODDS_TABLE = [
  { betPct: 25,  oddsRequired: 16.7 },
  { betPct: 33,  oddsRequired: 20.0 },
  { betPct: 50,  oddsRequired: 25.0 },
  { betPct: 66,  oddsRequired: 28.6 },
  { betPct: 75,  oddsRequired: 30.0 },
  { betPct: 100, oddsRequired: 33.3 },
  { betPct: 133, oddsRequired: 40.0 },
  { betPct: 150, oddsRequired: 42.9 },
];

export const MDF_TABLE = [
  { betPct: 25,  mdf: 80.0 },
  { betPct: 33,  mdf: 75.0 },
  { betPct: 50,  mdf: 66.7 },
  { betPct: 66,  mdf: 60.2 },
  { betPct: 75,  mdf: 57.1 },
  { betPct: 100, mdf: 50.0 },
  { betPct: 133, mdf: 42.9 },
  { betPct: 150, mdf: 40.0 },
];

export const HAND_READING_QUIZZES = [
  {
    id: 1,
    scenario: 'UTG raises to 2.5bb. Everyone folds. BB 3-bets to 10bb. UTG calls. Flop: A♠K♦7♣. BB bets 7bb into 20bb pot. What does BB\'s range look like?',
    options: [
      { label: 'Mostly AA, KK, AK — pure value', value: 'a' },
      { label: 'A wide range including bluffs: AK, QQ, plus A5s/A4s blockers', value: 'b' },
      { label: 'Mostly bluffs — BB is betting air to steal', value: 'c' },
      { label: 'Only sets: 77, AA, KK', value: 'd' },
    ],
    correct: 'b',
    explanation: 'BB 3-bet OOP, so their range is polarized: strong value (AA, KK, QQ, AK) PLUS blocker bluffs (A5s, A4s, A3s). On AK7r, strong value bets because they smash the board. Bluffs continue because A-blocker hands reduce villain\'s A-holdings. The c-bet is correctly a mix of value and semi-bluffs.',
  },
  {
    id: 2,
    scenario: 'BTN opens. BB calls. Flop: 8♥7♥6♣. BB check-raises all-in (100bb). BTN opened with JJ. What does BB\'s check-raising range contain?',
    options: [
      { label: 'Only 9T for the flopped straight', value: 'a' },
      { label: 'Sets (88, 77, 66), straights (9T, T9s), and combo draws (flush + straight draws)', value: 'b' },
      { label: 'Pairs and weak draws only', value: 'c' },
      { label: 'Bluffs only — BB has nothing', value: 'd' },
    ],
    correct: 'b',
    explanation: 'An all-in check-raise on 876 two-tone is very strong. BB\'s range includes: sets (88, 77, 66), made straights (T9s, T9o), combo draws (9♥5♥, flush+straight), and some two-pairs (87s, 76s). With JJ, BTN is crushed by most of this range and should fold preflop-aware. Calling off 100bb with an underpair on a wet board is a critical mistake.',
  },
  {
    id: 3,
    scenario: 'CO opens 2.5bb. BTN 3-bets to 8bb. CO calls. Flop K♠Q♦J♥. CO checks, BTN bets 4bb (~25% pot). What does BTN\'s small bet represent?',
    options: [
      { label: 'Nothing — small bet is always a bluff', value: 'a' },
      { label: 'BTN is probing with their entire range on a board that hits both ranges', value: 'b' },
      { label: 'BTN has the nuts (ATo for straight)', value: 'c' },
      { label: 'BTN is pot-controlling with AA/KK', value: 'd' },
    ],
    correct: 'b',
    explanation: 'KQJ is a "both-ranges" board — BTN has AK, KQ, QQ, but CO has them too. A small bet probes the flop without committing: it extracts value from weaker pairs (TT, 99), charges draws (T9, T8), and folds weak Qx/Jx. BTN\'s range is NOT only the nuts — mixing value, draws, and probes with a small size is GTO on such connected boards.',
  },
  {
    id: 4,
    scenario: 'Blinds post. UTG raises to 2.5bb. 4 players call (huge mistake by them). Flop: A♣5♦2♣ rainbow. UTG bets 33% pot. Why is this a good spot for UTG?',
    options: [
      { label: 'UTG has range and nut advantage on A52', value: 'a' },
      { label: 'UTG must always bet multiway', value: 'b' },
      { label: 'Bluffing is more profitable multiway', value: 'c' },
      { label: 'Small bets always work multiway', value: 'd' },
    ],
    correct: 'a',
    explanation: 'A52 rainbow is a dry board that heavily favors UTG. UTG\'s tight range (AK, AQ, AJ, AA, KK) has lots of aces and overpairs. Callers have more speculative hands (22-55 are in range but A5s, A4s combos are fewer). UTG has both range advantage AND nut advantage. Betting 33% frequently extracts value from the wide calling field. The TAG principle: bet your range advantage, size with your nut advantage.',
  },
  {
    id: 5,
    scenario: 'BTN opens 2.5bb. BB 3-bets to 11bb. BTN 4-bets to 24bb. BB folds. Why might BTN 4-bet a hand like A5s here?',
    options: [
      { label: 'A5s is a value hand stronger than AA', value: 'a' },
      { label: 'A5s has the ace blocker (reduces BB\'s AA combos) and can make a nut flush if called', value: 'b' },
      { label: 'A5s always 4-bets to chase flush draws', value: 'c' },
      { label: '4-betting A5s is a mistake — always fold', value: 'd' },
    ],
    correct: 'b',
    explanation: 'A5s is the ideal 4-bet bluff because: (1) Ace blocker — holds one of BB\'s potential AA combos, making it less likely they have AA. (2) Strong equity when called — can flop a nut flush draw, two pair, or Broadway straight. (3) 5-blocker — weakly blocks 55 (BB\'s calling range). 4-bet bluffing A5s with the AA blocker is a key GTO concept. This is why solvers use it heavily.',
  },
];

export const SPR_SCENARIOS = [
  {
    pot: 20, stack: 80, hand: 'TPTK (AQ on A-8-3)',
    question: 'SPR is 4. Should you be willing to stack off with TPTK?',
    answer: true,
    explanation: 'SPR 4 = low SPR. TPTK is a stack-off hand at SPR <= 4. Push with confidence.',
  },
  {
    pot: 10, stack: 200, hand: '77 on 9-5-2 rainbow (underpair)',
    question: 'SPR is 20. You have an underpair. Stack off?',
    answer: false,
    explanation: 'SPR 20 = very deep. An underpair needs near-nut equity at deep SPR. Fold or pot-control.',
  },
  {
    pot: 30, stack: 90, hand: 'Set of 6s (66 on 6-K-2)',
    question: 'SPR is 3. Stack off with a set?',
    answer: true,
    explanation: 'Sets stack off at any SPR. At SPR 3, you\'re almost certainly getting all-in. Ship it.',
  },
];
