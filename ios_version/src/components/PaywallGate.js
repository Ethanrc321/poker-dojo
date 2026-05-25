import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../context/SubscriptionContext.js';
import { C, Colors, Fonts, Size, Space, Radius } from '../theme.js';

const FEATURE_COPY = {
  postflop: {
    title: 'Postflop Trainer',
    desc:  'Real board scenarios with GTO c-bet analysis, board texture reads, and hand strength coaching.',
  },
  math: {
    title: 'Math Drills',
    desc:  'Pot odds, MDF, alpha, EV calculations, bluff frequencies, and GTO poker math quizzes.',
  },
  reading: {
    title: 'Hand Reading',
    desc:  'Range construction, equity analysis, and reading opponent holdings across every street.',
  },
  glossary: {
    title: 'Poker Glossary',
    desc:  'Full glossary with definitions, examples, and TAG principles for every poker term.',
  },
  charts: {
    title: 'Advanced Charts',
    desc:  'SPR commitment tables, river bet sizing ratios, pot odds quick-reference, and more.',
  },
  default: {
    title: 'Premium Feature',
    desc:  'Unlock full access to every trainer, chart, and drill in TAG Poker Trainer.',
  },
};

const PERKS = [
  'Postflop, Math & Hand Reading trainers',
  'Advanced GTO charts & reference tables',
  'Complete poker glossary',
  'Unlimited Preflop hands — no stamina limit',
];

export default function PaywallGate({ feature = 'default', children, onUpgrade }) {
  const { isSubscribed, purchaseSubscription } = useSubscription();

  if (isSubscribed) return children;

  const copy = FEATURE_COPY[feature] ?? FEATURE_COPY.default;
  const handleUpgrade = onUpgrade ?? purchaseSubscription;

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.lockCircle}>
          <Ionicons name="lock-closed" size={34} color={C.amber} />
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.desc}>{copy.desc}</Text>

        <View style={styles.perksBox}>
          {PERKS.map(p => (
            <View key={p} style={styles.perkRow}>
              <Ionicons name="checkmark-circle" size={14} color={C.green} style={styles.perkIcon} />
              <Text style={styles.perkText}>{p}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade} activeOpacity={0.85}>
          <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
        </TouchableOpacity>

        <Text style={styles.restoreHint}>Restore a previous purchase in Settings.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
  },
  card: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.xl,
    padding: Space.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(232,160,48,0.3)',
    gap: Space.sm,
  },
  lockCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(232,160,48,0.1)',
    borderWidth: 1, borderColor: 'rgba(232,160,48,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  title:      { fontFamily: Fonts.semibold, fontSize: Size.lg, color: Colors.textPrimary, textAlign: 'center' },
  desc:       { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: Size.sm * 1.55 },
  perksBox:   { width: '100%', gap: Space.xs },
  perkRow:    { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  perkIcon:   { marginTop: 1 },
  perkText:   { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, flex: 1 },
  upgradeBtn: {
    width: '100%', paddingVertical: 16,
    borderRadius: Radius.lg, backgroundColor: C.amber,
    alignItems: 'center', marginTop: Space.xs,
  },
  upgradeBtnText: { fontFamily: Fonts.semibold, fontSize: Size.base, color: '#000' },
  restoreHint:    { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, textAlign: 'center' },
});
