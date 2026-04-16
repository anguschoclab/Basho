/**
 * HeyaBrandHeader Component
 *
 * Full header component for stable pages with brand theming.
 * Features background gradient, large crest motif watermark, and brand-colored styling.
 */

import React from "react";
import type { HeyaBrandIdentity } from "@/engine/types/keshoMawashi";
import { cn } from "@/lib/utils";

interface HeyaBrandHeaderProps {
  brand: HeyaBrandIdentity;
  heyaName: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Display a branded header for stable pages
 */
export function HeyaBrandHeader({
  brand,
  heyaName,
  subtitle,
  size = "lg",
  className,
}: HeyaBrandHeaderProps) {
  const heightClasses = {
    sm: "h-32",
    md: "h-48",
    lg: "h-64",
  };

  const textSize = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  };

  const subtitleSize = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg shadow-lg",
        heightClasses[size],
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 50%, ${brand.primaryColor} 100%)`,
      }}
    >
      {/* Large crest watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4" style={{ stroke: brand.accentColor }}>
          {renderCrestMotif(brand.crestMotif, brand.accentColor)}
        </svg>
      </div>

      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <svg viewBox="0 0 200 100" className="w-full h-full" preserveAspectRatio="none">
          <pattern
            id="brandPattern"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="10" cy="10" r="2" fill={brand.accentColor} />
          </pattern>
          <rect width="100%" height="100%" fill="url(#brandPattern)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-6">
        <div className="flex items-center gap-4">
          {/* Small brand badge */}
          <div className="relative w-12 h-12 rounded-full border-2 shadow-md overflow-hidden flex-shrink-0">
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)`,
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full p-1">
                {renderCrestMotif(brand.crestMotif, brand.accentColor)}
              </svg>
            </div>
          </div>

          {/* Text */}
          <div className="flex-1">
            <h1
              className={cn("font-display font-black text-white drop-shadow-lg", textSize[size])}
              style={{
                borderBottom: `3px solid ${brand.accentColor}`,
                paddingBottom: "0.25rem",
              }}
            >
              {heyaName}
            </h1>
            {subtitle && (
              <p className={cn("text-white/80 font-medium mt-1", subtitleSize[size])}>{subtitle}</p>
            )}
          </div>

          {/* Tradition level badge */}
          {brand.traditionLevel >= 0.9 && (
            <div className="flex-shrink-0">
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
                <span className="text-xs font-bold text-white">Legendary Tradition</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: brand.accentColor }}
      />
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
              cx="50"
              cy="50"
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
