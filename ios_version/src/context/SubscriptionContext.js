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
  restorePurchases:    () => {},
  manageSubscription:  () => {},
});

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [purchasing,   setPurchasing]   = useState(false);

  // Persist subscription state locally
  useEffect(() => {
    AsyncStorage.getItem(SUB_KEY).then(val => {
      if (val === 'true') setIsSubscribed(true);
    });
  }, []);

  const purchaseSubscription = useCallback(async () => {
    setPurchasing(true);
    Alert.alert(
      'TAG Poker Trainer Premium',
      'Unlock all trainers — Postflop, Math, Hand Reading, full Charts, and unlimited Preflop hands.\n\n⚠️ In-App Purchase is not yet configured in App Store Connect. Tap "Enable (Dev)" to test the subscriber experience.',
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
      purchaseSubscription, restorePurchases, manageSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
