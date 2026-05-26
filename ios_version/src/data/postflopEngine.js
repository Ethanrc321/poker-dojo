// =============================================================================
// postflopEngine.js — Dynamic Postflop Scenario Generator
// =============================================================================
//
// Every call to generatePostflopScenario() produces a unique, valid postflop
// scenario — randomised positions, boards, hands, pot sizes, and streets.
// No fixed scenario bank — scenarios are computed from first principles.
//
// The returned object is compatible with PostflopScreen.js's render logic:
//   { title, heroPos, villainPos, potType, heroHand, heroHand2, board,
//     potBB, effectiveStackBB, street, question, options, correctOption,
//     explanation, spr, boardTexture, keyLesson }
// =============================================================================

// ─── Card utilities ───────────────────────────────────────────────────────────

const ALL_RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const ALL_SUITS = ['♠','♥','♦','♣'];
const RANK_VAL  = {A:14,K:13,Q:12,J:11,T:10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeDeck() {
  const deck = [];
  for (const r of ALL_RANKS) for (const s of ALL_SUITS) deck.push({ rank: r, suit: s });
  return shuffle(deck);
}

function dealFrom(deck, n) {
  return deck.splice(0, n);
}

function cardStr(c) { return `${c.rank}${c.suit}`; }
function boardStr(cards) { return cards.map(cardStr).join(' '); }

// ─── Board texture ────────────────────────────────────────────────────────────

function classifyTexture(cards) {
  const suits = cards.map(c => c.suit);
  const vals  = cards.map(c => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const uniqueSuits   = new Set(suits).size;
  const isPaired      = new Set(cards.map(c => c.rank)).size < cards.length;
  const isMonotone    = uniqueSuits === 1;
  const isTwoTone     = uniqueSuits === 2;
  const span          = vals[0] - vals[vals.length - 1];
  const connected     = span <= 4;
  if (isPaired)               return 'Paired';
  if (isMonotone)             return 'Monotone';
  if (connected && isTwoTone) return 'Wet';
  if (connected || isTwoTone) return 'Semi-Wet';
  return 'Dry';
}

// ─── Hand evaluation (simplified, vs board) ───────────────────────────────────

function evaluate(h1, h2, board) {
  const boardVals  = board.map(c => RANK_VAL[c.rank]);
  const boardSuits = board.map(c => c.suit);
  const boardRanks = board.map(c => c.rank);
  const topBoardVal= Math.max(...boardVals);
  const sortedBoardVals = [...boardVals].sort((a, b) => b - a);

  const v1 = RANK_VAL[h1.rank], v2 = RANK_VAL[h2.rank];
  const s1 = h1.suit, s2 = h2.suit;

  // --- Pairs ---
  const h1Pairs  = boardVals.filter(v => v === v1).length > 0;
  const h2Pairs  = boardVals.filter(v => v === v2).length > 0;
  const isPocket = v1 === v2;

  let handCategory = 'air';
  let handDesc = 'no pair, no draw';

  // Set / trips / full house
  if (isPocket && boardVals.includes(v1)) {
    handCategory = 'set';
    handDesc = `set of ${h1.rank}s`;
    // Upgrade to full house if the board has a pair of a different rank
    const bRankCounts = {};
    for (const v of boardVals) bRankCounts[v] = (bRankCounts[v] || 0) + 1;
    if (Object.entries(bRankCounts).some(([v, c]) => c >= 2 && Number(v) !== v1)) {
      handCategory = 'full_house';
      handDesc = `full house, ${h1.rank}s full`;
    }
  }
  // Two pair (pocket pair + board pair or two board hits)
  else if (!isPocket && h1Pairs && h2Pairs) {
    handCategory = 'two_pair';
    handDesc = `two pair (${h1.rank}s and ${h2.rank}s)`;
  }
  // Overpair
  else if (isPocket && v1 > topBoardVal) {
    handCategory = 'overpair';
    handDesc = `overpair (${h1.rank}${h1.rank})`;
  }
  // Top pair
  else if (!isPocket && (v1 === topBoardVal || v2 === topBoardVal)) {
    const kicker = v1 === topBoardVal ? v2 : v1;
    const kickerStr = v1 === topBoardVal ? h2.rank : h1.rank;
    const kickerGood = kicker >= 10;
    handCategory = kickerGood ? 'top_pair_good_kicker' : 'top_pair_weak_kicker';
    handDesc = `top pair, ${kickerGood ? 'good' : 'weak'} kicker (${h1.rank}${h2.rank} on ${boardRanks[boardVals.indexOf(topBoardVal)]})`;
  }
  // Middle or bottom pair
  else if (!isPocket && (h1Pairs || h2Pairs)) {
    handCategory = 'middle_pair';
    handDesc = `middle/bottom pair`;
  }

  // --- Made straight (must check before draws so it overrides pair/air labels) ---
  const allVals   = [v1, v2, ...boardVals];
  const uniqueVals = [...new Set(allVals)].sort((a, b) => a - b);
  const RANK_NAME  = {14:'A',13:'K',12:'Q',11:'J',10:'T',9:'9',8:'8',7:'7',6:'6',5:'5',4:'4',3:'3',2:'2'};

  let isStraight = false;
  // Wheel: A(14)-2-3-4-5
  if (uniqueVals.includes(14) && [2,3,4,5].every(v => uniqueVals.includes(v))) {
    isStraight = true;
    handCategory = 'straight';
    handDesc = 'A-2-3-4-5 straight (wheel)';
  }
  // Normal straights: any 5-card window with span=4 (all consecutive, no gaps)
  if (!isStraight) {
    for (let i = 0; i <= uniqueVals.length - 5; i++) {
      const w = uniqueVals.slice(i, i + 5);
      if (w[4] - w[0] === 4) {
        isStraight = true;
        handCategory = 'straight';
        handDesc = `${RANK_NAME[w[4]]}-high straight`;
        break;
      }
    }
  }

  // --- Flush & draws ---
  const allSuits = [s1, s2, ...boardSuits];
  const suitCounts = {};
  for (const s of allSuits) suitCounts[s] = (suitCounts[s] || 0) + 1;
  const hasFD = Object.values(suitCounts).some(n => n >= 4);

  // Made flush: 5+ cards of the same suit across hole cards + board
  // Overrides pair/set/full-house categories; keeps straight category if present (straight flush)
  const isMadeFlush = Object.values(suitCounts).some(n => n >= 5);
  if (isMadeFlush && handCategory !== 'straight') {
    const flushSuit = Object.entries(suitCounts).find(([, n]) => n >= 5)[0];
    const flushCards = [h1, h2, ...board].filter(c => c.suit === flushSuit);
    const flushHighVal = Math.max(...flushCards.map(c => RANK_VAL[c.rank]));
    const FN = { 14:'A',13:'K',12:'Q',11:'J',10:'T',9:'9',8:'8',7:'7',6:'6',5:'5',4:'4',3:'3',2:'2' };
    handCategory = 'flush';
    handDesc = `${FN[flushHighVal]}-high flush`;
  }

  let oesd = false, gutshot = false;
  if (!isStraight) {
    for (let i = 0; i <= uniqueVals.length - 4; i++) {
      const w    = uniqueVals.slice(i, i + 4);
      const span = w[3] - w[0];
      if (span === 3) { oesd = true; break; }
      if (span === 4) { gutshot = true; }
    }
  }

  // Upgrade draw categories
  if (!isStraight && (handCategory === 'air' || handCategory === 'middle_pair')) {
    if (hasFD && oesd)    { handCategory = 'combo_draw';   handDesc = 'flush draw + open-ended straight draw (~15 outs)'; }
    else if (hasFD)       { handCategory = 'flush_draw';   handDesc = 'flush draw (~9 outs)'; }
    else if (oesd)        { handCategory = 'oesd';         handDesc = 'open-ended straight draw (~8 outs)'; }
    else if (gutshot)     { handCategory = 'gutshot';      handDesc = 'gutshot straight draw (~4 outs)'; }
  }

  return { category: handCategory, desc: handDesc, hasFD, oesd, gutshot };
}

// ─── Scenario recipes ─────────────────────────────────────────────────────────
// Each recipe builds one complete scenario object. All take a fresh deck as input.

function scenarioIPCbetDryAir(deck) {
  const heroPos    = pick(['BTN', 'CO']);
  const villainPos = 'BB';
  const pot        = pick([5, 6, 7, 8]);
  const stack      = pick([85, 90, 92, 95, 97, 100]);
  const spr        = +(stack / pot).toFixed(1);

  // Hero needs air/overcards on a dry board
  let hero, board, texture, eval_;
  for (let i = 0; i < 100; i++) {
    const d = makeDeck();
    const h = dealFrom(d, 2);
    const b = dealFrom(d, 3);
    texture = classifyTexture(b);
    if (texture !== 'Dry') continue;
    eval_ = evaluate(h[0], h[1], b);
    if (eval_.category === 'air' || eval_.category === 'gutshot') {
      hero  = h; board = b; deck = d; break;
    }
  }
  if (!hero) {
    // Guaranteed: Q♠J♥ (overcards, no draw) on 9♦4♣2♥ — air on dry board
    hero = [{ rank: 'Q', suit: '♠' }, { rank: 'J', suit: '♥' }];
    board = [{ rank: '9', suit: '♦' }, { rank: '4', suit: '♣' }, { rank: '2', suit: '♥' }];
    texture = 'Dry'; eval_ = evaluate(hero[0], hero[1], board);
  }

  const betPct = pick([25, 30, 33]);
  const bet    = Math.round(pot * betPct / 100);

  return {
    title: `${heroPos} c-bet — dry board, no pair`,
    heroPos, villainPos,
    potType: 'SRP',
    heroHand: hero[0], heroHand2: hero[1],
    board,
    potBB: pot, effectiveStackBB: stack, street: 'Flop',
    question: `You are ${heroPos}. You raised preflop, ${villainPos} called. Flop: ${boardStr(board)} (${texture}). ${villainPos} checks. You hold ${cardStr(hero[0])}${cardStr(hero[1])} — ${eval_.desc}. What do you do?`,
    options: [
      { label: `Bet ${betPct}% pot (~${bet}bb) — range bet`, value: 'bet_small' },
      { label: `Bet 67% pot (~${Math.round(pot * 0.67)}bb) — large bet`, value: 'bet_large' },
      { label: 'Check back', value: 'check' },
    ],
    correctOption: 'bet_small',
    explanation: `On a ${texture.toLowerCase()} board, ${heroPos} has a significant range advantage. Betting small (~${betPct}%) with your entire range — including air like ${cardStr(hero[0])}${cardStr(hero[1])} — is high EV. There are no draws to give free cards to, ${villainPos} must defend their whole range, and your bet risks little. This is the classic "range bet" on a dry board.`,
    spr,
    boardTexture: texture,
    keyLesson: `Range bet small (~33%) on dry boards with range advantage, even with air. Low risk, forces precise defence.`,
  };
}

function scenarioIPCbetWetDraw(deck) {
  const heroPos    = pick(['BTN', 'CO', 'HJ']);
  const villainPos = 'BB';
  const pot        = pick([5, 6, 7, 8]);
  const stack      = pick([85, 90, 95, 97, 100]);
  const spr        = +(stack / pot).toFixed(1);

  let hero, board, texture, eval_;
  for (let i = 0; i < 100; i++) {
    const d = makeDeck();
    const h = dealFrom(d, 2);
    const b = dealFrom(d, 3);
    texture = classifyTexture(b);
    if (texture !== 'Wet' && texture !== 'Semi-Wet') continue;
    eval_ = evaluate(h[0], h[1], b);
    if (['combo_draw', 'flush_draw', 'oesd'].includes(eval_.category)) {
      hero = h; board = b; deck = d; break;
    }
  }
  if (!hero) {
    // Guaranteed: A♣K♣ on T♣7♦2♣ — 4 clubs = flush draw, Semi-Wet board
    hero = [{ rank: 'A', suit: '♣' }, { rank: 'K', suit: '♣' }];
    board = [{ rank: 'T', suit: '♣' }, { rank: '7', suit: '♦' }, { rank: '2', suit: '♣' }];
    texture = 'Semi-Wet'; eval_ = evaluate(hero[0], hero[1], board);
  }

  const betPct  = pick([65, 67, 70, 75]);
  const bet     = Math.round(pot * betPct / 100);
  const betSmall= Math.round(pot * 0.33);

  return {
    title: `${heroPos} c-bet — wet board, strong draw`,
    heroPos, villainPos,
    potType: 'SRP',
    heroHand: hero[0], heroHand2: hero[1],
    board,
    potBB: pot, effectiveStackBB: stack, street: 'Flop',
    question: `You are ${heroPos}. ${villainPos} called your raise. Flop: ${boardStr(board)} (${texture}). ${villainPos} checks. You have ${eval_.desc} with ${cardStr(hero[0])}${cardStr(hero[1])}. What do you do?`,
    options: [
      { label: `Bet ${betPct}% pot (~${bet}bb) — semi-bluff`, value: 'bet_large' },
      { label: `Bet 33% pot (~${betSmall}bb) — small bet`, value: 'bet_small' },
      { label: 'Check back', value: 'check' },
    ],
    correctOption: 'bet_large',
    explanation: `With a ${eval_.desc} you have strong equity — around ${eval_.category === 'combo_draw' ? '54%' : eval_.category === 'flush_draw' ? '35%' : '32%'} equity against a typical range. Bet large (${betPct}%) to build the pot, deny equity to hands that may fold, and set up future streets. A small bet doesn't extract enough value and gives villain great odds to continue with dominated draws.`,
    spr,
    boardTexture: texture,
    keyLesson: `Semi-bluff large on wet boards with strong draws. Size builds pot and denies equity to weaker draws.`,
  };
}

function scenarioIPTopPairCheck(deck) {
  const heroPos    = pick(['BTN', 'CO']);
  const villainPos = 'BB';
  const pot        = pick([10, 11, 12, 14, 15]);
  const stack      = pick([80, 85, 88, 90, 95]);
  const spr        = +(stack / pot).toFixed(1);

  let hero, board, texture, eval_;
  for (let i = 0; i < 100; i++) {
    const d = makeDeck();
    const h = dealFrom(d, 2);
    const b = dealFrom(d, 3);
    texture = classifyTexture(b);
    eval_ = evaluate(h[0], h[1], b);
    if (['top_pair_weak_kicker', 'middle_pair'].includes(eval_.category) && texture === 'Wet') {
      hero = h; board = b; deck = d; break;
    }
  }
  if (!hero) {
    // Guaranteed: 9♠8♦ on K♣J♣9♦ — middle pair (9s), Wet board
    hero = [{ rank: '9', suit: '♠' }, { rank: '8', suit: '♦' }];
    board = [{ rank: 'K', suit: '♣' }, { rank: 'J', suit: '♣' }, { rank: '9', suit: '♦' }];
    texture = 'Wet'; eval_ = evaluate(hero[0], hero[1], board);
  }

  const bet    = Math.round(pot * 0.67);
  const betSm  = Math.round(pot * 0.33);

  return {
    title: `${heroPos} — medium hand on wet board`,
    heroPos, villainPos,
    potType: 'SRP',
    heroHand: hero[0], heroHand2: hero[1],
    board,
    potBB: pot, effectiveStackBB: stack, street: 'Flop',
    question: `You are ${heroPos}. Flop: ${boardStr(board)} (${texture}). You hold ${cardStr(hero[0])}${cardStr(hero[1])} — ${eval_.desc}. Villain checks. What do you do?`,
    options: [
      { label: 'Check back — protect checking range', value: 'check' },
      { label: `Bet 67% pot (~${bet}bb)`, value: 'bet_large' },
      { label: `Bet 33% pot (~${betSm}bb)`, value: 'bet_small' },
    ],
    correctOption: 'check',
    explanation: `With ${eval_.desc} on a ${texture.toLowerCase()} board, checking back is correct. You need to protect your checking range with medium-strength hands. Betting sets you up for a tricky spot on the turn if called — you'll face another bet with a marginal hand. Checking keeps the pot small, realises your equity, and lets stronger hands do the betting.`,
    spr,
    boardTexture: texture,
    keyLesson: `Check medium-strength hands on wet boards. Protect your checking range and avoid bloating the pot with marginal holdings.`,
  };
}

function scenarioFacingCbetDraw(deck) {
  const heroPos    = 'BB';
  const villainPos = pick(['BTN', 'CO', 'HJ']);
  const pot        = pick([5, 6, 7, 8]);
  const stack      = pick([85, 90, 95, 97, 100]);
  const spr        = +(stack / pot).toFixed(1);
  const betPct     = pick([33, 40, 50]);
  const bet        = Math.round(pot * betPct / 100);
  const totalPot   = pot + bet;

  let hero, board, texture, eval_;
  for (let i = 0; i < 100; i++) {
    const d = makeDeck();
    const h = dealFrom(d, 2);
    const b = dealFrom(d, 3);
    texture = classifyTexture(b);
    eval_ = evaluate(h[0], h[1], b);
    if (['combo_draw', 'flush_draw', 'oesd'].includes(eval_.category) && (texture === 'Wet' || texture === 'Semi-Wet')) {
      hero = h; board = b; deck = d; break;
    }
  }
  if (!hero) {
    // Guaranteed: A♣K♣ on T♣7♦2♣ — 4 clubs = flush draw, Semi-Wet board
    hero = [{ rank: 'A', suit: '♣' }, { rank: 'K', suit: '♣' }];
    board = [{ rank: 'T', suit: '♣' }, { rank: '7', suit: '♦' }, { rank: '2', suit: '♣' }];
    texture = 'Semi-Wet'; eval_ = evaluate(hero[0], hero[1], board);
  }

  return {
    title: `BB defends draw vs ${villainPos} c-bet`,
    heroPos, villainPos,
    potType: 'SRP',
    heroHand: hero[0], heroHand2: hero[1],
    board,
    potBB: totalPot, effectiveStackBB: stack, street: 'Flop',
    question: `You are ${heroPos}. Flop: ${boardStr(board)} (${texture}). You have ${eval_.desc} with ${cardStr(hero[0])}${cardStr(hero[1])}. ${villainPos} bets ${bet}bb (~${betPct}% of ${pot}bb pot). What do you do?`,
    options: [
      { label: 'Call — continue with draw equity', value: 'call' },
      { label: 'Raise — check-raise semi-bluff', value: 'raise' },
      { label: 'Fold — not enough equity', value: 'fold' },
    ],
    correctOption: eval_.category === 'combo_draw' ? 'raise' : 'call',
    explanation: eval_.category === 'combo_draw'
      ? `With a combo draw (~15 outs, ~54% equity) you can check-raise as a semi-bluff. You have more equity than villain's range — raise to ~3x the bet. If called you still have massive draw equity. If villain folds, you take the pot immediately. This is a high-EV semi-bluff spot.`
      : `With a ${eval_.desc} you have roughly ${eval_.category === 'flush_draw' ? '35%' : '32%'} equity — enough to call vs a ${betPct}% pot bet (need ~${Math.round(bet / (totalPot + bet) * 100)}% equity). Call and see the turn. If you hit, you likely win a big pot. Folding surrenders too much equity.`,
    spr,
    boardTexture: texture,
    keyLesson: eval_.category === 'combo_draw'
      ? `Check-raise semi-bluff with combo draws (15 outs). Immediate fold equity + massive draw equity = high EV.`
      : `Call with flush draws and OESDs — you have enough equity. Use pot odds to confirm: if equity > call/(pot+call) × 100, calling is profitable.`,
  };
}

function scenarioSetOnWetBoard(deck) {
  const heroPos    = pick(['BTN', 'CO', 'BB']);
  const villainPos = heroPos === 'BB' ? 'BTN' : 'BB';
  const pot        = pick([5, 6, 7, 8, 10]);
  const stack      = pick([85, 90, 95, 97, 100]);
  const spr        = +(stack / pot).toFixed(1);

  let hero, board, texture, eval_;
  for (let i = 0; i < 100; i++) {
    const d    = makeDeck();
    const pair = pick(ALL_RANKS.filter(r => RANK_VAL[r] <= 10));
    const suit1= ALL_SUITS[0], suit2 = ALL_SUITS[1];
    const h    = [{ rank: pair, suit: suit1 }, { rank: pair, suit: suit2 }];
    // Deal board that contains one of this pair's rank
    const b = dealFrom(makeDeck().filter(c => !(c.rank === pair && (c.suit === suit1 || c.suit === suit2))), 3);
    if (!b.some(c => c.rank === pair)) continue;
    texture = classifyTexture(b);
    if (texture === 'Wet' || texture === 'Monotone') {
      hero = h; board = b; eval_ = evaluate(h[0], h[1], b); break;
    }
  }
  if (!hero) {
    // Guaranteed: 8♠8♥ on 8♣J♣9♦ — set of 8s on a Wet board
    hero = [{ rank: '8', suit: '♠' }, { rank: '8', suit: '♥' }];
    board = [{ rank: '8', suit: '♣' }, { rank: 'J', suit: '♣' }, { rank: '9', suit: '♦' }];
    texture = 'Wet'; eval_ = evaluate(hero[0], hero[1], board);
  }

  const villainBet = Math.round(pot * 0.6);
  const totalPot   = pot + villainBet;

  return {
    title: `Set on dangerous wet board — raise for protection`,
    heroPos, villainPos,
    potType: 'SRP',
    heroHand: hero[0], heroHand2: hero[1],
    board,
    potBB: totalPot, effectiveStackBB: stack, street: 'Flop',
    question: `Flop: ${boardStr(board)} (${texture}). You have ${eval_.desc} with ${cardStr(hero[0])}${cardStr(hero[1])}. ${villainPos} bets ${villainBet}bb into ${pot}bb. What do you do?`,
    options: [
      { label: `Raise to ~${villainBet * 3}bb — get it in`, value: 'raise' },
      { label: 'Call — keep villain in', value: 'call' },
      { label: 'Fold — board is too dangerous', value: 'fold' },
    ],
    correctOption: 'raise',
    explanation: `You have a set but the board is ${texture.toLowerCase()} — dangerous draws are out there. Raise now to charge draws and build the pot. Calling risks giving a free card for straight/flush draws. Sets are among the strongest hands in poker; raise for protection and value. Never fold a set here.`,
    spr,
    boardTexture: texture,
    keyLesson: `With sets on wet or monotone boards, raise for protection. Don't give draws a free card — charge them full price.`,
  };
}

function scenarioThreeBetPotOverpair(deck) {
  const heroPos    = pick(['SB', 'CO', 'BTN']);
  const villainPos = heroPos === 'SB' ? 'BTN' : 'BB';
  const pot        = pick([17, 18, 20, 21, 24, 25]);
  const stack      = pick([75, 78, 79, 80, 82, 85]);
  const spr        = +(stack / pot).toFixed(1);

  const pair   = pick(['A', 'K', 'Q', 'J']);
  const hero   = [{ rank: pair, suit: '♠' }, { rank: pair, suit: '♥' }];
  let board, texture;
  for (let i = 0; i < 20; i++) {
    const d = makeDeck().filter(c => !(c.rank === pair && (c.suit === '♠' || c.suit === '♥')));
    board   = dealFrom(d, 3);
    texture = classifyTexture(board);
    if (RANK_VAL[board[0].rank] < RANK_VAL[pair] &&
        RANK_VAL[board[1].rank] < RANK_VAL[pair] &&
        RANK_VAL[board[2].rank] < RANK_VAL[pair]) break;
  }

  const betSmall  = Math.round(pot * 0.33);
  const betLarge  = Math.round(pot * 0.67);

  return {
    title: `3-bet pot — overpair, low SPR`,
    heroPos, villainPos,
    potType: '3BP',
    heroHand: hero[0], heroHand2: hero[1],
    board,
    potBB: pot, effectiveStackBB: stack, street: 'Flop',
    question: `You 3-bet, ${villainPos} called. Pot: ${pot}bb. SPR: ${spr}. Flop: ${boardStr(board)} (${texture}). You have ${pair}${pair} — overpair. ${villainPos} checks. What do you do?`,
    options: [
      { label: `Bet 33% pot (~${betSmall}bb) — small bet keeps range wide`, value: 'bet_small' },
      { label: `Bet 67% pot (~${betLarge}bb) — larger bet`, value: 'bet_large' },
      { label: 'Check — trap with overpair', value: 'check' },
    ],
    correctOption: 'bet_small',
    explanation: `With SPR ${spr} in a 3-bet pot, you're committed to stacking off with an overpair. Bet small (~33%) to keep ${villainPos}'s calling range wide — they'll call with middle pairs, top pairs, and draws. A large bet folds hands you beat. At SPR ${spr}, you can comfortably get all the money in by the river with small-medium-large sizing across three streets.`,
    spr,
    boardTexture: texture,
    keyLesson: `In 3-bet pots with low SPR (<5), overpairs are stack-off hands. Bet small to keep villain's calling range wide and get stacks in by the river.`,
  };
}

function scenarioTurnDoubleBarrel(deck) {
  const heroPos    = pick(['BTN', 'CO', 'HJ']);
  const villainPos = 'BB';
  const pot        = pick([10, 11, 12, 14, 15, 17, 18]);
  const stack      = pick([75, 80, 85, 88, 90]);
  const spr        = +(stack / pot).toFixed(1);

  let hero, flop, turn, texture, eval_;
  for (let i = 0; i < 100; i++) {
    const d = makeDeck();
    const h = dealFrom(d, 2);
    const f = dealFrom(d, 3);
    const t = dealFrom(d, 1);
    texture = classifyTexture(f);
    // Evaluate on the full 4-card board so the turn card is accounted for
    const fullBoard = [...f, t[0]];
    const eval4 = evaluate(h[0], h[1], fullBoard);
    if (['top_pair_good_kicker', 'overpair'].includes(eval4.category) && texture === 'Dry') {
      hero = h; flop = f; turn = t; eval_ = eval4; break;
    }
  }
  if (!hero) {
    // Guaranteed: A♠K♥ on A♣7♦3♥ flop + 2♠ turn — top pair good kicker on full board
    hero = [{ rank: 'A', suit: '♠' }, { rank: 'K', suit: '♥' }];
    flop = [{ rank: 'A', suit: '♣' }, { rank: '7', suit: '♦' }, { rank: '3', suit: '♥' }];
    turn = [{ rank: '2', suit: '♠' }];
    texture = 'Dry'; eval_ = evaluate(hero[0], hero[1], [...flop, turn[0]]);
  }

  const board     = [...flop, turn[0]];
  const betMed    = Math.round(pot * 0.5);
  const betLarge  = Math.round(pot * 0.75);

  return {
    title: `Turn double barrel — ${eval_.desc}`,
    heroPos, villainPos,
    potType: 'SRP',
    heroHand: hero[0], heroHand2: hero[1],
    board: [...flop, turn[0]],
    potBB: pot, effectiveStackBB: stack, street: 'Turn',
    question: `You c-bet the flop, ${villainPos} called. Turn: ${cardStr(turn[0])} (blank). Pot: ${pot}bb. You have ${eval_.desc} with ${cardStr(hero[0])}${cardStr(hero[1])}. ${villainPos} checks. What do you do?`,
    options: [
      { label: `Bet 50% pot (~${betMed}bb) — double barrel`, value: 'bet_medium' },
      { label: `Bet 75% pot (~${betLarge}bb) — large double barrel`, value: 'bet_large' },
      { label: 'Check — pot control', value: 'check' },
    ],
    correctOption: 'bet_medium',
    explanation: `With ${eval_.desc} on a blank turn, bet 50% to continue extracting value. The blank doesn't improve ${villainPos}'s draws or pairs dramatically. A 50% bet keeps ${villainPos}'s calling range wide (draws, second pair) while building toward a river bet. SPR is ${spr} — you have room to bet-bet-bet without over-committing prematurely. A large bet may fold out the hands you beat.`,
    spr,
    boardTexture: texture,
    keyLesson: `Double-barrel blank turns with top pair+ and 50% sizing. Keeps calling ranges wide and builds pot for river value.`,
  };
}

function scenarioRiverThinValue(deck) {
  const heroPos    = pick(['BTN', 'CO']);
  const villainPos = 'BB';
  const pot        = pick([20, 22, 25, 28, 30, 33, 35]);
  const stack      = pick([55, 60, 65, 70, 75]);
  const spr        = +(stack / pot).toFixed(1);

  let hero, board, texture, eval_;
  for (let i = 0; i < 100; i++) {
    const d = makeDeck();
    const h = dealFrom(d, 2);
    const b = dealFrom(d, 5);
    texture = classifyTexture(b.slice(0, 3));
    eval_   = evaluate(h[0], h[1], b); // evaluate on full 5-card river board
    if (['top_pair_weak_kicker', 'middle_pair', 'top_pair_good_kicker'].includes(eval_.category)) {
      hero = h; board = b; break;
    }
  }
  if (!hero) {
    // Guaranteed: A♠K♥ on A♣7♦3♥2♠5♣ river — top pair good kicker
    hero = [{ rank: 'A', suit: '♠' }, { rank: 'K', suit: '♥' }];
    board = [{ rank: 'A', suit: '♣' }, { rank: '7', suit: '♦' }, { rank: '3', suit: '♥' }, { rank: '2', suit: '♠' }, { rank: '5', suit: '♣' }];
    texture = 'Dry'; eval_ = evaluate(hero[0], hero[1], board); // full 5-card board
  }

  const betSmall  = Math.round(pot * 0.28);
  const betLarge  = Math.round(pot * 0.67);

  return {
    title: `River thin value bet`,
    heroPos, villainPos,
    potType: 'SRP',
    heroHand: hero[0], heroHand2: hero[1],
    board,
    potBB: pot, effectiveStackBB: stack, street: 'River',
    question: `River. Pot: ${pot}bb. ${villainPos} checks. You have ${eval_.desc} with ${cardStr(hero[0])}${cardStr(hero[1])} — likely best but not certain. What do you do?`,
    options: [
      { label: `Bet 25-30% pot (~${betSmall}bb) — thin value`, value: 'bet_small' },
      { label: `Bet 67% pot (~${betLarge}bb) — large value`, value: 'bet_large' },
      { label: 'Check back — pot control', value: 'check' },
    ],
    correctOption: 'bet_small',
    explanation: `With ${eval_.desc} on the river, bet small (~25-30%) for thin value. This extracts value from weaker pairs and busted draws that can still call a small amount. A large bet turns your hand into a near-bluff — villain only calls with hands that beat you. Checking surrenders value from hands you beat. Small sizing maximises value extraction with marginal holdings.`,
    spr,
    boardTexture: texture,
    keyLesson: `River thin value bets use small sizing (25-33%). Larger bets only get called by hands that beat you — small bets extract from weaker pairs and busted draws.`,
  };
}

// ─── Scenario pool ────────────────────────────────────────────────────────────

const RECIPES = [
  scenarioIPCbetDryAir,
  scenarioIPCbetWetDraw,
  scenarioIPTopPairCheck,
  scenarioFacingCbetDraw,
  scenarioSetOnWetBoard,
  scenarioThreeBetPotOverpair,
  scenarioTurnDoubleBarrel,
  scenarioRiverThinValue,
];

/**
 * Generates a unique, fully randomised postflop scenario each call.
 * Compatible with PostflopScreen.js render expectations.
 */
export function generatePostflopScenario() {
  const recipe = pick(RECIPES);
  const deck   = makeDeck();
  return recipe(deck);
}
