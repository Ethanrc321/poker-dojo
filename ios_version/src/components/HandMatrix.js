import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { RANKS } from '../data/ranges.js';

const SCREEN_W = Dimensions.get('window').width;
const CELL = Math.floor((SCREEN_W - 73) / 14);

function gridToHand(row, col) {
  if (row === col) return RANKS[row] + RANKS[col];
  if (row < col)  return RANKS[row] + RANKS[col] + 's';
  return RANKS[col] + RANKS[row] + 'o';
}

// ── Legacy Set-based lookup (backward compat) ─────────────────────────────────
function getActionFromSets(hand, raiseSet, bluffSet, callSet, limpSet, mixSet) {
  if (raiseSet && raiseSet.has(hand)) return 'raise';
  if (bluffSet && bluffSet.has(hand)) return 'bluff';
  if (callSet  && callSet.has(hand))  return 'call';
  if (limpSet  && limpSet.has(hand))  return 'limp';
  if (mixSet   && mixSet.has(hand))   return 'mix';
  return 'fold';
}

export const ACTION_BG = {
  raise: '#b91c1c',  // red          — raise for value / 3-bet value / 4-bet value
  bluff: '#1e40af',  // blue         — raise as bluff / 3-bet bluff / 4-bet bluff
  call:  '#7c3aed',  // purple       — flat call / call 3-bet
  limp:  '#047857',  // teal         — SB limp
  mix:   '#d97706',  // yellow-orange — mix frequency (legacy Sets path)
  fold:  '#1c1c1e',  // dark         — fold
};

const ACTION_TEXT = {
  raise: '#fff', bluff: '#fff', call: '#fff',
  limp:  '#fff', mix:   '#fff', fold: '#3a3a3a',
};

const LEGEND_LABELS = {
  raise: 'Raise', bluff: 'Raise Bluff', call: 'Call',
  limp:  'Limp',  mix:   'Mix',         fold: 'Fold',
};

// ── Split cell renderer ───────────────────────────────────────────────────────
// Renders a cell split horizontally: left = primary action (at `freq`),
// right = secondary action (at 1-freq).  Label floats centered on top.
function SplitCell({ primary, secondary, freq, label }) {
  const leftW  = Math.round(CELL * freq);
  const rightW = CELL - leftW;
  const textColor = ACTION_TEXT[primary] || '#fff';
  return (
    <View style={[splitStyles.cell, { width: CELL, height: CELL }]}>
      <View style={{ width: leftW,  height: CELL, backgroundColor: ACTION_BG[primary]   || ACTION_BG.fold }} />
      <View style={{ width: rightW, height: CELL, backgroundColor: ACTION_BG[secondary] || ACTION_BG.fold }} />
      <Text style={[splitStyles.label, { color: textColor }]}>
        {label.length <= 3 ? label : label.slice(0, 2)}
      </Text>
    </View>
  );
}

const splitStyles = StyleSheet.create({
  cell: {
    flexDirection: 'row',
    borderRadius: 2,
    margin: 0.5,
    overflow: 'hidden',
    position: 'relative',
  },
  label: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 7,
    fontWeight: '700',
    lineHeight: CELL,
  },
});

