/**
 * Kesho-Mawashi Display Component
 *
 * Renders a visual representation of a rikishi's ceremonial apron.
 */

import React from "react";
import type { KeshoMawashi } from "@/engine/types/keshoMawashi";
import { cn } from "@/lib/utils";
import { renderBasePattern } from "./keshoPatterns";
import { renderSymbol, renderSecondarySymbol } from "./keshoSymbols";
import { renderBorder } from "./keshoBorders";
import { renderEmbroideryEffect, renderFringe } from "./keshoEffects";
import { TierBadge } from "./keshoComponents";

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

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <svg
        viewBox="0 0 200 280"
        className="w-full h-full drop-shadow-md"
        aria-label={`Kesho-mawashi: ${mawashi.description || "Ceremonial apron"}`}
      >
        {/* Main apron body with embossed border effect */}
        {/* Border */}
        {renderBorder(mawashi.borderStyle, mawashi.accentColor)}

        {/* Embroidery effect overlay */}
        {renderEmbroideryEffect(
          mawashi.embroideryStyle,
          mawashi.accentColor,
          mawashi.goldThreadDensity
        )}

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
        {mawashi.goldThreadDensity > 0.3 && (
          <>
            <rect
              x="20"
              y="20"
              width="160"
              height="200"
              rx="8"
              fill="url(#goldShimmer)"
              opacity={mawashi.goldThreadDensity * 0.4}
            />
            <rect
              x="20"
              y="20"
              width="160"
              height="200"
              rx="8"
              fill="url(#goldShimmer2)"
              opacity={mawashi.goldThreadDensity * 0.2}
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
        </defs>
      </svg>

      {/* Tier badge */}
      <div className="absolute -top-1 -right-1">
        <TierBadge tier={mawashi.tier} />
      </div>
    </div>
  );
}
