import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Notification helpers
//
// Two notification types:
//   1. Streak reminder  — daily 8pm alert if user hasn't practiced yet
//   2. Stamina refill   — one-shot alert 2 hours after stamina depletes
// ─────────────────────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge:  false,
  }),
});

const K = {
  streakId:  'notif_streak_id_v1',
  staminaId: 'notif_stamina_id_v1',
};

export async function requestNotificationPermissions() {
  const { status: current } = await Notifications.getPermissionsAsync();
  if (current === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Streak reminder ───────────────────────────────────────────────────────────
// Call on app start and after a practice session to keep the schedule fresh.
//   practicedToday=true  → schedule for 8pm tomorrow (already done today)
//   practicedToday=false → schedule for 8pm today if before 8pm, else tomorrow
export async function scheduleStreakReminder(streak, practicedToday) {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    // Cancel any existing reminder first
    const existingId = await AsyncStorage.getItem(K.streakId);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
      await AsyncStorage.removeItem(K.streakId);
    }

    const now     = new Date();
    const trigger = new Date();
    trigger.setHours(20, 0, 0, 0); // 8:00 pm today

    // Push to tomorrow if already past 8pm, or if user already practiced today
    if (practicedToday || trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    const body = streak > 1
      ? `You're on a ${streak}-day streak — don't break it! Complete 10 hands to keep it alive.`
      : 'Complete 10 hands today to start a streak!';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Daily practice reminder',
        body,
        sound: false,
      },
      trigger: { date: trigger },
    });

    await AsyncStorage.setItem(K.streakId, id);
  } catch (e) {
    // Notifications are non-critical — fail silently
    console.warn('[Notifications] scheduleStreakReminder failed:', e.message);
  }
}

export async function cancelStreakReminder() {
  try {
    const id = await AsyncStorage.getItem(K.streakId);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(K.streakId);
    }
  } catch (e) {
    console.warn('[Notifications] cancelStreakReminder failed:', e.message);
  }
}

// ── Stamina refill ────────────────────────────────────────────────────────────
// Call when stamina hits 0. Pass the ms until refill (REFILL_MS = 2hr).
export async function scheduleStaminaRefillNotification(ms) {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    // Cancel any existing stamina notification
    const existingId = await AsyncStorage.getItem(K.staminaId);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    }

    const seconds = Math.ceil(ms / 1000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚡ Stamina refilled!',
        body:  "You've got 20 hands ready — come back and keep practicing.",
        sound: false,
      },
      trigger: { seconds },
    });

    await AsyncStorage.setItem(K.staminaId, id);
  } catch (e) {
    console.warn('[Notifications] scheduleStaminaRefillNotification failed:', e.message);
  }
}

export async function cancelStaminaRefillNotification() {
  try {
    const id = await AsyncStorage.getItem(K.staminaId);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(K.staminaId);
    }
  } catch (e) {
    console.warn('[Notifications] cancelStaminaRefillNotification failed:', e.message);
  }
}
