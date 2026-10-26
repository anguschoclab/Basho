/**
 * keshoBorders.tsx
 *
 * Border rendering functions for kesho-mawashi display.
 */

import React from "react";
import {
  KESHO_BORDER_X,
  KESHO_BORDER_Y,
  KESHO_BORDER_WIDTH,
  KESHO_BORDER_HEIGHT,
  KESHO_INNER_BORDER_X,
  KESHO_INNER_BORDER_Y,
  KESHO_INNER_BORDER_WIDTH,
  KESHO_INNER_BORDER_HEIGHT,
  KESHO_MID_BORDER_X,
  KESHO_MID_BORDER_Y,
  KESHO_MID_BORDER_WIDTH,
  KESHO_MID_BORDER_HEIGHT,
  KESHO_ROPE_BORDER_X,
  KESHO_ROPE_BORDER_Y,
  KESHO_ROPE_BORDER_WIDTH,
  KESHO_ROPE_BORDER_HEIGHT,
  KESHO_CIRCLE_BORDER_COUNT,
  KESHO_CIRCLE_BORDER_SPACING,
  KESHO_CIRCLE_BORDER_X_OFFSET,
  KESHO_CIRCLE_BORDER_Y_SPACING,
  KESHO_OPACITY_FAINT,
  KESHO_OPACITY_LOW,
  KESHO_OPACITY_MEDIUM,
  KESHO_OPACITY_HIGH,
} from "@/constants/ui/kesho";

/**
 * Render border style for the mawashi edge
 */
export function renderBorder(borderStyle: string, color: string): React.ReactNode {
  switch (borderStyle) {
    case "double":
      return (
        <>
          <rect
            x={KESHO_BORDER_X}
            y={KESHO_BORDER_Y}
            width={KESHO_BORDER_WIDTH}
            height={KESHO_BORDER_HEIGHT}
            rx="7"
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity={KESHO_OPACITY_HIGH}
          />
          <rect
            x={KESHO_INNER_BORDER_X}
            y={KESHO_INNER_BORDER_Y}
            width={KESHO_INNER_BORDER_WIDTH}
            height={KESHO_INNER_BORDER_HEIGHT}
            rx="5"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity={KESHO_OPACITY_LOW}
          />
        </>
      );
    case "ornate":
      return (
        <>
          <rect
            x={KESHO_BORDER_X}
            y={KESHO_BORDER_Y}
            width={KESHO_BORDER_WIDTH}
            height={KESHO_BORDER_HEIGHT}
            rx="7"
            fill="none"
            stroke={color}
            strokeWidth="3"
            opacity={KESHO_OPACITY_MEDIUM}
          />
          {[...Array(KESHO_CIRCLE_BORDER_COUNT)].map((_, i) => (
            <circle
              key={i}
              cx={2 * KESHO_CIRCLE_BORDER_X_OFFSET + (i % 4) * KESHO_CIRCLE_BORDER_SPACING}
              cy={2 * KESHO_CIRCLE_BORDER_X_OFFSET + Math.floor(i / 4) * KESHO_CIRCLE_BORDER_Y_SPACING}
              r="3"
              fill={color}
              opacity={KESHO_OPACITY_LOW}
            />
          ))}
        </>
      );
    case "rope":
      return (
        <rect
          x={KESHO_ROPE_BORDER_X}
          y={KESHO_ROPE_BORDER_Y}
          width={KESHO_ROPE_BORDER_WIDTH}
          height={KESHO_ROPE_BORDER_HEIGHT}
          rx="8"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray="8 4"
          opacity={KESHO_OPACITY_HIGH}
        />
      );
    case "scalloped":
      return (
        <path
          d="M 20 20 L 40 20 Q 45 15 50 20 L 60 20 Q 65 15 70 20 L 80 20 Q 85 15 90 20 L 100 20 Q 105 15 110 20 L 120 20 Q 125 15 130 20 L 140 20 Q 145 15 150 20 L 160 20 Q 165 15 170 20 L 180 20 L 180 216 L 20 216 L 20 20"
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity="0.5"
        />
      );
    default:
      // simple - current embossed border
      return (
        <>
          <rect
            x={KESHO_BORDER_X}
            y={KESHO_BORDER_Y}
            width={KESHO_BORDER_WIDTH}
            height={KESHO_BORDER_HEIGHT}
            rx="7"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity={KESHO_OPACITY_HIGH}
          />
          <rect
            x={KESHO_MID_BORDER_X}
            y={KESHO_MID_BORDER_Y}
            width={KESHO_MID_BORDER_WIDTH}
            height={KESHO_MID_BORDER_HEIGHT}
            rx="6"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity={KESHO_OPACITY_LOW}
          />
          <rect
            x={KESHO_INNER_BORDER_X}
            y={KESHO_INNER_BORDER_Y}
            width={KESHO_INNER_BORDER_WIDTH}
            height={KESHO_INNER_BORDER_HEIGHT}
            rx="5"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity={KESHO_OPACITY_FAINT}
          />
        </>
      );
  }
}
