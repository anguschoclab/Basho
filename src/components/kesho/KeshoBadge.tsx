/**
 * KeshoBadge Component
 *
 * Medium 40x60px display for roster cards showing kesho pattern swatch and tier indicator.
 * Used in roster lists, rikishi cards, and other medium-sized displays.
 */

import type { KeshoMawashi } from "@/engine/types/keshoMawashi";
import { cn } from "@/lib/utils";

interface KeshoBadgeProps {
  kesho: KeshoMawashi;
  size?: "sm" | "md" | "lg";
  showTier?: boolean;
  className?: string;
}

/**
 * Display a kesho-mawashi badge for roster cards
 */
export function KeshoBadge({ kesho, size = "md", showTier = true, className }: KeshoBadgeProps) {
  const sizeClasses = {
    sm: "w-8 h-12",
    md: "w-10 h-14",
    lg: "w-12 h-16",
  };

  const tierColors: Record<string, string> = {
    juryo: "bg-muted-foreground",
    makuuchi: "bg-west",
    sanyaku: "bg-primary",
    yokozuna: "bg-gradient-to-br from-gold to-gold/80",
  };

  return (
    <div
      className={cn(
        "relative rounded-xs overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow",
        sizeClasses[size],
        className
      )}
      title={`Kesho-mawashi (${kesho.tier}): ${kesho.description}`}
      style={{
        background: `linear-gradient(135deg, ${kesho.primaryColor} 0%, ${kesho.secondaryColor} 100%)`,
      }}
    >
      {/* Pattern swatch */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: getPatternStyle(kesho.basePattern, kesho.secondaryColor),
        }}
      />

      {/* Gold thread overlay */}
      {kesho.goldThreadDensity > 0.3 && (
        <div
          className="absolute inset-0 opacity-30 animate-shimmer"
          style={{
            background: `linear-gradient(135deg, ${kesho.accentColor} 0%, transparent 50%, ${kesho.accentColor} 100%)`,
            backgroundSize: "200% 200%",
          }}
        />
      )}

      {/* Border */}
      <div
        className="absolute inset-0 rounded-xs border-2"
        style={{ borderColor: kesho.accentColor }}
      />

      {/* Tier indicator */}
      {showTier && (
        <div
          className={cn(
            "absolute bottom-0 right-0 w-4 h-4 rounded-tl-sm border-2 border-white flex items-center justify-center",
            tierColors[kesho.tier]
          )}
        >
          <span className="text-[8px] font-bold text-white">
            {kesho.tier.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Get CSS background style for pattern
 */
function getPatternStyle(pattern: string, color: string): string {
  switch (pattern) {
    case "striped":
      return `repeating-linear-gradient(90deg, transparent, transparent 4px, ${color} 4px, ${color} 8px)`;
    case "checkered":
      return `conic-gradient(${color} 90deg, transparent 90deg 180deg, ${color} 180deg 270deg, transparent 270deg)`;
    case "waves":
      return `repeating-linear-gradient(0deg, transparent, transparent 5px, ${color} 5px, ${color} 8px)`;
    case "plaid":
      return `repeating-linear-gradient(90deg, transparent, transparent 8px, ${color} 8px, ${color} 12px), repeating-linear-gradient(0deg, transparent, transparent 8px, ${color} 8px, ${color} 12px)`;
    case "chevron":
      return `linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 50%, ${color} 50%, ${color} 75%, transparent 75%)`;
    case "lattice":
      return `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;
    case "hexagonal":
      return `linear-gradient(30deg, ${color} 12%, transparent 12.5%, transparent 87%, ${color} 87.5%, ${color}), linear-gradient(150deg, ${color} 12%, transparent 12.5%, transparent 87%, ${color} 87.5%, ${color}), linear-gradient(30deg, ${color} 12%, transparent 12.5%, transparent 87%, ${color} 87.5%, ${color}), linear-gradient(150deg, ${color} 12%, transparent 12.5%, transparent 87%, ${color} 87.5%, ${color})`;
    default:
      return "none";
  }
}
