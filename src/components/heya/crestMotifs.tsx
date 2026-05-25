/**
 * Shared crest motif rendering functions for Heya branding components.
 */

import React from "react";

/**
 * Render the crest motif as SVG
 */
export function renderCrestMotif(motif: string, color: string): React.ReactNode {
  const MOTIF_HANDLERS: Record<string, () => React.ReactNode> = {
    mountain: () => (
      <path
        d="M50 20 L80 80 H20 Z"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinejoin="round"
      />
    ),
    wave: () => (
      <path
        d="M10 50 Q30 30 50 50 Q70 70 90 50"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
      />
    ),
    circle: () => <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="8" />,
    diamond: () => (
      <path d="M50 15 L85 50 L50 85 L15 50 Z" fill="none" stroke={color} strokeWidth="8" />
    ),
    star: () => (
      <path
        d="M50 10 L60 40 L95 40 L65 60 L75 90 L50 70 L25 90 L35 60 L5 40 L40 40 Z"
        fill="none"
        stroke={color}
        strokeWidth="6"
      />
    ),
    chrysanthemum: () => (
      <g>
        {[...Array(12)].map((_, i) => (
          <ellipse
            key={i}
            cx={50}
            cy={50}
            rx="8"
            ry="25"
            fill="none"
            stroke={color}
            strokeWidth="4"
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
      </g>
    ),
    bamboo: () => (
      <g>
        <rect x="45" y="10" width="10" height="35" fill={color} rx="2" />
        <rect x="45" y="35" width="10" height="30" fill={color} rx="2" />
        <rect x="45" y="60" width="10" height="30" fill={color} rx="2" />
      </g>
    ),
    pine: () => (
      <g>
        <path
          d="M50 10 L80 40 H60 L85 70 H65 L90 90 H10 L35 70 H15 L40 40 H20 Z"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinejoin="round"
        />
      </g>
    ),
    plum: () => (
      <g>
        <circle cx="50" cy="50" r="20" fill={color} opacity="0.3" />
        {[...Array(5)].map((_, i) => (
          <circle
            key={i}
            cx={50 + 25 * Math.cos((i * 72 * Math.PI) / 180)}
            cy={50 + 25 * Math.sin((i * 72 * Math.PI) / 180)}
            r="6"
            fill={color}
          />
        ))}
      </g>
    ),
    crane: () => (
      <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
        <path d="M30 70 Q50 50 70 70" />
        <path d="M50 50 L50 20" />
        <path d="M50 30 L35 15" />
        <path d="M50 30 L65 15" />
      </g>
    ),
    torii: () => (
      <g fill="none" stroke={color} strokeWidth="8" strokeLinecap="round">
        <path d="M20 25 H80" />
        <path d="M35 40 V80" />
        <path d="M65 40 V80" />
        <path d="M25 40 H75" />
      </g>
    ),
    dragon: () => (
      <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
        <path d="M20 50 Q35 30 50 50 Q65 70 80 50" />
        <path d="M30 40 L30 25" />
        <path d="M70 40 L70 25" />
        <circle cx="35" cy="45" r="3" fill={color} />
        <circle cx="65" cy="45" r="3" fill={color} />
      </g>
    ),
    phoenix: () => (
      <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
        <path d="M50 20 Q30 40 50 60 Q70 40 50 20" />
        <path d="M50 40 L30 25" />
        <path d="M50 40 L70 25" />
        <path d="M50 60 L35 80" />
        <path d="M50 60 L65 80" />
      </g>
    ),
    tiger: () => (
      <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
        <path d="M25 50 Q50 30 75 50" />
        <path d="M30 50 L25 35" />
        <path d="M70 50 L75 35" />
        <path d="M40 55 L40 70" />
        <path d="M60 55 L60 70" />
        <circle cx="40" cy="45" r="3" fill={color} />
        <circle cx="60" cy="45" r="3" fill={color} />
      </g>
    ),
    sakura: () => (
      <g>
        {[...Array(5)].map((_, i) => (
          <g
            key={i}
            transform={`rotate(${i * 72} 50 50) translate(50 20)`}
            fill="none"
            stroke={color}
            strokeWidth="4"
          >
            <ellipse cx="0" cy="0" rx="8" ry="12" />
            <path d="M0 12 L0 20" strokeWidth="2" />
          </g>
        ))}
        <circle cx="50" cy="50" r="5" fill={color} />
      </g>
    ),
    rising_sun: () => (
      <g fill="none" stroke={color} strokeWidth="6">
        <circle cx="50" cy="50" r="15" />
        {[...Array(8)].map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="25"
            x2={50 + 20 * Math.cos((i * 45 * Math.PI) / 180)}
            y2={25 + 20 * Math.sin((i * 45 * Math.PI) / 180)}
            strokeWidth="4"
          />
        ))}
      </g>
    ),
    lightning: () => (
      <g fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round">
        <path d="M55 15 L35 45 L50 45 L30 85 L70 45 L55 45 Z" />
      </g>
    ),
    waterfall: () => (
      <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
        <path d="M30 20 L30 80" />
        <path d="M50 15 L50 85" />
        <path d="M70 20 L70 80" />
        {[...Array(3)].map((_, i) => (
          <path
            key={i}
            d={`M${30 + i * 20} ${60 + i * 5} L${40 + i * 20} ${70 + i * 5}`}
            strokeWidth="3"
          />
        ))}
      </g>
    ),
    temple: () => (
      <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
        <path d="M20 35 L50 15 L80 35" />
        <path d="M25 35 V75" />
        <path d="M75 35 V75" />
        <path d="M20 75 H80" />
        <path d="M35 35 V55" />
        <path d="M65 35 V55" />
        <path d="M30 55 H70" />
      </g>
    ),
    carp: () => (
      <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
        <path d="M20 50 Q35 35 50 50 Q65 65 80 50" />
        <path d="M25 45 L15 40" />
        <path d="M75 45 L85 40" />
        <path d="M45 50 L35 60" />
        <path d="M55 50 L65 60" />
        <circle cx="35" cy="45" r="3" fill={color} />
        <circle cx="65" cy="45" r="3" fill={color} />
      </g>
    ),
  };

  const handler = MOTIF_HANDLERS[motif];
  return handler ? (
    handler()
  ) : (
    <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="8" />
  );
}
