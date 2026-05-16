import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, Colors, Fonts, Size, Space, Radius } from '../theme.js';

// ── Quiz data generators ──────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pot Odds = Call ÷ (Call + Total Pot) = betPct / (100 + 2*betPct), rounded
const PO_TABLE = [
  { betPct: 25,  ans: 17 },  // 25/150
  { betPct: 33,  ans: 20 },  // 33/166
  { betPct: 50,  ans: 25 },  // 50/200
  { betPct: 67,  ans: 29 },  // 67/234
  { betPct: 75,  ans: 30 },  // 75/250
  { betPct: 100, ans: 33 },  // 100/300
  { betPct: 125, ans: 36 },  // 125/350
  { betPct: 150, ans: 38 },  // 150/400
];

// MDF = Pot ÷ (Pot + Bet) = 100 / (100 + betPct), rounded
const MDF_TABLE = [
  { betPct: 25,  ans: 80 },  // 100/125
  { betPct: 33,  ans: 75 },  // 100/133
  { betPct: 50,  ans: 67 },  // 100/150
  { betPct: 67,  ans: 60 },  // 100/167
  { betPct: 75,  ans: 57 },  // 100/175
  { betPct: 100, ans: 50 },  // 100/200
  { betPct: 125, ans: 44 },  // 100/225
  { betPct: 150, ans: 40 },  // 100/250
];

// Alpha = Bet ÷ (Bet + Pot) = betPct / (100 + betPct) = 1 − MDF, rounded
const ALPHA_TABLE = [
  { betPct: 25,  ans: 20 },
  { betPct: 33,  ans: 25 },
  { betPct: 50,  ans: 33 },
  { betPct: 67,  ans: 40 },
  { betPct: 75,  ans: 43 },
  { betPct: 100, ans: 50 },
  { betPct: 125, ans: 56 },
  { betPct: 150, ans: 60 },
];

function pickDistractors(table, correctAns, minGap = 8) {
  const far = shuffle(table.filter(r => Math.abs(r.ans - correctAns) >= minGap));
  const result = far.slice(0, 3).map(r => r.ans);
  // Pad with fixed anchors if not enough spread options
  const fallbacks = [10, 17, 20, 25, 30, 33, 40, 43, 50, 57, 60, 67, 75, 80];
  for (const v of fallbacks) {
    if (result.length >= 3) break;
    if (v !== correctAns && Math.abs(v - correctAns) >= minGap && !result.includes(v)) result.push(v);
  }
  return result.slice(0, 3);
}

function potOddsQ() {
  const idx = Math.floor(Math.random() * PO_TABLE.length);
  const { betPct, ans: correct } = PO_TABLE[idx];
  const pot = [20, 30, 40, 50, 60, 80, 100][Math.floor(Math.random() * 7)];
  const betAmt = Math.round(pot * betPct / 100);
  const totalPot = pot + betAmt * 2;
  const distractors = pickDistractors(PO_TABLE, correct);
  const options = shuffle([correct, ...distractors]).map(v => ({ label: v + '%', value: v }));
  return {
    type: 'potodds',
    question: `Pot: $${pot}. Villain bets $${betAmt} (${betPct}% pot).\nWhat equity do you need to call?`,
    options,
    correct,
    explanation: `Pot Odds = Call ÷ (Call + Total Pot) = ${betAmt} ÷ ${totalPot} ≈ ${correct}%.\nYou need at least ${correct}% equity to break even.`,
    formula: 'Call ÷ (Call + Total Pot After Call)',
  };
}

function mdfQ() {
  const idx = Math.floor(Math.random() * MDF_TABLE.length);
  const { betPct, ans: correct } = MDF_TABLE[idx];
  const pot = [20, 30, 40, 50, 60, 80, 100][Math.floor(Math.random() * 7)];
  const betAmt = Math.round(pot * betPct / 100);
  const distractors = pickDistractors(MDF_TABLE, correct);
  const options = shuffle([correct, ...distractors]).map(v => ({ label: v + '%', value: v }));
  return {
    type: 'mdf',
    question: `Pot: $${pot}. Villain bets $${betAmt} (${betPct}% pot).\nHow often must you continue (MDF) to deny a profitable bluff?`,
    options,
    correct,
    explanation: `MDF = Pot ÷ (Pot + Bet) = ${pot} ÷ ${pot + betAmt} ≈ ${correct}%.\nFolding more than ${100 - correct}% makes every bluff profitable for villain.`,
    formula: 'Pot ÷ (Pot + Bet)',
  };
}

