// =============================================================================
// AdManager.js — Abstract Ad Integration Wrapper
// =============================================================================
//
// PURPOSE:
//   Single interface for all ad triggers in the app. Every part of the app
//   that needs to show an ad must call THIS file — never call ad SDKs inline.
//
// CURRENT STATE:  Stub — logs to console, no real ad shown.
//
// TO INTEGRATE APPLOVIN MAX:
//   1. Install the SDK:
//        npx expo install react-native-applovin-max
//   2. Initialise it in App.js:
//        import AppLovinMAX from 'react-native-applovin-max';
//        AppLovinMAX.initialize(process.env.EXPO_PUBLIC_APPLOVIN_SDK_KEY, () => {
//          AppLovinMAX.InterstitialAd.loadAd(process.env.EXPO_PUBLIC_APPLOVIN_INTERSTITIAL_AD_UNIT_ID);
//        });
//   3. Replace the body of showAdTrigger() below with:
//        const unitId = process.env.EXPO_PUBLIC_APPLOVIN_INTERSTITIAL_AD_UNIT_ID;
//        if (AppLovinMAX.InterstitialAd.isAdReady(unitId)) {
//          AppLovinMAX.InterstitialAd.showAd(unitId);
//          AppLovinMAX.InterstitialAd.loadAd(unitId); // pre-load next
//        }
//   No other file in the app needs to change.
//   Keys come from .env via EXPO_PUBLIC_APPLOVIN_SDK_KEY and
//   EXPO_PUBLIC_APPLOVIN_INTERSTITIAL_AD_UNIT_ID — never hardcode them here.
//
// CONSUMERS:
//   - infrastructure/HandTracker.js   → triggers ad every 20 hands (free tier only)
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Triggers an interstitial ad to be shown to the user.
 *
 * Always `await` this call — it is async so it can drop in a real SDK
 * (AppLovin MAX, AdMob) without changing any call sites.
 *
 * @returns {Promise<void>}
 */
export async function showAdTrigger() {
  // ── STUB ──────────────────────────────────────────────────────
  // Replace this block with the AppLovin MAX SDK call shown above.
  console.log('[AdManager] showAdTrigger() called — interstitial ad would appear here.');
  // ─────────────────────────────────────────────────────────────
}
