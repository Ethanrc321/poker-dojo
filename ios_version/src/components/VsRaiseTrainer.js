import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Card from './Card.js';
import { getNickname } from '../data/ranges.js';
import {
  FACING_OPEN_RANGES, OPEN_SIZES, POS_FULL, HERO_POSITIONS_FOR,
  ALL_SCENARIOS, buildVsRaisePool, getVsRaiseExplanation,
} from '../data/preflopActions.js';
import { RANGES } from '../engine/gto-engine.js';
import { C, Colors, Fonts, Size, Space, Radius, T, POS_COLOR } from '../theme.js';

const GTO_KEY_MAP = {
  BTN_CO: 'BTN_vs_CO',
  SB_BTN: 'SB_vs_BTN',
  BB_BTN: 'BB_vs_BTN',
};

const SUITS = ['♠', '♥', '♦', '♣'];
const POS_ORDER = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseHand(hand) {
  const isPair   = hand.length === 2 && !hand.endsWith('s') && !hand.endsWith('o');
  const isSuited = hand.endsWith('s');
  const r1 = hand[0];
  const r2 = isPair ? hand[0] : hand[1];
  if (isPair) {
    const s = shuffle([...SUITS]);
    return [{ rank: r1, suit: s[0] }, { rank: r2, suit: s[1] }];
  }
  if (isSuited) {
    const suit = SUITS[Math.floor(Math.random() * 4)];
    return [{ rank: r1, suit }, { rank: r2, suit }];
  }
  const s = shuffle([...SUITS]);
  return [{ rank: r1, suit: s[0] }, { rank: r2, suit: s[1] !== s[0] ? s[1] : s[2] }];
}