function alphaQ() {
  const idx = Math.floor(Math.random() * ALPHA_TABLE.length);
  const { betPct, ans: correct } = ALPHA_TABLE[idx];
  const pot = [20, 30, 40, 50, 60, 80, 100][Math.floor(Math.random() * 7)];
  const betAmt = Math.round(pot * betPct / 100);
  const distractors = pickDistractors(ALPHA_TABLE, correct);
  const options = shuffle([correct, ...distractors]).map(v => ({ label: v + '%', value: v }));
  return {
    type: 'alpha',
    question: `Pot: $${pot}. You bet $${betAmt} (${betPct}% pot) as a bluff.\nWhat fold frequency (Alpha) makes this bet immediately profitable?`,
    options,
    correct,
    explanation: `Alpha = Bet ÷ (Bet + Pot) = ${betAmt} ÷ ${betAmt + pot} ≈ ${correct}%.\nAlternatively: Alpha = 1 − MDF. If villain folds more than ${correct}%, the bluff is instantly profitable.`,
    formula: 'Bet ÷ (Bet + Pot)   ·   or: 1 − MDF',
  };
}

function sprQ() {
  const pots   = [10, 15, 20, 30, 40, 50];
  const stacks = [30, 50, 80, 100, 150, 200, 300];
  const pot   = pots[Math.floor(Math.random() * pots.length)];
  const stack = stacks[Math.floor(Math.random() * stacks.length)];
  const spr = Math.round((stack / pot) * 10) / 10;

  const thresholds = {
    'Committed (< 1)': spr < 1,
    'Low SPR 1–3': spr >= 1 && spr < 3,
    'Medium SPR 3–6': spr >= 3 && spr < 6,
    'High SPR 6–13': spr >= 6 && spr <= 13,
    'Very Deep (> 13)': spr > 13,
  };
  const correct = Object.keys(thresholds).find(k => thresholds[k]);
  const opts = shuffle(Object.keys(thresholds)).map(v => ({ label: v, value: v }));
  const sprNote = spr < 1
    ? 'You are committed — virtually any pair is a stack-off hand.'
    : spr < 3
    ? 'Low SPR: TPTK or better is comfortable to stack off.'
    : spr < 6
    ? 'Medium SPR: Two pair or better to stack off. Common cash game scenario.'
    : spr < 13
    ? 'High SPR: Sets and straights to stack off. Implied odds matter significantly.'
    : 'Very deep: Only nutted hands justify stacking off.';
  return {
    type: 'spr',
    question: `Effective stack: $${stack}. Pot on the flop: $${pot}. Calculate the SPR and classify it.`,
    options: opts,
    correct,
    spr,
    explanation: `SPR = Stack ÷ Pot = ${stack} ÷ ${pot} = ${spr}. Classification: ${correct}. ${sprNote}`,
    formula: 'Effective Stack ÷ Pot Size on Flop',
  };
}

function evQ() {
  const equities = [25, 30, 35, 40, 45, 50];
  const calls    = [20, 30, 40, 50, 60];
  const pots     = [80, 100, 120, 150, 200];
  const eq  = equities[Math.floor(Math.random() * equities.length)];
  const pot = pots[Math.floor(Math.random() * pots.length)];
  const call= calls[Math.floor(Math.random() * calls.length)];
  const totalPot = pot + call;
  const ev  = Math.round(((eq / 100) * totalPot - call) * 100) / 100;
  const isPositive = ev > 0;
  const correct = isPositive ? 'Call (positive EV)' : 'Fold (negative EV)';
  const opts = shuffle([
    { label: 'Call (positive EV)', value: 'Call (positive EV)' },
    { label: 'Fold (negative EV)', value: 'Fold (negative EV)' },
  ]);
  return {
    type: 'ev',
    question: `You have ${eq}% equity. Pot: $${pot}. Villain bets $${call}. You must call $${call}. EV = (${eq}% × $${totalPot}) − $${call}. Should you call or fold?`,
    options: opts,
    correct,
    ev,
    explanation: `EV = (Equity × Total Pot) − Call = (${eq/100} × $${totalPot}) − $${call} = $${Math.round(eq/100 * totalPot * 100)/100} − $${call} = $${ev}. This is a ${isPositive ? 'POSITIVE' : 'NEGATIVE'} EV call — you should ${isPositive ? 'CALL' : 'FOLD'}.`,
    formula: 'EV = (Equity × Total Pot) − Call Amount',
  };
}

const DRILL_TYPES = [
  { id: 'all',     label: 'All Drills' },
  { id: 'potodds', label: 'Pot Odds' },
  { id: 'mdf',     label: 'MDF' },
  { id: 'alpha',   label: 'Alpha' },
  { id: 'spr',     label: 'SPR' },
  { id: 'ev',      label: 'EV' },
];

