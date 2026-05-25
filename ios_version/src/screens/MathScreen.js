import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, Colors, Fonts, Size, Space, Radius } from '../theme.js';

// ── Engine import — all math logic lives here, zero UI code ──────
import { generateQuestion, DRILL_TYPES as BASE_DRILL_TYPES, FORMULA_REFERENCE } from '../engine/mathEngine.js';
import { QUIZZES } from '../engine/gto-engine.js';

const DRILL_TYPES = [
  ...BASE_DRILL_TYPES,
  { id: 'bluff',    label: 'Bluff Freq' },
  { id: 'texture',  label: 'Texture' },
  { id: 'threebet', label: '3-Bet' },
];

// ── UI-only display maps (theme colours, badge labels) ───────────
// These belong in the screen because they reference theme tokens (C.green etc.)
// and have no meaning outside of a visual context.

const TYPE_COLORS = {
  potodds:         { text: C.green,    bg: 'rgba(104,168,112,0.1)' },
  mdf:             { text: C.blue,     bg: 'rgba(85,119,224,0.1)'  },
  alpha:           { text: C.red,      bg: 'rgba(224,69,69,0.1)'   },
  spr:             { text: C.amber,    bg: 'rgba(232,160,48,0.1)'  },
  ev:              { text: C.purple,   bg: 'rgba(128,104,232,0.1)' },
  bluff_frequency: { text: C.red,      bg: 'rgba(224,69,69,0.1)'   },
  board_texture:   { text: '#10b981',  bg: 'rgba(16,185,129,0.1)'  },
  three_bet:       { text: C.purple,   bg: 'rgba(128,104,232,0.1)' },
  spr_commitment:  { text: C.amber,    bg: 'rgba(232,160,48,0.1)'  },
  preflop_range:   { text: C.green,    bg: 'rgba(104,168,112,0.1)' },
  ev_calculation:  { text: C.purple,   bg: 'rgba(128,104,232,0.1)' },
  pot_odds:        { text: C.green,    bg: 'rgba(104,168,112,0.1)' },
};

const TYPE_LABELS = {
  potodds:         'Pot Odds',
  mdf:             'MDF',
  alpha:           'Alpha',
  spr:             'SPR',
  ev:              'EV Call',
  bluff_frequency: 'Bluff Freq',
  board_texture:   'Texture',
  three_bet:       '3-Bet',
  spr_commitment:  'SPR',
  preflop_range:   'Range',
  ev_calculation:  'EV Bet',
  pot_odds:        'Pot Odds',
};

function quizToQuestion(quiz) {
  return {
    type: quiz.type,
    question: quiz.question,
    formula: quiz.formula || '—',
    options: quiz.choices.map(c => ({ value: c, label: c })),
    correct: quiz.correctAnswer,
    explanation: quiz.explanation,
  };
}

function getQuestion(type) {
  switch (type) {
    case 'bluff':    return quizToQuestion(QUIZZES.generateBluffFreqQuiz());
    case 'texture':  return quizToQuestion(QUIZZES.generateBoardTextureQuiz());
    case 'threebet': return quizToQuestion(QUIZZES.generate3BetQuiz());
    case 'all':
      return Math.random() < 0.3
        ? quizToQuestion(QUIZZES.getRandomQuiz())
        : generateQuestion('all');
    default: return generateQuestion(type);
  }
}

// Maps the colorKey strings from FORMULA_REFERENCE → actual theme colour values.
const COLOR_MAP = {
  green:  C.green,
  blue:   C.blue,
  red:    C.red,
  amber:  C.amber,
  purple: C.purple,
};

export default function MathScreen({ recordResult }) {
  const insets = useSafeAreaInsets();
  const [drillType, setDrillType] = useState('all');
  const [question,  setQuestion]  = useState(null);
  const [chosen,    setChosen]    = useState(null);
  const [streak,    setStreak]    = useState(0);
  const [stats,     setStats]     = useState({ total: 0, correct: 0 });
  const [showRef,   setShowRef]   = useState(false);

  const nextQ = useCallback(() => {
    setQuestion(getQuestion(drillType));
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
          {FORMULA_REFERENCE.map(({ name, formula, colorKey }) => (
            <View key={name} style={styles.refCard}>
              <Text style={[styles.refName, { color: COLOR_MAP[colorKey] }]}>{name}</Text>
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
