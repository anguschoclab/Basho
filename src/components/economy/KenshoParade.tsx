/**
 * KenshoParade.tsx
 * ================
 * Visual presentation for pre-bout sponsorship ceremonies.
 * Features scrolling traditional banners (Kensho) with premium styling.
 * (Phase N: Institutional Polish)
 */

import { cn } from "@/lib/utils";
import type { KenshoBannerSlot } from "@/engine/types/sponsors";

interface KenshoParadeProps {
  banners: KenshoBannerSlot[];
}

export function KenshoParade({ banners }: KenshoParadeProps) {
  if (!banners || banners.length === 0) return null;

  return (
    <div className="w-full py-8 overflow-hidden bg-muted/20 border-y border-dashed border-primary/20 relative group">
      {/* Scrollable Container */}
      <div className="flex gap-16 animate-infinite-scroll hover:[animation-play-state:paused] px-12">
        {/* Render twice for seamless loop if needed, or just once if count is high */}
        {[...banners, ...banners].map((banner, idx) => (
          <div
            key={`${banner.bannerId}-${idx}`}
            className="flex-shrink-0 flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-700"
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            {/* The Traditional Banner */}
            <div
              className={cn(
                "w-16 h-48 border-4 relative shadow-2xl transition-all hover:scale-110",
                banner.ceremonyStyleTag === "premium"
                  ? "bg-gold border-gold/40 ring-2 ring-gold/20"
                  : "bg-muted border-primary/20",
                "before:absolute before:-top-4 before:left-1/2 before:-translate-x-1/2 before:w-12 before:h-1 before:bg-primary/40 before:rounded-full"
              )}
            >
              {/* Top Reinforcement */}
              <div className="absolute top-0 w-full h-2 bg-primary/10" />

              {/* Calligraphy Area */}
              <div className="h-full flex flex-col items-center justify-center p-2">
                <div
                  className={cn(
                    "font-display font-black text-center text-sm leading-tight rotate-180 [writing-mode:vertical-rl]",
                    banner.ceremonyStyleTag === "premium" ? "text-background" : "text-primary/80"
                  )}
                >
                  {banner.displayName}
                </div>
              </div>

              {/* Bottom Weight */}
              <div className="absolute bottom-0 w-full h-1 bg-primary/20" />
            </div>

            {/* Banner Metadata Badge */}
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "text-[7px] font-black uppercase tracking-[0.2em]",
                  banner.ceremonyStyleTag === "premium" ? "text-gold" : "text-muted-foreground/60"
                )}
              >
                {banner.tier === "T5" ? "National Brand" : "Local Patron"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Atmospheric Overlays */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />

      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <div className="h-px w-8 bg-primary/20" />
        <span className="text-[9px] font-black uppercase tracking-widest text-primary/40 italic">
          Kensho-hiroō Ceremony
        </span>
        <div className="h-px w-8 bg-primary/20" />
      </div>
    </div>
  );
}
