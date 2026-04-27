/**
 * KeshoMiniIndicator Component
 *
 * Tiny 16x24px simplified kesho-mawashi representation for list views.
 * Shows for sekitori in banzuke, roster widgets, and other compact displays.
 */

import type { KeshoMawashi } from "@/engine/types/keshoMawashi";
import { cn } from "@/lib/utils";

interface KeshoMiniIndicatorProps {
  kesho: KeshoMawashi;
  className?: string;
}

/**
 * Display a miniature kesho-mawashi indicator
 */
export function KeshoMiniIndicator({ kesho, className }: KeshoMiniIndicatorProps) {
  const tierColors: Record<string, string> = {
    juryo: "bg-slate-500",
    makuuchi: "bg-blue-500",
    sanyaku: "bg-purple-500",
    yokozuna: "bg-yellow-500",
  };

  return (
    <div
      className={cn(
        "relative w-4 h-6 rounded-sm overflow-hidden shadow-sm",
        tierColors[kesho.tier] || "bg-gray-500",
        className
      )}
      title={`Kesho-mawashi (${kesho.tier}): ${kesho.description}`}
    >
      {/* Mini pattern overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(135deg, ${kesho.secondaryColor} 0%, ${kesho.primaryColor} 100%)`,
        }}
      />

      {/* Gold thread hint for higher tiers */}
      {(kesho.tier === "sanyaku" || kesho.tier === "yokozuna") && (
        <div className="absolute inset-0 opacity-20" style={{ background: kesho.accentColor }} />
      )}

      {/* Tier-specific border */}
      <div
        className="absolute inset-0 rounded-sm border border-white/20"
        style={{ borderColor: kesho.accentColor }}
      />
    </div>
  );
}
