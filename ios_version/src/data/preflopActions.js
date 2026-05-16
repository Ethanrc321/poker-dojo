// TAG-calibrated response ranges when facing a single open raise preflop.
// Structure: FACING_OPEN_RANGES[villainPos][heroPos] = { threebet: Set, call: Set }
// Any hand not in threebet or call = fold.

export const OPEN_SIZES = {
  UTG: '3bb', HJ: '3bb', CO: '2.5bb', BTN: '2.5bb', SB: '3bb',
};

export const POS_FULL = {
  UTG: 'Under the Gun', HJ: 'Hijack', CO: 'Cutoff',
  BTN: 'Button', SB: 'Small Blind', BB: 'Big Blind',
};

// Valid hero positions for each villain opener
export const HERO_POSITIONS_FOR = {
  UTG: ['HJ', 'CO', 'BTN', 'SB', 'BB'],
  HJ:  ['CO', 'BTN', 'SB', 'BB'],
  CO:  ['BTN', 'SB', 'BB'],
  BTN: ['SB', 'BB'],
  SB:  ['BB'],
};

export const FACING_OPEN_RANGES = {
  // ── UTG opens (~10% range) ────────────────────────────────────────────
  UTG: {
    HJ: {
      threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','A5s','A4s']),
      call:     new Set(['TT','99','AQs','KQs']),
    },
    CO: {
      threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs','A5s','A4s']),
      call:     new Set(['TT','99','88','AQo','AJs','KQs','KJs','QJs','JTs','T9s']),
    },
    BTN: {
      threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs','AJs','A5s','A4s','A3s']),
      call:     new Set(['TT','99','88','77','AQo','AJo','KQs','KJs','KTs','QJs','JTs','T9s','98s','87s']),
    },
    SB: {
      // SB vs UTG: 3-bet value/bluff + some calls (chart shows ~6.5% call rate)
      threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','A5s','A4s']),
      call:     new Set(['TT','99','AQs','KQs']),
    },
    BB: {
      threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs','A5s','A4s','A3s','A2s']),
      call:     new Set(['TT','99','88','77','66','55','44','33','22','AQo','AJo','ATs',
                         'KQs','KJs','KTs','KQo','QJs','JTs','T9s','98s','87s','76s','65s','54s']),
    },
  },

  // ── HJ opens (~21% range) ────────────────────────────────────────────
  HJ: {
    CO: {
      threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs','A5s','A4s']),
      call:     new Set(['TT','99','88','77','AQo','AJs','ATs','KQs','KJs','QJs','JTs','T9s','98s']),
    },
    BTN: {
      threebet: new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AJs','KQs','A5s','A4s','A3s']),
      call:     new Set(['99','88','77','AQo','AJo','ATs','KJs','KTs','KQo','QJs','QTs','JTs','T9s','98s','87s','76s']),
    },
    SB: {
      // SB vs HJ: 3-bet or fold mainly, small call range (chart: 7.1% call)
      threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','A5s','A4s','A3s']),
      call:     new Set(['TT','99','88','AQs','KQs']),
    },
    BB: {
      threebet: new Set(['AA','KK','QQ','JJ','AKs','AKo','AQs','A5s','A4s','A3s','A2s']),
      call:     new Set(['TT','99','88','77','66','55','44','33','22','AQo','AJo','ATs','A9s',
                         'KQs','KJs','KTs','KQo','QJs','QTs','JTs','T9s','98s','87s','76s','65s','54s']),
    },
  },

  // ── CO opens (~27% range) ────────────────────────────────────────────
  CO: {
    BTN: {
      threebet: new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AJs','KQs','A5s','A4s','A3s']),
      call:     new Set(['99','88','77','66','55','AQo','AJo','ATs','A9s','KJs','KTs','KJo','KQo',
                         'QJs','QTs','QJo','JTs','T9s','98s','87s','76s','65s']),
    },
    SB: {
      // Chart shows 0% call from SB vs CO — pure 3-bet or fold
      threebet: new Set(['AA','KK','QQ','JJ','TT','99','AKs','AKo','AQs','AJs','ATs',
                         'A5s','A4s','A3s','A2s','KQs','QJs','JTs','T9s','98s']),
      call:     new Set([]),
    },
    BB: {
      threebet: new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AJs','A5s','A4s','A3s','A2s']),
      call:     new Set(['99','88','77','66','55','44','33','22','AQo','AJo','ATs','A9s','A8s',
                         'KQs','KJs','KTs','K9s','KQo','QJs','QTs','JTs','T9s','98s','87s','76s','65s','54s']),
    },
  },

  // ── BTN opens (~51% range) ───────────────────────────────────────────
  BTN: {
    SB: {
      // Chart shows 0% call from SB vs BTN — pure 3-bet or fold
      threebet: new Set(['AA','KK','QQ','JJ','TT','99','88','AKs','AKo','AQs','AJs','ATs','KQs','KJs',
                         'A5s','A4s','A3s','A2s','QJs','JTs','T9s','98s','87s','76s','K9s','Q9s']),
      call:     new Set([]),
    },
    BB: {
      threebet: new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AJs','KQs','A5s','A4s','A3s','A2s']),
      call:     new Set(['99','88','77','66','55','44','33','22','AQo','AJo','ATs','A9s','A8s','A7s',
                         'KJs','KTs','K9s','K8s','KQo','QJs','QTs','JTs','T9s','98s','87s','76s','65s','54s','43s']),
    },
  },

  // ── SB opens (~35-40% range) ─────────────────────────────────────────
  SB: {
    BB: {
      threebet: new Set(['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AJs','KQs','A5s','A4s','A3s']),
      call:     new Set(['99','88','77','66','55','44','33','22','AQo','AJo','ATs','A9s',
                         'KJs','KTs','KQo','QJs','QTs','JTs','T9s','98s','87s','76s','65s']),
    },
  },
};

