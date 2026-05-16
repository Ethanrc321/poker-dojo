import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, Colors, Fonts, Size, Space, Radius } from '../theme.js';

const TERMS = [
  // Core math
  { term: 'Pot Odds', cat: 'Math', def: 'The minimum equity your hand needs to profitably call a bet. Formula: Call ÷ (Call + Total Pot After Call). Example: calling $50 into a $200 total pot = 25% pot odds needed.' },
  { term: 'MDF (Minimum Defense Frequency)', cat: 'Math', def: 'How often your range must continue (call or raise) to prevent the bettor from profitably bluffing any two cards. Formula: Pot ÷ (Pot + Bet). Facing a 50% pot bet = must defend 66.7% of your range.' },
  { term: 'Alpha', cat: 'Math', def: 'The fold percentage needed for a bluff to be immediately profitable. Alpha = 1 − MDF = Bet ÷ (Bet + Pot). If you need villain to fold 42.9%+ of the time for your bet to profit, alpha is 42.9%.' },
  { term: 'SPR (Stack-to-Pot Ratio)', cat: 'Math', def: 'Effective Stack ÷ Pot on the Flop. Determines how committed each player is. SPR <3 = TPTK stack-off territory. SPR 3–6 = two pair+ to stack off. SPR 6+ = sets and better.' },
  { term: 'EV (Expected Value)', cat: 'Math', def: 'The average amount you win or lose per decision over infinite repetitions. Positive EV = profitable long-term. EV of a call = (Equity × Total Pot) − Call Amount.' },
  { term: 'Equity', cat: 'Math', def: "The percentage of the pot you would win if the hand went to showdown right now with both players' holdings revealed. Not the same as winning probability — equity ignores fold equity." },
  { term: 'Realized Equity', cat: 'Math', def: 'The equity you actually capture in a hand, accounting for fold pressure, position, and playability. In position, you realize more equity than your raw percentage because you can fold turns with no equity.' },
  // Positions
  { term: 'UTG (Under the Gun)', cat: 'Position', def: 'First to act preflop in a 6-max game. Also called LJ (Lojack). Plays the tightest range (~17%) because 5 players act behind.' },
  { term: 'HJ (Hijack)', cat: 'Position', def: 'Second to act preflop in 6-max. Slightly wider than UTG (~21%) because one fewer player acts behind.' },
  { term: 'CO (Cutoff)', cat: 'Position', def: 'Third to act preflop. Two players to act behind (BTN and blinds). Open range ~27–28%.' },
  { term: 'BTN (Button)', cat: 'Position', def: 'Acts last postflop on every street. Most profitable seat. Only SB/BB respond to opens. Open range ~43–45%.' },
  { term: 'SB (Small Blind)', cat: 'Position', def: 'Posts 0.5bb. Acts first postflop (OOP vs everyone). Always OOP on all postflop streets. Should primarily 3-bet or fold vs raises.' },
  { term: 'BB (Big Blind)', cat: 'Position', def: 'Posts 1bb. Acts last preflop, first postflop OOP (except vs SB where BB has position). Has best pot odds of any seat — defends very wide.' },
  { term: 'IP (In Position)', cat: 'Position', def: 'Acting last on postflop streets. Massive advantage — you see what the other player does before acting. IP players can bet and control pot size more effectively.' },
  { term: 'OOP (Out of Position)', cat: 'Position', def: 'Acting first on postflop streets. Significant disadvantage — you must commit chips without knowing what the other player will do.' },
  // Preflop terms
  { term: 'RFI (Raise First In)', cat: 'Preflop', def: 'The first player to put in a raise preflop, facing no previous action. Standard sizing is 2.5bb from all positions; 3bb from SB.' },
  { term: '3-Bet', cat: 'Preflop', def: 'The third bet in a sequence (open = 1st, call or raise = 2nd, re-raise = 3rd). A 3-bet re-raises the open. Size: ~3× the open IP, ~4× the open OOP.' },
  { term: '4-Bet', cat: 'Preflop', def: 'The fourth bet — re-raising a 3-bet. Value 4-bets: AA, KK, QQ, AKs, AKo. Bluff 4-bets: A5s, A4s (blocker combos). Size: ~2.3–2.75× the 3-bet.' },
  { term: 'Squeeze', cat: 'Preflop', def: "A 3-bet made after a raise and one or more callers. The caller's cold-calling range is weak, making squeezes very profitable. Must use a larger size than a standard 3-bet." },
  // Postflop terms
  { term: 'C-Bet (Continuation Bet)', cat: 'Postflop', def: 'A bet made on the flop by the preflop aggressor. IP c-bets more frequently and with smaller sizing on dry boards, larger on wet boards. OOP c-bets much less frequently.' },
  { term: 'Donk Bet', cat: 'Postflop', def: 'A bet made by the OOP caller into the preflop aggressor on the flop, before they c-bet. Generally discouraged in GTO play but can be profitable on boards that heavily favor the BB range.' },
  { term: 'Float', cat: 'Postflop', def: 'Calling a flop bet with a weak or marginal hand intending to bluff on a later street. Effective when in position with fold equity on future streets.' },
  { term: 'Check-Raise', cat: 'Postflop', def: 'Check when first to act, then raise when the opponent bets. Used to build pots with strong hands and as semi-bluffs with combo draws. Standard size: ~3× the bet or ~60% of total pot.' },
  { term: 'Block Bet', cat: 'Postflop', def: 'A small bet (typically 25–33% pot) made OOP to control pot size and prevent a larger bet. Used with marginal hands that want to see a showdown cheaply.' },
  { term: 'Double Barrel', cat: 'Postflop', def: 'Betting both the flop and the turn. Correct to continue with strong made hands, draws that gained equity, and bluffs with good blockers. Give up on the turn with weak air.' },
  // Range concepts
  { term: 'Polarized Range', cat: 'Ranges', def: 'A betting range consisting of very strong hands (value) and weak hands (bluffs), with nothing in between. Common on the river and in 3-bet ranges. Best when you want to apply maximum pressure.' },
  { term: 'Merged Range', cat: 'Ranges', def: 'A betting range containing mostly strong hands and mediocre hands, few or no pure bluffs. Common for early street value bets or small sizing bets that include the whole range.' },
  { term: 'Linear Range', cat: 'Ranges', def: 'The strongest X% of hands. Used for preflop RFI ranges — just open the best hands in order from premium down to the cutoff point for each position.' },
  { term: 'Range Advantage', cat: 'Ranges', def: "When your overall range has more equity across all possible hands than your opponent's. Determines how OFTEN to bet — more range advantage = bet more frequently." },
  { term: 'Nut Advantage', cat: 'Ranges', def: 'When your range contains more of the very best hands (nuts and near-nuts). Determines bet SIZING — more nut hands allows larger bet sizes because your range is harder to attack.' },
  { term: 'Blocker', cat: 'Ranges', def: 'A card in your hand that reduces combinations in your opponent\'s strong range. Example: holding A♣ on a board where you want to bluff — it makes it less likely villain has AA or other strong A-high hands.' },
  // Hand types
  { term: 'TPTK', cat: 'Hand Strength', def: 'Top Pair Top Kicker. The highest pair possible on the board with the best kicker (e.g., AK on an A-7-3 board = TPTK). Generally a stack-off hand at SPR ≤ 3.' },
  { term: 'Set', cat: 'Hand Strength', def: 'A pocket pair that matches one of the board cards. Example: 77 on K72 = set of 7s. Sets are very concealed and powerful. Stack off at any SPR.' },
  { term: 'Trips', cat: 'Hand Strength', def: 'Three of a kind where the board is paired and you hold one matching card. Example: holding K♣ on KK8 board = trips. Less valuable than sets because less disguised and more players can have it.' },
  { term: 'Combo Draw', cat: 'Hand Strength', def: 'A hand that has multiple draws simultaneously — e.g., flush draw + open-ended straight draw. Typically 13–15 outs, giving ~50%+ equity on the flop. Play aggressively with combo draws.' },
  { term: 'Backdoor Draw', cat: 'Hand Strength', def: "A draw that requires both the turn AND river to complete. Example: backdoor flush draw (need two running suited cards). Worth ~2–3% equity. Factor into borderline decisions but don't overvalue." },
  // Strategy concepts
  { term: 'GTO (Game Theory Optimal)', cat: 'Strategy', def: 'A balanced, unexploitable strategy that makes your opponent indifferent between their options. GTO is the baseline — use it vs unknown opponents, then deviate exploitatively vs known leaks.' },
  { term: 'TAG (Tight-Aggressive)', cat: 'Strategy', def: 'Playing a tight range of hands preflop (folding trash), then playing those hands aggressively with bets and raises. The most profitable long-term style for most poker games.' },
  { term: 'LAG (Loose-Aggressive)', cat: 'Strategy', def: 'Playing a wider range of hands preflop combined with aggressive postflop play. Profitable for expert players who can navigate complex spots, but leads to large variance and mistakes for most players.' },
  { term: 'Nit', cat: 'Strategy', def: 'An extremely tight, passive player. Folds too much preflop and postflop. Easily exploited by frequent stealing and bluffing — they will fold to any aggression.' },
  { term: 'SRP (Single Raised Pot)', cat: 'Strategy', def: 'A pot where there was one raise and one or more callers, but no 3-bet. Most common pot type in cash games. Standard postflop play applies.' },
  { term: '3BP (3-Bet Pot)', cat: 'Strategy', def: 'A pot involving a 3-bet and a call. Typically ~30bb pot by the flop. SPR is lower, so commitment decisions arrive sooner. Value hands are played more aggressively.' },
  { term: 'Value Betting', cat: 'Strategy', def: "Betting with a strong hand hoping to be called by a weaker hand. TAG principle: bet for value aggressively across all streets — don't slowplay made hands when the board is dynamic." },
  { term: 'Protection Betting', cat: 'Strategy', def: "Betting to deny equity to opponent's drawing hands. Example: betting a top pair on a flush draw board to prevent free cards that would outdraw you. Often pairs with value betting." },
];

