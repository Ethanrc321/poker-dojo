import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HAND_READING_QUIZZES } from '../data/scenarios.js';
import { C, T, Colors, Fonts, Size, Space, Radius } from '../theme.js';

const TIPS = [
  ['Start with preflop action', 'A UTG raiser has a ~17% range. A BTN 3-bettor after a CO open has a polarized range. Always begin by filtering based on preflop action.'],
  ['Narrow on each street', 'Every bet, check, or raise narrows the range. A check on the flop removes most premium made hands unless the player is trapping.'],
  ['Look for blockers', "If you hold an ace, villain is less likely to have AA/AK. If you hold the K♥, they can't have K♥ in a flush-chasing range."],
  ['Consider bet sizing', 'Large bets on the river are polarized (nuts or bluff). Small bets are often thin value or blocking bets. Sizing is a massive range tell.'],
  ['Merged vs. polarized', 'On early streets, ranges are more merged (many hands). On the river, ranges should be polarized (value or air). A medium-sized river bet from a balanced player is unusual.'],
];

export default function ReadingScreen({ recordResult }) {
  const insets = useSafeAreaInsets();
  const total = HAND_READING_QUIZZES.length;
  const [order,    setOrder]    = useState(() => { const a = Array.from({ length: total }, (_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; });
  const [pos,      setPos]      = useState(0);
  const [chosen,   setChosen]   = useState(null);
  const [stats,    setStats]    = useState({ total: 0, correct: 0 });
  const [showTips, setShowTips] = useState(false);

  const q = HAND_READING_QUIZZES[order[pos]];

  function handleAnswer(val) {
    if (chosen !== null) return;
    setChosen(val);
    const isCorrect = val === q.correct;
    setStats(s => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
    recordResult({ correct: isCorrect });
  }

  function next() {
    const nextPos = pos + 1;
    if (nextPos >= total) {
      const a = Array.from({ length: total }, (_, i) => i);
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      setOrder(a);
      setPos(0);
    } else {
      setPos(nextPos);
    }
    setChosen(null);
  }

  const isCorrect = chosen !== null && chosen === q.correct;
  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;
  const progress = ((pos + 1) / total) * 100;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Hand Reading Quiz</Text>
          <Text style={styles.subtitle}>Analyze betting sequences · Narrow villain's range</Text>
        </View>
        {pct !== null && (
          <Text style={[styles.pct, { color: pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red }]}>{pct}%</Text>
        )}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>{pos + 1} / {total}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Scenario card */}
      <View style={styles.scenarioCard}>
        <View style={styles.scenarioBg}>
          <Text style={styles.scenarioLabel}>SCENARIO</Text>
          <Text style={styles.scenarioText}>{q.scenario}</Text>
        </View>

        <Text style={styles.questionPrompt}>What is the most accurate assessment?</Text>

        <View style={styles.options}>
          {q.options.map(opt => {
            const isSel = chosen !== null && chosen === opt.value;
            const isRight = opt.value === q.correct;
            let bg = '#1a1a1a', border = '#2a2a2a', textColor = '#ccc';
            if (chosen !== null) {
              if (isRight)  { bg = 'rgba(0,128,0,0.2)';  border = '#166534'; textColor = '#86efac'; }
              else if (isSel) { bg = 'rgba(127,0,0,0.2)'; border = '#7f1d1d'; textColor = '#fca5a5'; }
              else            { bg = '#111'; border = '#111'; textColor = '#555'; }
            }
            return (
              <TouchableOpacity
                key={opt.value}
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
          borderColor: isCorrect ? '#166534' : '#92400e',
          backgroundColor: isCorrect ? 'rgba(0,128,0,0.1)' : 'rgba(180,83,9,0.1)',
        }]}>
          <Text style={[styles.explanationTitle, { color: isCorrect ? C.green : C.amber }]}>
            {isCorrect ? '✓ Correct!' : 'Not Quite'}
          </Text>
          <Text style={styles.explanationText}>{q.explanation}</Text>
        </View>
      )}

      {chosen !== null && (
        <TouchableOpacity onPress={next} style={styles.nextBtn} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Next Scenario →</Text>
        </TouchableOpacity>
      )}

      {/* Hand Reading Tips */}
      <TouchableOpacity onPress={() => setShowTips(v => !v)} style={styles.tipsToggle} activeOpacity={0.7}>
        <Text style={styles.tipsToggleText}>{showTips ? '▲' : '▼'} Hand Reading Fundamentals</Text>
      </TouchableOpacity>

      {showTips && (
        <View style={styles.tipsContent}>
          {TIPS.map(([title, text]) => (
            <View key={title} style={styles.tipCard}>
              <Text style={styles.tipTitle}>{title}</Text>
              <Text style={styles.tipText}>{text}</Text>
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
  container:     { flex: 1, backgroundColor: Colors.bg1 },
  content:       { paddingHorizontal: Space.base },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Space.base, paddingTop: Space.lg, marginBottom: Space.sm },
  title:         { ...T.screenTitle },
  subtitle:      { ...T.subtitle, marginTop: Space.xxs },
  pct:           { fontFamily: Fonts.semibold, fontSize: Size.md, fontVariant: ['tabular-nums'] },
  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: Space.sm, marginBottom: Space.sm },
  progressLabel: { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, width: 36 },
  progressTrack: { flex: 1, height: 4, backgroundColor: Colors.bg3, borderRadius: Radius.xs, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: C.green, borderRadius: Radius.xs },
  scenarioCard:  { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.base, marginBottom: Space.sm, borderWidth: 1, borderColor: Colors.borderSubtle },
  scenarioBg:    { backgroundColor: Colors.bg3, borderRadius: Radius.md, padding: Space.base, marginBottom: Space.base },
  scenarioLabel: { ...T.sectionLabel, marginBottom: Space.xs },
  scenarioText:  { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textPrimary, lineHeight: Size.sm * 1.55 },
  questionPrompt:{ fontFamily: Fonts.medium, fontSize: Size.sm, color: Colors.textPrimary, marginBottom: Space.sm },
  options:       { gap: Space.xs },
  option:        { paddingHorizontal: Space.base, paddingVertical: Space.sm, borderRadius: Radius.md, borderWidth: 1 },
  optionText:    { fontFamily: Fonts.regular, fontSize: Size.sm, lineHeight: Size.sm * 1.45 },
  explanation:      { borderRadius: Radius.lg, padding: Space.base, borderWidth: 1, marginBottom: Space.sm, gap: Space.xs },
  explanationTitle: { fontFamily: Fonts.semibold, fontSize: Size.md },
  explanationText:  { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textSecondary, lineHeight: Size.sm * 1.5 },
  nextBtn:     { paddingVertical: Space.base, borderRadius: Radius.lg, backgroundColor: Colors.bg2, alignItems: 'center', marginBottom: Space.sm },
  nextBtnText: { ...T.btnPrimary, color: Colors.textPrimary },
  tipsToggle:     { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Space.base, alignItems: 'center', marginBottom: Space.xs },
  tipsToggleText: { fontFamily: Fonts.medium, fontSize: Size.sm, color: Colors.textSecondary },
  tipsContent:    { gap: Space.xs, marginBottom: Space.xs },
  tipCard:  { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Space.base, gap: Space.xxs + 2 },
  tipTitle: { fontFamily: Fonts.semibold, fontSize: Size.xs, color: C.green },
  tipText:  { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, lineHeight: Size.xs * 1.6 },
});
