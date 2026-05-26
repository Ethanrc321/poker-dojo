import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Daily streak system
//
// A streak day is only earned after DAILY_GOAL hands are answered (any result).
//
// Rules:
//   • Last earned day was yesterday  → streak + 1
//   • Last earned day was today      → no change (already counted)
//   • Last earned day was 2+ days ago → reset to 1
//   • Never earned                   → start at 1 on first qualifying day
// ─────────────────────────────────────────────────────────────────────────────

export const DAILY_GOAL = 10; // hands required to earn the streak day

const K = {
  count:      'streak_count_v1',
  date:       'streak_last_date_v1',   // date the streak was last EARNED
  longest:    'streak_longest_v1',
  dailyCount: 'streak_daily_count_v1', // hands answered today
  dailyDate:  'streak_daily_date_v1',  // which calendar day dailyCount belongs to
};

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function loadRaw() {
  const [cStr, dateStr, longestStr, dcStr, ddStr] = await Promise.all([
    AsyncStorage.getItem(K.count),
    AsyncStorage.getItem(K.date),
    AsyncStorage.getItem(K.longest),
    AsyncStorage.getItem(K.dailyCount),
    AsyncStorage.getItem(K.dailyDate),
  ]);
  return {
    count:      cStr      ? parseInt(cStr, 10)      : 0,
    lastDate:   dateStr   || null,
    longest:    longestStr ? parseInt(longestStr, 10) : 0,
    dailyCount: (dcStr && ddStr === todayStr()) ? parseInt(dcStr, 10) : 0,
  };
}

// Called by App.js after every hand answered
export async function recordPracticeDay() {
  const { count, lastDate, longest, dailyCount } = await loadRaw();
  const t = todayStr();

  // Increment today's hand count
  const newDailyCount = dailyCount + 1;
  await AsyncStorage.multiSet([
    [K.dailyCount, String(newDailyCount)],
    [K.dailyDate,  t],
  ]);

  // Streak already earned today — just update daily count
  if (lastDate === t) {
    return { count, longest, practicedToday: true, dailyCount: newDailyCount, isNew: false };
  }

  // Not yet earned today — check if we just hit the goal
  if (newDailyCount < DAILY_GOAL) {
    return { count, longest, practicedToday: false, dailyCount: newDailyCount, isNew: false };
  }

  // Hit the goal — award the streak day
  const newCount   = lastDate === yesterdayStr() ? count + 1 : 1;
  const newLongest = Math.max(longest, newCount);

  await AsyncStorage.multiSet([
    [K.count,   String(newCount)],
    [K.date,    t],
    [K.longest, String(newLongest)],
  ]);

  return { count: newCount, longest: newLongest, practicedToday: true, dailyCount: newDailyCount, isNew: true };
}

export function useStreak() {
  const [streak,         setStreak]         = useState(0);
  const [longestStreak,  setLongestStreak]  = useState(0);
  const [practicedToday, setPracticedToday] = useState(false);
  const [dailyCount,     setDailyCount]     = useState(0);
  const [loaded,         setLoaded]         = useState(false);

  useEffect(() => {
    loadRaw().then(({ count, lastDate, longest, dailyCount: dc }) => {
      setStreak(count);
      setLongestStreak(longest);
      setPracticedToday(lastDate === todayStr());
      setDailyCount(dc);
      setLoaded(true);
    });
  }, []);

  const recordPractice = useCallback(async () => {
    const result = await recordPracticeDay();
    setStreak(result.count);
    setLongestStreak(result.longest);
    setPracticedToday(result.practicedToday);
    setDailyCount(result.dailyCount);
    return result;
  }, []);

  return { streak, longestStreak, practicedToday, dailyCount, loaded, recordPractice };
}
