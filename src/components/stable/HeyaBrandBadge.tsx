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

  const getShapeClass = (style: string) => {
    switch (style) {
      case "circular":
        return "rounded-full";
      case "square":
        return "rounded-md";
      case "diamond":
        return "rounded-md rotate-45";
      case "oval":
        return "rounded-[50%]";
      case "shield":
        return "rounded-b-[50%] rounded-t-md";
      case "hexagonal":
        return "clip-path-hexagon";
      case "star":
        return "clip-path-star";
      case "octagonal":
        return "clip-path-octagon";
      case "triangular":
        return "clip-path-triangle";
      case "crescent":
        return "clip-path-crescent";
      default:
        return "rounded-full";
    }
  };

  const getClipPath = (style: string) => {
    switch (style) {
      case "hexagonal":
        return "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
      case "star":
        return "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
      case "octagonal":
        return "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)";
      case "triangular":
        return "polygon(50% 0%, 0% 100%, 100% 100%)";
      case "crescent":
        return "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%, 50% 50%, 30% 50%, 30% 0%)";
      default:
        return "none";
    }
  };

  const clipPath = getClipPath(brand.crestStyle);
  const needsClipPath = clipPath !== "none";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative border-2 shadow-md overflow-hidden",
          sizeClasses[size],
          getShapeClass(brand.crestStyle)
        )}
        style={{
          background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)`,
          borderColor: brand.accentColor,
          clipPath: needsClipPath ? clipPath : undefined,
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
