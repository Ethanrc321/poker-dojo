import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HandMatrix from '../components/HandMatrix.js';
import { POSITION_LABELS } from '../data/ranges.js';
import { POT_ODDS_TABLE, MDF_TABLE } from '../data/scenarios.js';
import { RFI_MAPS } from '../data/pokerRanges.js';
import { C, Colors, Fonts, Size, Space, Radius, T } from '../theme.js';

const VIEWS = [
  { id: 'rfi',  label: 'RFI'  },
  { id: 'math', label: 'Math' },
];

const RFI_POSITIONS = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
const RFI_POS_LABEL = { UTG1: 'UTG+1', UTG2: 'UTG+2', LJ: 'LJ' }; // display overrides for position pills

const RFI_STATS = {
  UTG:  { pct: '10.1%', note: 'UTG acts first with 7 players behind. Only the strongest hands: premium pairs (66+), strong aces, suited broadways. Every hand raised may face a 3-bet from 7 players.' },
  UTG1: { pct: '14.3%', note: 'UTG+1 has 6 players behind. Slightly wider than UTG — add suited aces down to A4s, K9s, Q9s, J9s, 87s, and AJo/KQo offsuit. Still a tight, linear range.' },
  UTG2: { pct: '15.7%', note: 'UTG+2 has 6 players behind. Adds 55, all suited aces (A2s–AKs), and 76s over UTG+1. Still no offsuit broadway additions beyond AJo/KQo. Pure raise or fold.' },
  LJ:   { pct: '18.3%', note: 'Lojack has 5 players behind. Adds 44, 65s, ATo, and KJo over UTG+2. Range stays linear — no mixing, no speculative hands yet.' },
  HJ:   { pct: '21.3%', note: 'Hijack has 4 players behind. Opens all pairs (22+), all suited aces, K8s+, and adds T8s, 97s, 54s, and QJo. Pure raise or fold — no mixing yet.' },
  CO:   { pct: '27.0%', note: 'CO has 3 players behind. Adds K7s, Q8s, J8s, 86s, 75s, 64s, 43s, and offsuit broadway combos (A9o, KTo, QTo, JTo) over HJ. Pure raise or fold.' },
  BTN:  { pct: '51.1%', note: 'BTN is the most profitable seat — last to act every postflop street. Open 51.1% — all pairs, all suited aces/kings/queens, J6s+, T6s+, 96s+, and wide offsuit coverage including all Ax, K4o+, Q8o+, J8o+, and suited connectors.' },
  SB:   { pct: '71.3%', note: 'SB plays a unique 4-action strategy: raise for value (10.7% — AA–88, top suited/offsuit aces & kings), raise as bluff (13.0% — low Jx/Tx suited, low offsuit Qx/Kx), limp (47.7% — wide speculative hands), or fold (28.7%). Always OOP vs BB postflop.' },
};

const SPR_ROWS = [
  ['< 1',  'Committed — all-in near-inevitable', 'Any top pair or better'],
  ['1–3',  'Low SPR — limited multi-street play', 'Top Pair Top Kicker (TPTK) or better'],
  ['3–6',  'Medium SPR — standard cash game postflop', 'Two pair or better to stack off'],
  ['6–13', 'High SPR — implied odds matter', 'Sets, straights, flushes to stack off'],
  ['> 13', 'Very deep — speculative hands thrive', 'Nutted hands only to stack off'],
];

const RIVER_RATIO_ROWS = [
  ['33% pot', '75%', '25%'],
  ['50% pot', '66.7%', '33.3%'],
  ['75% pot', '57.1%', '42.9%'],
  ['100% pot', '50%', '50%'],
];

