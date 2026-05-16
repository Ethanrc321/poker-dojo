import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card.js';
import CardBack from '../components/CardBack.js';
import { POSTFLOP_SCENARIOS, getCbetRecommendation } from '../data/scenarios.js';
import { C, Colors, Fonts, Size, Space, Radius, T } from '../theme.js';

const TEXTURE_COLORS = {
  Dry:       { text: C.green,   bg: 'rgba(104,168,112,0.1)' },
  'Semi-Wet':{ text: C.amber,   bg: 'rgba(232,160,48,0.1)' },
  Wet:       { text: C.blue,    bg: 'rgba(85,119,224,0.1)' },
  Paired:    { text: C.purple,  bg: 'rgba(128,104,232,0.1)' },
  Monotone:  { text: C.red,     bg: 'rgba(224,69,69,0.1)' },
};

function makeOrder(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PostflopScreen({ recordResult }) {
  const insets = useSafeAreaInsets();
  const [order,        setOrder]        = useState(() => makeOrder(POSTFLOP_SCENARIOS.length));
  const [pos,          setPos]          = useState(0);
  const [userChoice,   setUserChoice]   = useState(null);
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 });

  const scenario = POSTFLOP_SCENARIOS[order[pos]];
  const rec = getCbetRecommendation(scenario.boardTexture, scenario.heroPosition === 'BTN' ? 'IP' : 'OOP');
  const textureStyle = TEXTURE_COLORS[scenario.boardTexture] || { text: '#888', bg: 'rgba(100,100,100,0.1)' };
  const spr = scenario.spr ?? (scenario.effectiveStackBB / scenario.potBB).toFixed(1);

  function handleChoice(val) {
    if (userChoice !== null) return;
    const isCorrect = val === scenario.correctOption;
    setUserChoice(val);
    setSessionStats(prev => ({ total: prev.total + 1, correct: prev.correct + (isCorrect ? 1 : 0) }));
    recordResult({ correct: isCorrect });
  }

  function next() {
    const nextPos = pos + 1;
    if (nextPos >= order.length) {
      setOrder(makeOrder(POSTFLOP_SCENARIOS.length));
      setPos(0);
    } else {
      setPos(nextPos);
    }
    setUserChoice(null);
  }

  const pct = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : null;
  const isCorrectAnswer = userChoice !== null && userChoice === scenario.correctOption;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Postflop Trainer</Text>
          <Text style={styles.subtitle}>Board texture · SPR · c-bet decisions</Text>
        </View>
        {pct !== null && (
          <Text style={[styles.pct, { color: pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red }]}>{pct}%</Text>
        )}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Scenario header */}
      <View style={styles.scenarioHeader}>
        <Text style={styles.scenarioIdx}>{pos + 1}/{POSTFLOP_SCENARIOS.length}</Text>
        <Text style={styles.scenarioTitle}>{scenario.title}</Text>
      </View>

      {/* Table visual */}
      <View style={styles.tableWrap}>
        {/* Players */}
        <View style={styles.playerRow}>
          <View style={styles.playerSide}>
            <Text style={styles.playerPos}>{scenario.villainPosition}</Text>
            <View style={styles.hiddenCards}>
              <CardBack size="sm" />
              <CardBack size="sm" />
            </View>
          </View>

          <View style={styles.potDisplay}>
            <Text style={styles.potLabel}>Pot</Text>
            <Text style={styles.potAmt}>{scenario.potBB}bb</Text>
          </View>

          <View style={[styles.playerSide, { alignItems: 'flex-end' }]}>
            <Text style={[styles.playerPos, { color: C.green }]}>YOU ({scenario.heroPosition})</Text>
            <View style={styles.heroCardsRow}>
              <Card card={scenario.heroHand} size="sm" />
              <Card card={scenario.heroHand2} size="sm" />
            </View>
          </View>
        </View>

        {/* Board */}
        <View style={styles.boardRow}>
          {scenario.board.map((c, i) => <Card key={i} card={c} size="smd" />)}
          {scenario.board.length < 5 && Array.from({ length: 5 - scenario.board.length }).map((_, i) => (
            <View key={`e${i}`} style={styles.emptyCard} />
          ))}
        </View>
        <Text style={styles.streetLabel}>{scenario.street}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={[styles.statVal, { color: C.amber }]}>{scenario.potBB}bb</Text>
          <Text style={styles.statKey}>Pot</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={[styles.statVal, { color: C.blue }]}>{spr}</Text>
          <Text style={styles.statKey}>SPR</Text>
        </View>
        <View style={styles.statCell}>
          <View style={[styles.textureBadge, { backgroundColor: textureStyle.bg }]}>
            <Text style={[styles.textureBadgeText, { color: textureStyle.text }]}>{scenario.boardTexture}</Text>
          </View>
          <Text style={styles.statKey}>Board</Text>
        </View>
      </View>

      {/* Question & options */}
      <View style={styles.questionBox}>
        <Text style={styles.question}>{scenario.question}</Text>
        <View style={styles.options}>
          {scenario.options.map(opt => {
            const isSel    = userChoice === opt.value;
            const isCorrect = opt.value === scenario.correctOption;
            let bg = '#1a1a1a', border = '#2a2a2a', textColor = '#ccc';
            if (userChoice !== null) {
              if (isCorrect)  { bg = 'rgba(0,128,0,0.2)';     border = '#166534'; textColor = '#86efac'; }
              else if (isSel) { bg = 'rgba(127,0,0,0.2)';     border = '#7f1d1d'; textColor = '#fca5a5'; }
              else            { bg = '#111'; border = '#111'; textColor = '#555'; }
            }
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleChoice(opt.value)}
                disabled={userChoice !== null}
                style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, { color: textColor }]}>
                  {userChoice !== null && isCorrect ? '✓ ' : ''}
                  {isSel && !isCorrect ? '✗ ' : ''}
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Feedback */}
      {userChoice !== null && (
        <View style={[styles.feedback, {
          borderColor: isCorrectAnswer ? '#166534' : '#92400e',
          backgroundColor: isCorrectAnswer ? 'rgba(0,128,0,0.1)' : 'rgba(180,83,9,0.1)',
        }]}>
          <Text style={[styles.feedbackTitle, { color: isCorrectAnswer ? C.green : C.amber }]}>
            {isCorrectAnswer ? '✓ Correct!' : 'Not Optimal'}
          </Text>
          <Text style={styles.feedbackText}>{scenario.explanation}</Text>
          <View style={styles.recBox}>
            <Text style={styles.recTitle}>Board Rec ({scenario.boardTexture}):</Text>
            <Text style={styles.recLine}><Text style={{ color: C.amber }}>Frequency: </Text>{rec.frequency}</Text>
            <Text style={styles.recLine}><Text style={{ color: C.amber }}>Sizing: </Text>{rec.sizing}</Text>
          </View>
          <Text style={styles.keyLesson}>Key lesson: {scenario.keyLesson}</Text>
        </View>
      )}

      {/* Next */}
      {userChoice !== null && (
        <TouchableOpacity onPress={next} style={styles.nextBtn} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Next Scenario →</Text>
        </TouchableOpacity>
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
  scenarioHeader:{ flexDirection: 'row', alignItems: 'center', gap: Space.xs, marginBottom: Space.sm },
  scenarioIdx:   { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary },
  scenarioTitle: { fontFamily: Fonts.semibold, fontSize: Size.sm, color: Colors.textSecondary, flex: 1 },
  tableWrap:     { backgroundColor: '#0d1f0d', borderRadius: Radius.xl, padding: Space.base, borderWidth: 2, borderColor: '#1a3a1a', marginBottom: Space.sm, alignItems: 'center' },
  playerRow:     { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: Space.sm },
  playerSide:    { alignItems: 'flex-start' },
  playerPos:     { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginBottom: Space.xxs },
  hiddenCards:   { flexDirection: 'row', gap: Space.xxs },
  potDisplay:    { alignItems: 'center' },
  potLabel:      { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary },
  potAmt:        { fontFamily: Fonts.semibold, fontSize: Size.sm, color: C.amber },
  heroCardsRow:  { flexDirection: 'row', gap: Space.xxs },
  boardRow:      { flexDirection: 'row', gap: 3, marginBottom: Space.xs },
  emptyCard:     { width: 62, height: 88, borderRadius: 11, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.borderMedium },
  streetLabel:   { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1 },
  statsRow:      { flexDirection: 'row', gap: Space.xs, marginBottom: Space.sm },
  statCell:      { flex: 1, backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Space.sm, alignItems: 'center' },
  statVal:       { fontFamily: Fonts.semibold, fontSize: Size.md },
  statKey:       { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginTop: 2 },
  textureBadge:  { paddingHorizontal: Space.xs, paddingVertical: 3, borderRadius: Radius.sm, marginBottom: 2 },
  textureBadgeText: { fontFamily: Fonts.semibold, fontSize: Size.xxs },
  questionBox:   { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.sm, marginBottom: Space.sm, borderWidth: 1, borderColor: Colors.borderSubtle },
  question:      { fontFamily: Fonts.medium, fontSize: Size.sm, color: Colors.textPrimary, marginBottom: Space.sm, lineHeight: Size.sm * 1.5 },
  options:       { gap: Space.xs },
  option:        { paddingHorizontal: Space.sm, paddingVertical: Space.sm, borderRadius: Radius.md, borderWidth: 1 },
  optionText:    { fontFamily: Fonts.regular, fontSize: Size.sm, lineHeight: Size.sm * 1.45 },
  feedback:         { borderRadius: Radius.lg, padding: Space.base, borderWidth: 1, marginBottom: Space.base, gap: Space.xs },
  feedbackTitle:    { fontFamily: Fonts.semibold, fontSize: Size.md },
  feedbackText:     { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, lineHeight: Size.xs * 1.55 },
  recBox:           { backgroundColor: Colors.bg3, borderRadius: Radius.sm, padding: Space.xs },
  recTitle:         { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: Colors.textTertiary, marginBottom: Space.xxs },
  recLine:          { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, lineHeight: Size.xs * 1.5 },
  keyLesson:        { fontFamily: Fonts.semibold, fontSize: Size.xs, color: C.green },
  nextBtn:          { paddingVertical: Space.base, borderRadius: Radius.lg, backgroundColor: Colors.bg2, alignItems: 'center', marginBottom: Space.base },
  nextBtnText:      { ...T.btnPrimary, color: Colors.textPrimary },
});
