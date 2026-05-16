import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, Dimensions, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import Card from '../components/Card.js';
import CardBack from '../components/CardBack.js';
import { createDeck, getBestHand, RANK_VAL } from '../utils/handEval.js';
import { BOT_PROFILES, getBotPreflopAction, getBotPostflopAction, analyzeAction, MODULE_NAMES } from '../utils/gameCoach.js';
import { C, Colors, Fonts, Size, Space, Radius, T, POS_COLOR } from '../theme.js';

const POSITIONS    = ['UTG','HJ','CO','BTN','SB','BB'];
const PREFLOP_ORD  = ['UTG','HJ','CO','BTN','SB','BB'];
const POSTFLOP_ORD = ['SB','BB','UTG','HJ','CO','BTN'];
const ALL_PIDS     = ['player','bot0','bot1','bot2','bot3','bot4'];
const BOT_AVATARS  = ['🧑‍🦰', '😎', '🐰', '🐻', '🦊'];
const PMAP = { tag:'TAG', caller:'CALLER', lag:'LAG', nit:'NIT' };
const BOT_TMPLS = [0,1,2,3,0].map(i => BOT_PROFILES[i]);
const PERSONA_RING = { TAG:'#5577E0', CALLER:'#8068E8', LAG:'#E04545', NIT:'#9ca3af' };

const n1 = x => Math.round(x * 10) / 10;

function buildHand(hc, prevStacks) {
  const stacks = {};
  ALL_PIDS.forEach(p => {
    const prev = prevStacks?.[p] ?? 100;
    stacks[p] = prev < 8 ? 100 : prev;
  });
  const bots = {};
  ['bot0','bot1','bot2','bot3','bot4'].forEach((bid, i) => {
    const t = BOT_TMPLS[i];
    bots[bid] = { ...t, personality: PMAP[t.id] };
  });
  const pos = {};
  ALL_PIDS.forEach((pid, i) => { pos[pid] = POSITIONS[(i + hc) % POSITIONS.length]; });
  const sbP = ALL_PIDS.find(p => pos[p] === 'SB');
  const bbP = ALL_PIDS.find(p => pos[p] === 'BB');
  const deck = createDeck();
  const hands = {};
  ALL_PIDS.forEach((pid, i) => {
    hands[pid] = [deck[i * 2], deck[i * 2 + 1]];
    if (pid !== 'player') bots[pid].cards = hands[pid];
  });
  const ns = { ...stacks };
  ns[sbP] = n1(stacks[sbP] - 0.5);
  ns[bbP] = n1(stacks[bbP] - 1.0);
  const sb = Object.fromEntries(ALL_PIDS.map(p => [p, 0]));
  sb[sbP] = 0.5; sb[bbP] = 1.0;
  const streetOrder = PREFLOP_ORD.map(p => ALL_PIDS.find(pid => pos[pid] === p));
  return {
    phase: 'preflop', deck: deck.slice(12), hands, community: [],
    positions: pos, bots, stacks: ns, pot: 1.5,
    streetBets: sb, currentBetLevel: 1.0,
    activePlayers: [...ALL_PIDS], streetOrder,
    toAct: [...streetOrder], currentActor: streetOrder[0],
    raisedPot: false, playerIsAggressor: false,
    handOver: false, showdown: false, showCoach: false, coaching: null,
    log: [`Hand #${hc + 1}  ·  You: ${pos.player}`],
  };
}

