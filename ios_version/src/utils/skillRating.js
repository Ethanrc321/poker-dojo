import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Skill Rating System
//
// Asymmetric ELO-style model:
//   • Gain decreases as rating rises  (harder to improve at the top)
//   • Loss increases as rating rises  (harder to maintain high ratings)
//
// Break-even accuracy required to hold a rating:
//   800   → ~51%   1300 → ~60%   1900 → ~73%
//   1000  → ~53%   1600 → ~66%   2200 → ~81%
//   1100  → ~56%   1750 → ~70%   2500 → ~87%
//                                 2800 → ~91%
// ─────────────────────────────────────────────────────────────────────────────

const RATING_KEY  = '@poker_skill_rating_v1';
const HISTORY_KEY = '@poker_skill_history_v1';

export const INITIAL_RATING = 800;
export const MAX_HISTORY    = 60;  // snapshots kept; all shown on graph

export const TIERS = [
  { min: 0,    label: 'Rookie',   color: '#6b7280' },
  { min: 700,  label: 'Amateur',  color: '#60a5fa' },
  { min: 1000, label: 'Regular',  color: '#34d399' },
  { min: 1300, label: 'Solid',    color: '#a78bfa' },
  { min: 1600, label: 'Advanced', color: '#f59e0b' },
  { min: 1900, label: 'Expert',   color: '#f97316' },
  { min: 2200, label: 'Master',   color: '#ef4444' },
  { min: 2500, label: 'Elite',    color: '#e8a030' },
];

export function getTier(rating) {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (rating >= t.min) tier = t;
    else break;
  }
  return tier;
}

export function getNextTier(rating) {
  const idx = TIERS.findIndex(t => t === getTier(rating));
  return TIERS[idx + 1] ?? null;
}

export function getTierProgress(rating) {
  const current = getTier(rating);
  const next    = getNextTier(rating);
  if (!next) return 1; // Elite — maxed
  return (rating - current.min) / (next.min - current.min);
}

// ── Delta formulas ────────────────────────────────────────────────────────────

function calcGain(rating) {
  // Max ~30 pts at start, floors at 4 pts near the top
  return Math.max(4, Math.round(30 * (1 - rating / 3200)));
}

function calcLoss(rating) {
  // Min ~16 pts at start, grows linearly to ~40+ at the top
  return Math.round(16 + rating / 120);
}

export function calcNewRating(current, isCorrect, isMinor = false) {
  if (isCorrect) return Math.min(3000, current + calcGain(current));
  const penalty = isMinor
    ? Math.round(calcLoss(current) * 0.5)
    : calcLoss(current);
  return Math.max(0, current - penalty);
}

// Preview the gain/loss at a given rating (used in UI hints)
export function previewDelta(rating) {
  return { gain: calcGain(rating), loss: calcLoss(rating) };
}

// ── Persistence ───────────────────────────────────────────────────────────────

export async function loadSkillRating() {
  try {
    const [rStr, hStr] = await Promise.all([
      AsyncStorage.getItem(RATING_KEY),
      AsyncStorage.getItem(HISTORY_KEY),
    ]);
    const rating  = rStr ? parseInt(rStr, 10) : INITIAL_RATING;
    const history = hStr
      ? JSON.parse(hStr)
      : [{ rating, ts: Date.now() }];
    return { rating, history };
  } catch {
    return { rating: INITIAL_RATING, history: [{ rating: INITIAL_RATING, ts: Date.now() }] };
  }
}

export async function saveSkillRating(rating, history) {
  await Promise.all([
    AsyncStorage.setItem(RATING_KEY, String(rating)),
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY))),
  ]);
}
