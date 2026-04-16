/**
 * HeyaBrandBadge Component
 *
 * Small circular/crest display showing heya brand colors and motif.
 * Used in main menu, roster lists, and other compact views.
 */

import type { HeyaBrandIdentity } from "@/engine/types/keshoMawashi";
import { cn } from "@/lib/utils";
import { renderCrestMotif } from "./crestMotifs";

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