function applyAction(gs, actor, action, amount) {
  const { pot, stacks, streetBets, currentBetLevel, toAct, activePlayers, streetOrder } = gs;
  let nPot = pot, nSt = { ...stacks }, nBets = { ...streetBets };
  let nToAct = [...toAct], nAct = [...activePlayers];
  let newLvl = currentBetLevel, newRaised = gs.raisedPot, logMsg = '';
  const name = actor === 'player' ? 'You' : gs.bots[actor]?.name;
  const v = actor !== 'player' ? 's' : '';
  if (action === 'fold') {
    nAct = nAct.filter(p => p !== actor);
    nToAct = nToAct.filter(p => p !== actor);
    logMsg = `${name} fold${v}`;
  } else if (action === 'check') {
    nToAct = nToAct.filter(p => p !== actor);
    logMsg = `${name} check${v}`;
  } else if (action === 'call') {
    const amt = n1(Math.min(currentBetLevel - (streetBets[actor] || 0), stacks[actor]));
    nSt[actor] = n1(stacks[actor] - amt);
    nBets[actor] = n1((streetBets[actor] || 0) + amt);
    nPot = n1(pot + amt);
    nToAct = nToAct.filter(p => p !== actor);
    logMsg = `${name} call${v} ${amt}bb`;
  } else if (action === 'raise' || action === 'bet') {
    const add = n1(amount - (streetBets[actor] || 0));
    nSt[actor] = n1(stacks[actor] - add);
    nBets[actor] = amount;
    nPot = n1(pot + add);
    newLvl = amount; newRaised = true;
    nToAct = streetOrder.filter(p => p !== actor && nAct.includes(p));
    logMsg = `${name} raise${v} to ${amount}bb`;
  } else if (action === 'allin') {
    const all = stacks[actor], total = n1((streetBets[actor] || 0) + all);
    nSt[actor] = 0; nBets[actor] = total; nPot = n1(pot + all);
    if (total > newLvl) {
      newLvl = total; newRaised = true;
      nToAct = streetOrder.filter(p => p !== actor && nAct.includes(p));
    } else {
      nToAct = nToAct.filter(p => p !== actor);
    }
    logMsg = `${name} ALL-IN (${all}bb)`;
  }
  return {
    ...gs, pot: nPot, stacks: nSt, streetBets: nBets, currentBetLevel: newLvl,
    activePlayers: nAct, toAct: nToAct, currentActor: nToAct[0] || null,
    raisedPot: newRaised, log: [...gs.log, logMsg],
  };
}

function nextStreet(gs) {
  const { phase, activePlayers, positions, deck, community, stacks, pot, bots, hands } = gs;
  if (activePlayers.length <= 1) {
    const w = activePlayers[0];
    if (!w) return { ...gs, handOver: true };
    const wn = w === 'player' ? 'You win' : `${bots[w]?.name} wins`;
    return { ...gs, stacks: { ...stacks, [w]: n1(stacks[w] + pot) }, pot: 0, handOver: true, showdown: true, log: [...gs.log, `--- ${wn} ${pot}bb ---`] };
  }
  const np = { preflop:'flop', flop:'turn', turn:'river', river:'showdown' }[phase];
  if (np === 'showdown') {
    const results = activePlayers
      .map(pid => ({ pid, best: getBestHand(hands[pid], community) }))
      .sort((a, b) => (b.best?.score || 0) - (a.best?.score || 0));
    const w = results[0].pid;
    const wn = w === 'player' ? 'You' : bots[w]?.name;
    const sdLog = results.map(r => {
      const n = r.pid === 'player' ? 'You' : bots[r.pid]?.name;
      return `${n}: ${hands[r.pid].map(c => c.rank + c.suit).join('')}  (${r.best?.desc || '?'})`;
    });
    return { ...gs, phase:'showdown', stacks:{ ...stacks, [w]: n1(stacks[w] + pot) }, pot:0, handOver:true, showdown:true, log:[...gs.log,'--- SHOWDOWN ---',...sdLog,`${wn} wins!`] };
  }
  let nd = [...deck], nc = [...community];
  for (let i = 0; i < (np === 'flop' ? 3 : 1); i++) nc.push(nd.shift());
  const pfo = POSTFLOP_ORD
    .map(p => ALL_PIDS.find(pid => positions[pid] === p))
    .filter(p => p && activePlayers.includes(p));
  return {
    ...gs, phase: np, deck: nd, community: nc,
    streetBets: Object.fromEntries(ALL_PIDS.map(p => [p, 0])),
    currentBetLevel: 0, streetOrder: pfo, toAct: [...pfo], currentActor: pfo[0] || null,
    log: [...gs.log, `--- ${np.toUpperCase()} ---`],
  };
}

const QUALITY_COLORS = {
  good:       { border: '#68A870', bg: 'rgba(104,168,112,0.05)', title: '#68A870', btn: '#68A870' },
  minor:      { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)', title: '#f59e0b', btn: '#f59e0b' },
  mistake:    { border: '#f97316', bg: 'rgba(249,115,22,0.08)', title: '#f97316', btn: '#f97316' },
  big_mistake:{ border: '#E04545', bg: 'rgba(224,69,69,0.08)', title: '#E04545', btn: '#E04545' },
  neutral:    { border: '#555',    bg: 'rgba(100,100,100,0.05)', title: '#aaa',  btn: '#888' },
};

