import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AcesIcon from '../components/AcesIcon.js';
import { useSubscription } from '../context/SubscriptionContext.js';
import { DAILY_GOAL } from '../utils/streak.js';
import { C, POS_COLOR, T, Colors, Space, Radius, Fonts, Size } from '../theme.js';

const { width: SCREEN_W } = Dimensions.get('window');

const NAV_ITEMS = [
  { id: 'Preflop',  label: 'Preflop',    icon: 'aces',                stat: 'preflop'                    },
  { id: 'Postflop', label: 'Postflop',   icon: 'layers-outline',      stat: 'postflop', locked: true      },
  { id: 'Math',     label: 'Math',       icon: 'calculator-outline',  stat: 'math',     locked: true      },
  { id: 'Reading',  label: 'Reading',    icon: 'eye-outline',         stat: 'quiz',     locked: true      },
  { id: 'Charts',   label: 'Charts',     icon: 'stats-chart-outline', stat: null,       noStat: true      },
  { id: 'Glossary', label: 'Glossary',   icon: 'school-outline',      stat: null,       noStat: true, locked: true },
];

const MODULES = [
  { key: 'preflop',  label: 'Preflop Trainer',  locked: false },
  { key: 'postflop', label: 'Postflop Trainer', locked: true  },
  { key: 'math',     label: 'Math Drills',       locked: true  },
  { key: 'quiz',     label: 'Hand Reading',      locked: true  },
  { key: null,       label: 'Charts',            locked: false },
  { key: null,       label: 'Glossary',          locked: true  },
];

function pct(correct, total) {
  return total > 0 ? Math.round((correct / total) * 100) : null;
}
function perfColor(p) {
  return p >= 80 ? C.green : p >= 60 ? C.amber : C.red;
}
function perfLabel(p) {
  if (p === null) return null;
  if (p >= 85) return 'Excellent';
  if (p >= 75) return 'Good';
  if (p >= 60) return 'Improving';
  return 'Needs Work';
}

