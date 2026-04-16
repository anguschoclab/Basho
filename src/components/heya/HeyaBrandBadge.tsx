/**
 * HeyaBrandBadge Component
 *
 * Small circular/crest display showing heya brand colors and motif.
 * Used in main menu, roster lists, and other compact views.
 */

import React from "react";
import type { HeyaBrandIdentity } from "@/engine/types/keshoMawashi";
import { cn } from "@/lib/utils";

interface HeyaBrandBadgeProps {
  brand: HeyaBrandIdentity;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Display a heya's brand identity as a circular crest badge
 */
export function HeyaBrandBadge({
  brand,
  size = "md",
  showLabel = false,
  className,
}: HeyaBrandBadgeProps) {
  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const textSize = {
    xs: "text-[8px]",
    sm: "text-[10px]",
    md: "text-[12px]",
    lg: "text-[14px]",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative rounded-full border-2 shadow-md overflow-hidden",
          sizeClasses[size]
        )}
        style={{
          background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)`,
          borderColor: brand.accentColor,
        }}
        title={`Heya Brand - Tradition: ${Math.round(brand.traditionLevel * 100)}%`}
      >
        {/* Crest motif */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className={cn(sizeClasses[size], "p-1")}>
            {renderCrestMotif(brand.crestMotif, brand.accentColor)}
          </svg>
        </div>

        {/* Tradition level indicator */}
        {brand.traditionLevel >= 0.9 && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/20 to-transparent" />
        )}
      </div>

      {showLabel && (
        <span className={cn("font-bold text-primary", textSize[size])}>{brand.heyaId}</span>
      )}
    </div>
  );
}

/**
 * Render the crest motif as SVG
 */
function renderCrestMotif(motif: string, color: string): React.ReactNode {
  switch (motif) {
    case "mountain":
      return (
        <path
          d="M50 20 L80 80 H20 Z"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinejoin="round"
        />
      );
    case "wave":
      return (
        <path
          d="M10 50 Q30 30 50 50 Q70 70 90 50"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
        />
      );
    case "circle":
      return <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="8" />;
    case "diamond":
      return <path d="M50 15 L85 50 L50 85 L15 50 Z" fill="none" stroke={color} strokeWidth="8" />;
    case "star":
      return (
        <path
          d="M50 10 L60 40 L95 40 L65 60 L75 90 L50 70 L25 90 L35 60 L5 40 L40 40 Z"
          fill="none"
          stroke={color}
          strokeWidth="6"
        />
      );
    case "chrysanthemum":
      return (
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
      );
    case "bamboo":
      return (
        <g>
          <rect x="45" y="10" width="10" height="35" fill={color} rx="2" />
          <rect x="45" y="35" width="10" height="30" fill={color} rx="2" />
          <rect x="45" y="60" width="10" height="30" fill={color} rx="2" />
        </g>
      );
    case "pine":
      return (
        <g>
          <path
            d="M50 10 L80 40 H60 L85 70 H65 L90 90 H10 L35 70 H15 L40 40 H20 Z"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </g>
      );
    case "plum":
      return (
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
      );
    case "crane":
      return (
        <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
          <path d="M30 70 Q50 50 70 70" />
          <path d="M50 50 L50 20" />
          <path d="M50 30 L35 15" />
          <path d="M50 30 L65 15" />
        </g>
      );
    case "torii":
      return (
        <g fill="none" stroke={color} strokeWidth="8" strokeLinecap="round">
          <path d="M20 25 H80" />
          <path d="M35 40 V80" />
          <path d="M65 40 V80" />
          <path d="M25 40 H75" />
        </g>
      );
    default:
      return <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="8" />;
  }
}