function CoachOverlay({ coaching, onContinue, handOver }) {
  const qc = QUALITY_COLORS[coaching.quality] || QUALITY_COLORS.neutral;
  const isGood = coaching.quality === 'good';

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
    ]).start();
  }, []);

  return (
    <Modal transparent visible animationType="none">
      <Animated.View style={[coachStyles.backdrop, { opacity: fadeAnim }]}>
        <Animated.View style={[coachStyles.card, { borderColor: qc.border, backgroundColor: '#0f0f0f', transform: [{ translateY: slideAnim }] }]}>
          <Text style={[coachStyles.title, { color: qc.title }]}>{coaching.title}</Text>
          <Text style={coachStyles.explanation}>{coaching.explanation}</Text>

          {coaching.tagPrinciple && (
            <View style={coachStyles.tagBox}>
              <Text style={coachStyles.tagLabel}>TAG Principle</Text>
              <Text style={coachStyles.tagText}>{coaching.tagPrinciple}</Text>
            </View>
          )}

          {coaching.evImpact && (
            <Text style={coachStyles.evImpact}>EV Impact: {coaching.evImpact}</Text>
          )}

          {coaching.practiceModule && (
            <View style={coachStyles.practiceBox}>
              <Text style={coachStyles.practiceLabel}>Practice Recommendation</Text>
              <Text style={coachStyles.practiceText}>{coaching.practiceNote}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={onContinue}
            style={[
              coachStyles.continueBtn,
              isGood
                ? { backgroundColor: C.green }
                : { backgroundColor: `${qc.btn}20`, borderWidth: 1, borderColor: `${qc.btn}40` },
            ]}
            activeOpacity={0.8}
          >
            <Text style={[coachStyles.continueBtnText, isGood ? { color: '#050a07' } : { color: qc.btn }]}>
              {handOver ? 'Deal Next Hand →' : 'Continue →'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const BOT_IDS = ['bot0','bot1','bot2','bot3','bot4'];

export default function PlayScreen({ recordResult }) {
  const insets = useSafeAreaInsets();
  const [gs, setGs]         = useState(null);
  const [hc, setHc]         = useState(() => Math.floor(Math.random() * 6));
  const [raiseAmt, setRaiseAmt] = useState(2.5);
  const [logOpen, setLogOpen]   = useState(false);

  useEffect(() => { setGs(buildHand(0)); }, []);

  // Recalculate raise amount when phase/bet level changes
  useEffect(() => {
    if (!gs) return;
    const lvl  = gs.currentBetLevel || 0;
    const call = n1(Math.max(0, lvl - (gs.streetBets?.player || 0)));
    const potR = n1(gs.pot + call * 2 + call);
    const max  = n1((gs.stacks?.player || 0) + (gs.streetBets?.player || 0));
    setRaiseAmt(Math.round(Math.min(Math.max(potR, lvl * 2 || 2.5), max) * 2) / 2);
  }, [gs?.phase, gs?.currentBetLevel]);

  // Auto-bot effect
  useEffect(() => {
    if (!gs || gs.showCoach || gs.handOver) return;
    const { currentActor, phase } = gs;
    if (!currentActor || currentActor === 'player') return;
    const t = setTimeout(() => {
      setGs(prev => {
        if (!prev || prev.currentActor !== currentActor || prev.phase !== phase || prev.showCoach || prev.handOver) return prev;
        const bot    = { ...prev.bots[currentActor], cards: prev.hands[currentActor] };
        const callAmt = n1(Math.max(0, prev.currentBetLevel - (prev.streetBets[currentActor] || 0)));
        const facing  = callAmt > 0;
        let res;
        if (prev.phase === 'preflop') {
          res = getBotPreflopAction(bot, { facingBet:facing, betToCall:callAmt, pot:prev.pot, bb:1, position:prev.positions[currentActor], raisedPot:prev.raisedPot });
        } else {
          res = getBotPostflopAction(bot, { community:prev.community, pot:prev.pot, facingBet:facing, betToCall:callAmt, effectiveStack:Math.min(prev.stacks[currentActor], prev.stacks.player || 100), street:prev.phase });
        }
        let act = res.action, amt = 0;
        if (act === 'raise' || act === 'bet') {
          amt = n1(Math.min(res.amount || prev.currentBetLevel * 2.5, prev.stacks[currentActor] + (prev.streetBets[currentActor] || 0)));
          if (amt <= prev.currentBetLevel) act = 'call';
        }
        if (act === 'call' && callAmt === 0) act = 'check';
        if ((act === 'raise' || act === 'bet') && amt >= prev.stacks[currentActor] + (prev.streetBets[currentActor] || 0)) act = 'allin';
        let ng = applyAction(prev, currentActor, act, amt);
        if (ng.toAct.length === 0) ng = nextStreet(ng);
        return ng;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [gs?.currentActor, gs?.showCoach, gs?.handOver, gs?.phase]);

  function handlePlayerAction(action, amount) {
    if (!gs || gs.currentActor !== 'player' || gs.showCoach || gs.handOver) return;
    const callAmt  = n1(Math.max(0, gs.currentBetLevel - (gs.streetBets.player || 0)));
    const normPos  = gs.positions.player;
    const botStacks = ['bot0','bot1','bot2','bot3','bot4'].map(b => gs.stacks[b] || 0);
    const coaching = analyzeAction({
      street:gs.phase, playerCards:gs.hands.player, community:gs.community,
      pot:gs.pot, callAmount:callAmt, currentBet:gs.currentBetLevel,
      playerAction:action, playerPosition:normPos,
      playerIsAggressor:gs.playerIsAggressor, facingBet:callAmt > 0,
      facingRaise:gs.raisedPot && callAmt > 0, raisedPot:gs.raisedPot,
      bbAmount:1, effectiveStack:Math.min(gs.stacks.player, Math.max(...botStacks)),
      villainBetSize:gs.currentBetLevel,
      villainBetPct:gs.pot > 0 ? Math.round((gs.currentBetLevel / gs.pot) * 100) : 0,
      botPersonality:Object.values(gs.bots)[0]?.personality, raiseAmount:amount,
    });
    if (coaching.quality === 'good') recordResult?.({ correct: true });
    else if (coaching.quality === 'mistake' || coaching.quality === 'big_mistake') recordResult?.({ correct: false });

    const gameAction = action === 'limp' ? 'call' : action;
    let ng = applyAction(gs, 'player', gameAction, amount);
    if (gameAction === 'raise' || gameAction === 'bet') ng = { ...ng, playerIsAggressor:true };
    if (gameAction === 'fold') {
      setGs({ ...ng, handOver:true, showCoach:true, coaching });
      return;
    }
    if (ng.toAct.length === 0) ng = nextStreet(ng);
    setGs({ ...ng, showCoach:true, coaching });
  }

  function handleContinue() {
    if (!gs) return;
    if (gs.handOver) { const n = hc + 1; setHc(n); setGs(buildHand(n, gs.stacks)); }
    else { setGs(g => ({ ...g, showCoach:false })); }
  }

  function dealNext() {
    const n = hc + 1; setHc(n); setGs(buildHand(n, gs.stacks));
  }

  if (!gs) return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }]}>
      <Text style={{ color: '#444', fontSize: 16 }}>Dealing...</Text>
    </View>
  );

  const { phase, hands, community, pot, stacks, positions, bots,
    activePlayers, currentActor, currentBetLevel, streetBets,
    showCoach, coaching, handOver, showdown, log } = gs;

  const callAmt   = n1(Math.max(0, currentBetLevel - (streetBets.player || 0)));
  const isMyTurn  = currentActor === 'player' && !showCoach && !handOver && activePlayers.includes('player');
  const canCheck  = callAmt === 0;
  const isLimp    = phase === 'preflop' && heroPos === 'SB' && !gs.raisedPot && callAmt > 0 && callAmt <= 0.5;
  const maxRaise  = n1(stacks.player + (streetBets.player || 0));
  const minRaise  = n1(Math.min(currentBetLevel * 2 || 2.5, maxRaise));
  const safeRaise = Math.min(Math.max(raiseAmt, minRaise), maxRaise);
  const activeCnt = activePlayers.length;
  const heroPos   = positions.player;
  const posStyle  = POS_COLOR[heroPos] || { bg:'#374151', text:'#d1d5db' };

  const phaseAccent = { preflop:'#E8A030', flop:'#68A870', turn:'#5577E0', river:'#8068E8', showdown:'#fff' }[phase] || '#fff';
  const phaseLabel  = { preflop:'PREFLOP', flop:'FLOP', turn:'TURN', river:'RIVER', showdown:'SHOWDOWN' }[phase] || phase.toUpperCase();

  const betPills = [
    { label:'1BB', val:n1(Math.max(minRaise, 2.5)) },
    { label:'1/2P', val:n1(Math.min(pot * 0.5 + callAmt, maxRaise)) },
    { label:'2/3P', val:n1(Math.min(pot * 0.67 + callAmt, maxRaise)) },
    { label:'Pot',  val:n1(Math.min(pot + callAmt * 2 + callAmt, maxRaise)) },
    { label:'2x',   val:n1(Math.min((pot + callAmt * 2 + callAmt) * 2, maxRaise)) },
  ].filter(p => p.val >= minRaise);

  const heroHandStrength = community.length > 0 && activePlayers.includes('player')
    ? getBestHand(hands.player, community)
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.handNum}>Hand #{hc + 1}</Text>
          <Text style={[styles.phaseLabel, { color: phaseAccent }]}>{phaseLabel}</Text>
          <Text style={styles.activeCnt}>{activeCnt} active</Text>
        </View>

        {/* Bot row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.botRow} contentContainerStyle={styles.botRowContent}>
          {BOT_IDS.map((pid, i) => {
            const bot    = bots[pid];
            const folded = !activePlayers.includes(pid);
            const acting = currentActor === pid && !showCoach && !handOver;
            const p      = positions[pid];
            const ring   = PERSONA_RING[bot?.personality] || '#5577E0';
            const bet    = streetBets[pid] || 0;

            return (
              <View key={pid} style={[styles.botItem, folded && styles.botFolded]}>
                {/* Avatar */}
                <View style={styles.botAvatarWrap}>
                  {acting && <View style={[styles.actingGlow, { backgroundColor: `${ring}28`, borderRadius: 40 }]} />}
                  <View style={[styles.botAvatar, {
                    borderColor: acting ? ring : '#2c2c2e',
                    shadowColor: acting ? ring : 'transparent',
                    shadowOpacity: acting ? 0.7 : 0,
                    shadowRadius: 8,
                  }]}>
                    <Text style={styles.botEmoji}>{BOT_AVATARS[i]}</Text>
                  </View>
                  {p === 'BTN' && (
                    <View style={styles.dealerBtn}><Text style={styles.dealerBtnText}>D</Text></View>
                  )}
                  {!folded && (
                    <View style={styles.holeCards}>
                      {showdown
                        ? hands[pid].map((c, ci) => <Card key={ci} card={c} size="xs" />)
                        : [0,1].map(ci => <View key={ci} style={styles.hiddenCard} />)
                      }
                    </View>
                  )}
                </View>
                <Text style={styles.botName}>{bot.name.split(' ').pop()}</Text>
                <View style={[styles.posBadge, { backgroundColor: POS_COLOR[p]?.bg || '#374151' }]}>
                  <Text style={[styles.posBadgeText, { color: POS_COLOR[p]?.text || '#d1d5db' }]}>{p}</Text>
                </View>
                <Text style={styles.botStack}>{stacks[pid]}bb</Text>
                {bet > 0 && <Text style={styles.botBet}>{bet}bb</Text>}
              </View>
            );
          })}
        </ScrollView>

        {/* Community cards */}
        <View style={styles.communityWrap}>
          <View style={styles.communityCards}>
            {community.map((c, i) => <Card key={i} card={c} size="md" />)}
            {Array.from({ length: 5 - community.length }).map((_, i) => <CardBack key={i} size="md" />)}
          </View>

          {/* Pot */}
          <View style={styles.potRow}>
            <View style={styles.chipDot} />
            <Text style={styles.potAmt}>{pot}</Text>
            <Text style={styles.potBB}>bb</Text>
            {activeCnt <= 3 && phase !== 'preflop' && (
              <Text style={styles.potNote}>{activeCnt === 2 ? '· HU' : `· ${activeCnt}-way`}</Text>
            )}
          </View>
        </View>

        {/* Hero area */}
        <View style={styles.heroArea}>
          {/* Hole cards overlapping */}
          <View style={styles.holeCardRow}>
            {activePlayers.includes('player')
              ? hands.player.map((c, i) => (
                  <View key={i} style={{ marginLeft: i > 0 ? -18 : 0, zIndex: i }}>
                    <Card card={c} size="xl" />
                  </View>
                ))
              : [0,1].map(i => (
                  <View key={i} style={[{ marginLeft: i > 0 ? -18 : 0, zIndex: i, opacity: 0.3 }]}>
                    <Card card={hands.player[i]} size="xl" />
                  </View>
                ))
            }
          </View>

          {/* Info panel */}
          <View style={styles.heroPanelWrap}>
            {/* Pot type or hand strength */}
            <Text style={heroHandStrength ? styles.handStrength : styles.potType}>
              {heroHandStrength ? heroHandStrength.desc : (gs.raisedPot ? '3-bet pot' : 'SRP')}
            </Text>

            {/* Position — main focal point */}
            <View style={[styles.heroPosChip, { backgroundColor: posStyle.bg, borderColor: posStyle.text + '55' }]}>
              <Text style={[styles.heroPosText, { color: posStyle.text }]}>{heroPos}</Text>
            </View>

            {/* Stack */}
            <View style={styles.heroStackRow}>
              <Text style={styles.heroStack}>{stacks.player}</Text>
              <Text style={styles.heroStackUnit}>BB</Text>
            </View>

            {gs.raisedPot && (
              <View style={styles.threeBetBadge}>
                <Text style={styles.threeBetText}>3-bet pot</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action buttons */}
        {isMyTurn && (
          <View style={styles.actionArea}>
            {/* Context hint */}
            <Text style={styles.contextHint}>
              {callAmt > 0
                ? isLimp
                  ? `limp ${callAmt}bb to complete · SB`
                  : `call ${callAmt}bb · need ${Math.round(callAmt / (pot + callAmt) * 100)}% equity`
                : `first to act · ${heroPos}`}
            </Text>

            {/* 3 main buttons */}
            <View style={styles.mainButtons}>
              <TouchableOpacity onPress={() => handlePlayerAction('fold')} style={[styles.actionBtn, styles.foldBtn]} activeOpacity={0.8}>
                <Text style={[styles.actionBtnText, { color: '#ff453a' }]}>Fold</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handlePlayerAction(isLimp ? 'limp' : canCheck ? 'check' : 'call')} style={[styles.actionBtn]} activeOpacity={0.8}>
                <Text style={styles.actionBtnText}>{isLimp ? 'Limp' : canCheck ? 'Check' : `Call ${callAmt}bb`}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handlePlayerAction(canCheck ? 'bet' : 'raise', safeRaise)} style={[styles.actionBtn, styles.raiseBtn]} activeOpacity={0.8}>
                <Text style={[styles.actionBtnLabel, { color: C.green }]}>↑</Text>
                <Text style={[styles.actionBtnSub, { color: C.green }]}>{canCheck ? 'Bet' : 'Raise'}</Text>
                <Text style={[styles.actionBtnAmt, { color: C.green }]}>{safeRaise}bb</Text>
              </TouchableOpacity>
            </View>

            {/* All-in */}
            <TouchableOpacity onPress={() => handlePlayerAction('allin')} style={styles.allinBtn} activeOpacity={0.8}>
              <Text style={styles.allinText}>All-In · {maxRaise}bb</Text>
            </TouchableOpacity>

            {/* Bet size pills */}
            <View style={styles.pillRow}>
              {betPills.map(({ label, val }) => {
                const active = Math.abs(safeRaise - val) < 0.1;
                return (
                  <TouchableOpacity key={label} onPress={() => setRaiseAmt(val)}
                    style={[styles.pill, active && styles.pillActive]} activeOpacity={0.8}>
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Slider (iOS native) */}
            <View style={styles.sliderRow}>
              <Slider
                style={styles.slider}
                minimumValue={minRaise}
                maximumValue={maxRaise}
                step={0.5}
                value={Math.min(Math.max(raiseAmt, minRaise), maxRaise)}
                onValueChange={v => setRaiseAmt(v)}
                minimumTrackTintColor={C.green}
                maximumTrackTintColor="#333"
                thumbTintColor={C.green}
              />
              <Text style={styles.sliderVal}>{safeRaise}bb</Text>
            </View>
          </View>
        )}

        {/* Deal next hand */}
        {handOver && !showCoach && (
          <TouchableOpacity onPress={dealNext} style={styles.dealBtn} activeOpacity={0.9}>
            <Text style={styles.dealBtnText}>Deal Next Hand →</Text>
          </TouchableOpacity>
        )}

        {/* Action log */}
        <View style={styles.logWrap}>
          <TouchableOpacity onPress={() => setLogOpen(o => !o)} style={styles.logHeader}>
            <Text style={styles.logToggle}>{logOpen ? '▴' : '▾'} Action Log</Text>
          </TouchableOpacity>
          {logOpen && (
            <ScrollView style={styles.logScroll} showsVerticalScrollIndicator={false}>
              {[...log].reverse().map((e, i) => (
                <Text key={i} style={[styles.logLine, {
                  color: e.startsWith('---') ? '#333' : e.startsWith('You') ? C.green : '#555'
                }]}>{e}</Text>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Coach overlay */}
      {showCoach && coaching && (
        <CoachOverlay coaching={coaching} onContinue={handleContinue} handOver={handOver} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg0 },
  scrollContent: {},
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Space.md, paddingTop: Space.sm, paddingBottom: Space.xs,
  },
  handNum:   { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary },
  phaseLabel:{ fontFamily: Fonts.semibold, fontSize: Size.xs, letterSpacing: 2 },
  activeCnt: { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary },
  botRow:        { flexGrow: 0 },
  botRowContent: { paddingHorizontal: Space.sm, paddingVertical: Space.xs, gap: Space.xs },
  botItem:   { alignItems: 'center', width: 64 },
  botFolded: { opacity: 0.22 },
  botAvatarWrap: { position: 'relative', marginBottom: Space.xxs },
  actingGlow:    { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, zIndex: 0 },
  botAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.bg2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, zIndex: 1,
    shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  botEmoji:    { fontSize: 26 },
  dealerBtn:   {
    position: 'absolute', bottom: -2, right: -2, width: 18, height: 18,
    borderRadius: 9, backgroundColor: C.amber, alignItems: 'center',
    justifyContent: 'center', zIndex: 2,
  },
  dealerBtnText: { fontFamily: Fonts.semibold, fontSize: 8, color: '#000' },
  holeCards:   { position: 'absolute', top: -4, right: -6, flexDirection: 'row', gap: 1, zIndex: 3 },
  hiddenCard:  { width: 12, height: 16, borderRadius: 2, backgroundColor: '#162238', borderWidth: 1, borderColor: '#ddd8cc' },
  botName:     { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: Colors.textPrimary, marginBottom: 2 },
  posBadge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.xs, marginBottom: 2 },
  posBadgeText:{ fontFamily: Fonts.semibold, fontSize: 8 },
  botStack:    { fontFamily: Fonts.regular, fontSize: 9, color: Colors.textTertiary },
  botBet:      { fontFamily: Fonts.semibold, fontSize: 9, color: C.amber },
  communityWrap:  { alignItems: 'center', paddingVertical: Space.sm },
  communityCards: { flexDirection: 'row', gap: 6, marginBottom: Space.xs },
  potRow:      { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  chipDot:     { width: 14, height: 14, borderRadius: 7, backgroundColor: '#B87820', shadowColor: C.amber, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6 },
  potAmt:      { fontFamily: Fonts.semibold, fontSize: Size.xxl, color: Colors.textPrimary },
  potBB:       { fontFamily: Fonts.regular, fontSize: Size.sm, color: Colors.textTertiary },
  potNote:     { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary },
  heroArea:    { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Space.base, paddingBottom: Space.sm, gap: Space.sm },
  holeCardRow: { flexDirection: 'row' },
  heroPanelWrap: {
    flex: 1, backgroundColor: Colors.bg2, borderRadius: Radius.xl, padding: Space.sm,
    alignItems: 'center', minHeight: 144, justifyContent: 'center', gap: Space.xs,
  },
  handStrength: { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: C.green },
  potType:      { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary },
  heroPosChip:  {
    paddingHorizontal: 18, paddingVertical: Space.xs, borderRadius: Radius.md,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  heroPosText:  { fontFamily: Fonts.semibold, fontSize: Size.xl, letterSpacing: 1 },
  heroStackRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Space.xxs },
  heroStack:    { fontFamily: Fonts.semibold, fontSize: Size.xxl, color: Colors.textPrimary, lineHeight: Size.xxl + 4 },
  heroStackUnit:{ fontFamily: Fonts.semibold, fontSize: Size.base, color: Colors.textSecondary, marginBottom: 2 },
  threeBetBadge:{ paddingHorizontal: Space.xs, paddingVertical: 3, borderRadius: Radius.xs, backgroundColor: 'rgba(249,115,22,0.2)' },
  threeBetText: { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: '#f97316' },
  actionArea:   { paddingHorizontal: Space.base, paddingBottom: Space.sm, gap: Space.xs },
  contextHint:  { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, textAlign: 'center' },
  mainButtons:  { flexDirection: 'row', gap: Space.xs },
  actionBtn:    {
    flex: 1, paddingVertical: Space.base, borderRadius: Radius.lg, backgroundColor: Colors.bg2,
    alignItems: 'center', justifyContent: 'center',
  },
  foldBtn:  {},
  raiseBtn: {},
  actionBtnText:  { fontFamily: Fonts.semibold, fontSize: Size.sm, color: Colors.textPrimary },
  actionBtnLabel: { fontFamily: Fonts.semibold, fontSize: Size.lg, lineHeight: 24 },
  actionBtnSub:   { fontFamily: Fonts.regular, fontSize: Size.xxs, lineHeight: 14 },
  actionBtnAmt:   { fontFamily: Fonts.regular, fontSize: Size.xxs, lineHeight: 13 },
  allinBtn: {
    paddingVertical: Space.sm, borderRadius: Radius.lg, backgroundColor: Colors.bg2,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,69,58,0.2)',
  },
  allinText:    { fontFamily: Fonts.semibold, fontSize: Size.xs, color: 'rgba(255,69,58,0.4)' },
  pillRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs, justifyContent: 'center' },
  pill:         { paddingHorizontal: Space.sm, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.bg2 },
  pillActive:   { backgroundColor: C.green },
  pillText:     { fontFamily: Fonts.semibold, fontSize: Size.xs, color: Colors.textTertiary },
  pillTextActive: { color: '#000' },
  sliderRow:    { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  slider:       { flex: 1 },
  sliderVal:    { width: 52, textAlign: 'right', fontFamily: Fonts.regular, color: Colors.textPrimary, fontSize: Size.xs },
  dealBtn: {
    marginHorizontal: Space.base, paddingVertical: Space.base, borderRadius: Radius.lg,
    backgroundColor: C.green, alignItems: 'center', marginBottom: Space.base,
    shadowColor: C.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12,
  },
  dealBtnText: { ...T.btnPrimary, color: '#050a07' },
  logWrap:     { marginHorizontal: Space.base, borderRadius: Radius.lg, backgroundColor: Colors.bg1, overflow: 'hidden' },
  logHeader:   { paddingHorizontal: Space.base, paddingVertical: Space.sm },
  logToggle:   { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: Colors.textTertiary },
  logScroll:   { maxHeight: 120, paddingHorizontal: Space.base, paddingBottom: Space.sm },
  logLine:     { fontFamily: Fonts.regular, fontSize: Size.xxs, lineHeight: 15 },
});

const coachStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'flex-end', padding: Space.base, paddingBottom: Space.xl,
  },
  card: {
    borderRadius: Radius.xl, borderWidth: 1, padding: Space.md, gap: Space.sm,
  },
  title:       { fontFamily: Fonts.semibold, fontSize: Size.md },
  explanation: { fontFamily: Fonts.regular, fontSize: Size.xs, color: Colors.textSecondary, lineHeight: Size.xs * 1.55 },
  tagBox: {
    backgroundColor: 'rgba(104,168,112,0.06)', borderLeftWidth: 2,
    borderLeftColor: C.green, borderRadius: Radius.md, padding: Space.sm,
  },
  tagLabel:     { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: C.green, marginBottom: Space.xxs },
  tagText:      { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, lineHeight: Size.xxs * 1.55 },
  evImpact:     { fontFamily: Fonts.semibold, fontSize: Size.xxs, color: C.red },
  practiceBox:  { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Space.sm, borderWidth: 1, borderColor: Colors.borderSubtle },
  practiceLabel:{ fontFamily: Fonts.semibold, fontSize: Size.xxs, color: C.amber, marginBottom: Space.xxs },
  practiceText: { fontFamily: Fonts.regular, fontSize: Size.xxs, color: Colors.textTertiary, lineHeight: Size.xxs * 1.55 },
  continueBtn:  { paddingVertical: Space.base, borderRadius: Radius.lg, alignItems: 'center' },
  continueBtnText: { ...T.btnPrimary },
});
