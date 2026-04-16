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