export const ALL_SCENARIOS = Object.entries(FACING_OPEN_RANGES).flatMap(([vPos, heroMap]) =>
  Object.keys(heroMap).map(hPos => ({ villainPos: vPos, heroPos: hPos }))
);

export function getActionVsRaise(hand, heroPos, villainPos) {
  const ranges = FACING_OPEN_RANGES[villainPos]?.[heroPos];
  if (!ranges) return 'fold';
  if (ranges.threebet.has(hand)) return '3bet';
  if (ranges.call.has(hand)) return 'call';
  return 'fold';
}

// Curated borderline fold hands — strong-looking hands that are actually folds in tight spots
const BORDERLINE_FOLDS = [
  'KJo','KTo','K9o','QJo','QTo','Q9o','JTo','J9o','T9o',
  'A9o','A8o','A7o','A6o','A5o',
  'K8s','K7s','K6s','Q9s','Q8s','J9s','J8s','T8s','97s','86s','75s','64s',
  'ATo',
];

export function buildVsRaisePool(heroPos, villainPos) {
  const ranges = FACING_OPEN_RANGES[villainPos]?.[heroPos];
  if (!ranges) return [];

  const pool = [];
  for (const h of ranges.threebet) pool.push({ hand: h, action: '3bet' });
  for (const h of ranges.call)     pool.push({ hand: h, action: 'call' });

  // Add fold hands that aren't in the range for this spot (so they stay as folds)
  for (const h of BORDERLINE_FOLDS) {
    if (!ranges.threebet.has(h) && !ranges.call.has(h)) {
      pool.push({ hand: h, action: 'fold' });
    }
  }

  return pool;
}

export function getVsRaiseExplanation(hand, heroPos, villainPos, correctAction) {
  const openSize = OPEN_SIZES[villainPos] || '3bb';
  const isIP = !['SB', 'BB'].includes(heroPos);
  const isBB = heroPos === 'BB';
  const isBluff = new Set(['A5s','A4s','A3s','A2s']).has(hand);
  const isPair = hand.length === 2;
  const isSmallPair = isPair && ['22','33','44','55','66','77','88'].includes(hand);
  const villainTight = ['UTG', 'HJ'].includes(villainPos);

  if (correctAction === '3bet') {
    if (isBluff) {
      return `${hand} is a 3-bet bluff. The ace blocker reduces the chance villain holds AA/AK. It has decent equity when called, and keeps your 3-bet range balanced so you aren't only betting with premiums.`;
    }
    return `${hand} is a value 3-bet from ${heroPos} vs ${villainPos}'s ${openSize} open. Build the pot now — you have a clear equity advantage and want to play for stacks against most of villain's range.`;
  }

  if (correctAction === 'call') {
    if (isSmallPair) {
      return `${hand} is a set-mine call. You'll flop a set ~11% of the time, and when you do you often win a big pot. The implied odds at standard stack depths make this a profitable continue.`;
    }
    if (isBB) {
      return `From the BB you're getting a discount and closing the action. ${hand} has enough equity and playability to defend here — folding would give away too much of your forced investment.`;
    }
    return `${hand} is a flat call from ${heroPos}. ${isIP
      ? 'Acting last postflop lets you realize your equity, float profitably, and bluff-catch with position — a huge edge.'
      : 'Despite being OOP, this hand has enough raw equity to continue against this open size.'}`;
  }

  // fold
  if (heroPos === 'SB') {
    return `From the SB you play the entire hand out of position. ${hand} doesn't have the nut potential to 3-bet polarized or the postflop playability to call. Fold and wait for a better spot.`;
  }
  if (villainTight) {
    return `${villainPos} has a tight range (~${villainPos === 'UTG' ? '17' : '21'}% of hands). ${hand} is dominated or at a significant equity disadvantage. Neither 3-betting nor calling is profitable — fold.`;
  }
  return `${hand} falls below the continue threshold from ${heroPos} here. Calling builds a weak, hard-to-play range; the hand isn't strong enough to 3-bet profitably either. Disciplined folds prevent stack leakage.`;
}