export default function VsRaiseTrainer({ recordResult, isSubscribed, decrement }) {
  const [filterVillain, setFilterVillain] = useState(null);
  const [filterHero,    setFilterHero]    = useState(null);
  const [activeVillain, setActiveVillain] = useState(null);
  const [activeHero,    setActiveHero]    = useState(null);
  const [pool,          setPool]          = useState([]);
  const [poolIdx,       setPoolIdx]       = useState(0);
  const [currentHand,   setCurrentHand]   = useState(null);
  const [cards,         setCards]         = useState([]);
  const [correctAction, setCorrectAction] = useState(null);
  const [userAction,    setUserAction]    = useState(null);
  const [stats,         setStats]         = useState({ total: 0, correct: 0 });

  function loadHand(newPool, idx, vPos, hPos) {
    const item = newPool[idx];
    setPool(newPool);
    setPoolIdx(idx);
    setActiveVillain(vPos);
    setActiveHero(hPos);
    setCurrentHand(item.hand);
    setCards(parseHand(item.hand));
    setCorrectAction(item.action);
    setUserAction(null);
  }

  const newScenario = useCallback((vPos, hPos) => {
    const resolvedVillain = vPos ?? filterVillain ?? ALL_SCENARIOS[Math.floor(Math.random() * ALL_SCENARIOS.length)].villainPos;
    let resolvedHero = hPos ?? filterHero;
    if (!resolvedHero) {
      const options = HERO_POSITIONS_FOR[resolvedVillain];
      resolvedHero = options[Math.floor(Math.random() * options.length)];
    }
    const newPool = shuffle(buildVsRaisePool(resolvedHero, resolvedVillain));
    loadHand(newPool, 0, resolvedVillain, resolvedHero);
  }, [filterVillain, filterHero]);

  useEffect(() => { newScenario(); }, []);

  function next() {
    // If either filter is "Any", pick a fresh random scenario each hand
    if (!filterVillain || !filterHero) {
      newScenario();
      return;
    }
    const nextIdx = poolIdx + 1;
    if (nextIdx >= pool.length) {
      const reshuffled = shuffle([...pool]);
      loadHand(reshuffled, 0, activeVillain, activeHero);
    } else {
      loadHand(pool, nextIdx, activeVillain, activeHero);
    }
  }

  function handleAction(action) {
    if (userAction !== null) return;
    setUserAction(action);
    const isCorrect = action === correctAction;
    setStats(s => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
    recordResult({ correct: isCorrect });
    if (!isSubscribed) decrement();
  }

  const isCorrect = userAction !== null && userAction === correctAction;
  const pct       = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;
  const nickname  = currentHand ? getNickname(currentHand) : null;
  const ranges    = activeVillain && activeHero ? FACING_OPEN_RANGES[activeVillain]?.[activeHero] : null;

  const gtoKey = GTO_KEY_MAP[`${activeHero}_${activeVillain}`] ?? null;
  const gtoFreqs = gtoKey && currentHand
    ? (RANGES.GTO_3BET_RANGES[gtoKey]?.[currentHand] ?? null)
    : null;

  if (!currentHand) return null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Filters */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Opener:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => { setFilterVillain(null); setFilterHero(null); newScenario(null, null); }}
            style={[styles.pill, !filterVillain && styles.pillActive]}
          >
            <Text style={[styles.pillText, !filterVillain && styles.pillTextActive]}>Any</Text>
          </TouchableOpacity>
          {['UTG', 'HJ', 'CO', 'BTN', 'SB'].map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => { setFilterVillain(p); setFilterHero(null); newScenario(p, null); }}
              style={[styles.pill, filterVillain === p && styles.pillActive]}
            >
              <Text style={[styles.pillText, filterVillain === p && styles.pillTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filterVillain && (
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Your pos:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => { setFilterHero(null); newScenario(filterVillain, null); }}
              style={[styles.pill, !filterHero && styles.pillActive]}
            >
              <Text style={[styles.pillText, !filterHero && styles.pillTextActive]}>Any</Text>
            </TouchableOpacity>
            {HERO_POSITIONS_FOR[filterVillain]?.map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => { setFilterHero(p); newScenario(filterVillain, p); }}
                style={[styles.pill, filterHero === p && styles.pillActive]}
              >
                <Text style={[styles.pillText, filterHero === p && styles.pillTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Scenario banner */}
      <View style={styles.scenarioBanner}>
        <Text style={styles.scenarioLine}>
          <Text style={{ color: C.amber, fontWeight: '700' }}>{activeVillain} </Text>
          <Text style={{ color: '#aaa' }}>opens to </Text>
          <Text style={{ color: C.amber, fontWeight: '700' }}>{OPEN_SIZES[activeVillain]}</Text>
          <Text style={{ color: '#aaa' }}>. Folds to you in </Text>
          <Text style={{ color: C.green, fontWeight: '700' }}>{activeHero}</Text>
          <Text style={{ color: '#aaa' }}>.</Text>
        </Text>

        {/* Table position strip */}
        <View style={styles.posStrip}>
          {POS_ORDER.map(p => {
            const isVillain = p === activeVillain;
            const isHero    = p === activeHero;
            const pc        = POS_COLOR[p];
            return (
              <View
                key={p}
                style={[
                  styles.posChip,
                  isVillain && { backgroundColor: pc.bg + 'aa', borderColor: pc.text + '66' },
                  isHero    && { backgroundColor: 'rgba(104,168,112,0.15)', borderColor: 'rgba(104,168,112,0.5)' },
                ]}
              >
                <Text style={[
                  styles.posChipText,
                  isVillain && { color: pc.text },
                  isHero    && { color: C.green },
                ]}>
                  {p}
                </Text>
                {isVillain && <Text style={[styles.posRole, { color: pc.text }]}>raise</Text>}
                {isHero    && <Text style={[styles.posRole, { color: C.green }]}>you</Text>}
              </View>
            );
          })}
        </View>
      </View>

      {/* Cards */}
      <View style={styles.cardsRow}>
        {cards.map((card, i) => <Card key={i} card={card} size="lg" />)}
      </View>

      <View style={styles.handNameRow}>
        <Text style={styles.handName}>{currentHand}</Text>
        {nickname && <Text style={styles.nickname}>"{nickname}"</Text>}
        <Text style={styles.handType}>
          {currentHand.endsWith('s') ? 'Suited' : currentHand.endsWith('o') ? 'Off-suit' : 'Pair'}
        </Text>
      </View>

      {/* Action buttons */}
      {userAction === null ? (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => handleAction('fold')} style={styles.foldBtn} activeOpacity={0.8}>
            <Text style={styles.foldBtnText}>Fold</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleAction('call')} style={styles.callBtn} activeOpacity={0.8}>
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleAction('3bet')} style={styles.threeBetBtn} activeOpacity={0.8}>
            <Text style={styles.threeBetBtnText}>3-Bet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.feedbackBox, { borderColor: isCorrect ? '#166534' : '#92400e', backgroundColor: isCorrect ? 'rgba(0,128,0,0.1)' : 'rgba(180,83,9,0.1)' }]}>
          <View style={styles.feedbackHeader}>
            <Text style={[styles.feedbackTitle, { color: isCorrect ? C.green : C.amber }]}>
              {isCorrect ? '✓ Correct!' : 'Not Optimal'}
            </Text>
            <View style={[styles.correctBadge, {
              backgroundColor: correctAction === '3bet' ? 'rgba(104,168,112,0.15)' : correctAction === 'call' ? 'rgba(85,119,224,0.15)' : 'rgba(224,69,69,0.15)',
              borderColor: correctAction === '3bet' ? C.green : correctAction === 'call' ? C.blue : C.red,
            }]}>
              <Text style={[styles.correctBadgeText, {
                color: correctAction === '3bet' ? C.green : correctAction === 'call' ? C.blue : C.red,
              }]}>
                {correctAction === '3bet' ? '3-Bet' : correctAction === 'call' ? 'Call' : 'Fold'}
              </Text>
            </View>
          </View>
          <Text style={styles.explanationText}>
            {getVsRaiseExplanation(currentHand, activeHero, activeVillain, correctAction)}
          </Text>
          {gtoFreqs && (
            <View style={styles.gtoFreqBox}>
              <Text style={styles.gtoFreqTitle}>GTO Frequencies ({activeHero} vs {activeVillain})</Text>
              <Text style={styles.gtoFreqLine}>
                <Text style={{ color: C.green }}>3-Bet: </Text>{Math.round(gtoFreqs[0] * 100)}%{'  '}
                <Text style={{ color: C.blue }}>Call: </Text>{Math.round(gtoFreqs[1] * 100)}%{'  '}
                <Text style={{ color: '#888' }}>Fold: </Text>{Math.round((1 - gtoFreqs[0] - gtoFreqs[1]) * 100)}%
              </Text>
            </View>
          )}
        </View>
      )}

      {userAction !== null && (
        <TouchableOpacity onPress={next} style={styles.nextBtn} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Next Hand →</Text>
        </TouchableOpacity>
      )}

      {/* Range reference (shown after answering) */}
      {userAction !== null && ranges && (
        <View style={styles.rangePanel}>
          <Text style={styles.rangePanelTitle}>{activeHero} vs {activeVillain} open — Range</Text>
          <Text style={styles.rangeLine}>
            <Text style={{ color: C.green, fontWeight: '700' }}>3-Bet: </Text>
            <Text style={{ color: '#666' }}>{[...ranges.threebet].join(', ')}</Text>
          </Text>
          {ranges.call.size > 0 && (
            <Text style={styles.rangeLine}>
              <Text style={{ color: C.blue, fontWeight: '700' }}>Call: </Text>
              <Text style={{ color: '#666' }}>{[...ranges.call].join(', ')}</Text>
            </Text>
          )}
          <Text style={[styles.rangeLine, { marginTop: 4 }]}>
            <Text style={{ color: '#555', fontWeight: '700' }}>Fold: </Text>
            <Text style={{ color: '#444' }}>Everything else</Text>
          </Text>
        </View>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Space.base },

  filterRow:   { flexDirection: 'row', alignItems: 'center', gap: Space.xs, marginBottom: Space.xs },
  filterLabel: { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, width: 58 },
  pill:        { paddingHorizontal: Space.sm, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.bg2, marginRight: 6 },
  pillActive:  { backgroundColor: C.green },
  pillText:    { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textSecondary },
  pillTextActive: { color: '#000' },

  scenarioBanner:{ backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Space.sm, marginBottom: Space.sm, gap: Space.sm, borderWidth: 1, borderColor: Colors.borderSubtle },
  scenarioLine:  { fontFamily: Fonts.regular, fontSize: Size.sm, lineHeight: Size.sm * 1.45 },
  posStrip:      { flexDirection: 'row', gap: Space.xxs },
  posChip:       { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: Radius.xs, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'transparent', gap: 2 },
  posChipText:   { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: Colors.textTertiary },
  posRole:       { fontFamily: Fonts.semibold, fontSize: 8 },

  cardsRow:    { flexDirection: 'row', justifyContent: 'center', gap: Space.sm, marginBottom: Space.sm },
  handNameRow: { alignItems: 'center', marginBottom: Space.md },
  handName:    { fontFamily: Fonts.semibold, fontSize: Size.lg, color: Colors.textPrimary },
  nickname:    { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, marginTop: 2 },
  handType:    { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginTop: 2 },

  actionRow:     { flexDirection: 'row', gap: Space.xs, marginBottom: Space.md },
  foldBtn:       { flex: 1, paddingVertical: 18, borderRadius: Radius.md, backgroundColor: '#2a0a0a', borderWidth: 1, borderColor: 'rgba(224,69,69,0.3)', alignItems: 'center' },
  callBtn:       { flex: 1, paddingVertical: 18, borderRadius: Radius.md, backgroundColor: '#0A1228', borderWidth: 1, borderColor: 'rgba(85,119,224,0.3)', alignItems: 'center' },
  threeBetBtn:   { flex: 1, paddingVertical: 18, borderRadius: Radius.md, backgroundColor: '#0F1A0F', borderWidth: 1, borderColor: 'rgba(104,168,112,0.3)', alignItems: 'center' },
  foldBtnText:   { fontFamily: Fonts.semibold, fontSize: Size.sm, color: C.red },
  callBtnText:   { fontFamily: Fonts.semibold, fontSize: Size.sm, color: C.blue },
  threeBetBtnText:{ fontFamily: Fonts.semibold, fontSize: Size.sm, color: C.green },

  feedbackBox:      { borderRadius: Radius.lg, padding: Space.base, borderWidth: 1, marginBottom: Space.sm, gap: Space.xs },
  feedbackHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedbackTitle:    { fontFamily: Fonts.semibold, fontSize: Size.md },
  correctBadge:     { paddingHorizontal: Space.xs, paddingVertical: Space.xxs, borderRadius: Radius.sm, borderWidth: 1 },
  correctBadgeText: { fontFamily: Fonts.semibold, fontSize: Size.xs },
  explanationText:  { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, lineHeight: Size.xs * 1.55 },

  nextBtn:     { paddingVertical: Space.base, borderRadius: Radius.lg, backgroundColor: Colors.bg2, alignItems: 'center', marginBottom: Space.sm },
  nextBtnText: { ...T.btnPrimary, color: Colors.textPrimary },

  gtoFreqBox:   { backgroundColor: 'rgba(104,168,112,0.07)', borderRadius: Radius.sm, padding: Space.xs, borderWidth: 1, borderColor: 'rgba(104,168,112,0.2)' },
  gtoFreqTitle: { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: Colors.textTertiary, marginBottom: Space.xxs },
  gtoFreqLine:  { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary },

  rangePanel:      { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Space.sm, gap: Space.xxs + 2, borderWidth: 1, borderColor: Colors.borderSubtle },
  rangePanelTitle: { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textTertiary, marginBottom: Space.xxs },
  rangeLine:       { fontFamily: Fonts.regular, fontSize: Size.xs, lineHeight: Size.xs * 1.5 },
});
