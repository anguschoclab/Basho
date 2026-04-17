/**
 * keshoPatterns.tsx
 *
 * Pattern rendering functions for kesho-mawashi display.
 */

import React from "react";

/**
 * Render the base pattern for the mawashi
 */
export function renderBasePattern(
  pattern: string,
  primaryColor: string,
  secondaryColor: string
): React.ReactNode {
  switch (pattern) {
    case "striped":
      return (
        <g opacity={0.3}>
          {[...Array(8)].map((_, i) => (
            <rect key={i} x={20 + i * 20} y="20" width="10" height="200" fill={secondaryColor} />
          ))}
        </g>
      );
    case "gradient":
      return (
        <defs>
          <linearGradient id="baseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
        </defs>
      );
    case "cloud":
      return (
        <g opacity={0.2} fill={secondaryColor}>
          <circle cx="60" cy="60" r="20" />
          <circle cx="100" cy="50" r="25" />
          <circle cx="140" cy="60" r="20" />
          <circle cx="80" cy="100" r="15" />
          <circle cx="120" cy="110" r="18" />
          <circle cx="100" cy="140" r="22" />
        </g>
      );
    case "ray":
      return (
        <g opacity={0.3} stroke={secondaryColor} strokeWidth="2">
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="100"
              y1="120"
              x2={100 + 80 * Math.cos((i * 30 * Math.PI) / 180)}
              y2={120 + 80 * Math.sin((i * 30 * Math.PI) / 180)}
            />
          ))}
        </g>
      );
    case "waves":
      return (
        <g opacity={0.25} fill="none" stroke={secondaryColor} strokeWidth="2">
          {[...Array(6)].map((_, i) => (
            <path
              key={i}
              d={`M 20 ${40 + i * 35} Q 60 ${30 + i * 35} 100 ${40 + i * 35} Q 140 ${50 + i * 35} 180 ${40 + i * 35}`}
            />
          ))}
        </g>
      );
    case "scales":
      return (
        <g opacity={0.3} fill={secondaryColor}>
          {[...Array(5)].map((_, row) =>
            [...Array(7)].map((_, col) => (
              <ellipse
                key={`${row}-${col}`}
                cx={35 + col * 20 + (row % 2) * 10}
                cy={40 + row * 35}
                rx="8"
                ry="12"
              />
            ))
          )}
        </g>
      );
    case "geometric":
      return (
        <g opacity={0.3} fill="none" stroke={secondaryColor} strokeWidth="1.5">
          {[...Array(4)].map((_, i) => (
            <rect
              key={i}
              x={30 + i * 30}
              y={30 + i * 30}
              width={140 - i * 60}
              height={180 - i * 60}
              rx="4"
            />
          ))}
        </g>
      );
    case "dragon":
      return (
        <g opacity={0.2} fill={secondaryColor}>
          {/* Dragon body curve */}
          <path
            d="M 30 60 Q 60 40 100 60 Q 140 80 170 60"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="3"
          />
          <path
            d="M 30 100 Q 60 80 100 100 Q 140 120 170 100"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="3"
          />
          <path
            d="M 30 140 Q 60 120 100 140 Q 140 160 170 140"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="3"
          />
          {/* Dragon scales */}
          {[...Array(12)].map((_, i) => (
            <circle key={i} cx={40 + (i % 4) * 40} cy={70 + Math.floor(i / 4) * 35} r="6" />
          ))}
        </g>
      );
    case "phoenix":
      return (
        <g opacity={0.2} fill={secondaryColor}>
          {/* Phoenix wing pattern */}
          <path
            d="M 40 50 Q 70 30 100 50 Q 130 70 160 50"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
          />
          <path
            d="M 40 90 Q 70 70 100 90 Q 130 110 160 90"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
          />
          <path
            d="M 40 130 Q 70 110 100 130 Q 130 150 160 130"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
          />
          {/* Phoenix feathers */}
          {[...Array(9)].map((_, i) => (
            <path
              key={i}
              d={`M ${50 + (i % 3) * 50} ${60 + Math.floor(i / 3) * 40} L ${55 + (i % 3) * 50} ${70 + Math.floor(i / 3) * 40} L ${50 + (i % 3) * 50} ${80 + Math.floor(i / 3) * 40}`}
            />
          ))}
        </g>
      );
    default:
      return null;
  }
}