function TableRow({ cells, colors, isHeader }) {
  return (
    <View style={[tableStyles.row, isHeader && tableStyles.headerRow]}>
      {cells.map((cell, i) => (
        <View key={i} style={tableStyles.cell}>
          <Text style={[tableStyles.cellText, isHeader && tableStyles.headerText, colors && { color: colors[i] }]}>
            {cell}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SimpleTable({ title, headers, rows, headerColors, rowColors, note }) {
  return (
    <View style={styles.tableWrap}>
      {title ? <Text style={styles.tableTitle}>{title}</Text> : null}
      <TableRow cells={headers} isHeader colors={headerColors} />
      {rows.map((row, i) => (
        <TableRow key={i} cells={row} colors={rowColors} />
      ))}
      {note ? <Text style={styles.tableNote}>{note}</Text> : null}
    </View>
  );
}

function NotePanel({ title, children }) {
  return (
    <View style={styles.notePanel}>
      {title ? <Text style={styles.notePanelTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export default function ChartsScreen() {
  const insets = useSafeAreaInsets();
  const [view,   setView]   = useState('rfi');
  const [rfiPos, setRfiPos] = useState('UTG');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Hand Range Charts</Text>
        <Text style={styles.subtitle}>PokerCoaching.com · 8-max · 100bb · ante</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.viewScroll} contentContainerStyle={styles.viewRow}>
        {VIEWS.map(v => (
          <TouchableOpacity
            key={v.id}
            onPress={() => setView(v.id)}
            style={[styles.viewPill, view === v.id && styles.viewPillActive]}
          >
            <Text style={[styles.viewPillText, view === v.id && styles.viewPillTextActive]}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── RFI Ranges ─────────────────────────────────────────── */}
        {view === 'rfi' && (
          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posRow}>
              {RFI_POSITIONS.map(p => (
                <TouchableOpacity key={p} onPress={() => setRfiPos(p)}
                  style={[styles.posPill, rfiPos === p && styles.posPillActive]}>
                  <Text style={[styles.posPillText, rfiPos === p && styles.posPillTextActive]}>{RFI_POS_LABEL[p] || p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.matrixPanel}>
              <HandMatrix
                freqMap={RFI_MAPS[rfiPos]}
                title={rfiPos === 'SB'
                  ? 'SB — Raise First In (4-action)'
                  : `${rfiPos} — ${POSITION_LABELS[rfiPos] || ''} — Raise First In`}
                subtitle={rfiPos === 'SB'
                  ? 'Red = Raise Value  ·  Blue = Raise Bluff  ·  Teal = Limp  ·  Dark = Fold'
                  : `Open raise to ${'UTG|UTG1|UTG2|LJ|HJ'.includes(rfiPos) ? '3bb' : '2.5bb'}.  Red = Raise  ·  Split = Mix (~50%)  ·  Dark = Fold`}
              />
            </View>

            <NotePanel title={`${rfiPos} — ${RFI_STATS[rfiPos]?.pct} of hands`}>
              <Text style={styles.notePanelText}>{RFI_STATS[rfiPos]?.note}</Text>
              {rfiPos === 'SB' && (
                <>
                  <View style={styles.statRow}>
                    <View style={[styles.statDot, { backgroundColor: '#b91c1c' }]} />
                    <Text style={styles.statLabel}>Raise for Value</Text>
                    <Text style={styles.statVal}>~8.9% · 118 combos</Text>
                  </View>
                  <View style={styles.statRow}>
                    <View style={[styles.statDot, { backgroundColor: '#1e40af' }]} />
                    <Text style={styles.statLabel}>Raise as Bluff</Text>
                    <Text style={styles.statVal}>~13.0% · 172 combos</Text>
                  </View>
                  <View style={styles.statRow}>
                    <View style={[styles.statDot, { backgroundColor: '#047857' }]} />
                    <Text style={styles.statLabel}>Limp</Text>
                    <Text style={styles.statVal}>~48.6% · 644 combos</Text>
                  </View>
                  <View style={styles.statRow}>
                    <View style={[styles.statDot, { backgroundColor: '#3a3a3a', borderWidth: 1, borderColor: '#555' }]} />
                    <Text style={styles.statLabel}>Fold</Text>
                    <Text style={styles.statVal}>~29.6% · 392 combos</Text>
                  </View>
                  <Text style={[styles.notePanelText, { marginTop: Space.xs }]}>
                    Use 3bb open size from SB (not 2.5bb) to deny BB a profitable price. AA/KK/AKo are sometimes limped and then limp/3-bet when BB raises.
                  </Text>
                </>
              )}
            </NotePanel>
          </View>
        )}

        {/* ── Math Tables ────────────────────────────────────────── */}
        {view === 'math' && (
          <View style={styles.section}>
            <SimpleTable
              title="Pot Odds (Equity Needed to Call)"
              headers={['Bet Size', 'Min Equity Needed']}
              rows={POT_ODDS_TABLE.map(r => [r.betPct + '% pot', r.oddsRequired + '%'])}
              headerColors={['#888', '#888']}
              rowColors={[C.amber, C.green]}
              note="Formula: Call ÷ (Call + Total Pot After Call)"
            />
            <SimpleTable
              title="Minimum Defense Frequency (MDF)"
              headers={['Bet Size', 'Must Defend']}
              rows={MDF_TABLE.map(r => [r.betPct + '% pot', r.mdf + '%'])}
              headerColors={['#888', '#888']}
              rowColors={[C.amber, C.blue]}
              note="Formula: Pot ÷ (Pot + Bet)"
            />
            <SimpleTable
              title="Alpha — Fold % Needed for Bluff to Profit"
              headers={['Bet Size', 'Fold% Needed']}
              rows={POT_ODDS_TABLE.map(r => [r.betPct + '% pot', (100 - r.oddsRequired).toFixed(1) + '%'])}
              headerColors={['#888', '#888']}
              rowColors={[C.amber, C.red]}
              note="Formula: Bet ÷ (Bet + Pot) · Alpha = 1 − MDF"
            />
            <View style={styles.tableWrap}>
              <Text style={styles.tableTitle}>Stack-to-Pot Ratio (SPR) Guide</Text>
              <TableRow cells={['SPR', 'Meaning', 'Stack-Off Threshold']} isHeader />
              {SPR_ROWS.map(([spr, meaning, threshold]) => (
                <View key={spr} style={tableStyles.row}>
                  <View style={tableStyles.cell}>
                    <Text style={[tableStyles.cellText, { color: C.amber, fontWeight: '700' }]}>{spr}</Text>
                  </View>
                  <View style={[tableStyles.cell, { flex: 2 }]}>
                    <Text style={[tableStyles.cellText, { color: '#ccc' }]}>{meaning}</Text>
                  </View>
                  <View style={[tableStyles.cell, { flex: 2 }]}>
                    <Text style={[tableStyles.cellText, { color: C.green }]}>{threshold}</Text>
                  </View>
                </View>
              ))}
              <Text style={styles.tableNote}>Formula: Effective Stack ÷ Flop Pot Size</Text>
            </View>
            <View style={styles.tableWrap}>
              <Text style={styles.tableTitle}>Value-to-Bluff Ratio (River)</Text>
              <TableRow cells={['River Bet Size', 'Value %', 'Bluff %']} isHeader />
              {RIVER_RATIO_ROWS.map(([bet, val, bluff]) => (
                <View key={bet} style={tableStyles.row}>
                  <View style={tableStyles.cell}>
                    <Text style={[tableStyles.cellText, { color: C.amber }]}>{bet}</Text>
                  </View>
                  <View style={tableStyles.cell}>
                    <Text style={[tableStyles.cellText, { color: C.green }]}>{val}</Text>
                  </View>
                  <View style={tableStyles.cell}>
                    <Text style={[tableStyles.cellText, { color: C.red }]}>{bluff}</Text>
                  </View>
                </View>
              ))}
              <Text style={styles.tableNote}>Your bluff % should equal the pot odds you are laying (opponent's call equity needed).</Text>
            </View>
            <View style={[styles.tableWrap, { marginBottom: 0 }]}>
              <Text style={styles.tableTitle}>4-Bet Sizing Reference</Text>
              <TableRow cells={['Position', '3-bet Size', '4-bet Size']} isHeader />
              {[
                ['In Position',     '3× open = ~7.5bb', '2.5× 3-bet = ~19bb'],
                ['Out of Position', '3.5× open = ~9bb', '2.75× 3-bet = ~25bb'],
              ].map(([pos, three, four]) => (
                <View key={pos} style={tableStyles.row}>
                  <View style={[tableStyles.cell, { flex: 1.2 }]}>
                    <Text style={[tableStyles.cellText, { color: '#ccc' }]}>{pos}</Text>
                  </View>
                  <View style={tableStyles.cell}>
                    <Text style={[tableStyles.cellText, { color: C.blue }]}>{three}</Text>
                  </View>
                  <View style={tableStyles.cell}>
                    <Text style={[tableStyles.cellText, { color: C.red }]}>{four}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const tableStyles = StyleSheet.create({
  row:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.bg3, paddingVertical: Space.xs },
  headerRow:  { borderBottomColor: Colors.borderMedium },
  cell:       { flex: 1, paddingHorizontal: Space.xxs },
  cellText:   { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary },
  headerText: { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: Colors.textTertiary },
});

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.bg1 },
  content:            { paddingHorizontal: Space.base },
  header:             { paddingHorizontal: Space.base, paddingTop: Space.lg, marginBottom: Space.sm },
  title:              { ...T.screenTitle },
  subtitle:           { ...T.subtitle, marginTop: Space.xxs },
  viewScroll:         { flexGrow: 0, flexShrink: 0, marginBottom: Space.sm },
  viewRow:            { gap: Space.xxs + 2, paddingHorizontal: Space.base },
  viewPill:           { paddingHorizontal: Space.xs, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.bg2, marginRight: Space.xxs },
  viewPillActive:     { backgroundColor: C.green },
  viewPillText:       { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: Colors.textTertiary },
  viewPillTextActive: { color: '#000' },
  section:            { gap: Space.sm },
  posRow:             { gap: Space.xs, paddingRight: Space.base, marginBottom: Space.xxs },
  posPill:            { paddingHorizontal: Space.sm, paddingVertical: 7, borderRadius: Radius.sm, backgroundColor: Colors.bg2, marginRight: 6 },
  posPillActive:      { backgroundColor: C.amber },
  posPillText:        { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textSecondary },
  posPillTextActive:  { color: '#fff' },
  matrixPanel:        { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.sm },
  notePanel:          { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.sm, gap: Space.xs },
  notePanelTitle:     { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textPrimary, marginBottom: Space.xxs },
  notePanelText:      { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, lineHeight: Size.xs * 1.45 },
  bulletText:         { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, lineHeight: Size.xs * 1.5 },
  statRow:            { flexDirection: 'row', alignItems: 'center', gap: Space.xs, paddingVertical: 2 },
  statDot:            { width: 10, height: 10, borderRadius: 5 },
  statLabel:          { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, flex: 1 },
  statVal:            { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textPrimary },
  tableWrap:          { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.sm, marginBottom: 0 },
  tableTitle:         { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textPrimary, marginBottom: Space.xs },
  tableNote:          { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginTop: Space.xs },
});
