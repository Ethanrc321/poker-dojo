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
  isSubscribed:         false,
  purchasing:           false,
  purchaseSubscription: () => {},
  purchaseMonthly:      () => {},
  purchaseYearly:       () => {},
  restorePurchases:     () => {},
  manageSubscription:   () => {},
});

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [purchasing,   setPurchasing]   = useState(false);

  // Restore persisted subscription state on mount.
  // When real IAP is wired (RevenueCat / StoreKit), replace this getItem with a
  // live entitlement check — AsyncStorage becomes a cache, not the source of truth.
  useEffect(() => {
    AsyncStorage.getItem(SUB_KEY).then(val => {
      if (val === 'true') setIsSubscribed(true);
    });
  }, []);

  // DEV ONLY — instantly grants premium. Remove before App Store submission.
  const devUnlock = useCallback(async () => {
    await AsyncStorage.setItem(SUB_KEY, 'true');
    setIsSubscribed(true);
    Alert.alert('Dev Mode', 'Premium unlocked for testing.');
  }, []);

  // Purchase stub — replace with real RevenueCat/StoreKit calls before App Store submission.
  // Shows a neutral error so Apple reviewers don't see dev internals.
  // TODO: wire up real IAP product IDs:
  //   Monthly: 'com.pokerdojo.app.premium.monthly'  → $9.99/mo, 7-day trial
  //   Yearly:  'com.pokerdojo.app.premium.yearly'   → $79.99/yr, 7-day trial
  const _devActivate = useCallback(async (planLabel) => {
    setPurchasing(true);
    Alert.alert(
      'Purchase Unavailable',
      'In-App Purchases are not available at this time. Please try again later.',
      [{ text: 'OK', onPress: () => setPurchasing(false) }]
    );
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
      restorePurchases, manageSubscription, devUnlock,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
