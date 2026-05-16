import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Line, Path, G, Defs, ClipPath } from 'react-native-svg';

const SIZES = {
  xs: { width: 42,  height: 60  },
  sm: { width: 56,  height: 80  },
  md: { width: 72,  height: 100 },
  lg: { width: 88,  height: 124 },
  xl: { width: 100, height: 144 },
};

const NAVY  = '#162238';
const CREAM = '#ddd8cc';
const RAY_COUNT = 36;

export default function CardBack({ size = 'md' }) {
  const s = SIZES[size] || SIZES.md;
  const { width: W, height: H } = s;
  const borderRadius = W * 0.13;

  const cx = W / 2;
  const cy = H / 2;

  // White/cream border width (shows as card edge)
  const edgeW = W * 0.055;

  // Navy rect sits inside the cream edge
  const navyX  = edgeW;
  const navyY  = edgeW;
  const navyW  = W - edgeW * 2;
  const navyH  = H - edgeW * 2;
  const navyRx = borderRadius * 0.55;

  // Decorative inner border inset (from card edge)
  const bInset = edgeW + W * 0.065;
  const innerX = bInset;
  const innerY = bInset;
  const innerW = W - bInset * 2;
  const innerH = H - bInset * 2;
  const innerRx = navyRx * 0.35;

  // Rays are clipped to inner border rect so they never overlap the border
  const rayClipId  = `ray-clip-${size}`;
  const cardClipId = `card-clip-${size}`;

  // Circle geometry
  const outerR = Math.min(innerW, innerH) * 0.36;
  const innerR = outerR * 0.80;
  const starR  = innerR * 0.50;

  // Corner rivets — just inside the inner border corners
  const dotR   = W * 0.024;
  const dotOff = bInset + W * 0.035;
  const rivets = [
    [dotOff,        dotOff       ],
    [W - dotOff,    dotOff       ],
    [dotOff,        H - dotOff   ],
    [W - dotOff,    H - dotOff   ],
  ];

  // Rays: start just outside the inner circle, extend toward inner border
  const rays = Array.from({ length: RAY_COUNT }, (_, i) => {
    const angle = (i / RAY_COUNT) * 2 * Math.PI;
    const x1 = cx + Math.cos(angle) * outerR * 0.72;
    const y1 = cy + Math.sin(angle) * outerR * 0.72;
    // Extend well past the inner border — clipPath will trim them
    const x2 = cx + Math.cos(angle) * (Math.min(W, H) * 0.85);
    const y2 = cy + Math.sin(angle) * (Math.min(W, H) * 0.85);
    return { x1, y1, x2, y2 };
  });

  // 4-pointed compass star
  function starPath(pcx, pcy, r) {
    const inner = r * 0.2;
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const outerAngle = (i / 4) * 2 * Math.PI - Math.PI / 2;
      const mid1 = outerAngle + Math.PI / 4;
      pts.push(`${i === 0 ? 'M' : 'L'} ${pcx + Math.cos(outerAngle) * r} ${pcy + Math.sin(outerAngle) * r}`);
      pts.push(`L ${pcx + Math.cos(mid1) * inner} ${pcy + Math.sin(mid1) * inner}`);
    }
    pts.push('Z');
    return pts.join(' ');
  }

  return (
    <View style={[styles.shadow, { width: W, height: H, borderRadius, backgroundColor: CREAM }]}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          {/* Clip the entire SVG to the card shape */}
          <ClipPath id={cardClipId}>
            <Rect x={0} y={0} width={W} height={H} rx={borderRadius} ry={borderRadius} />
          </ClipPath>
          {/* Clip rays strictly to inner border rect */}
          <ClipPath id={rayClipId}>
            <Rect x={innerX} y={innerY} width={innerW} height={innerH} rx={innerRx} ry={innerRx} />
          </ClipPath>
        </Defs>

        <G clipPath={`url(#${cardClipId})`}>
          {/* Navy fill (cream edge shows around it) */}
          <Rect x={navyX} y={navyY} width={navyW} height={navyH} rx={navyRx} ry={navyRx} fill={NAVY} />

          {/* Decorative inner border */}
          <Rect
            x={innerX} y={innerY} width={innerW} height={innerH}
            rx={innerRx} ry={innerRx}
            fill="none"
            stroke={CREAM}
            strokeWidth={W * 0.012}
            opacity={0.55}
          />

          {/* Corner rivets */}
          {rivets.map(([rx, ry], i) => (
            <Circle key={i} cx={rx} cy={ry} r={dotR} fill={CREAM} opacity={0.5} />
          ))}

          {/* Sunburst rays — clipped to inner border rect */}
          <G clipPath={`url(#${rayClipId})`}>
            {rays.map((r, i) => (
              <Line
                key={i}
                x1={r.x1} y1={r.y1}
                x2={r.x2} y2={r.y2}
                stroke={CREAM}
                strokeWidth={W * 0.007}
                opacity={0.30}
              />
            ))}
          </G>

          {/* Outer circle — navy fill occludes rays behind it */}
          <Circle cx={cx} cy={cy} r={outerR} fill={NAVY} stroke={CREAM} strokeWidth={W * 0.014} opacity={0.85} />

          {/* Inner circle ring */}
          <Circle cx={cx} cy={cy} r={innerR} fill="none" stroke={CREAM} strokeWidth={W * 0.01} opacity={0.55} />

          {/* 4-pointed star */}
          <Path d={starPath(cx, cy, starR)} fill={CREAM} opacity={0.9} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    overflow: 'hidden',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
  },
});
