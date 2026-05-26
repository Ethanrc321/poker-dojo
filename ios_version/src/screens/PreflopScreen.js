import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useStamina, MAX_STAMINA, formatRefillTime } from '../utils/stamina.js';
import { useSubscription } from '../context/SubscriptionContext.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card.js';
import {
  RANKS, POSITIONS, POSITION_LABELS, RFI_RANGES,
  SB_RAISE_VALUE, SB_RAISE_BLUFF, SB_LIMP,
  getRFIAction, getEVLoss, getNickname, getActionExplanation, buildTrainerPool,
} from '../data/ranges.js';
import { EVALUATOR } from '../engine/gto-engine.js';
import VsRaiseTrainer from '../components/VsRaiseTrainer.js';
import { C, Colors, Fonts, Size, Space, Radius, T } from '../theme.js';
import { triggerHaptic, Haptics } from '../utils/haptics.js';

const SUITS = ['♠','♥','♦','♣'];
const POSITIONS_SELECTABLE = ['UTG','HJ','CO','BTN','SB'];

const POSITION_DESCRIPTIONS = {
  UTG: 'First to act. 5 players behind. Play only premium hands that can withstand 3-bets.',
  HJ:  'Second to act. 4 players behind. Slightly wider than UTG.',
  CO:  'Cutoff. 3 players behind. Wide range, position is valuable.',
  BTN: 'Button. Acts last postflop. Most profitable seat — open ~43% of hands.',
  SB:  'Small Blind. Only BB behind. Use 3bb open. OOP vs BB postflop.',
  BB:  'Big Blind. Already invested 1bb. Defend wide, 3-bet strong hands.',
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseHand(hand) {
  const isPair    = hand.length === 2 && !hand.endsWith('s') && !hand.endsWith('o');
  const isSuited  = hand.endsWith('s');
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

function getFeedbackStyle(evLoss) {
  if (evLoss.bb === 0) return { border: C.green,   text: C.green,   label: 'Correct!' };
  if (Math.abs(evLoss.bb) <= 0.1) return { border: C.amber,  text: C.amber,  label: 'Minor Leak' };
  if (Math.abs(evLoss.bb) <= 0.3) return { border: '#f97316', text: '#f97316', label: 'Medium Mistake' };
  return { border: C.red, text: C.red, label: 'Significant Mistake' };
}

function getFeedbackFromEval(evalRes) {
  if (!evalRes) return { border: C.green, text: C.green, label: 'Correct!' };
  if (evalRes.isCorrect) return { border: C.green, text: C.green, label: 'Correct!' };
  const loss = Math.abs(evalRes.evLossMBB);
  if (loss < 4)  return { border: C.amber,    text: C.amber,    label: 'Minor Leak' };
  if (loss < 10) return { border: '#f97316',  text: '#f97316',  label: 'Medium Mistake' };
  return              { border: C.red,        text: C.red,       label: 'Significant Mistake' };
}

export default function PreflopScreen({ recordResult, isActive, onNavigate }) {
  const insets = useSafeAreaInsets();
  const { isSubscribed } = useSubscription();
  const { stamina, isEmpty, msUntilRefill, loaded, decrement, refillFromAd } = useStamina();

  const [staminaModalVisible, setStaminaModalVisible] = useState(false);
  const [timeLeft,            setTimeLeft]            = useState(0);

  const [mode,          setMode]          = useState('rfi');
  const [selectedPos,   setSelectedPos]   = useState(null);
  const [currentPos,    setCurrentPos]    = useState('BTN');
  const [currentHand,   setCurrentHand]   = useState(null);
  const [cards,         setCards]         = useState([]);
  const [correctAction, setCorrectAction] = useState(null);
  const [userAction,    setUserAction]    = useState(null);
  const [evalResult,    setEvalResult]    = useState(null);
  const [streak,        setStreak]        = useState(0);
  const [sessionStats,  setSessionStats]  = useState({ total: 0, correct: 0 });

  const drawHand = useCallback((forcePos) => {
    // forcePos = string → use that position immediately (position pill switch)
    // forcePos = null   → random (Random pill switch)
    // forcePos = undefined → fall back to selectedPos state (Next Hand / normal flow)
    const resolved = forcePos !== undefined ? forcePos : selectedPos;
    const pos = resolved || (['UTG','HJ','CO','BTN','SB'][Math.floor(Math.random() * 5)]);
    setCurrentPos(pos);
    const p = buildTrainerPool(pos, 'RFI');
    if (p.length === 0) return;
    const item = p[Math.floor(Math.random() * p.length)];
    const hand = item.hand;
    const action = getRFIAction(hand, pos) || item.action;
    setCurrentHand(hand);
    setCards(parseHand(hand));
    setCorrectAction(action);
    setUserAction(null);
    setEvalResult(null);
  }, [selectedPos]);

  useEffect(() => { drawHand(); }, []);

  // Single effect owns all stamina-modal visibility logic — all deps explicit,
  // no stale closures. Also clears modal when screen is not active so it can
  // never appear on top of other screens (Modal renders at native root level).
  useEffect(() => {
    if (isSubscribed) {
      setStaminaModalVisible(false);
    } else if (!isActive) {
      setStaminaModalVisible(false);
    } else if (loaded && isEmpty) {
      setStaminaModalVisible(true);
    }
  }, [isSubscribed, isEmpty, loaded, isActive]);

  // Live countdown tick — seed once when modal opens, interval handles the rest
  useEffect(() => {
    if (!staminaModalVisible) return;
    setTimeLeft(msUntilRefill);
    if (msUntilRefill <= 0) return;
    const id = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1000)), 1000);
    return () => clearInterval(id);
  }, [staminaModalVisible]); // intentionally excludes msUntilRefill — seeded once on open

  function handleAction(action) {
    if (userAction !== null) return;
    if (!isSubscribed && isEmpty) { showStaminaModal(); return; }
    setUserAction(action);
    let isCorrect;
    if (currentPos !== 'SB') {
      const result = EVALUATOR.evalPreflopRFI(currentHand, currentPos, action);
      setEvalResult(result);
      isCorrect = result.isCorrect;
    } else {
      setEvalResult(null);
      const evLoss = getEVLoss(correctAction, action);
      isCorrect = evLoss.bb === 0 || Math.abs(evLoss.bb) <= 0.05;
    }
    setSessionStats(prev => ({ total: prev.total + 1, correct: prev.correct + (isCorrect ? 1 : 0) }));
    setStreak(prev => isCorrect ? prev + 1 : 0);
    recordResult({ correct: isCorrect, position: currentPos });
    if (!isSubscribed) decrement();
    triggerHaptic(isCorrect
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error
    );
  }

  const showStaminaModal = useCallback(() => {
    if (!isSubscribed && isEmpty) setStaminaModalVisible(true);
  }, [isSubscribed, isEmpty]);

  const handleAdRefill = useCallback(async () => {
    const success = await refillFromAd();
    if (success) { setStaminaModalVisible(false); drawHand(); }
  }, [refillFromAd, drawHand]);

  const evLoss  = (userAction && currentPos === 'SB') ? getEVLoss(correctAction, userAction) : null;
  const fbStyle = userAction ? (evLoss ? getFeedbackStyle(evLoss) : getFeedbackFromEval(evalResult)) : null;
  const nickname = currentHand ? getNickname(currentHand) : null;
  const pct      = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Preflop Trainer</Text>
          <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {mode === 'rfi'
              ? currentPos === 'SB'
                ? 'SB RFI — Raise, Limp, or Fold.'
                : 'RFI — Raise First In. Raise or Fold.'
              : 'vs. Raise — Fold, Call, or 3-Bet.'}
          </Text>
        </View>
          <View style={styles.staminaCenter}>
          {!isSubscribed && loaded && (
            <TouchableOpacity
              onPress={() => isEmpty && setStaminaModalVisible(true)}
              activeOpacity={isEmpty ? 0.7 : 1}
            >
              <View style={[
                styles.staminaPill,
                {
                  backgroundColor: isEmpty
                    ? 'rgba(224,69,69,0.12)'
                    : stamina <= 5
                      ? 'rgba(232,160,48,0.12)'
                      : 'rgba(104,168,112,0.10)',
                  borderColor: isEmpty
                    ? 'rgba(224,69,69,0.35)'
                    : stamina <= 5
                      ? 'rgba(232,160,48,0.35)'
                      : 'rgba(104,168,112,0.30)',
                },
              ]}>
                <Ionicons
                  name="flash"
                  size={14}
                  color={isEmpty ? C.red : stamina <= 5 ? C.amber : C.green}
                />
                <Text style={[styles.staminaText, {
                  color: isEmpty ? C.red : stamina <= 5 ? C.amber : Colors.textSecondary,
                }]}>
                  {stamina}/{MAX_STAMINA}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          </View>

        <View style={styles.headerRight}>
          {pct !== null && (
            <Text style={[styles.pct, { color: pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red }]}>
              {pct}%
            </Text>
          )}
          {streak >= 3 && <Text style={styles.streak}>{streak} streak</Text>}
        </View>
      </View>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          onPress={() => { if (!isSubscribed && isEmpty) { showStaminaModal(); return; } setMode('rfi'); }}
          style={[styles.modePill, mode === 'rfi' && styles.modePillActive]}
        >
          <Text style={[styles.modePillText, mode === 'rfi' && styles.modePillTextActive]}>RFI Training</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { if (!isSubscribed && isEmpty) { showStaminaModal(); return; } setMode('vsraise'); }}
          style={[styles.modePill, mode === 'vsraise' && styles.modePillActive]}
        >
          <Text style={[styles.modePillText, mode === 'vsraise' && styles.modePillTextActive]}>vs. Raise</Text>
        </TouchableOpacity>
      </View>

      {mode === 'vsraise' ? (
        <VsRaiseTrainer recordResult={recordResult} isSubscribed={isSubscribed} decrement={decrement} isEmpty={isEmpty} onStaminaEmpty={showStaminaModal} />
      ) : (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Position selector */}
      <View style={styles.posRow}>
        <Text style={styles.posLabel}>Position:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => { if (!isSubscribed && isEmpty) { showStaminaModal(); return; } setSelectedPos(null); drawHand(null); }}
            style={[styles.posPill, !selectedPos && styles.posPillActive]}
          >
            <Text style={[styles.posPillText, !selectedPos && styles.posPillTextActive]}>Random</Text>
          </TouchableOpacity>
          {POSITIONS_SELECTABLE.map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => { if (!isSubscribed && isEmpty) { showStaminaModal(); return; } setSelectedPos(p); drawHand(p); }}
              style={[styles.posPill, selectedPos === p && styles.posPillActive]}
            >
              <Text style={[styles.posPillText, selectedPos === p && styles.posPillTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {sessionStats.total > 0 && (
        <Text style={styles.sessionCount}>{sessionStats.total} hands this session</Text>
      )}

      {/* Position info */}
      <View style={styles.panel}>
        <Text style={styles.posName}>{currentPos} — {POSITION_LABELS[currentPos]}</Text>
        <Text style={styles.posDesc}>{POSITION_DESCRIPTIONS[currentPos]}</Text>
      </View>

      {/* Cards */}
      <View style={styles.cardsRow}>
        {cards.map((card, i) => <Card key={i} card={card} size="lg" />)}
      </View>

      {/* Hand name */}
      <View style={styles.handNameRow}>
        <Text style={styles.handName}>{currentHand}</Text>
        {nickname && <Text style={styles.nickname}>"{nickname}"</Text>}
        <Text style={styles.handType}>
          {currentHand?.endsWith('s') ? 'Suited' : currentHand?.endsWith('o') ? 'Off-suit' : 'Pair'}
        </Text>
      </View>

      {/* Action buttons */}
      {userAction === null ? (
        currentPos === 'SB' ? (
          <View style={styles.sbActionWrap}>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => handleAction('raise')} style={styles.raiseBtn} activeOpacity={0.8}>
                <Text style={styles.raiseBtnText}>Raise</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAction('limp')} style={styles.limpBtn} activeOpacity={0.8}>
                <Text style={styles.limpBtnText}>Limp</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => handleAction('fold')} style={[styles.foldBtn, { flex: 0, paddingHorizontal: Space.xl }]} activeOpacity={0.8}>
              <Text style={styles.foldBtnText}>Fold</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => handleAction('raise')} style={styles.raiseBtn} activeOpacity={0.8}>
              <Text style={styles.raiseBtnText}>Raise</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleAction('fold')} style={styles.foldBtn} activeOpacity={0.8}>
              <Text style={styles.foldBtnText}>Fold</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <View style={[styles.feedbackBox, { borderColor: fbStyle.border }]}>
          <View style={styles.feedbackHeader}>
            <Text style={[styles.feedbackLabel, { color: fbStyle.text }]}>{fbStyle.label}</Text>
            {evalResult ? (
              <Text style={{ fontSize: 12, color: evalResult.isMixed ? C.amber : evalResult.isCorrect ? C.green : C.red }}>
                GTO: {Math.round(evalResult.gtoFreq * 100)}% raise{evalResult.isMixed ? ' (mixed)' : ''}
              </Text>
            ) : (
              <Text style={{ fontSize: 13, color: evLoss?.bb < 0 ? C.red : C.green }}>
                {evLoss?.bb < 0 ? evLoss.bb + ' bb' : 'No EV loss'}
              </Text>
            )}
          </View>
          <Text style={styles.correctActionLine}>
            <Text style={{ color: '#888' }}>Correct: </Text>
            <Text style={{ fontWeight: '700', color:
              (correctAction === 'raise' || correctAction === 'raise_value') ? C.green :
              correctAction === 'raise_bluff' ? '#3b82f6' :
              correctAction === 'limp' ? '#10b981' :
              correctAction === 'fold' ? C.red : C.amber }}>
              {evalResult
                ? (evalResult.gtoAction === 'raise' ? 'RAISE' : 'FOLD') +
                  (evalResult.isMixed ? ` (~${Math.round(evalResult.gtoFreq * 100)}%)` : '')
                : correctAction === 'mix' ? 'Raise ~50% / Fold ~50% (MIX)'
                : correctAction === 'raise_value' ? 'RAISE (Value)'
                : correctAction === 'raise_bluff' ? 'RAISE (Bluff)'
                : correctAction?.toUpperCase()}
            </Text>
            <Text style={{ color: '#888' }}>  ·  You: </Text>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{userAction?.toUpperCase()}</Text>
          </Text>
          <Text style={styles.explanation}>
            {evalResult ? evalResult.feedback : getActionExplanation(currentHand, currentPos, correctAction)}
          </Text>

          {correctAction === 'fold' && userAction === 'raise' && (
            <View style={styles.remindBox}>
              <Text style={styles.remindText}>TAG discipline: This hand is below the {currentPos} opening range. Opening it creates a leaky range that gets exploited by 3-bets from late position.</Text>
            </View>
          )}
          {(correctAction === 'raise' || correctAction === 'raise_value') && userAction === 'fold' && (
            <View style={[styles.remindBox, { borderColor: C.blue, backgroundColor: 'rgba(85,119,224,0.08)' }]}>
              <Text style={[styles.remindText, { color: '#93c5fd' }]}>TAG means playing strong hands aggressively. This hand is in the {currentPos} range — folding surrenders EV you should be capturing.</Text>
            </View>
          )}
          {correctAction === 'raise_value' && userAction === 'limp' && (
            <View style={styles.remindBox}>
              <Text style={styles.remindText}>Premium hands must be raised from SB — never limped. Limping AA/KK/QQ gives the BB a free flop and lets them realize equity cheaply against your best hands.</Text>
            </View>
          )}
          {correctAction === 'limp' && userAction === 'raise' && (
            <View style={[styles.remindBox, { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.06)' }]}>
              <Text style={[styles.remindText, { color: '#6ee7b7' }]}>SB has a dedicated limp range. Over-raising with these hands inflates the pot in a spot where you're OOP vs BB for the rest of the hand.</Text>
            </View>
          )}
        </View>
      )}

      {/* Next Hand button — hidden when stamina is empty (modal takes over) */}
      {userAction !== null && (!isEmpty || isSubscribed) && (
        <TouchableOpacity onPress={() => drawHand()} style={styles.nextBtn} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Next Hand →</Text>
        </TouchableOpacity>
      )}

      {/* Quick reference */}
      {currentPos === 'SB' ? (
        <View style={styles.quickRef}>
          <Text style={styles.quickRefTitle}>Quick Range Reference — SB (4-Action)</Text>
          <Text style={styles.quickRefLine}>
            <Text style={{ color: C.green, fontWeight: '600' }}>Raise Value: </Text>
            <Text style={{ color: '#666' }}>{[...SB_RAISE_VALUE].slice(0, 12).join(', ')}...</Text>
          </Text>
          <Text style={styles.quickRefLine}>
            <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Raise Bluff: </Text>
            <Text style={{ color: '#666' }}>{[...SB_RAISE_BLUFF].slice(0, 10).join(', ')}...</Text>
          </Text>
          <Text style={styles.quickRefLine}>
            <Text style={{ color: '#10b981', fontWeight: '600' }}>Limp: </Text>
            <Text style={{ color: '#666' }}>{[...SB_LIMP].slice(0, 12).join(', ')}...</Text>
          </Text>
        </View>
      ) : currentPos !== 'BB' && RFI_RANGES[currentPos] ? (
        <View style={styles.quickRef}>
          <Text style={styles.quickRefTitle}>Quick Range Reference — {currentPos}</Text>
          <Text style={styles.quickRefLine}>
            <Text style={{ color: C.green, fontWeight: '600' }}>Raise: </Text>
            <Text style={{ color: '#666' }}>
              {[...RFI_RANGES[currentPos].raise].slice(0, 20).join(', ')}{RFI_RANGES[currentPos].raise.size > 20 ? '...' : ''}
            </Text>
          </Text>
          <Text style={styles.quickRefLine}>
            <Text style={{ color: C.amber, fontWeight: '600' }}>Mix (~50%): </Text>
            <Text style={{ color: '#666' }}>{[...RFI_RANGES[currentPos].mix].join(', ')}</Text>
          </Text>
        </View>
      ) : null}

      <View style={{ height: 20 }} />
      </ScrollView>
      )}

      {/* ── Stamina modal ─────────────────────────────────────────── */}
      <Modal visible={staminaModalVisible && !isSubscribed} transparent animationType="fade" statusBarTranslucent>
        <BlurView style={StyleSheet.absoluteFill} intensity={55} tint="dark">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>

              {/* X dismiss */}
              <TouchableOpacity style={styles.modalClose} onPress={() => setStaminaModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color="#555" />
              </TouchableOpacity>

              {/* Icon */}
              <View style={styles.modalIconCircle}>
                <Ionicons name="flash" size={28} color={C.amber} />
              </View>

              {/* Headline */}
              <Text style={styles.modalTitle}>Out of Stamina</Text>
              <Text style={styles.modalSubtitle}>
                Upgrade to Premium for unlimited training — no stamina limits, no ads, and full access to every module.
              </Text>

              {/* Perks */}
              <View style={styles.modalPerks}>
                {[
                  'Ad Free',
                  'Unlimited training — no limits',
                  'Postflop, Math & Hand Reading trainers',
                  'Advanced GTO charts & glossary',
                ].map(p => (
                  <View key={p} style={styles.modalPerkRow}>
                    <Ionicons name="checkmark-circle" size={14} color={C.green} />
                    <Text style={styles.modalPerkText}>{p}</Text>
                  </View>
                ))}
              </View>

              {/* Upgrade CTA */}
              <TouchableOpacity
                style={styles.modalUpgradeBtn}
                onPress={() => { setStaminaModalVisible(false); onNavigate?.('Subscription'); }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalUpgradeBtnText}>Start 7-Day Free Trial</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.modalDivider}>
                <View style={styles.modalDividerLine} />
                <Text style={styles.modalDividerText}>or</Text>
                <View style={styles.modalDividerLine} />
              </View>

              {/* Ad refill button */}
              <TouchableOpacity style={styles.adBtn} onPress={handleAdRefill} activeOpacity={0.85}>
                <Ionicons name="film-outline" size={18} color={C.amber} />
                <Text style={styles.adBtnText}>Refill</Text>
              </TouchableOpacity>

              {/* Countdown */}
              {timeLeft > 0 ? (
                <Text style={styles.modalCountdown}>
                  Auto-refills in {formatRefillTime(timeLeft)}
                </Text>
              ) : (
                <View style={styles.modalCountdownReady}>
                  <Ionicons name="flash" size={13} color={C.green} />
                  <Text style={[styles.modalCountdown, { color: C.green }]}>
                    Stamina ready — tap Refill or close to continue
                  </Text>
                </View>
              )}

            </View>
          </View>
        </BlurView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg1 },
  content:          { paddingHorizontal: Space.base },
  header:        { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Space.base, paddingTop: Space.lg, marginBottom: Space.base },
  headerLeft:    { flex: 1 },
  title:         { ...T.screenTitle },
  subtitle:      { ...T.subtitle, marginTop: Space.xxs },
  staminaCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 2 },
  headerRight:   { alignItems: 'flex-end', justifyContent: 'flex-start' },
  pct:              { fontFamily: Fonts.semibold, fontSize: Size.md, fontVariant: ['tabular-nums'] },
  streak:           { fontFamily: Fonts.regular, fontSize: Size.xs, color: C.amber, marginTop: 2 },
  modeRow:          { flexDirection: 'row', gap: Space.xs, paddingHorizontal: Space.base, marginBottom: Space.sm },
  modePill:         { flex: 1, paddingVertical: Space.xs, borderRadius: Radius.md, backgroundColor: Colors.bg2, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderSubtle },
  modePillActive:   { backgroundColor: C.green, borderColor: C.green },
  modePillText:     { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textTertiary },
  modePillTextActive: { color: '#000' },
  posRow:           { flexDirection: 'row', alignItems: 'center', gap: Space.xs, marginBottom: Space.xs },
  posLabel:         { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary },
  posPill:          { paddingHorizontal: Space.sm, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.bg2, marginRight: 6 },
  posPillActive:    { backgroundColor: C.green },
  posPillText:      { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textSecondary },
  posPillTextActive:{ color: '#000' },
  sessionCount:     { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginBottom: Space.sm },
  panel:            { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Space.sm, marginBottom: Space.base },
  posName:          { fontFamily: Fonts.semibold, fontSize: Size.md, color: C.amber, marginBottom: Space.xxs },
  posDesc:          { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, lineHeight: Size.xs * 1.45 },
  cardsRow:         { flexDirection: 'row', justifyContent: 'center', gap: Space.sm, marginBottom: Space.sm },
  handNameRow:      { alignItems: 'center', marginBottom: Space.md },
  handName:         { fontFamily: Fonts.semibold, fontSize: Size.lg, color: Colors.textPrimary },
  nickname:         { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, marginTop: 2 },
  handType:         { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginTop: 2 },
  sbActionWrap:     { gap: Space.xs, marginBottom: Space.md, alignItems: 'center' },
  actionRow:        { flexDirection: 'row', gap: Space.sm, marginBottom: Space.xs },
  raiseBtn:         { flex: 1, paddingVertical: 18, borderRadius: Radius.lg, backgroundColor: '#0F1A0F', borderWidth: 1, borderColor: 'rgba(104,168,112,0.3)', alignItems: 'center' },
  raiseBtnText:     { fontFamily: Fonts.semibold, fontSize: Size.md, color: C.green },
  limpBtn:          { flex: 1, paddingVertical: 18, borderRadius: Radius.lg, backgroundColor: '#0a1a12', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', alignItems: 'center' },
  limpBtnText:      { fontFamily: Fonts.semibold, fontSize: Size.md, color: '#10b981' },
  foldBtn:          { flex: 1, paddingVertical: 18, borderRadius: Radius.lg, backgroundColor: '#2a0a0a', borderWidth: 1, borderColor: 'rgba(224,69,69,0.3)', alignItems: 'center' },
  foldBtnText:      { fontFamily: Fonts.semibold, fontSize: Size.md, color: C.red },
  feedbackBox:      { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.base, borderWidth: 1, marginBottom: Space.base, gap: Space.xs },
  feedbackHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedbackLabel:    { fontFamily: Fonts.semibold, fontSize: Size.base },
  correctActionLine:{ fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary },
  explanation:      { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, lineHeight: Size.xs * 1.5 },
  remindBox:        { backgroundColor: 'rgba(232,160,48,0.08)', borderRadius: Radius.sm, padding: Space.xs, borderWidth: 1, borderColor: 'rgba(232,160,48,0.25)' },
  remindText:       { fontFamily: Fonts.regular, fontSize: Size.xxs, color: '#fcd34d', lineHeight: Size.xxs * 1.6 },
  nextBtn:          { paddingVertical: Space.base, borderRadius: Radius.lg, backgroundColor: Colors.bg2, alignItems: 'center', marginBottom: Space.md },
  nextBtnText:      { ...T.btnPrimary, color: Colors.textPrimary },
  quickRef:         { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Space.sm, marginBottom: Space.base, gap: Space.xxs + 2 },
  quickRefTitle:    { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textSecondary, marginBottom: Space.xxs },
  quickRefLine:     { fontFamily: Fonts.regular, fontSize: Size.xs, lineHeight: Size.xs * 1.5 },

  // Stamina pill (header)
  staminaPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  staminaText:      { fontFamily: Fonts.semibold, fontSize: Size.sm, fontVariant: ['tabular-nums'] },

  // Stamina modal
  modalOverlay:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xl },
  modalCard:          {
    width: '100%', backgroundColor: Colors.bg2, borderRadius: Radius.xl,
    padding: Space.xl, alignItems: 'center', gap: Space.sm,
    borderWidth: 1, borderColor: 'rgba(232,160,48,0.25)',
  },
  modalClose:         { position: 'absolute', top: Space.sm, right: Space.sm, padding: Space.xs },
  modalIconCircle:    {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(232,160,48,0.1)', borderWidth: 1, borderColor: 'rgba(232,160,48,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Space.xxs,
  },
  modalTitle:         { fontFamily: Fonts.semibold, fontSize: Size.lg, color: Colors.textPrimary, textAlign: 'center' },
  modalSubtitle:      { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: Size.sm * 1.55 },
  modalPerks:         { width: '100%', gap: Space.xs, marginVertical: Space.xxs },
  modalPerkRow:       { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  modalPerkText:      { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, flex: 1 },
  modalUpgradeBtn:    { width: '100%', paddingVertical: 16, borderRadius: Radius.lg, backgroundColor: C.amber, alignItems: 'center' },
  modalUpgradeBtnText:{ fontFamily: Fonts.semibold, fontSize: Size.base, color: '#000' },
  modalDivider:       { flexDirection: 'row', alignItems: 'center', width: '100%', gap: Space.xs },
  modalDividerLine:   { flex: 1, height: 1, backgroundColor: Colors.borderSubtle },
  modalDividerText:   { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary },
  modalCountdown:      { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, textAlign: 'center' },
  modalCountdownReady: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  adBtn:              { width: '100%', paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.borderMedium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  adBtnText:          { fontFamily: Fonts.semibold, fontSize: Size.base, color: Colors.textPrimary },
});
