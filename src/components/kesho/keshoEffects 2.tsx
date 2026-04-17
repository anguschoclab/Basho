/**
 * keshoEffects.tsx
 *
 * Effect rendering functions for kesho-mawashi display.
 */

import React from "react";

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
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="5" cy="5" r="2" fill={color} opacity={0.3 * density} />
        </pattern>
      );
    case "couching":
      return (
        <pattern
          id="couching-pattern"
          x="0"
          y="0"
          width="15"
          height="15"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="7.5"
            x2="15"
            y2="7.5"
            stroke={color}
            strokeWidth="2"
            opacity={0.4 * density}
          />
          <line
            x1="7.5"
            y1="0"
            x2="7.5"
            y2="15"
            stroke={color}
            strokeWidth="1"
            opacity={0.3 * density}
          />
        </pattern>
      );
    case "goldwork":
      return (
        <defs>
          <linearGradient id="goldwork-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.8 * density} />
            <stop offset="50%" stopColor="#FFD700" stopOpacity={0.9 * density} />
            <stop offset="100%" stopColor={color} stopOpacity={0.8 * density} />
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
  const fringeCount = Math.floor(12 + density * 24);

  return (
    <g>
      {/* Fringe base line */}
      <line x1="20" y1="220" x2="180" y2="220" stroke={color} strokeWidth="2" opacity="0.8" />
      {/* Individual tassels with sway animation */}
      {[...Array(fringeCount)].map((_, i) => {
        const x = 25 + i * (150 / fringeCount);
        const swayOffset = Math.sin((i / fringeCount) * Math.PI * 2) * 5;
        const length = 20 + Math.random() * 15;
        const delay = i * 0.05;

        return (
          <g key={i}>
            <line
              x1={x}
              y1="220"
              x2={x + swayOffset}
              y2={220 + length}
              stroke={color}
              strokeWidth="1.5"
              opacity={0.6 + Math.random() * 0.4}
              className="animate-sway"
              style={{ animationDelay: `${delay}s` }}
            />
            {/* Tassel end knot */}
            <circle cx={x + swayOffset} cy={220 + length} r="2" fill={color} opacity="0.8" />
          </g>
        );
      })}
      <style>
        {`
          @keyframes sway {
            0%, 100% { transform: translateX(0px); }
            25% { transform: translateX(3px); }
            75% { transform: translateX(-3px); }
          }
          .animate-sway {
            animation: sway 2s ease-in-out infinite;
            transform-origin: top center;
          }
        `}
      </style>
    </g>
  );
}
