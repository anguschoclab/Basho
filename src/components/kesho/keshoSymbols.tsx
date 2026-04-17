/**
 * keshoSymbols.tsx
 *
 * Symbol rendering functions for kesho-mawashi display.
 */

import React from "react";

/**
 * Render the main symbol based on type
 */
export function renderSymbol(
  symbol: { type: string; value: string },
  x: number,
  y: number,
  color: string
): React.ReactNode {
  const symbolMap: Record<string, string> = {
    dragon: "🐉",
    phoenix: "🔥",
    tiger: "🐅",
    mt_fuji: "🗻",
    waves: "🌊",
    sakura: "🌸",
    pine: "🌲",
    bamboo: "🎋",
    crane: "🕊️",
    rising_sun: "☀️",
    lightning: "⚡",
    waterfall: "💧",
    temple: "⛩️",
    treasure_ship: "⛵",
    carp: "🐟",
    lotus: "🪷",
    thunder: "⛈️",
    wind: "💨",
  };

  const content = symbolMap[symbol.value] || "⭕";

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r="40" fill={color} opacity="0.2" />
      <text
        x="0"
        y="12"
        textAnchor="middle"
        fontSize="48"
        fill={color}
        style={{ filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.3))" }}
      >
        {content}
      </text>
    </g>
  );
}

/**
 * Render a secondary symbol in a corner position
 */
export function renderSecondarySymbol(
  symbol: { position: string; value: string },
  color: string,
  isTertiary = false
): React.ReactNode {
  // Simple hash function for deterministic positioning
  const hashPosition = (str: string, seed: number) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % seed;
  };

  const positionMap: Record<string, { x: number; y: number }> = {
    left: { x: 50, y: 120 },
    right: { x: 150, y: 120 },
    upper: { x: 100, y: 60 },
    lower: { x: 100, y: 180 },
    scattered: {
      x: 50 + hashPosition(symbol.value, 100),
      y: 60 + hashPosition(symbol.value + "y", 120),
    },
    center: { x: 100, y: 120 },
    diagonal: {
      x: 60 + hashPosition(symbol.value, 80),
      y: 60 + hashPosition(symbol.value + "d", 120),
    },
    corners: {
      x: 30 + hashPosition(symbol.value, 2) * 140,
      y: 30 + hashPosition(symbol.value + "c", 2) * 160,
    },
    border: {
      x: 30 + hashPosition(symbol.value, 140),
      y: 30 + hashPosition(symbol.value + "b", 160),
    },
    concentric: { x: 100, y: 120 },
  };

  const pos = positionMap[symbol.position] || positionMap.left;
  const size = isTertiary ? 20 : 28;

  return (
    <g transform={`translate(${pos.x}, ${pos.y})`}>
      <circle r={size} fill={color} opacity="0.15" />
      <text x="0" y={size / 3} textAnchor="middle" fontSize={size} fill={color} opacity="0.8">
        ◆
      </text>
    </g>
  );
}