export default function DashboardScreen({ stats, resetStats, onNavigate, streak = 0, longestStreak = 0, practicedToday = false, dailyCount = 0 }) {
  const insets = useSafeAreaInsets();
  const { isSubscribed } = useSubscription();

  const totalHands   = Object.values(stats).reduce((a, m) => a + (m.total   || 0), 0);
  const totalCorrect = Object.values(stats).reduce((a, m) => a + (m.correct || 0), 0);
  const overall      = pct(totalCorrect, totalHands);
  const preflopByPos = stats.preflop?.byPosition || {};

  // Best and worst module
  const rankedModules = MODULES
    .map(m => ({ ...m, p: pct(stats[m.key]?.correct, stats[m.key]?.total) }))
    .filter(m => m.p !== null)
    .sort((a, b) => b.p - a.p);
  const best  = rankedModules[0]  || null;
  const worst = rankedModules[rankedModules.length - 1] || null;

  // Best and worst position
  const rankedPos = ['UTG','HJ','CO','BTN','SB','BB']
    .map(pos => {
      const d = preflopByPos[pos];
      return d?.total > 0 ? { pos, p: pct(d.correct, d.total), total: d.total } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.p - a.p);
  const bestPos  = rankedPos[0]  || null;
  const worstPos = rankedPos[rankedPos.length - 1] || null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Poker Dojo</Text>
          <Text style={styles.subtitle}>GTO-calibrated · 6-max training</Text>
        </View>
        <TouchableOpacity onPress={() => onNavigate('Settings')} style={styles.gearIcon}>
          <Ionicons name="settings-outline" size={20} color="#444" />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

      {/* ── Streak Card ─────────────────────────────────────────── */}
      <View style={styles.streakCard}>
        {/* Left: flame + count */}
        <View style={styles.streakLeft}>
          <Ionicons name="flame" size={36} color={C.amber} />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.streakCount}>{streak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.streakDivider} />

        {/* Right: today badge + progress + longest */}
        <View style={styles.streakRight}>
          <View style={[
            styles.todayBadge,
            practicedToday
              ? { backgroundColor: 'rgba(104,168,112,0.15)', borderColor: 'rgba(104,168,112,0.35)' }
              : { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: Colors.borderSubtle },
          ]}>
            <Ionicons
              name={practicedToday ? 'checkmark-circle' : 'time-outline'}
              size={13}
              color={practicedToday ? C.green : Colors.textTertiary}
            />
            <Text style={[styles.todayBadgeText, { color: practicedToday ? C.green : Colors.textTertiary }]}>
              {practicedToday ? `Done — ${DAILY_GOAL}/${DAILY_GOAL} hands` : `${dailyCount}/${DAILY_GOAL} hands today`}
            </Text>
          </View>
          {!practicedToday && dailyCount > 0 && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min((dailyCount / DAILY_GOAL) * 100, 100)}%` }]} />
            </View>
          )}
          {longestStreak > 0 && (
            <Text style={styles.longestText}>Best: {longestStreak} days</Text>
          )}
        </View>
      </View>

      {/* ── Quick Nav Grid ──────────────────────────────────────── */}
      <View style={styles.navSection}>
        <Text style={styles.sectionLabel}>TRAINERS</Text>
        <View style={styles.navGrid}>
          {NAV_ITEMS.map(item => {
            const s    = item.stat ? stats[item.stat] : null;
            const p    = s ? pct(s.correct, s.total) : null;
            const col  = p !== null ? perfColor(p) : '#555';
            const showLock = item.locked && !isSubscribed;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => onNavigate(item.id)}
                style={[styles.navCell, item.noStat && styles.navCellCentered, showLock && styles.navCellLocked]}
                activeOpacity={0.7}
              >
                <View style={styles.navIconWrap}>
                  {item.icon === 'aces'
                    ? <AcesIcon size={22} color={showLock ? '#666' : '#fff'} bgColor={C.bg3} />
                    : <Ionicons name={item.icon} size={22} color={showLock ? '#666' : '#fff'} />
                  }
                  {p !== null && !showLock && (
                    <View style={[styles.navBadge, { backgroundColor: col }]} />
                  )}
                </View>
                <Text style={[styles.navLabel, showLock && styles.navLabelLocked]}>{item.label}</Text>
                {!item.noStat && !showLock && (p !== null
                  ? <Text style={[styles.navStat, { color: col }]}>{p}%</Text>
                  : <Text style={styles.navStatEmpty}>—</Text>
                )}

                {/* Lock overlay */}
                {showLock && (
                  <View style={styles.lockOverlay} pointerEvents="none">
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={11} color={C.amber} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Overall Stats ───────────────────────────────────────── */}
      {totalHands > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OVERALL PERFORMANCE</Text>
          <View style={styles.overallRow}>
            <View style={[styles.overallMain, { borderColor: overall !== null ? perfColor(overall) + '44' : '#2a2a2a' }]}>
              <Text style={[styles.overallPct, { color: overall !== null ? perfColor(overall) : '#fff' }]}>
                {overall !== null ? `${overall}%` : '—'}
              </Text>
              <Text style={styles.overallLabel}>Accuracy</Text>
              {overall !== null && (
                <Text style={[styles.overallGrade, { color: perfColor(overall) }]}>
                  {perfLabel(overall)}
                </Text>
              )}
            </View>
            <View style={styles.overallStats}>
              {[
                { label: 'Answered', value: totalHands,              color: '#fff'   },
                { label: 'Correct',  value: totalCorrect,             color: C.green  },
                { label: 'Mistakes', value: totalHands - totalCorrect, color: C.red   },
              ].map(({ label, value, color }) => (
                <View key={label} style={styles.overallStatItem}>
                  <Text style={[styles.overallStatVal, { color }]}>{value}</Text>
                  <Text style={styles.overallStatLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ── Module Breakdown ────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MODULE BREAKDOWN</Text>
        <View style={styles.panel}>
          {MODULES.map(({ key, label, locked }) => {
            const showLock = locked && !isSubscribed;
            const s   = key ? stats[key] : null;
            const hasData = !!(s && s.total > 0);

            // Free modules with no data yet — hide until first use
            if (!showLock && !hasData) return null;

            const p   = hasData ? pct(s.correct, s.total) : null;
            const col = p !== null ? perfColor(p) : '#555';

            return (
              <View key={label} style={[styles.moduleRow, showLock && styles.moduleRowLocked]}>
                {/* Label */}
                <Text style={[styles.moduleRowLabel, showLock && styles.moduleRowLabelLocked]}>
                  {label}
                </Text>

                {/* Progress bar */}
                <View style={styles.moduleBarTrack}>
                  {!showLock && hasData && (
                    <View style={[styles.moduleBarFill, { width: `${p}%`, backgroundColor: col }]} />
                  )}
                  {showLock && (
                    <View style={styles.moduleBarLocked} />
                  )}
                </View>

                {/* Right side: % or lock */}
                {showLock ? (
                  <View style={styles.moduleLockWrap}>
                    <Ionicons name="lock-closed" size={10} color={C.amber} />
                  </View>
                ) : hasData ? (
                  <Text style={[styles.moduleRowPct, { color: col }]}>{p}%</Text>
                ) : null}
              </View>
            );
          }).filter(Boolean)}
        </View>
      </View>

      {/* ── Preflop by Position ─────────────────────────────────── */}
      {rankedPos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFLOP BY POSITION</Text>
          <View style={styles.posGrid}>
            {['UTG','HJ','CO','BTN','SB','BB'].map(pos => {
              const d  = preflopByPos[pos];
              const p  = d?.total > 0 ? pct(d.correct, d.total) : null;
              const pc = POS_COLOR[pos];
              return (
                <View key={pos} style={[styles.posCell, { backgroundColor: pc.bg + '55', borderColor: pc.bg }]}>
                  <Text style={[styles.posCellPos, { color: pc.text }]}>{pos}</Text>
                  <Text
                    style={[styles.posCellPct, { color: p !== null ? perfColor(p) : '#333' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {p !== null ? `${p}%` : '—'}
                  </Text>
                  <Text style={styles.posCellCount}>{d?.total ?? 0} hands</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Insights ────────────────────────────────────────────── */}
      {(best || bestPos) && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INSIGHTS</Text>
          <View style={styles.panel}>
            {best && (
              <View style={styles.insightRow}>
                <Ionicons name="trophy-outline" size={15} color={C.green} style={styles.insightIcon} />
                <Text style={styles.insightText}>
                  Strongest module: <Text style={{ color: C.green, fontWeight: '700' }}>{best.label}</Text>
                  <Text style={{ color: '#555' }}> at {best.p}%</Text>
                </Text>
              </View>
            )}
            {worst && worst.key !== best?.key && worst.p < 75 && (
              <View style={styles.insightRow}>
                <Ionicons name="flame-outline" size={15} color={C.amber} style={styles.insightIcon} />
                <Text style={styles.insightText}>
                  Focus on: <Text style={{ color: C.amber, fontWeight: '700' }}>{worst.label}</Text>
                  <Text style={{ color: '#555' }}> — currently {worst.p}%</Text>
                </Text>
              </View>
            )}
            {bestPos && (
              <View style={styles.insightRow}>
                <Ionicons name="location-outline" size={15} color={C.blue} style={styles.insightIcon} />
                <Text style={styles.insightText}>
                  Best position: <Text style={{ color: C.blue, fontWeight: '700' }}>{bestPos.pos}</Text>
                  <Text style={{ color: '#555' }}> at {bestPos.p}%</Text>
                </Text>
              </View>
            )}
            {worstPos && worstPos.pos !== bestPos?.pos && worstPos.p < 80 && (
              <View style={styles.insightRow}>
                <Ionicons name="alert-circle-outline" size={15} color={C.red} style={styles.insightIcon} />
                <Text style={styles.insightText}>
                  Leaky position: <Text style={{ color: C.red, fontWeight: '700' }}>{worstPos.pos}</Text>
                  <Text style={{ color: '#555' }}> — only {worstPos.p}% ({worstPos.total} hands)</Text>
                </Text>
              </View>
            )}
            {overall !== null && overall >= 80 && (
              <View style={styles.insightRow}>
                <Ionicons name="star-outline" size={15} color={C.green} style={styles.insightIcon} />
                <Text style={styles.insightText}>
                  <Text style={{ color: C.green, fontWeight: '700' }}>Solid TAG player</Text>
                  <Text style={{ color: '#555' }}> — overall accuracy above 80%</Text>
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Empty state ─────────────────────────────────────────── */}
      {totalHands === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyDesc}>Tap any trainer above to start building your stats.</Text>
        </View>
      )}

      <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const NAV_CELL_W = Math.floor((SCREEN_W - Space.base * 2 - Space.xs * 2) / 3);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg1 },
  content:   { paddingHorizontal: Space.base },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Space.base, paddingTop: Space.lg, marginBottom: Space.md },
  title:    { ...T.screenTitle },
  subtitle: { ...T.subtitle, marginTop: Space.xxs },
  gearIcon: { padding: Space.xxs, marginTop: Space.xxs },

  sectionLabel: { ...T.sectionLabel, marginBottom: Space.sm },
  section: { marginBottom: Space.lg },

  navSection: { marginBottom: Space.lg },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs },
  navCell: {
    width: NAV_CELL_W,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Space.sm,
    alignItems: 'center',
    gap: Space.xxs,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  navCellCentered: { justifyContent: 'center' },
  navIconWrap:  { position: 'relative', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  navBadge:     { position: 'absolute', top: 0, right: 0, width: 7, height: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.bg1 },
  navLabel:      { fontFamily: Fonts.medium, fontSize: Size.xs, color: Colors.textSecondary, textAlign: 'center' },
  navLabelLocked:{ color: '#444' },
  navStat:       { fontFamily: Fonts.semibold, fontSize: Size.xs, fontVariant: ['tabular-nums'] },
  navStatEmpty:  { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary },
  navCellLocked: { borderColor: 'rgba(232,160,48,0.18)' },

  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,12,0.52)',
    borderRadius: Radius.md,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 5,
  },
  lockBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(232,160,48,0.15)',
    borderWidth: 1, borderColor: 'rgba(232,160,48,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },

  overallRow:  { flexDirection: 'row', gap: Space.sm },
  overallMain: {
    width: 112, backgroundColor: Colors.bg2, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Space.lg, borderWidth: 1,
  },
  overallPct:       { fontFamily: Fonts.semibold, fontSize: Size.xl, fontVariant: ['tabular-nums'] },
  overallLabel:     { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginTop: Space.xxs },
  overallGrade:     { fontFamily: Fonts.semibold, fontSize: Size.xxs, marginTop: Space.xxs, letterSpacing: 0.4 },
  overallStats:     { flex: 1, backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.base, justifyContent: 'space-around' },
  overallStatItem:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overallStatVal:   { fontFamily: Fonts.semibold, fontSize: Size.md, fontVariant: ['tabular-nums'] },
  overallStatLabel: { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary },

  panel:          { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.base, gap: Space.sm },
  moduleRow:           { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  moduleRowLocked:     { opacity: 0.55 },
  moduleRowLabel:      { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textSecondary, width: 112 },
  moduleRowLabelLocked:{ color: '#555' },
  moduleBarTrack:      { flex: 1, height: 4, backgroundColor: Colors.bg3, borderRadius: Radius.xs, overflow: 'hidden' },
  moduleBarFill:       { height: '100%', borderRadius: Radius.xs },
  moduleBarLocked:     { height: '100%', width: '35%', backgroundColor: 'rgba(232,160,48,0.2)', borderRadius: Radius.xs },
  moduleRowPct:        { fontFamily: Fonts.semibold, fontSize: Size.xs, width: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
  moduleRowCount:      { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, width: 34, textAlign: 'right', fontVariant: ['tabular-nums'] },
  moduleLockWrap:      { width: 36, alignItems: 'center', justifyContent: 'center' },

  posGrid: { flexDirection: 'row', gap: Space.xxs + 2 },
  posCell: { flex: 1, borderRadius: Radius.sm, padding: Space.xs, alignItems: 'center', borderWidth: 1, gap: Space.xxs },
  posCellPos:   { fontFamily: Fonts.semibold, fontSize: Size.xxs, letterSpacing: 0.4 },
  posCellPct:   { fontFamily: Fonts.semibold, fontSize: Size.sm + 1, fontVariant: ['tabular-nums'] },
  posCellCount: { fontFamily: Fonts.regular, fontSize: Size.xxs - 1, color: Colors.textTertiary, fontVariant: ['tabular-nums'] },

  insightRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: Space.xs, paddingVertical: Space.xxs },
  insightIcon: { marginTop: 2 },
  insightText: { flex: 1, fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textSecondary, lineHeight: Size.sm * 1.5 },

  emptyState: { alignItems: 'center', paddingVertical: Space.xl, gap: Space.sm },
  emptyTitle: { fontFamily: Fonts.semibold, fontSize: Size.md, color: Colors.textPrimary },
  emptyDesc:  { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: Size.sm * 1.5 },

  // Streak card
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.base,
    marginBottom: Space.lg,
    gap: Space.base,
  },
  streakLeft:   { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  streakCount:  { fontFamily: Fonts.semibold, fontSize: Size.xl, color: Colors.textPrimary },
  streakLabel:  { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginTop: 1 },
  streakDivider:{ width: 1, height: 36, backgroundColor: Colors.borderSubtle },
  streakRight:  { flex: 1, gap: Space.xxs },
  todayBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  todayBadgeText:{ fontFamily: Fonts.semibold, fontSize: Size.xxs },
  progressTrack: { height: 3, backgroundColor: Colors.bg3, borderRadius: Radius.full, overflow: 'hidden', width: '100%' },
  progressFill:  { height: '100%', backgroundColor: C.amber, borderRadius: Radius.full },
  longestText:   { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginLeft: 2 },
});
