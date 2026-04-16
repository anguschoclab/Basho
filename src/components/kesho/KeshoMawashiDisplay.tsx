/**
 * Kesho-Mawashi Display Component
 *
 * Renders a visual representation of a rikishi's ceremonial apron.
 */

import React from "react";
import type { KeshoMawashi, YokozunaTsuna } from "@/engine/types/keshoMawashi";
import { cn } from "@/lib/utils";

interface KeshoMawashiDisplayProps {
  mawashi: KeshoMawashi;
  size?: "sm" | "md" | "lg" | "card";
  className?: string;
}

/**
 * Display a kesho-mawashi as an SVG visualization
 */
export function KeshoMawashiDisplay({ mawashi, size = "md", className }: KeshoMawashiDisplayProps) {
  const sizeClasses = {
    sm: "w-16 h-20",
    md: "w-24 h-32",
    lg: "w-32 h-44",
    card: "w-full h-48",
  };

  const goldOpacity = mawashi.goldThreadDensity;

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <svg
        viewBox="0 0 200 280"
        className="w-full h-full drop-shadow-md"
        aria-label={`Kesho-mawashi: ${mawashi.description || "Ceremonial apron"}`}
      >
        {/* Main apron body with embossed border effect */}
        {/* Outer border (light) */}
        <rect
          x="18"
          y="18"
          width="164"
          height="204"
          rx="10"
          fill="none"
          stroke={mawashi.accentColor}
          strokeWidth="1"
          opacity="0.5"
        />
        {/* Middle border (main) */}
        <rect
          x="20"
          y="20"
          width="160"
          height="200"
          rx="8"
          fill={mawashi.primaryColor}
          stroke={mawashi.accentColor}
          strokeWidth="2"
        />
        {/* Inner border (dark for embossed effect) */}
        <rect
          x="22"
          y="22"
          width="156"
          height="196"
          rx="7"
          fill="none"
          stroke={mawashi.accentColor}
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Base pattern overlay */}
        {renderBasePattern(mawashi.basePattern, mawashi.primaryColor, mawashi.secondaryColor)}

        {/* Main symbol */}
        {renderSymbol(mawashi.mainSymbol, 100, 120, mawashi.accentColor)}

        {/* Secondary symbol */}
        {mawashi.secondarySymbol &&
          renderSecondarySymbol(mawashi.secondarySymbol, mawashi.accentColor)}

        {/* Tertiary symbol */}
        {mawashi.tertiarySymbol &&
          renderSecondarySymbol(mawashi.tertiarySymbol, mawashi.accentColor, true)}

        {/* Heya crest (small corner emblem) */}
        <g transform="translate(30, 30)" opacity="0.8">
          <circle
            r="12"
            fill={mawashi.secondaryColor}
            stroke={mawashi.accentColor}
            strokeWidth="1"
          />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fontSize="12"
            fill={mawashi.primaryColor}
            fontWeight="bold"
          >
            ★
          </text>
        </g>

        {/* Gold thread shimmer effect */}
        {goldOpacity > 0.3 && (
          <>
            <rect
              x="20"
              y="20"
              width="160"
              height="200"
              rx="8"
              fill="url(#goldShimmer)"
              opacity={goldOpacity * 0.4}
            />
            <rect
              x="20"
              y="20"
              width="160"
              height="200"
              rx="8"
              fill="url(#goldShimmer2)"
              opacity={goldOpacity * 0.2}
            />
          </>
        )}

        {/* Fringe at bottom with sway animation */}
        {renderFringe(mawashi.goldThreadDensity, mawashi.accentColor)}

        {/* Definitions */}
        <defs>
          <linearGradient id="goldShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.3" />
            <stop offset="25%" stopColor="#FFA500" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#FFD700" stopOpacity="0.6" />
            <stop offset="75%" stopColor="#FFA500" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="goldShimmer2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFD700" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </linearGradient>
          <style>
            {`
              @keyframes shimmer {
                0% { opacity: 0.2; }
                50% { opacity: 0.5; }
                100% { opacity: 0.2; }
              }
              .animate-shimmer {
                animation: shimmer 3s ease-in-out infinite;
              }
            `}
          </style>
        </defs>
      </svg>

      {/* Tier badge */}
      <div className="absolute -top-1 -right-1">
        <TierBadge tier={mawashi.tier} />
      </div>
    </div>
  );
}

