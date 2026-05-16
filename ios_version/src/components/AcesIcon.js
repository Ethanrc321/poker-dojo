import React from 'react';
import Svg, { G, Rect, Text, Defs, ClipPath } from 'react-native-svg';

export default function AcesIcon({ size = 26, color = '#fff', bgColor = '#191919' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        {/* Clip everything outside the front card so back card lines don't bleed through */}
        <ClipPath id="frontCard">
          <Rect x="8" y="3" width="13" height="18" rx="2" />
        </ClipPath>
      </Defs>

      {/* Back card — rotated ~-14° around its center */}
      <G transform="rotate(-12, 8.5, 12)">
        <Rect
          x="2"
          y="3"
          width="13"
          height="18"
          rx="2"
          fill={bgColor}
          stroke={color}
          strokeWidth="1.5"
        />
        <Text
          x="4.5"
          y="10"
          fontSize="6"
          fontWeight="bold"
          fill={color}
          fontFamily="System"
        >
          A
        </Text>
      </G>

      {/* Front card — straight, covers back card's interior */}
      <Rect
        x="8"
        y="3"
        width="13"
        height="18"
        rx="2"
        fill={bgColor}
        stroke={color}
        strokeWidth="1.5"
      />
      <Text
        x="10.5"
        y="10"
        fontSize="6"
        fontWeight="bold"
        fill={color}
        fontFamily="System"
      >
        A
      </Text>
    </Svg>
  );
}
