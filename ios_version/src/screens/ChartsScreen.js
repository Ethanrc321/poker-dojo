import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HandMatrix from '../components/HandMatrix.js';
import { POSITION_LABELS, RFI_VS_3BET } from '../data/ranges.js';
import { POT_ODDS_TABLE, MDF_TABLE } from '../data/scenarios.js';
import { FACING_OPEN_RANGES, HERO_POSITIONS_FOR } from '../data/preflopActions.js';
import {
  RFI_MAPS, getFacingRFIMap, getVs3BetMap, validateScenario,
} from '../data/pokerRanges.js';
import { C, Colors, Fonts, Size, Space, Radius, T } from '../theme.js';

const VIEWS = [
  { id: 'rfi',    label: 'RFI'        },
  { id: 'facing', label: 'Facing RFI' },
  { id: 'vs3bet', label: 'vs 3-Bet'   },
  { id: 'math',   label: 'Math'       },
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

const FACING_VILLAIN_POSITIONS = ['UTG','HJ','CO','BTN','SB'];

const VS3BET_OPEN_POSITIONS = ['UTG','HJ','CO','BTN','SB'];

const VS3BET_VILLAIN_FOR = {
  UTG: ['HJ','CO','BTN','SB','BB'],
  HJ:  ['CO','BTN','SB','BB'],
  CO:  ['BTN','SB','BB'],
  BTN: ['SB','BB'],
  SB:  ['BB'],
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
  const [view,       setView]       = useState('rfi');
  const [rfiPos,     setRfiPos]     = useState('BTN');
  const [fcVillain,  setFcVillain]  = useState('BTN');
  const [fcHero,     setFcHero]     = useState('BB');
  const [v3OpenPos,  setV3OpenPos]  = useState('BTN');
  const [v3VillPos,  setV3VillPos]  = useState('BB');

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

        {/* ── Facing RFI ─────────────────────────────────────────── */}
        {view === 'facing' && (() => {
          const heroOptions  = HERO_POSITIONS_FOR[fcVillain] || [];
          const validHero    = heroOptions.includes(fcHero) ? fcHero : heroOptions[0];
          const facingFreqMap = getFacingRFIMap(fcVillain, validHero);
          const ranges       = FACING_OPEN_RANGES[fcVillain]?.[validHero] || { threebet: new Set(), call: new Set() };
          const noCall       = ranges.call.size === 0;
          return (
            <View style={styles.section}>
              <Text style={styles.fcSubLabel}>Villain opens from:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posRow}>
                {FACING_VILLAIN_POSITIONS.map(p => (
                  <TouchableOpacity key={p} onPress={() => { setFcVillain(p); setFcHero(HERO_POSITIONS_FOR[p]?.[0] || 'BB'); }}
                    style={[styles.posPill, fcVillain === p && styles.posPillRed]}>
                    <Text style={[styles.posPillText, fcVillain === p && styles.posPillTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.fcSubLabel}>Your position:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posRow}>
                {heroOptions.map(p => (
                  <TouchableOpacity key={p} onPress={() => setFcHero(p)}
                    style={[styles.posPill, validHero === p && styles.posPillActive]}>
                    <Text style={[styles.posPillText, validHero === p && styles.posPillTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {noCall && (validHero === 'SB') && (
                <View style={styles.alertBanner}>
                  <Text style={styles.alertText}>⚠ SB vs {fcVillain}: 3-bet or fold — no flat calls (chart shows 0% call rate)</Text>
                </View>
              )}

              <View style={styles.matrixPanel}>
                <HandMatrix
                  freqMap={facingFreqMap || undefined}
                  raiseSet={facingFreqMap ? undefined : ranges.threebet}
                  callSet={facingFreqMap ? undefined : (ranges.call.size > 0 ? ranges.call : undefined)}
                  title={`${validHero} vs ${fcVillain} open`}
                  subtitle="Blue = 3-bet  ·  Purple = Flat call  ·  Dark = Fold"
                />
              </View>

              <NotePanel title={`${validHero} vs ${fcVillain} open`}>
                {validHero === 'SB' && ['CO','BTN'].includes(fcVillain) ? (
                  <>
                    <Text style={styles.notePanelText}>SB vs {fcVillain} is a pure 3-bet-or-fold spot. The positional disadvantage is too severe to flat-call — you'll play the entire hand OOP vs an aggressive opening range.</Text>
                    <Text style={styles.bulletText}>• 3-bet value: AA, KK, QQ, JJ+, AKs/o, AQs, TT (vs BTN)</Text>
                    <Text style={styles.bulletText}>• 3-bet bluff: A5s–A2s (blockers), suited connectors, KQs</Text>
                    <Text style={styles.bulletText}>• Fold: everything else — even JTs, 99, AJo</Text>
                  </>
                ) : validHero === 'BB' ? (
                  <>
                    <Text style={styles.notePanelText}>BB is already invested 1bb, closing the action, and gets the best price in poker. Defend a wide range — the tighter the opener, the tighter you defend.</Text>
                    <Text style={styles.bulletText}>• vs UTG: defend ~28% — respect the tight range</Text>
                    <Text style={styles.bulletText}>• vs BTN: defend ~72% — BTN opens 51%, call very wide</Text>
                    <Text style={styles.bulletText}>• vs SB: defend ~78% — you have position advantage postflop</Text>
                    <Text style={styles.bulletText}>• 3-bet value: AA–JJ, AKs/o always. Add TT/AQs vs BTN/SB</Text>
                    <Text style={styles.bulletText}>• 3-bet bluff: A5s–A2s (ace blockers + equity)</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.notePanelText}>From {validHero} vs {fcVillain}'s open, you have position postflop. Flat-calling is profitable with hands that flop well and have implied odds. 3-bet the top of your range.</Text>
                    <Text style={styles.bulletText}>• 3-bet value: AA–QQ, AKs/o, AQs. Add JJ/AJs vs looser openers</Text>
                    <Text style={styles.bulletText}>• 3-bet bluff: A5s–A3s (blockers). Add suited connectors vs BTN/CO</Text>
                    <Text style={styles.bulletText}>• Flat call: medium pairs (set-mining), suited broadways, strong connectors</Text>
                    <Text style={styles.bulletText}>• Fold: marginal offsuit hands, weak low cards</Text>
                  </>
                )}
              </NotePanel>
            </View>
          );
        })()}

        {/* ── RFI vs 3-Bet ───────────────────────────────────────── */}
        {view === 'vs3bet' && (() => {
          const villOptions = VS3BET_VILLAIN_FOR[v3OpenPos] || ['BB'];
          const validVill   = villOptions.includes(v3VillPos) ? v3VillPos : villOptions[0];

          // Pick the right range sub-key
          let rangeKey = 'vs_late';
          if (v3OpenPos === 'UTG') {
            rangeKey = ['HJ','CO'].includes(validVill) ? 'vs_tight' : 'vs_late';
          } else if (v3OpenPos === 'HJ') {
            rangeKey = ['UTG'].includes(validVill) ? 'vs_tight' : 'vs_late';
          } else if (v3OpenPos === 'CO') {
            rangeKey = validVill === 'BB' ? 'vs_BB' : 'vs_BTN_SB';
          } else if (v3OpenPos === 'BTN') {
            rangeKey = 'vs_SB_BB';
          } else if (v3OpenPos === 'SB') {
            rangeKey = 'vs_BB';
          }

          const vsRange     = RFI_VS_3BET[v3OpenPos]?.[rangeKey] || { fourBetValue: new Set(), fourBetBluff: new Set(), call: new Set() };
          const vs3BetFreqMap = getVs3BetMap(v3OpenPos, validVill);

          return (
            <View style={styles.section}>
              <Text style={styles.fcSubLabel}>You opened from:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posRow}>
                {VS3BET_OPEN_POSITIONS.map(p => (
                  <TouchableOpacity key={p} onPress={() => { setV3OpenPos(p); setV3VillPos(VS3BET_VILLAIN_FOR[p]?.[0] || 'BB'); }}
                    style={[styles.posPill, v3OpenPos === p && styles.posPillActive]}>
                    <Text style={[styles.posPillText, v3OpenPos === p && styles.posPillTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.fcSubLabel}>3-bet from:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posRow}>
                {villOptions.map(p => (
                  <TouchableOpacity key={p} onPress={() => setV3VillPos(p)}
                    style={[styles.posPill, validVill === p && styles.posPillBlue]}>
                    <Text style={[styles.posPillText, validVill === p && styles.posPillTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.matrixPanel}>
                <HandMatrix
                  freqMap={vs3BetFreqMap || undefined}
                  raiseSet={vs3BetFreqMap ? undefined : vsRange.fourBetValue}
                  bluffSet={vs3BetFreqMap ? undefined : vsRange.fourBetBluff}
                  callSet={vs3BetFreqMap  ? undefined : vsRange.call}
                  title={`${v3OpenPos} opens — ${validVill} 3-bets`}
                  subtitle="Red = 4-bet Value  ·  Blue = 4-bet Bluff  ·  Purple = Call  ·  Dark = Fold"
                />
              </View>

              <NotePanel title={`${v3OpenPos} vs ${validVill} 3-bet`}>
                <Text style={styles.notePanelText}>
                  When you open from {v3OpenPos} and face a 3-bet from {validVill}, the chart recommends a polar 4-bet/call/fold strategy.
                </Text>
                <View style={styles.statRow}>
                  <View style={[styles.statDot, { backgroundColor: '#b91c1c' }]} />
                  <Text style={styles.statLabel}>4-bet for Value</Text>
                  <Text style={styles.statVal}>{vsRange.fourBetValue.size} combos</Text>
                </View>
                <View style={styles.statRow}>
                  <View style={[styles.statDot, { backgroundColor: '#1e40af' }]} />
                  <Text style={styles.statLabel}>4-bet as Bluff</Text>
                  <Text style={styles.statVal}>{vsRange.fourBetBluff.size} combos</Text>
                </View>
                <View style={styles.statRow}>
                  <View style={[styles.statDot, { backgroundColor: '#7c3aed' }]} />
                  <Text style={styles.statLabel}>Call 3-bet</Text>
                  <Text style={styles.statVal}>{vsRange.call.size} combos</Text>
                </View>
                <Text style={[styles.bulletText, { marginTop: Space.xs }]}>• 4-bet Value: AA, KK + AKs/AKo (sometimes QQ depending on position)</Text>
                <Text style={styles.bulletText}>• 4-bet Bluff: A5s/A4s (ace blocker + equity). Sizing: 2.5× the 3-bet</Text>
                <Text style={styles.bulletText}>• Call: QQ–99, AQs, KQs — hands that play well in 3-bet pots IP</Text>
                <Text style={styles.bulletText}>• Fold: hands outside all three categories</Text>
                {v3OpenPos === 'SB' && (
                  <Text style={[styles.bulletText, { color: C.amber, marginTop: Space.xxs }]}>
                    Note: From SB, AA/KK/AKo may have been limped and are used as limp/3-bet value, not in the standard 4-bet range.
                  </Text>
                )}
              </NotePanel>
            </View>
          );
        })()}

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
                ['In Position',  '3× open = ~7.5bb', '2.5× 3-bet = ~19bb'],
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
  posPillRed:         { backgroundColor: '#991b1b' },
  posPillBlue:        { backgroundColor: C.blue },
  posPillText:        { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textSecondary },
  posPillTextActive:  { color: '#fff' },
  matrixPanel:        { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.sm },
  notePanel:          { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.sm, gap: Space.xs },
  notePanelTitle:     { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textPrimary, marginBottom: Space.xxs },
  notePanelText:      { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, lineHeight: Size.xs * 1.45 },
  bulletText:         { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textTertiary, lineHeight: Size.xs * 1.5 },
  fcSubLabel:         { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: Colors.textTertiary, marginBottom: 4 },
  alertBanner:        { backgroundColor: 'rgba(180,83,9,0.12)', borderRadius: Radius.sm, borderWidth: 1, borderColor: 'rgba(180,83,9,0.35)', padding: Space.xs },
  alertText:          { fontFamily: Fonts.semibold, fontSize: Size.xs, color: C.amber },
  statRow:            { flexDirection: 'row', alignItems: 'center', gap: Space.xs, paddingVertical: 2 },
  statDot:            { width: 10, height: 10, borderRadius: 5 },
  statLabel:          { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, flex: 1 },
  statVal:            { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textPrimary },
  tableWrap:          { backgroundColor: Colors.bg2, borderRadius: Radius.lg, padding: Space.sm, marginBottom: 0 },
  tableTitle:         { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textPrimary, marginBottom: Space.xs },
  tableNote:          { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginTop: Space.xs },
});
