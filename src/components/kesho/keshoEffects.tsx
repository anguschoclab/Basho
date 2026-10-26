/**
 * keshoEffects.tsx
 *
 * Effect rendering functions for kesho-mawashi display.
 */

import React from "react";
import "./kesho-effects.css";
import { KESHO_COLORS } from "@/constants/ui/drawingPalette";
import {
  KESHO_DOT_RADIUS,
  KESHO_DOT_SIZE,
  KESHO_LINE_SIZE,
  KESHO_FRINGE_COUNT_BASE,
  KESHO_FRINGE_COUNT_MULTIPLIER,
  KESHO_FRINGE_START_X,
  KESHO_FRINGE_END_X,
  KESHO_FRINGE_Y,
  KESHO_FRINGE_SPACING,
  KESHO_FRINGE_START_X_OFFSET,
  KESHO_FRINGE_LENGTH_BASE,
  KESHO_FRINGE_LENGTH_VARIATION,
  KESHO_FRINGE_DELAY_MULTIPLIER,
  KESHO_FRINGE_SWAY_OFFSET,
  KESHO_FRINGE_OPACITY_VARIATION,
  KESHO_OPACITY_LOW,
  KESHO_OPACITY_MEDIUM,
  KESHO_OPACITY_VERY_HIGH,
  KESHO_OPACITY_ULTRA_HIGH,
  KESHO_OPACITY_MAXIMUM,
  KESHO_GRADIENT_START,
  KESHO_GRADIENT_MID,
  KESHO_GRADIENT_END,
} from "@/constants/ui/kesho";

/**
 * Render embroidery effect based on style
 */
export function renderEmbroideryEffect(
  style: string,
  color: string,
  density: number
): React.ReactNode {
  switch (style) {
    case "satin":
      return (
        <defs>
          <filter id="satin-glow">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      );
    case "chain":
      return (
        <pattern
          id="chain-pattern"
          x="0"
          y="0"
          width={KESHO_DOT_SIZE}
          height={KESHO_DOT_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={KESHO_DOT_SIZE / 2}
            cy={KESHO_DOT_SIZE / 2}
            r={KESHO_DOT_RADIUS}
            fill={color}
            opacity={KESHO_OPACITY_LOW * density}
          />
        </pattern>
      );
    case "couching":
      return (
        <pattern
          id="couching-pattern"
          x="0"
          y="0"
          width={KESHO_LINE_SIZE}
          height={KESHO_LINE_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1={KESHO_LINE_SIZE / 2}
            x2={KESHO_LINE_SIZE}
            y2={KESHO_LINE_SIZE / 2}
            stroke={color}
            strokeWidth="2"
            opacity={KESHO_OPACITY_MEDIUM * density}
          />
          <line
            x1={KESHO_LINE_SIZE / 2}
            y1="0"
            x2={KESHO_LINE_SIZE / 2}
            y2={KESHO_LINE_SIZE}
            stroke={color}
            strokeWidth="1"
            opacity={KESHO_OPACITY_LOW * density}
          />
        </pattern>
      );
    case "goldwork":
      return (
        <defs>
          <linearGradient id="goldwork-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset={`${KESHO_GRADIENT_START}%`}
              stopColor={color}
              stopOpacity={KESHO_OPACITY_ULTRA_HIGH * density}
            />
            <stop
              offset={`${KESHO_GRADIENT_MID}%`}
              stopColor={KESHO_COLORS.gold}
              stopOpacity={KESHO_OPACITY_MAXIMUM * density}
            />
            <stop
              offset={`${KESHO_GRADIENT_END}%`}
              stopColor={color}
              stopOpacity={KESHO_OPACITY_ULTRA_HIGH * density}
            />
          </linearGradient>
        </defs>
      );
    default:
      return null;
  }
}

/**
 * Render fringe at the bottom of the mawashi with sway animation
 */
export function renderFringe(density: number, color: string): React.ReactNode {
  const fringeCount = Math.floor(KESHO_FRINGE_COUNT_BASE + density * KESHO_FRINGE_COUNT_MULTIPLIER);

  return (
    <g>
      {/* Fringe base line */}
      <line
        x1={KESHO_FRINGE_START_X}
        y1={KESHO_FRINGE_Y}
        x2={KESHO_FRINGE_END_X}
        y2={KESHO_FRINGE_Y}
        stroke={color}
        strokeWidth="2"
        opacity={KESHO_OPACITY_ULTRA_HIGH}
      />
      {/* Individual tassels with sway animation */}
      {[...Array(fringeCount)].map((_, i) => {
        const x = KESHO_FRINGE_START_X_OFFSET + i * (KESHO_FRINGE_SPACING / fringeCount);
        const swayOffset = Math.sin((i / fringeCount) * Math.PI * 2) * KESHO_FRINGE_SWAY_OFFSET;

        // Deterministic pseudo-random per tassel — Math.random() here would
        // reshuffle fringe lengths on every React render (flicker) and trip
        // the determinism audit.
        const h1 = ((i * 2654435761) >>> 0) / 4294967296;
        const h2 = ((i * 1597334677) >>> 0) / 4294967296;
        const length = KESHO_FRINGE_LENGTH_BASE + h1 * KESHO_FRINGE_LENGTH_VARIATION;
        const delay = i * KESHO_FRINGE_DELAY_MULTIPLIER;

        return (
          <g key={i}>
            <line
              x1={x}
              y1={KESHO_FRINGE_Y}
              x2={x + swayOffset}
              y2={KESHO_FRINGE_Y + length}
              stroke={color}
              strokeWidth="1.5"
              opacity={KESHO_OPACITY_VERY_HIGH + h2 * KESHO_FRINGE_OPACITY_VARIATION}
              className="animate-sway"
              style={{ animationDelay: `${delay}s` }}
            />
            {/* Tassel end knot */}
            <circle
              cx={x + swayOffset}
              cy={KESHO_FRINGE_Y + length}
              r={KESHO_DOT_RADIUS}
              fill={color}
              opacity={KESHO_OPACITY_ULTRA_HIGH}
            />
          </g>
        );
      })}
    </g>
  );
}
