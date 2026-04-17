/**
 * keshoComponents.tsx
 *
 * Component functions for kesho-mawashi display.
 */

import React from "react";
import type { YokozunaTsuna } from "@/engine/types/keshoMawashi";
import { cn } from "@/lib/utils";

/**
 * Tier badge component with tier-specific styling
 */
export function TierBadge({ tier }: { tier: string }) {
  const tierConfig: Record<string, { bg: string; border: string; icon: string; label: string }> = {
    juryo: {
      bg: "bg-muted-foreground",
      border: "border-muted-foreground/70",
      icon: "J",
      label: "Juryo",
    },
    makuuchi: {
      bg: "bg-west",
      border: "border-west/70",
      icon: "M",
      label: "Makuuchi",
    },
    sanyaku: {
      bg: "bg-primary",
      border: "border-primary/70",
      icon: "S",
      label: "Sanyaku",
    },
    yokozuna: {
      bg: "bg-gradient-to-br from-gold to-gold/80",
      border: "border-gold/70",
      icon: "Y",
      label: "Yokozuna",
    },
  };

  const config = tierConfig[tier] || {
    bg: "bg-muted",
    border: "border-muted-foreground",
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
        <div className="absolute inset-0 rounded-full animate-pulse-glow bg-gold/20" />
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
      <div className="absolute -top-1 -right-1 text-gold">
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
