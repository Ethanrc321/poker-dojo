// =============================================================================
// HandTracker.js — Per-Hand Counter & Ad Trigger Coordinator
// =============================================================================
//
// PURPOSE:
//   Tracks how many hands the user has played this session. Every 20 hands,
//   triggers an interstitial ad via AdManager — unless the user is premium,
//   in which case no ads are ever shown.
//
// CURRENT STATE:
//   Uses an in-memory counter. Counter resets when the app is closed.
//   See "TO PERSIST ACROSS SESSIONS" below to add AsyncStorage persistence.
//
// TO PERSIST ACROSS SESSIONS (optional upgrade):
//   1. Install AsyncStorage:
//        npx expo install @react-native-async-storage/async-storage
//   2. Add to this file:
//        import AsyncStorage from '@react-native-async-storage/async-storage';
//   3. Replace `let handCount = 0;` with a load on module init:
//        let handCount = 0;
//        AsyncStorage.getItem('handTracker_count')
//          .then(v => { if (v !== null) handCount = parseInt(v, 10); });
//   4. In recordHandPlayed(), after incrementing, add:
//        await AsyncStorage.setItem('handTracker_count', String(handCount));
//   No other file in the app needs to change.
//
// CONSUMERS:
//   - infrastructure/HandTracker is called by any screen that completes a hand
//     (e.g. PlayScreen after a hand result is recorded)
//
// DEPENDENCIES:
//   - infrastructure/AdManager.js       → showAdTrigger()
//   - infrastructure/SubscriptionService.js → checkPremiumStatus()
// =============================================================================

import { showAdTrigger }     from './AdManager.js';
import { checkPremiumStatus } from './SubscriptionService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Internal state
// ─────────────────────────────────────────────────────────────────────────────

/** Number of hands played since app launch (resets on restart). */
let handCount = 0;

/** How many hands between each ad trigger. */
const AD_INTERVAL = 20;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call this once every time a hand is completed.
 *
 * Increments the internal counter. When the counter hits a multiple of
 * AD_INTERVAL (20), checks subscription status and shows an ad if the user
 * is on the free tier.
 *
 * Always `await` this call — it is async due to the subscription and ad checks.
 *
 * @returns {Promise<void>}
 */
export async function recordHandPlayed() {
  handCount += 1;

  if (handCount % AD_INTERVAL === 0) {
    const isPremium = await checkPremiumStatus();
    if (!isPremium) {
      await showAdTrigger();
    }
  }
}

/**
 * Returns the current hand count for this session.
 * Useful for display or debugging.
 *
 * @returns {number}
 */
export function getHandCount() {
  return handCount;
}

/**
 * Resets the counter to zero.
 * Call this if the user starts a new session within the same app launch.
 *
 * @returns {void}
 */
export function resetHandCount() {
  handCount = 0;
}