/**
 * Render the base pattern for the mawashi
 */
function renderBasePattern(
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

/**
 * Render the main symbol based on type
 */
function renderSymbol(
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
function renderSecondarySymbol(
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

/**
 * Render fringe at the bottom of the mawashi with sway animation
 */
function renderFringe(density: number, color: string): React.ReactNode {
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

/**
 * Tier badge component with tier-specific styling
 */
function TierBadge({ tier }: { tier: string }) {
  const tierConfig: Record<string, { bg: string; border: string; icon: string; label: string }> = {
    juryo: {
      bg: "bg-slate-600",
      border: "border-slate-400",
      icon: "J",
      label: "Juryo",
    },
    makuuchi: {
      bg: "bg-blue-600",
      border: "border-blue-400",
      icon: "M",
      label: "Makuuchi",
    },
    sanyaku: {
      bg: "bg-purple-600",
      border: "border-purple-400",
      icon: "S",
      label: "Sanyaku",
    },
    yokozuna: {
      bg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
      border: "border-yellow-300",
      icon: "Y",
      label: "Yokozuna",
    },
  };

  const config = tierConfig[tier] || {
    bg: "bg-gray-500",
    border: "border-gray-400",
    icon: "?",
    label: "Unknown",
  };

  return (
    <div
      className={cn(
        "relative w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center",
        config.bg,
        config.border
      )}
      title={`Tier: ${config.label}`}
    >
      <span className="text-[10px] font-bold text-white">{config.icon}</span>
      {/* Yokozuna gets a crown glow effect */}
      {tier === "yokozuna" && (
        <div className="absolute inset-0 rounded-full animate-pulse-glow bg-yellow-400/20" />
      )}
    </div>
  );
}

/**
 * Yokozuna Tsuna (Rope Belt) Display
 */
interface YokozunaTsunaDisplayProps {
  tsuna: YokozunaTsuna;
  size?: "sm" | "md" | "lg";
  variant?: "active" | "retired";
  className?: string;
}

export function YokozunaTsunaDisplay({
  tsuna,
  size = "md",
  variant = "active",
  className,
}: YokozunaTsunaDisplayProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  const isRetired = variant === "retired" || tsuna.isRetired;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full",
        sizeClasses[size],
        className
      )}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Rope circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={tsuna.ropeColor === "gold_accented" ? "#FFD700" : "#FFFFFF"}
          strokeWidth="6"
          opacity={isRetired ? 0.5 : 1}
        />

        {/* Twisted rope effect */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#000000"
          strokeWidth="1"
          strokeDasharray="4 2"
          opacity={isRetired ? 0.3 : 0.6}
        />

        {/* Paper tassels */}
        {renderPaperTassels(tsuna.paperTassels, isRetired)}
      </svg>

      {/* Yokozuna crown icon */}
      <div className="absolute -top-1 -right-1 text-yellow-500">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Render paper tassels hanging from the tsuna
 */
function renderPaperTassels(count: number, isRetired: boolean): React.ReactNode {
  const tasselPositions = [
    { x: 50, y: 12 },
    { x: 12, y: 50 },
    { x: 88, y: 50 },
    { x: 25, y: 25 },
    { x: 75, y: 25 },
    { x: 25, y: 75 },
    { x: 75, y: 75 },
  ];

  return (
    <g>
      {tasselPositions.slice(0, count).map((pos, i) => (
        <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
          {/* Paper zigzag */}
          <path
            d="M-3,0 L3,0 L3,8 L-3,8 Z M-3,10 L3,10 L3,18 L-3,18 Z"
            fill="#FFFFFF"
            opacity={isRetired ? 0.4 : 0.8}
          />
        </g>
      ))}
    </g>
  );
}
