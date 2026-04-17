/**
 * keshoBorders.tsx
 *
 * Border rendering functions for kesho-mawashi display.
 */

import React from "react";

/**
 * Render border style for the mawashi edge
 */
export function renderBorder(borderStyle: string, color: string): React.ReactNode {
  switch (borderStyle) {
    case "double":
      return (
        <>
          <rect
            x="20"
            y="20"
            width="160"
            height="196"
            rx="7"
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity="0.5"
          />
          <rect
            x="24"
            y="24"
            width="152"
            height="188"
            rx="5"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.3"
          />
        </>
      );
    case "ornate":
      return (
        <>
          <rect
            x="20"
            y="20"
            width="160"
            height="196"
            rx="7"
            fill="none"
            stroke={color}
            strokeWidth="3"
            opacity="0.4"
          />
          {[...Array(12)].map((_, i) => (
            <circle
              key={i}
              cx={20 + (i % 4) * 40 + 20}
              cy={20 + Math.floor(i / 4) * 49 + 20}
              r="3"
              fill={color}
              opacity="0.3"
            />
          ))}
        </>
      );
    case "rope":
      return (
        <rect
          x="18"
          y="18"
          width="164"
          height="200"
          rx="8"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray="8 4"
          opacity="0.5"
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
            x="20"
            y="20"
            width="160"
            height="196"
            rx="7"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.5"
          />
          <rect
            x="22"
            y="22"
            width="156"
            height="192"
            rx="6"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.3"
          />
          <rect
            x="24"
            y="24"
            width="152"
            height="188"
            rx="5"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.15"
          />
        </>
      );
  }
}