const DRILL_GENERATORS = { potodds: potOddsQ, mdf: mdfQ, alpha: alphaQ, spr: sprQ, ev: evQ };

function generateQ(type) {
  if (type === 'all') {
    const gens = Object.values(DRILL_GENERATORS);
    return gens[Math.floor(Math.random() * gens.length)]();
  }
  return DRILL_GENERATORS[type]?.();
}

const TYPE_COLORS = {
  potodds: { text: C.green,   bg: 'rgba(104,168,112,0.1)' },
  mdf:     { text: C.blue,    bg: 'rgba(85,119,224,0.1)' },
  alpha:   { text: C.red,     bg: 'rgba(224,69,69,0.1)' },
  spr:     { text: C.amber,   bg: 'rgba(232,160,48,0.1)' },
  ev:      { text: C.purple,  bg: 'rgba(128,104,232,0.1)' },
};
const TYPE_LABELS = { potodds: 'Pot Odds', mdf: 'MDF', alpha: 'Alpha', spr: 'SPR', ev: 'EV Call' };

const FORMULAS = [
  ['Pot Odds', 'Call ÷ (Call + Pot After Call)', C.green],
  ['MDF', 'Pot ÷ (Pot + Bet)', C.blue],
  ['Alpha', 'Bet ÷ (Bet + Pot) = 1 − MDF', C.red],
  ['SPR', 'Effective Stack ÷ Flop Pot', C.amber],
  ['EV (Call)', '(Equity × Total Pot) − Call', C.purple],
  ['EV (Bluff)', '(Fold% × Pot) − (Call% × Bet)', C.purple],
];

