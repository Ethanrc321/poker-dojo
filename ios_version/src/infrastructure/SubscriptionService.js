// =============================================================================
// SubscriptionService.js — Premium Subscription Status
// =============================================================================
//
// PURPOSE:
//   Single source of truth for whether the current user has an active premium
//   subscription. Every part of the app that needs to gate features or suppress
//   ads must call THIS file — never check subscription status inline.
//
// CURRENT STATE:  Stub — always returns false (free tier).
//
// TO INTEGRATE REVENUECAT:
//   1. Install the SDK:
//        npx expo install react-native-purchases
//   2. Initialise it in App.js:
//        import Purchases from 'react-native-purchases';
//        Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY });
//   3. Replace the body of checkPremiumStatus() below with:
//        const info = await Purchases.getCustomerInfo();
//        return info.entitlements.active['premium'] !== undefined;
//   No other file in the app needs to change.
//   Your API key comes from .env via EXPO_PUBLIC_REVENUECAT_IOS_KEY — never hardcode it here.
//
// CONSUMERS:
//   - infrastructure/HandTracker.js   → suppress ads for premium users
//   - (future) screens/*              → gate premium-only features
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Internal state
// Set this to `true` during local development if you want to test premium UI
// without a real subscription. Never ship with this set to true.
// ─────────────────────────────────────────────────────────────────────────────
const DEV_OVERRIDE_PREMIUM = false;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns whether the user currently has an active premium subscription.
 *
 * Always `await` this call — it is async so it can drop in a real SDK
 * (RevenueCat, StoreKit) without changing any call sites.
 *
 * @returns {Promise<boolean>} true = premium, false = free tier
 */
export async function checkPremiumStatus() {
  if (DEV_OVERRIDE_PREMIUM) return true;

  // ── STUB ──────────────────────────────────────────────────────
  // Replace this block with the RevenueCat SDK call shown above.
  return false;
  // ─────────────────────────────────────────────────────────────
}

/**
 * Human-readable tier label for display purposes.
 * Returns 'Premium' or 'Free'.
 *
 * @returns {Promise<'Premium'|'Free'>}
 */
export async function getSubscriptionTier() {
  const isPremium = await checkPremiumStatus();
  return isPremium ? 'Premium' : 'Free';
}
