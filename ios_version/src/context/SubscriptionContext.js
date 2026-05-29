import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// ─────────────────────────────────────────────────────────────────────────────
// Subscription service — powered by RevenueCat
//
// Product IDs:
//   Monthly: 'com.pokerdojo.app.premium.monthly'  → $9.99/mo, 7-day trial
//   Yearly:  'com.pokerdojo.app.premium.yearly'   → $79.99/yr, 7-day trial
//
// Entitlement: 'premium'
// ─────────────────────────────────────────────────────────────────────────────

const RC_API_KEY_IOS = 'appl_DCRAoupCUInPDdOtNfNfmCnDyDp';

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
  devUnlock:            () => {},
});

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [purchasing,   setPurchasing]   = useState(false);

  // ── Initialise RevenueCat and check entitlement on mount ──────────────────
  useEffect(() => {
    if (Platform.OS === 'ios') {
      Purchases.setLogLevel(LOG_LEVEL.ERROR); // silence verbose logs in production
      Purchases.configure({ apiKey: RC_API_KEY_IOS });
    }

    checkEntitlement();
  }, []);

  async function checkEntitlement() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      setIsSubscribed(!!customerInfo.entitlements.active['premium']);
    } catch (e) {
      console.warn('[RevenueCat] checkEntitlement error:', e);
    }
  }

  // ── Shared purchase handler ───────────────────────────────────────────────
  const purchasePackage = useCallback(async (packageToBuy) => {
    if (!packageToBuy) {
      Alert.alert('Unavailable', 'This plan is not available right now. Please try again later.');
      return;
    }
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
      if (customerInfo.entitlements.active['premium']) {
        setIsSubscribed(true);
      }
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
        console.warn('[RevenueCat] purchase error:', e);
      }
    } finally {
      setPurchasing(false);
    }
  }, []);

  // ── Fetch the default offering and find a package by type ─────────────────
  async function getPackage(type) {
    try {
      const offerings = await Purchases.getOfferings();
      const current   = offerings.current;
      if (!current) return null;
      return current.availablePackages.find(p => p.packageType === type) ?? null;
    } catch (e) {
      console.warn('[RevenueCat] getOfferings error:', e);
      return null;
    }
  }

  const purchaseMonthly = useCallback(async () => {
    setPurchasing(true);
    const pkg = await getPackage('MONTHLY');
    await purchasePackage(pkg);
  }, [purchasePackage]);

  const purchaseYearly = useCallback(async () => {
    setPurchasing(true);
    const pkg = await getPackage('ANNUAL');
    await purchasePackage(pkg);
  }, [purchasePackage]);

  // Legacy single-plan entry point (used by PaywallGate)
  const purchaseSubscription = useCallback(() => purchaseYearly(), [purchaseYearly]);

  // ── Restore purchases ─────────────────────────────────────────────────────
  const restorePurchases = useCallback(async () => {
    setPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['premium']) {
        setIsSubscribed(true);
        Alert.alert('Restored', 'Your premium subscription has been restored.');
      } else {
        Alert.alert('No Purchase Found', 'No active subscription found on this Apple ID.\n\nIf you believe this is an error, contact support.');
      }
    } catch (e) {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
      console.warn('[RevenueCat] restore error:', e);
    } finally {
      setPurchasing(false);
    }
  }, []);

  // ── Manage subscription (opens App Store) ────────────────────────────────
  const manageSubscription = useCallback(() => {
    Linking.openURL(MANAGE_URL).catch(() =>
      Alert.alert('Error', 'Could not open subscription management.')
    );
  }, []);

  // ── DEV ONLY — remove before App Store submission ─────────────────────────
  const devUnlock = useCallback(() => {
    setIsSubscribed(true);
    Alert.alert('Dev Mode', 'Premium unlocked for testing.');
  }, []);

  const devLock = useCallback(() => {
    setIsSubscribed(false);
    Alert.alert('Dev Mode', 'Premium locked — stamina + ads active.');
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      isSubscribed, purchasing,
      purchaseSubscription, purchaseMonthly, purchaseYearly,
      restorePurchases, manageSubscription, devUnlock, devLock,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
