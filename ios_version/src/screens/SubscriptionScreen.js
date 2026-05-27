import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../context/SubscriptionContext.js';
import { C, Colors, Fonts, Size, Space, Radius, T } from '../theme.js';

const PLANS = [
  {
    id:       'yearly',
    label:    'Yearly',
    badge:    'BEST VALUE',
    saving:   'Save 33% vs monthly',
    then:     '$79.99 / year',
    perMonth: '$6.67 / month after trial',
    compare:  'vs $9.99/month billed monthly',
  },
  {
    id:       'monthly',
    label:    'Monthly',
    badge:    null,
    saving:   null,
    then:     '$9.99 / month',
    perMonth: null,
    compare:  null,
  },
];

const FEATURES = [
  'Ad Free',
  'Unlimited training — no stamina limit',
  'Postflop, Math & Hand Reading trainers',
  'Advanced GTO charts & reference tables',
  'Complete poker glossary',
];

export default function SubscriptionScreen({ onNavigate }) {
  const insets = useSafeAreaInsets();
  const { purchasing, purchaseMonthly, purchaseYearly, restorePurchases, devUnlock } = useSubscription();
  const [selected, setSelected] = useState('yearly');

  function handleStartTrial() {
    if (selected === 'yearly') purchaseYearly();
    else purchaseMonthly();
  }

  const selectedPlan = PLANS.find(p => p.id === selected);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate?.('Settings')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
        <Text style={styles.backLabel}>Settings</Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Headline */}
        <Text style={styles.title}>Poker Dojo</Text>
        <Text style={styles.titleAccent}>Premium</Text>
        <Text style={styles.subtitle}>Try free for 7 days — no charge today. Cancel anytime before day 8 and you'll never pay a thing.</Text>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, purchasing && { opacity: 0.55 }]}
          onPress={handleStartTrial}
          disabled={purchasing}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>
            {purchasing ? 'Loading…' : 'Start 7-Day Free Trial'}
          </Text>
        </TouchableOpacity>

        {/* Plan selector */}
        <View style={styles.plansWrap}>
          {PLANS.map(plan => {
            const isSelected = selected === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelected(plan.id)}
                activeOpacity={0.8}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
              >
                {/* Top row: checkmark + label | badges */}
                <View style={styles.planTopRow}>
                  <View style={styles.planLabelRow}>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={C.amber} />
                    )}
                    <Text style={[styles.planLabel, isSelected && styles.planLabelSelected]}>
                      {plan.label}
                    </Text>
                  </View>
                  <View style={styles.planBadges}>
                    {plan.badge && (
                      <View style={styles.bestBadge}>
                        <Text style={styles.bestBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
                    {plan.saving && (
                      <View style={styles.saveBadge}>
                        <Text style={styles.saveBadgeText}>{plan.saving}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Free trial hero */}
                <View style={styles.planFreeRow}>
                  <Text style={[styles.planFreeText, isSelected && styles.planFreeTextSelected]}>
                    FREE
                  </Text>
                  <Text style={styles.planFreeDays}> for 7 days</Text>
                </View>

                {/* Then price */}
                <Text style={styles.planThen}>then {plan.then}</Text>

                {/* Per-month breakdown + comparison for yearly */}
                {plan.perMonth && (
                  <Text style={styles.planPerMonth}>{plan.perMonth}</Text>
                )}
                {plan.compare && (
                  <Text style={styles.planComparison}>{plan.compare}</Text>
                )}

              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feature list */}
        <View style={styles.featuresWrap}>
          {FEATURES.map(f => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={C.green} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Fine print */}
        <Text style={styles.finePrint}>
          {selected === 'yearly'
            ? 'No charge for the first 7 days. On day 8, you\'ll be billed $79.99 for the year (~$6.67/month). Cancel before day 8 and you owe nothing. Renews automatically each year until cancelled.'
            : 'No charge for the first 7 days. On day 8, you\'ll be billed $9.99. Cancel before day 8 and you owe nothing. Renews automatically each month until cancelled.'}
        </Text>

        <TouchableOpacity onPress={restorePurchases} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>Restore a previous purchase</Text>
        </TouchableOpacity>

        {/* DEV ONLY — remove before App Store submission */}
        <TouchableOpacity onPress={devUnlock} style={styles.devBtn}>
          <Text style={styles.devBtnText}>⚙️ Dev: Unlock Premium</Text>
        </TouchableOpacity>

        <View style={{ height: Space.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg1 },
  content:   { paddingHorizontal: Space.base, alignItems: 'center' },

  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: Space.sm, paddingTop: Space.sm, paddingBottom: Space.xs, alignSelf: 'flex-start' },
  backLabel: { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textSecondary },

  title:       { fontFamily: Fonts.semibold, fontSize: Size.xl, color: Colors.textPrimary, textAlign: 'center', letterSpacing: -0.3, marginTop: Space.sm },
  titleAccent: { fontFamily: Fonts.semibold, fontSize: Size.xl, color: C.amber, textAlign: 'center', letterSpacing: -0.3, marginBottom: Space.sm },
  subtitle:    { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: Size.sm * 1.6, marginBottom: Space.lg },

  plansWrap: { width: '100%', gap: Space.sm, marginTop: Space.sm, marginBottom: Space.lg },

  planCard: {
    width: '100%', backgroundColor: Colors.bg2,
    borderRadius: Radius.lg, padding: Space.base,
    borderWidth: 1.5, borderColor: Colors.borderSubtle,
  },
  planCardSelected: {
    borderColor: C.amber,
    backgroundColor: 'rgba(232,160,48,0.06)',
  },
  planTopRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Space.xs },
  planLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planLabel:     { fontFamily: Fonts.semibold, fontSize: Size.base, color: Colors.textSecondary },
  planLabelSelected: { color: Colors.textPrimary },
  planBadges:    { flexDirection: 'row', gap: Space.xxs },
  bestBadge:     { backgroundColor: C.amber, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  bestBadgeText: { fontFamily: Fonts.semibold, fontSize: 9, color: '#000', letterSpacing: 0.4 },
  saveBadge:     { backgroundColor: 'rgba(104,168,112,0.15)', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(104,168,112,0.3)' },
  saveBadgeText: { fontFamily: Fonts.semibold, fontSize: 9, color: C.green, letterSpacing: 0.3 },

  planFreeRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: Space.xs },
  planFreeText:     { fontFamily: Fonts.semibold, fontSize: Size.lg, color: Colors.textSecondary, letterSpacing: -0.3 },
  planFreeTextSelected: { color: C.amber },
  planFreeDays:     { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textTertiary, marginBottom: 2 },
  planThen:         { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, marginTop: 3 },
  planPerMonth:     { fontFamily: Fonts.regular, fontSize: Size.xs, color: C.amber, marginTop: Space.xxs },
  planComparison:   { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginTop: 2 },

  featuresWrap: { width: '100%', gap: Space.sm, marginBottom: Space.lg },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  featureText:  { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textSecondary, flex: 1 },

  ctaBtn:     { width: '100%', paddingVertical: 18, borderRadius: Radius.lg, backgroundColor: C.amber, alignItems: 'center', marginBottom: Space.base },
  ctaBtnText: { fontFamily: Fonts.semibold, fontSize: Size.base, color: '#000', letterSpacing: 0.2 },

  finePrint:  { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, textAlign: 'center', lineHeight: Size.xxs * 1.7, marginBottom: Space.base },
  restoreBtn:  { paddingVertical: Space.xs },
  restoreText: { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, textDecorationLine: 'underline' },

  devBtn:     { marginTop: Space.lg, paddingVertical: Space.xs },
  devBtnText: { fontFamily: Fonts.regular, fontSize: Size.xs, color: 'rgba(255,255,255,0.2)' },
});
