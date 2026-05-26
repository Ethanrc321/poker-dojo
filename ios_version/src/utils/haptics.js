import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'haptics_enabled_v1';

// Module-level cache — loaded once on app start, updated instantly on toggle
let _enabled = true;

/** Call once during app startup to restore the user's saved preference. */
export async function loadHapticsPreference() {
  const val = await AsyncStorage.getItem(KEY);
  if (val !== null) _enabled = val === 'true';
}

/** Persist and apply the user's preference. */
export async function setHapticsEnabled(enabled) {
  _enabled = enabled;
  await AsyncStorage.setItem(KEY, String(enabled));
}

export function getHapticsEnabled() {
  return _enabled;
}

/**
 * Drop-in replacement for Haptics.notificationAsync.
 * Silently no-ops when the user has disabled haptics.
 *
 * Usage: triggerHaptic(Haptics.NotificationFeedbackType.Success)
 *        triggerHaptic(Haptics.NotificationFeedbackType.Error)
 */
export function triggerHaptic(type) {
  if (!_enabled) return;
  Haptics.notificationAsync(type);
}

export { Haptics };
