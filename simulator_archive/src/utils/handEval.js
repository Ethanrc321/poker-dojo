// ============================================================
// Hand Evaluation Engine
// ============================================================

export const SUITS = ['♠','♥','♦','♣'];
export const RANK_VAL = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14};
export const VAL_TO_RANK = {2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'T',11:'J',12:'Q',13:'K',14:'A'};
const RANKS_DECK = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];

export function createDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS_DECK) deck.push({ rank: r, suit: s });
  return shuffleDeck(deck);
}

export function shuffleDeck(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Score a 5-card hand. Higher = better.
export function evaluate5(cards) {
  const vals = cards.map(c => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const isFlush = new Set(cards.map(c => c.suit)).size === 1;
  const cnt = {};
  for (const v of vals) cnt[v] = (cnt[v] || 0) + 1;
  const grps = Object.entries(cnt)
    .map(([v, c]) => ({ v: +v, c }))
    .sort((a, b) => b.c - a.c || b.v - a.v);

  // Straight detection
  let isStraight = false, strHigh = 0;
  const uniq = [...new Set(vals)].sort((a, b) => b - a);
  if (uniq.length >= 5) {
    if (uniq[0] - uniq[4] === 4) { isStraight = true; strHigh = uniq[0]; }
    // Wheel A-2-3-4-5
    if (uniq.includes(14) && uniq.includes(5) && uniq.includes(4) && uniq.includes(3) && uniq.includes(2)) {
      isStraight = true; strHigh = 5;
    }
  }

  if (isFlush && isStraight) {
    const cat = strHigh === 14 ? 10 : 9;
    return { cat, score: cat * 1e8 + strHigh, desc: strHigh === 14 ? 'Royal Flush' : 'Straight Flush' };
  }
  if (grps[0].c === 4)
    return { cat: 8, score: 8e8 + grps[0].v * 100 + (grps[1]?.v || 0), desc: 'Four of a Kind' };
  if (grps[0].c === 3 && grps[1]?.c >= 2)
    return { cat: 7, score: 7e8 + grps[0].v * 100 + (grps[1]?.v || 0), desc: 'Full House' };
  if (isFlush)
    return { cat: 6, score: 6e8 + vals.reduce((s, v, i) => s + v * Math.pow(16, 4 - i), 0), desc: 'Flush' };
  if (isStraight)
    return { cat: 5, score: 5e8 + strHigh, desc: 'Straight' };
  if (grps[0].c === 3) {
    const k = grps.slice(1).map(g => g.v);
    return { cat: 4, score: 4e8 + grps[0].v * 1e4 + (k[0] || 0) * 100 + (k[1] || 0), desc: 'Three of a Kind' };
  }
  if (grps[0].c === 2 && grps[1]?.c === 2) {
    const hi = Math.max(grps[0].v, grps[1].v), lo = Math.min(grps[0].v, grps[1].v);
    const k = grps.find(g => g.c === 1)?.v || 0;
    return { cat: 3, score: 3e8 + hi * 1e4 + lo * 100 + k, desc: 'Two Pair' };
  }
  if (grps[0].c === 2) {
    const k = grps.filter(g => g.c === 1).map(g => g.v).sort((a, b) => b - a);
    return {
      cat: 2,
      score: 2e8 + grps[0].v * 1e6 + (k[0] || 0) * 1e4 + (k[1] || 0) * 100 + (k[2] || 0),
      desc: 'One Pair',
    };
  }
  return { cat: 1, score: vals.reduce((s, v, i) => s + v * Math.pow(16, 4 - i), 0), desc: 'High Card' };
}

// Best 5-card hand from up to 7 cards
export function getBestHand(holeCards, community) {
  const all = [...holeCards, ...(community || [])];
  if (all.length < 5) return null;
  let best = null;
  for (let i = 0; i < all.length; i++)
  for (let j = i + 1; j < all.length; j++)
  for (let k = j + 1; k < all.length; k++)
  for (let l = k + 1; l < all.length; l++)
  for (let m = l + 1; m < all.length; m++) {
    const h = evaluate5([all[i], all[j], all[k], all[l], all[m]]);
    if (!best || h.score > best.score) best = h;
  }
  return best;
}

// Detect flush draw, open-ended straight draw, gutshot from hole + community
export function getDraws(holeCards, community) {
  if (!community || community.length < 3) return [];
  const draws = [];
  const all = [...holeCards, ...community];
  const holeVals = holeCards.map(c => RANK_VAL[c.rank]);

  // Flush draw: 4 of same suit on board+hole
  for (const suit of SUITS) {
    const cnt = all.filter(c => c.suit === suit).length;
    const holeCnt = holeCards.filter(c => c.suit === suit).length;
    if (cnt === 4 && holeCnt >= 1) draws.push('flush_draw');
    if (cnt === 3 && holeCnt === 2 && community.length < 5) draws.push('backdoor_flush');
  }

  // Straight draws
  const allVals = [...new Set(all.map(c => RANK_VAL[c.rank]))];
  // Include ace as 1 for wheel
  const extVals = allVals.includes(14) ? [...allVals, 1] : allVals;

  for (let lo = 1; lo <= 10; lo++) {
    const seq = [lo, lo+1, lo+2, lo+3, lo+4];
    const have = seq.filter(v => extVals.includes(v));
    if (have.length === 5) continue; // already made
    if (have.length === 4) {
      const missing = seq.find(v => !extVals.includes(v));
      // Open ended if missing is on either end
      if (missing === lo || missing === lo + 4) {
        if (holeVals.some(v => have.includes(v) || have.includes(v === 14 ? 1 : v))) draws.push('oesd');
      } else {
        if (holeVals.some(v => have.includes(v) || have.includes(v === 14 ? 1 : v))) draws.push('gutshot');
      }
    }
    if (have.length === 3 && community.length < 5) {
      if (holeVals.filter(v => have.includes(v)).length >= 2) draws.push('backdoor_straight');
    }
  }

  return [...new Set(draws)];
}

// Rough hand strength label for postflop coaching
export function handStrengthLabel(cat) {
  return ['','High Card','One Pair','Two Pair','Trips','Straight','Flush','Full House','Quads','Straight Flush','Royal Flush'][cat] || '?';
}

// Estimate approximate equity % given hand category + draws (rough, for coaching only)
export function approxEquity(handCat, draws, community) {
  const street = !community ? 'preflop' : community.length === 3 ? 'flop' : community.length === 4 ? 'turn' : 'river';
  if (handCat >= 7) return 92; // FH+
  if (handCat >= 6) return 85; // flush
  if (handCat >= 5) return 82; // straight
  if (handCat >= 4) return 73; // trips
  if (handCat >= 3) return 62; // two pair
  if (handCat >= 2) {          // one pair — depends heavily on kicker/board
    const base = street === 'river' ? 55 : 50;
    if (draws.includes('flush_draw')) return base + 18;
    if (draws.includes('oesd')) return base + 15;
    return base;
  }
  // High card / air — draws only
  if (draws.includes('flush_draw') && draws.includes('oesd')) return 52;
  if (draws.includes('flush_draw')) return 36;
  if (draws.includes('oesd')) return 30;
  if (draws.includes('gutshot')) return 18;
  if (draws.includes('backdoor_flush') || draws.includes('backdoor_straight')) return 14;
  return 10;
}

// What does this hand "look like" on this board (relative strength)
export function relativeStrength(holeCards, community) {
  if (!community || community.length === 0) return 'preflop';
  const best = getBestHand(holeCards, community);
  const draws = getDraws(holeCards, community);

  if (!best) return 'air';
  if (best.cat >= 7) return 'nutted';
  if (best.cat >= 5) return 'very_strong';
  if (best.cat >= 4) return 'strong';
  if (best.cat >= 3) return 'solid';
  if (best.cat >= 2) {
    // Pair — check if it's top pair
    const boardVals = community.map(c => RANK_VAL[c.rank]);
    const maxBoard = Math.max(...boardVals);
    const holeVals = holeCards.map(c => RANK_VAL[c.rank]);
    const allCnt = [...holeCards, ...community].reduce((cnt, c) => {
      const v = RANK_VAL[c.rank]; cnt[v] = (cnt[v] || 0) + 1; return cnt;
    }, {});
    const pairVal = Object.entries(allCnt).find(([, c]) => c === 2)?.[0];

    if (!pairVal) return 'medium';
    const pv = +pairVal;

    // ── Board-pair detection ─────────────────────────────────────────────────
    // If the board itself supplies both copies of the pair (player holds neither),
    // then EVERYONE at the table has this "pair" — it is not a real hand advantage.
    // The player is purely in a kicker battle; classify accordingly.
    const boardCopies = boardVals.filter(v => v === pv).length;
    const holeCopies  = holeVals.filter(v => v === pv).length;
    if (boardCopies >= 2 && holeCopies === 0) {
      const kicker = Math.max(...holeVals);
      if (kicker >= 13) return 'board_pair_top_kicker'; // A or K — can win kicker battles
      if (kicker >= 10) return 'board_pair_mid_kicker'; // T–Q — often chopped or losing
      return 'board_pair_no_kicker';                    // 9 or below — effectively air
    }
    // ────────────────────────────────────────────────────────────────────────

    const myKicker = holeVals.filter(v => v !== pv).sort((a, b) => b - a)[0] || 0;

    if (pv === maxBoard) return myKicker >= 12 ? 'tptk' : myKicker >= 9 ? 'tpgk' : 'tp_weak';
    if (pv > boardVals.sort((a, b) => b - a)[1]) return 'middle_pair';
    return 'bottom_pair';
  }

  if (draws.length > 0) {
    const strong = draws.includes('flush_draw') && (draws.includes('oesd') || draws.includes('gutshot'));
    if (strong) return 'combo_draw';
    if (draws.includes('flush_draw') || draws.includes('oesd')) return 'strong_draw';
    return 'weak_draw';
  }
  return 'air';
}