export default function MathScreen({ recordResult }) {
  const insets = useSafeAreaInsets();
  const [drillType, setDrillType] = useState('all');
  const [question,  setQuestion]  = useState(null);
  const [chosen,    setChosen]    = useState(null);
  const [streak,    setStreak]    = useState(0);
  const [stats,     setStats]     = useState({ total: 0, correct: 0 });
  const [showRef,   setShowRef]   = useState(false);

  const nextQ = useCallback(() => {
    setQuestion(generateQ(drillType));
    setChosen(null);
  }, [drillType]);

  useEffect(() => { nextQ(); }, [drillType]);

  function handleAnswer(val) {
    if (chosen !== null) return;
    setChosen(val);
    const isCorrect = String(val) === String(question.correct);
    setStats(s => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
    setStreak(s => isCorrect ? s + 1 : 0);
    recordResult({ correct: isCorrect });
  }

  if (!question) return null;

  const isCorrect = chosen !== null && String(chosen) === String(question.correct);
  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;
  const typeStyle = TYPE_COLORS[question.type] || { text: '#888', bg: 'rgba(100,100,100,0.1)' };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Math Drills</Text>
          <Text style={styles.subtitle}>Pot odds · MDF · Alpha · SPR · EV</Text>
        </View>
        <View style={styles.headerRight}>
          {pct !== null && (
            <Text style={[styles.pct, { color: pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red }]}>{pct}%</Text>
          )}
          {streak >= 3 && <Text style={styles.streak}>{streak} streak</Text>}
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Drill type selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll} contentContainerStyle={styles.typeRow}>
        {DRILL_TYPES.map(dt => (
          <TouchableOpacity
            key={dt.id}
            onPress={() => setDrillType(dt.id)}
            style={[styles.typePill, drillType === dt.id && styles.typePillActive]}
          >
            <Text style={[styles.typePillText, drillType === dt.id && styles.typePillTextActive]}>{dt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {stats.total > 0 && (
        <Text style={styles.sessionCount}>{stats.total} answered this session</Text>
      )}

      {/* Question card */}
      <View style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeStyle.text }]}>
              {TYPE_LABELS[question.type]}
            </Text>
          </View>
        </View>

        <Text style={styles.questionText}>{question.question}</Text>
        <Text style={styles.formulaText}>
          <Text style={{ color: '#666' }}>Formula: </Text>
          <Text style={{ color: C.amber }}>{question.formula}</Text>
        </Text>

        <View style={styles.options}>
          {question.options.map((opt, i) => {
            const isSel = chosen !== null && String(opt.value) === String(chosen);
            const isRight = String(opt.value) === String(question.correct);
            let bg = '#1a1a1a', border = '#2a2a2a', textColor = '#ccc';
            if (chosen !== null) {
              if (isRight)  { bg = 'rgba(0,128,0,0.2)';  border = '#166534'; textColor = '#86efac'; }
              else if (isSel) { bg = 'rgba(127,0,0,0.2)'; border = '#7f1d1d'; textColor = '#fca5a5'; }
              else            { bg = '#111'; border = '#111'; textColor = '#555'; }
            }
            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleAnswer(opt.value)}
                disabled={chosen !== null}
                style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, { color: textColor }]}>
                  {chosen !== null && isRight ? '✓ ' : ''}
                  {isSel && !isRight ? '✗ ' : ''}
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Explanation */}
      {chosen !== null && (
        <View style={[styles.explanation, {
          borderColor: isCorrect ? '#166534' : '#7f1d1d',
          backgroundColor: isCorrect ? 'rgba(0,128,0,0.1)' : 'rgba(127,0,0,0.1)',
        }]}>
          <Text style={[styles.explanationTitle, { color: isCorrect ? C.green : C.red }]}>
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            {question.spr !== undefined ? `  SPR = ${question.spr}` : ''}
          </Text>
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      )}

      {chosen !== null && (
        <TouchableOpacity onPress={nextQ} style={styles.nextBtn} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Next Question →</Text>
        </TouchableOpacity>
      )}

      {/* Quick reference */}
      <TouchableOpacity onPress={() => setShowRef(v => !v)} style={styles.refToggle} activeOpacity={0.7}>
        <Text style={styles.refToggleText}>{showRef ? '▲' : '▼'} Quick Reference Formulas</Text>
      </TouchableOpacity>

      {showRef && (
        <View style={styles.refGrid}>
          {FORMULAS.map(([name, formula, color]) => (
            <View key={name} style={styles.refCard}>
              <Text style={[styles.refName, { color }]}>{name}</Text>
              <Text style={styles.refFormula}>{formula}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg1 },
  content:     { paddingHorizontal: Space.base },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Space.base, paddingTop: Space.lg, marginBottom: Space.base },
  title:       { ...T.screenTitle },
  subtitle:    { ...T.subtitle, marginTop: Space.xxs },
  headerRight: { alignItems: 'flex-end' },
  pct:         { fontFamily: Fonts.semibold, fontSize: Size.md, fontVariant: ['tabular-nums'] },
  streak:      { fontFamily: Fonts.regular, fontSize: Size.xs, color: C.amber, marginTop: Space.xxs },
  typeScroll:  { marginBottom: Space.base },
  typeRow:     { gap: Space.xs, paddingRight: Space.base },
  typePill:       { paddingHorizontal: Space.sm, paddingVertical: Space.xxs + 2, borderRadius: Radius.full, backgroundColor: Colors.bg2 },
  typePillActive: { backgroundColor: C.green },
  typePillText:       { fontFamily: Fonts.medium, fontSize: Size.xs, color: Colors.textSecondary },
  typePillTextActive: { color: Colors.bg1, fontFamily: Fonts.semibold },
  sessionCount:  { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginBottom: Space.sm, marginTop: Space.xxs },
  questionCard:  { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.base, marginBottom: Space.sm, borderWidth: 1, borderColor: Colors.borderSubtle },
  questionHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: Space.sm },
  typeBadge:     { paddingHorizontal: Space.sm, paddingVertical: Space.xxs + 1, borderRadius: Radius.xs },
  typeBadgeText: { fontFamily: Fonts.semibold, fontSize: Size.xxs },
  questionText:  { fontFamily: Fonts.medium, fontSize: Size.sm, color: Colors.textPrimary, lineHeight: Size.sm * 1.55, marginBottom: Space.xs },
  formulaText:   { fontFamily: Fonts.regular, fontSize: Size.xs, marginBottom: Space.base },
  options:       { gap: Space.xs },
  option:        { paddingHorizontal: Space.base, paddingVertical: Space.sm, borderRadius: Radius.md, borderWidth: 1 },
  optionText:    { fontFamily: Fonts.regular, fontSize: Size.sm },
  explanation:      { borderRadius: Radius.lg, padding: Space.base, borderWidth: 1, marginBottom: Space.sm, gap: Space.xs },
  explanationTitle: { fontFamily: Fonts.semibold, fontSize: Size.base },
  explanationText:  { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textSecondary, lineHeight: Size.sm * 1.5 },
  nextBtn:     { paddingVertical: Space.base, borderRadius: Radius.lg, backgroundColor: Colors.bg2, alignItems: 'center', marginBottom: Space.sm },
  nextBtnText: { ...T.btnPrimary, color: Colors.textPrimary },
  refToggle:     { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Space.base, alignItems: 'center', marginBottom: Space.xs },
  refToggleText: { fontFamily: Fonts.medium, fontSize: Size.sm, color: Colors.textSecondary },
  refGrid: { gap: Space.xs, marginBottom: Space.sm },
  refCard: { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Space.sm },
  refName:    { fontFamily: Fonts.semibold, fontSize: Size.xs, marginBottom: Space.xxs },
  refFormula: { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary },
});
