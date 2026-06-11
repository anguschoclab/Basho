/**
 * HeyaBrandHeader Component
 *
 * Full header component for stable pages with brand theming.
 * Features background gradient, large crest motif watermark, and brand-colored styling.
 */

import type { HeyaBrandIdentity } from "@/engine/types/keshoMawashi";
import { cn } from "@/lib/utils";
import { renderCrestMotif } from "./crestMotifs";

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

  const getShapeClass = (style: string) => {
    const SHAPE_CLASSES: Record<string, string> = {
      circular: "rounded-full",
      square: "rounded-md",
      diamond: "rounded-md rotate-45",
      oval: "rounded-[50%]",
      shield: "rounded-b-[50%] rounded-t-md",
      hexagonal: "rounded-md",
      star: "rounded-md",
      octagonal: "rounded-md",
      triangular: "rounded-md",
      crescent: "rounded-md",
    };
    return SHAPE_CLASSES[style] || "rounded-full";
  };

  const getClipPath = (style: string) => {
    const CLIP_PATHS: Record<string, string> = {
      hexagonal: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
      octagonal: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
      triangular: "polygon(50% 0%, 0% 100%, 100% 100%)",
      crescent: "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%, 50% 50%, 30% 50%, 30% 0%)",
    };
    return CLIP_PATHS[style] || "none";
  };

  const clipPath = getClipPath(brand.crestStyle);
  const needsClipPath = clipPath !== "none";

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

      {/* Decorative pattern overlay using crest motif */}
      <div className="absolute inset-0 opacity-5 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-1/2 h-1/2" style={{ stroke: brand.accentColor }}>
          {renderCrestMotif(brand.crestMotif, brand.accentColor)}
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-6">
        <div className="flex items-center gap-4">
          {/* Small brand badge */}
          <div
            className={cn(
              "relative w-12 h-12 border-2 shadow-md overflow-hidden flex-shrink-0",
              getShapeClass(brand.crestStyle)
            )}
            style={{
              background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)`,
              borderColor: brand.accentColor,
              clipPath: needsClipPath ? clipPath : undefined,
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full p-1">
              {renderCrestMotif(brand.crestMotif, brand.accentColor)}
            </svg>
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
