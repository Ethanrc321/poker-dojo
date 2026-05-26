import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, G, Defs, ClipPath, Pattern, Line } from 'react-native-svg';

const SIZES = {
  xs: { width: 42,  height: 60  },
  sm: { width: 56,  height: 80  },
  md: { width: 72,  height: 100 },
  lg: { width: 88,  height: 124 },
  xl: { width: 100, height: 144 },
};

const BG    = '#13131A';
const AMBER = '#E8A030';

export default function CardBack({ size = 'md' }) {
  const s   = SIZES[size] || SIZES.md;
  const { width: W, height: H } = s;
  const radius = W * 0.12;

  // IDs must be unique per size so multiple cards don't share defs
  const clipId    = `cb-clip-${size}`;
  const patternId = `cb-pat-${size}`;

  // Inner border inset
  const pad  = W * 0.075;
  const iRx  = radius * 0.45;

  return (
    <View style={[styles.card, { width: W, height: H, borderRadius: radius }]}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>

          {/* Card shape clip */}
          <ClipPath id={clipId}>
            <Rect x={0} y={0} width={W} height={H} rx={radius} ry={radius} />
          </ClipPath>

          {/* Subtle diagonal line texture */}
          <Pattern
            id={patternId}
            x="0" y="0"
            width="10" height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <Line x1="0" y1="0" x2="0" y2="10" stroke={AMBER} strokeWidth="0.6" opacity="0.06" />
          </Pattern>

        </Defs>

        <G clipPath={`url(#${clipId})`}>

          {/* Base fill */}
          <Rect x={0} y={0} width={W} height={H} fill={BG} />

          {/* Diagonal line texture */}
          <Rect x={0} y={0} width={W} height={H} fill={`url(#${patternId})`} />

          {/* Inner border */}
          <Rect
            x={pad} y={pad}
            width={W - pad * 2} height={H - pad * 2}
            rx={iRx} ry={iRx}
            fill="none"
            stroke={AMBER}
            strokeWidth={Math.max(0.8, W * 0.014)}
            opacity={0.22}
          />

        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 7,
    elevation: 7,
  },
});
