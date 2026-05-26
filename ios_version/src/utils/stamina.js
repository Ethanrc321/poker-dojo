import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleStaminaRefillNotification,
  cancelStaminaRefillNotification,
} from './notifications.js';

// ─────────────────────────────────────────────────────────────────────────────
// Stamina system — free-tier Preflop trainer
//
// • 20 hands per session
// • Depleted → watch a rewarded ad OR wait 2 hours (tracked while app is closed)
// • Subscribers bypass this entirely (checked externally via useSubscription)
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_STAMINA   = 20;
export const REFILL_MS     = 2 * 60 * 60 * 1000; // 2 hours

const K = {
  count:     'stamina_count_v1',
  depleted:  'stamina_depleted_at_v1',
};

async function computeCurrentStamina() {
  const [cStr, dStr] = await Promise.all([
    AsyncStorage.getItem(K.count),
    AsyncStorage.getItem(K.depleted),
  ]);

  let count      = cStr !== null ? parseInt(cStr, 10) : MAX_STAMINA;
  let depletedAt = dStr ? parseInt(dStr, 10) : null;

  // Background refill: if 2 hours have elapsed since depletion, restore
  if (count === 0 && depletedAt && Date.now() - depletedAt >= REFILL_MS) {
    count      = MAX_STAMINA;
    depletedAt = null;
    await AsyncStorage.multiRemove([K.count, K.depleted]);
  }

  return { count, depletedAt };
}

export function useStamina() {
  const [stamina,    setStamina]    = useState(MAX_STAMINA);
  const [depletedAt, setDepletedAt] = useState(null);
  const [loaded,     setLoaded]     = useState(false);
  const staminaRef = useRef(MAX_STAMINA); // avoids stale closure in decrement

  const refresh = useCallback(async () => {
    const { count, depletedAt: da } = await computeCurrentStamina();
    staminaRef.current = count;
    setStamina(count);
    setDepletedAt(da);
    setLoaded(true);
  }, []);

  // Initial load
  useEffect(() => { refresh(); }, []);

  // Recalculate when app returns to foreground — catches background timer expiry
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Call after each hand answered (only for non-subscribers)
  const decrement = useCallback(async () => {
    const next = Math.max(0, staminaRef.current - 1);
    staminaRef.current = next;
    setStamina(next);
    await AsyncStorage.setItem(K.count, String(next));
    if (next === 0) {
      const now = Date.now();
      setDepletedAt(now);
      await AsyncStorage.setItem(K.depleted, String(now));
      scheduleStaminaRefillNotification(REFILL_MS);
    }
  }, []);

  // Call after a rewarded ad completes to restore stamina.
  // TODO: Replace the stub block below with a real rewarded ad call
  //   e.g. react-native-google-mobile-ads RewardedAd.load() → show() → onEarned callback.
  //   Call the restore block inside the ad's earned-reward callback, and resolve(false)
  //   inside the ad's dismissed-without-reward / error callback.
  const refillFromAd = useCallback(() => {
    return new Promise(async resolve => {
      // ── STUB (remove when real ads are wired) ──────────────────────────────
      // Simulates a completed rewarded ad with no intermediate popup.
      // ──────────────────────────────────────────────────────────────────────
      staminaRef.current = MAX_STAMINA;
      setStamina(MAX_STAMINA);
      setDepletedAt(null);
      await AsyncStorage.multiRemove([K.count, K.depleted]);
      cancelStaminaRefillNotification();
      resolve(true);
    });
  }, []);

  const msUntilRefill = (depletedAt && stamina === 0)
    ? Math.max(0, depletedAt + REFILL_MS - Date.now())
    : 0;

  return {
    stamina,
    maxStamina: MAX_STAMINA,
    isEmpty:    stamina === 0,
    msUntilRefill,
    loaded,
    decrement,
    refillFromAd,
  };
}

// Format remaining refill time for display
export function formatRefillTime(ms) {
  if (ms <= 0) return 'Ready';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
