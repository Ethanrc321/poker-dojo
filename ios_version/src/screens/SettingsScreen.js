import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet, Alert, Linking, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext.js';
import { useSubscription } from '../context/SubscriptionContext.js';
import { C, Colors, Fonts, Size, Space, Radius, T } from '../theme.js';
import { getHapticsEnabled, setHapticsEnabled } from '../utils/haptics.js';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// ── Reusable row component ────────────────────────────────────────────────────
function Row({ icon, label, value, onPress, destructive }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? C.red : Colors.textSecondary}
          style={styles.rowIcon}
        />
        <Text style={[styles.rowLabel, destructive && { color: C.red }]}>{label}</Text>
      </View>
      {value
        ? <Text style={styles.rowValue}>{value}</Text>
        : onPress
          ? <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          : null
      }
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SectionLabel({ title }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SettingsScreen({ resetStats, onNavigate }) {
  const insets = useSafeAreaInsets();
  const { user, loading, signIn, signOut } = useAuth();
  const {
    isSubscribed,
    restorePurchases, manageSubscription,
  } = useSubscription();
  const [hapticsOn, setHapticsOn] = useState(getHapticsEnabled());

  function handleHapticsToggle(val) {
    setHapticsOn(val);
    setHapticsEnabled(val);
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Sign out of your Google account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  function handleResetStats() {
    Alert.alert(
      'Reset Stats',
      'Reset all training stats? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetStats();
            Alert.alert('Done', 'All stats have been reset.');
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Account ──────────────────────────────────────────────── */}
        <SectionLabel title="ACCOUNT" />
        <View style={styles.panel}>
          {user ? (
            <>
              <View style={styles.profileRow}>
                {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>
                      {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {user.displayName ?? 'Google User'}
                  </Text>
                  <Text style={styles.profileEmail} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
              </View>
              <Divider />
              <Row icon="log-out-outline" label="Sign Out" onPress={handleSignOut} destructive />
            </>
          ) : (
            <TouchableOpacity
              style={styles.googleSignInBtn}
              onPress={signIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color="#fff" />
              <Text style={styles.googleSignInText}>Sign in with Google</Text>
            </TouchableOpacity>
          )}
        </View>
        {!user && (
          <Text style={styles.hint}>Sign in to sync your progress across devices.</Text>
        )}

        {/* ── Subscription ─────────────────────────────────────────── */}
        <SectionLabel title="SUBSCRIPTION" />
        <View style={styles.panel}>
          <View style={styles.subRow}>
            <View style={[styles.badge, isSubscribed ? styles.badgePremium : styles.badgeFree]}>
              <Text style={[styles.badgeText, isSubscribed ? styles.badgeTextPremium : styles.badgeTextFree]}>
                {isSubscribed ? 'PREMIUM' : 'FREE'}
              </Text>
            </View>
            <Text style={styles.subDesc}>
              {isSubscribed
                ? 'Full access to all trainers and charts.'
                : 'Preflop trainer + basic RFI charts.'}
            </Text>
          </View>

          {isSubscribed ? (
            <>
              <Divider />
              <Row
                icon="card-outline"
                label="Manage Subscription"
                onPress={manageSubscription}
              />
            </>
          ) : (
            <>
              <Divider />
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => onNavigate?.('Subscription')}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeBtnText}>Start 7-Day Free Trial</Text>
              </TouchableOpacity>
              <Divider />
              <Row icon="refresh-outline" label="Restore Purchases" onPress={restorePurchases} />
            </>
          )}
        </View>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <SectionLabel title="PREFERENCES" />
        <View style={styles.panel}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="phone-portrait-outline" size={18} color={Colors.textSecondary} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Haptic Feedback</Text>
            </View>
            <Switch
              value={hapticsOn}
              onValueChange={handleHapticsToggle}
              trackColor={{ false: '#333', true: 'rgba(232,160,48,0.5)' }}
              thumbColor={hapticsOn ? C.amber : '#888'}
              ios_backgroundColor="#333"
            />
          </View>
        </View>

        {/* ── App Data ─────────────────────────────────────────────── */}
        <SectionLabel title="APP DATA" />
        <View style={styles.panel}>
          <Row
            icon="trash-outline"
            label="Reset All Stats"
            onPress={handleResetStats}
            destructive
          />
        </View>

        {/* ── About ────────────────────────────────────────────────── */}
        <SectionLabel title="ABOUT" />
        <View style={styles.panel}>
          <Row icon="information-circle-outline" label="Version" value={APP_VERSION} />
          <Divider />
          <Row
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://ethanrc321.github.io/poker-dojo/privacy/').catch(() => {})}
          />
          <Divider />
          <Row
            icon="shield-checkmark-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://ethanrc321.github.io/poker-dojo/terms/').catch(() => {})}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg1 },
  header:    { paddingHorizontal: Space.base, paddingTop: Space.lg, marginBottom: Space.xs },
  title:     { ...T.screenTitle },
  content:   { paddingHorizontal: Space.base },

  sectionLabel: {
    fontFamily: Fonts.semibold, fontSize: Size.xxs,
    color: Colors.textTertiary, letterSpacing: 0.8,
    marginTop: Space.lg, marginBottom: Space.xs,
  },
  panel:   { backgroundColor: Colors.bg2, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderSubtle, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: Colors.borderSubtle, marginHorizontal: Space.base },
  hint:    { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginTop: Space.xs, paddingHorizontal: Space.xxs },

  // Row
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.base, paddingVertical: 14 },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  rowIcon:  {},
  rowLabel: { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textPrimary },
  rowValue: { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textTertiary },

  // Profile
  profileRow:       { flexDirection: 'row', alignItems: 'center', gap: Space.base, padding: Space.base },
  avatar:           { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder:{ backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:    { fontFamily: Fonts.semibold, fontSize: Size.lg, color: '#000' },
  profileInfo:      { flex: 1 },
  profileName:      { fontFamily: Fonts.semibold, fontSize: Size.base, color: Colors.textPrimary },
  profileEmail:     { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, marginTop: 2 },

  // Google button
  googleSignInBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.sm, paddingVertical: 14, paddingHorizontal: Space.base },
  googleSignInText: { fontFamily: Fonts.semibold, fontSize: Size.base, color: Colors.textPrimary },

  // Subscription
  subRow:           { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.base },
  badge:            { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgePremium:     { backgroundColor: 'rgba(104,168,112,0.15)', borderWidth: 1, borderColor: C.green },
  badgeFree:        { backgroundColor: 'rgba(100,100,100,0.15)', borderWidth: 1, borderColor: '#444' },
  badgeText:        { fontFamily: Fonts.semibold, fontSize: Size.xxs, letterSpacing: 0.5 },
  badgeTextPremium: { color: C.green },
  badgeTextFree:    { color: Colors.textTertiary },
  subDesc:          { flex: 1, fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary },

  upgradeBtn:        { margin: Space.base, paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: C.amber, alignItems: 'center' },
  upgradeBtnDisabled:{ opacity: 0.5 },
  upgradeBtnText:    { fontFamily: Fonts.semibold, fontSize: Size.base, color: '#000' },
});
