import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Subscription service
//
// Currently stubbed — to wire up real IAP:
//   npm install react-native-iap
//   Replace purchaseSubscription / restorePurchases with real purchase calls
//   Remove the DEV OVERRIDE block in purchaseSubscription
// ─────────────────────────────────────────────────────────────────────────────

const SUB_KEY   = 'is_subscribed_v1';
const MANAGE_URL = Platform.OS === 'ios'
  ? 'https://apps.apple.com/account/subscriptions'
  : 'https://play.google.com/store/account/subscriptions';

const SubscriptionContext = createContext({
  isSubscribed:        false,
  purchasing:          false,
  purchaseSubscription: () => {},
  purchaseMonthly:     () => {},
  purchaseYearly:      () => {},
  devActivateDirect:   () => {},
  restorePurchases:    () => {},
  manageSubscription:  () => {},
});

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [purchasing,   setPurchasing]   = useState(false);

  // DEV: clear subscription on every app start so Expo Go reloads begin unsubscribed.
  // Remove the removeItem call (and keep only getItem) before shipping to production.
  useEffect(() => {
    AsyncStorage.removeItem(SUB_KEY);
  }, []);

  // Shared dev-stub that activates premium for testing
  const _devActivate = useCallback(async (planLabel) => {
    setPurchasing(true);
    Alert.alert(
      'Poker Dojo Premium',
      `${planLabel} — Unlock all trainers, no stamina limit, no ads.\n\n⚠️ In-App Purchase is not yet configured in App Store Connect. Tap "Enable (Dev)" to test the subscriber experience.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setPurchasing(false) },
        {
          // DEV OVERRIDE — remove this option once real IAP is configured
          text: 'Enable (Dev)',
          onPress: async () => {
            await AsyncStorage.setItem(SUB_KEY, 'true');
            setIsSubscribed(true);
            setPurchasing(false);
          },
        },
      ]
    );
  }, []);

  // DEV ONLY — activates premium instantly with no popup. Remove before shipping.
  const devActivateDirect = useCallback(async () => {
    await AsyncStorage.setItem(SUB_KEY, 'true');
    setIsSubscribed(true);
  }, []);

  // Legacy single-plan entry point (used by PaywallGate)
  const purchaseSubscription = useCallback(() => _devActivate('Premium'), [_devActivate]);

  // Plan-specific entry points (used by SubscriptionScreen)
  // TODO: replace with real react-native-iap product IDs once configured:
  //   Monthly: 'com.yourapp.premium.monthly'  → $9.99/mo, 7-day trial
  //   Yearly:  'com.yourapp.premium.yearly'   → $79.99/yr, 7-day trial
  const purchaseMonthly = useCallback(() => _devActivate('Monthly — $9.99/month (7-day free trial)'), [_devActivate]);
  const purchaseYearly  = useCallback(() => _devActivate('Yearly — $79.99/year (~$6.67/month) (7-day free trial)'), [_devActivate]);

  const restorePurchases = useCallback(async () => {
    // Stub — replace with real restore logic from react-native-iap
    Alert.alert('Restore Purchases', 'No active subscription found on this Apple ID.\n\nIf you believe this is an error, contact support.');
  }, []);

  const manageSubscription = useCallback(() => {
    Linking.openURL(MANAGE_URL).catch(() =>
      Alert.alert('Error', 'Could not open subscription management.')
    );
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      isSubscribed, purchasing,
      purchaseSubscription, purchaseMonthly, purchaseYearly,
      devActivateDirect,
      restorePurchases, manageSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
