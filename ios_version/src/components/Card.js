import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SIZES = {
  xs: { width: 42,  height: 60,  rankFont: 8,  suitFont: 7,  pad: 3  },
  sm:  { width: 56,  height: 80,  rankFont: 10, suitFont: 9,  pad: 4  },
  smd: { width: 62,  height: 88,  rankFont: 11, suitFont: 10, pad: 5  },
  md:  { width: 72,  height: 100, rankFont: 13, suitFont: 11, pad: 6  },
  lg: { width: 88,  height: 124, rankFont: 16, suitFont: 13, pad: 7  },
  xl: { width: 100, height: 144, rankFont: 22, suitFont: 18, pad: 8  },
};

export default function Card({ card, size = 'md' }) {
  const s = SIZES[size] || SIZES.md;
  const isRed = card.suit === '♥' || card.suit === '♦';
  const color = isRed ? '#e11d48' : '#111827';

  const rankLineHeight = Math.ceil(s.rankFont * 1.25);
  const suitLineHeight = Math.ceil(s.suitFont * 1.25);
  const cornerOffset = s.pad;

  return (
    <View style={[styles.card, { width: s.width, height: s.height, borderRadius: s.width * 0.18, padding: s.pad }]}>
      {/* Top-left rank+suit */}
      <View style={[styles.corner, { top: cornerOffset, left: cornerOffset + 1 }]}>
        <Text style={[styles.rank, { fontSize: s.rankFont, lineHeight: rankLineHeight, color }]}>{card.rank}</Text>
        <Text style={[styles.suit, { fontSize: s.suitFont, lineHeight: suitLineHeight, color }]}>{card.suit}</Text>
      </View>

      {/* Center suit */}
      <View style={styles.center}>
        <Text style={[styles.centerSuit, { fontSize: s.rankFont * 1.8, color }]}>{card.suit}</Text>
      </View>

      {/* Bottom-right rank+suit (rotated 180) */}
      <View style={[styles.corner, styles.cornerBottom, { bottom: cornerOffset, right: cornerOffset + 1 }]}>
        <Text style={[styles.rank, { fontSize: s.rankFont, lineHeight: rankLineHeight, color, transform: [{ rotate: '180deg' }] }]}>{card.rank}</Text>
        <Text style={[styles.suit, { fontSize: s.suitFont, lineHeight: suitLineHeight, color, transform: [{ rotate: '180deg' }] }]}>{card.suit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  corner: {
    position: 'absolute',
    alignItems: 'flex-start',
  },
  cornerBottom: {
    alignItems: 'flex-end',
  },
  rank: {
    fontWeight: '900',
  },
  suit: {
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSuit: {
    fontWeight: '400',
  },
});
