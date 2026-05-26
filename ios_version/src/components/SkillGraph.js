import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';

const GRAPH_H = 72;
const PAD_X   = 6;
const PAD_Y   = 8;
const LINE_W  = 2;
const DOT_R   = 2.5;

// history: [{ rating: number, ts: number }, ...]
// color:   line colour (matches tier)
export default function SkillGraph({ history, color = '#e8a030' }) {
  const [containerW, setContainerW] = useState(0);

  const totalH = GRAPH_H + PAD_Y * 2;

  if (!history || history.length < 2 || containerW === 0) {
    return (
      <View
        style={{ width: '100%', height: totalH }}
        onLayout={e => setContainerW(e.nativeEvent.layout.width)}
      />
    );
  }

  const gW = containerW - PAD_X * 2;
  const gH = GRAPH_H;

  const ratings = history.map(h => h.rating);
  const rawMin  = Math.min(...ratings);
  const rawMax  = Math.max(...ratings);
  const span    = rawMax - rawMin || 80;
  const minR    = rawMin - span * 0.12;
  const maxR    = rawMax + span * 0.12;

  const n   = history.length;
  const toX = i => PAD_X + (i / (n - 1)) * gW;
  const toY = r => PAD_Y + gH - ((r - minR) / (maxR - minR)) * gH;

  const pts = history.map((h, i) => ({ x: toX(i), y: toY(h.rating) }));

  // SVG polyline expects a flat "x1,y1 x2,y2 …" string
  const pointsStr = pts.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View
      style={{ width: '100%', height: totalH }}
      onLayout={e => setContainerW(e.nativeEvent.layout.width)}
    >
      <Svg width={containerW} height={totalH}>
        {/* Continuous line — round joins/caps eliminate all choppiness */}
        <Polyline
          points={pointsStr}
          fill="none"
          stroke={color}
          strokeWidth={LINE_W}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Accent dots — first, last, every 8th */}
        {pts.map((p, i) => {
          const isLast = i === pts.length - 1;
          if (i !== 0 && !isLast && i % 8 !== 0) return null;
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={DOT_R}
              fill={isLast ? color : color + '99'}
            />
          );
        })}
      </Svg>
    </View>
  );
}