// ── Stats builder (works for both paths) ─────────────────────────────────────
function buildStats(cells, freqMap) {
  if (freqMap) {
    const counts = { raise: 0, bluff: 0, call: 0, limp: 0, mix: 0, fold: 0 };
    for (const row of cells) {
      for (const cell of row) {
        const entry = freqMap[cell.hand];
        if (!entry || entry.primary === 'fold') continue;
        if (entry.freq < 1.0) counts.mix++;
        else counts[entry.primary] = (counts[entry.primary] || 0) + 1;
      }
    }
    return counts;
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────
/**
 * 13×13 hand range matrix.
 *
 * Two rendering modes:
 * 1. **freqMap** (preferred): pass a `Record<string, {primary, secondary, freq}>` from
 *    pokerRanges.js.  Cells with freq < 1.0 render as split left/right halves.
 * 2. **Sets** (legacy/fallback): pass raiseSet/bluffSet/callSet/limpSet/mixSet as before.
 *    mixSet cells render as solid yellow-orange.
 */
export default function HandMatrix({
  // Frequency-map mode
  freqMap,
  // Legacy Set mode
  raiseSet, bluffSet, callSet, limpSet, mixSet,
  // Shared
  title, subtitle,
}) {
  const useSets = !freqMap;

  const cells = useMemo(() => {
    const result = [];
    for (let row = 0; row < 13; row++) {
      const rowCells = [];
      for (let col = 0; col < 13; col++) {
        const hand = gridToHand(row, col);
        const label = row === col
          ? RANKS[row] + RANKS[row]
          : row < col
            ? RANKS[row] + RANKS[col] + 's'
            : RANKS[col] + RANKS[row] + 'o';

        if (useSets) {
          const action = getActionFromSets(hand, raiseSet, bluffSet, callSet, limpSet, mixSet);
          rowCells.push({ hand, action, label, split: false });
        } else {
          const entry = freqMap[hand] || { primary: 'fold', secondary: 'fold', freq: 1.0 };
          const split = entry.primary !== 'fold' && entry.freq < 1.0;
          rowCells.push({ hand, label, split, entry });
        }
      }
      result.push(rowCells);
    }
    return result;
  }, [freqMap, raiseSet, bluffSet, callSet, limpSet, mixSet]);

  // ── Legend visibility ──────────────────────────────────────────────────────
  const hasRaise = useSets ? (raiseSet?.size > 0) : cells.flat().some(c => !c.split && c.entry?.primary === 'raise');
  const hasBluff = useSets ? (bluffSet?.size > 0) : cells.flat().some(c => !c.split && c.entry?.primary === 'bluff');
  const hasCall  = useSets ? (callSet?.size  > 0) : cells.flat().some(c => !c.split && c.entry?.primary === 'call');
  const hasLimp  = useSets ? (limpSet?.size  > 0) : cells.flat().some(c => !c.split && c.entry?.primary === 'limp');
  const hasMix   = useSets ? (mixSet?.size   > 0) : cells.flat().some(c => c.split);

  // ── Stats line ─────────────────────────────────────────────────────────────
  const statsLine = useMemo(() => {
    if (useSets) {
      return [
        raiseSet?.size > 0 && `${raiseSet.size} raise`,
        bluffSet?.size > 0 && `${bluffSet.size} bluff`,
        callSet?.size  > 0 && `${callSet.size} call`,
        limpSet?.size  > 0 && `${limpSet.size} limp`,
        mixSet?.size   > 0 && `${mixSet.size} mix`,
      ].filter(Boolean).join(' · ');
    }
    // Count hands per action from freqMap
    const counts = {};
    for (const row of cells) {
      for (const c of row) {
        const p = c.entry?.primary;
        if (p && p !== 'fold') counts[p] = (counts[p] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(' · ');
  }, [cells, useSets, raiseSet, bluffSet, callSet, limpSet, mixSet]);

  return (
    <View>
      {title    && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {/* Legend */}
      <View style={styles.legend}>
        {hasRaise && <View style={[styles.legendItem, { backgroundColor: ACTION_BG.raise }]}><Text style={styles.legendText}>{LEGEND_LABELS.raise}</Text></View>}
        {hasBluff && <View style={[styles.legendItem, { backgroundColor: ACTION_BG.bluff }]}><Text style={styles.legendText}>{LEGEND_LABELS.bluff}</Text></View>}
        {hasCall  && <View style={[styles.legendItem, { backgroundColor: ACTION_BG.call  }]}><Text style={styles.legendText}>{LEGEND_LABELS.call}</Text></View>}
        {hasLimp  && <View style={[styles.legendItem, { backgroundColor: ACTION_BG.limp  }]}><Text style={styles.legendText}>{LEGEND_LABELS.limp}</Text></View>}
        {hasMix   && (
          <View style={styles.legendItem}>
            <View style={{ flexDirection: 'row', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ backgroundColor: ACTION_BG.raise, paddingHorizontal: 6, paddingVertical: 3 }}>
                <Text style={styles.legendText}>Mix</Text>
              </View>
              <View style={{ backgroundColor: ACTION_BG.fold, paddingHorizontal: 6, paddingVertical: 3 }}>
                <Text style={[styles.legendText, { color: '#555' }]}>~50%</Text>
              </View>
            </View>
          </View>
        )}
        <View style={[styles.legendItem, { backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#333' }]}>
          <Text style={[styles.legendText, { color: '#666' }]}>Fold</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Column headers */}
          <View style={styles.headerRow}>
            <View style={{ width: CELL, height: CELL }} />
            {RANKS.map(r => (
              <View key={r} style={[styles.headerCell, { width: CELL, height: CELL }]}>
                <Text style={styles.headerText}>{r}</Text>
              </View>
            ))}
          </View>

          {/* Rows */}
          {cells.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              <View style={[styles.headerCell, { width: CELL, height: CELL }]}>
                <Text style={styles.headerText}>{RANKS[rowIdx]}</Text>
              </View>
              {row.map((cell, colIdx) => {
                if (!useSets && cell.split) {
                  return (
                    <SplitCell
                      key={colIdx}
                      primary={cell.entry.primary}
                      secondary={cell.entry.secondary}
                      freq={cell.entry.freq}
                      label={cell.label}
                    />
                  );
                }
                const action = useSets ? cell.action : (cell.entry?.primary || 'fold');
                return (
                  <View
                    key={colIdx}
                    style={[styles.cell, {
                      width: CELL,
                      height: CELL,
                      backgroundColor: ACTION_BG[action] || ACTION_BG.fold,
                    }]}
                  >
                    <Text style={[styles.cellText, { color: ACTION_TEXT[action] || '#fff' }]}>
                      {cell.label.length <= 3 ? cell.label : cell.label.slice(0, 2)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {statsLine ? <Text style={styles.stats}>{statsLine}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title:    { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#888', fontSize: 11, marginBottom: 8 },
  legend:   { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  legendItem: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  legendText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  headerRow:  { flexDirection: 'row' },
  row:        { flexDirection: 'row' },
  headerCell: { alignItems: 'center', justifyContent: 'center' },
  headerText: { color: '#666', fontSize: 9, fontWeight: '600' },
  cell: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 2, margin: 0.5,
  },
  cellText: { fontSize: 7, fontWeight: '700' },
  stats:    { color: '#555', fontSize: 11, marginTop: 6 },
});