const CATEGORIES = ['All', ...new Set(TERMS.map(t => t.cat))];

const CAT_COLORS = {
  Math:           { text: C.green,   bg: 'rgba(104,168,112,0.1)' },
  Position:       { text: C.blue,    bg: 'rgba(85,119,224,0.1)' },
  Preflop:        { text: C.amber,   bg: 'rgba(232,160,48,0.1)' },
  Postflop:       { text: C.purple,  bg: 'rgba(128,104,232,0.1)' },
  Ranges:         { text: C.red,     bg: 'rgba(224,69,69,0.1)' },
  'Hand Strength':{ text: '#22d3ee', bg: 'rgba(34,211,238,0.1)' },
  Strategy:       { text: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
};

function TermCard({ item, isExpanded, onPress }) {
  const catStyle = CAT_COLORS[item.cat] || { text: '#888', bg: 'rgba(100,100,100,0.1)' };
  return (
    <TouchableOpacity onPress={onPress} style={styles.termCard} activeOpacity={0.75}>
      <View style={styles.termHeader}>
        <View style={styles.termHeaderLeft}>
          <Text style={styles.termText}>{item.term}</Text>
          <View style={[styles.catBadge, { backgroundColor: catStyle.bg }]}>
            <Text style={[styles.catBadgeText, { color: catStyle.text }]}>{item.cat}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
      </View>
      {isExpanded && (
        <Text style={styles.defText}>{item.def}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function GlossaryScreen() {
  const insets = useSafeAreaInsets();
  const [query,    setQuery]    = useState('');
  const [cat,      setCat]      = useState('All');
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    return TERMS.filter(t => {
      const matchCat = cat === 'All' || t.cat === cat;
      const q = query.toLowerCase();
      const matchQ = !q || t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [query, cat]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Poker Glossary</Text>
        <Text style={styles.subtitle}>{TERMS.length} terms — GTO, math, positions, and strategy</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search terms..."
          placeholderTextColor="#555"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setCat(c)}
            style={[styles.catPill, cat === c && styles.catPillActive]}
          >
            <Text style={[styles.catPillText, cat === c && styles.catPillTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Terms list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.term}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.emptyText}>No terms found for "{query}"</Text>
        }
        ListFooterComponent={
          filtered.length > 0
            ? <Text style={styles.footerText}>{filtered.length} of {TERMS.length} terms shown</Text>
            : null
        }
        renderItem={({ item }) => (
          <TermCard
            item={item}
            isExpanded={expanded === item.term}
            onPress={() => setExpanded(expanded === item.term ? null : item.term)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg1 },
  header:    { paddingHorizontal: Space.base, paddingTop: Space.lg, marginBottom: Space.sm },
  title:     { ...T.screenTitle },
  subtitle:  { ...T.subtitle, marginTop: Space.xxs },
  searchWrap: { paddingHorizontal: Space.base, marginBottom: Space.xs },
  searchInput: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    paddingHorizontal: Space.base,
    paddingVertical: Space.sm,
    fontFamily: Fonts.regular,
    fontSize: Size.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  catScroll: { flexGrow: 0, flexShrink: 0, marginBottom: Space.sm },
  catRow:    { paddingHorizontal: Space.base, paddingVertical: Space.xxs, gap: Space.xs, alignItems: 'center' },
  catPill:       { paddingHorizontal: Space.sm, paddingVertical: Space.xxs + 2, borderRadius: Radius.full, backgroundColor: Colors.bg2 },
  catPillActive: { backgroundColor: C.green },
  catPillText:       { fontFamily: Fonts.medium, fontSize: Size.xs, color: Colors.textSecondary },
  catPillTextActive: { color: Colors.bg1, fontFamily: Fonts.semibold },
  listContent: { paddingHorizontal: Space.base, paddingBottom: Space.md },
  termCard: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Space.base,
    marginBottom: Space.xs,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  termHeader:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  termHeaderLeft: { flex: 1, gap: Space.xxs + 2 },
  termText:       { fontFamily: Fonts.medium, fontSize: Size.sm, color: Colors.textPrimary },
  catBadge:       { alignSelf: 'flex-start', paddingHorizontal: Space.xs, paddingVertical: Space.xxs, borderRadius: Radius.xs },
  catBadgeText:   { fontFamily: Fonts.semibold, fontSize: Size.xxs },
  chevron:        { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, marginLeft: Space.xs, marginTop: Space.xxs },
  defText:        { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, lineHeight: Size.xs * 1.6, marginTop: Space.sm, paddingTop: Space.sm, borderTopWidth: 1, borderTopColor: Colors.separator },
  emptyText:      { fontFamily: Fonts.regular, textAlign: 'center', color: Colors.textSecondary, fontSize: Size.sm, paddingVertical: Space.xl },
  footerText:     { fontFamily: Fonts.regular, textAlign: 'center', fontSize: Size.xxs, color: Colors.textTertiary, paddingVertical: Space.base },
});
