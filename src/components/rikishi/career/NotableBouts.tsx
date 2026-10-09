/**
 * NotableBouts.tsx
 *
 * Expandable notable-bouts list for the rikishi career tab.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Star, Swords } from "lucide-react";
import type { NotableBoutEntry } from "@/presenters/engineAccess";

export function NotableBouts({ notableBouts }: { notableBouts?: NotableBoutEntry[] }) {
  const [expandedBoutId, setExpandedBoutId] = useState<string | null>(null);
  if (!notableBouts || notableBouts.length === 0) return null;
  return (
    <div className="space-y-6 pt-10 border-t-2 border-dashed">
      <h3 className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
        <Swords className="h-6 w-6 text-primary" />
        Notable Bouts
      </h3>
      <div className="space-y-3">
        {notableBouts.map((b, i: number) => (
          <div
            key={i}
            className="border border-border/40 rounded-lg p-4 hover:bg-primary/5 transition-colors"
          >
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedBoutId(expandedBoutId === b.boutId ? null : b.boutId)}
            >
              <div className="flex items-center gap-3">
                <button
                  className="text-xs font-black uppercase tracking-widest text-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedBoutId(expandedBoutId === b.boutId ? null : b.boutId);
                  }}
                >
                  {b.boutId}
                </button>
                <span className="text-sm font-display font-black">
                  {b.winner ? "W" : "L"} vs {b.opponentShikona}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {b.isKinboshi && (
                  <Badge className="text-[9px] font-black uppercase tracking-widest bg-gold/20 text-gold border border-gold/40">
                    <Star className="h-3 w-3 mr-1" /> Kinboshi
                  </Badge>
                )}
                {b.isUpset && (
                  <Badge className="text-[9px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/40">
                    UPSET
                  </Badge>
                )}
                {b.isYushoRace && (
                  <Badge className="text-[9px] font-black uppercase tracking-widest bg-gold/20 text-gold border border-gold/40">
                    Yusho Race
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase tracking-widest"
                >
                  {b.kimarite}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase tracking-widest"
                >
                  {b.year} {b.bashoName} Day {b.day}
                </Badge>
              </div>
            </div>
            {expandedBoutId === b.boutId && b.narrativeLines.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/20 space-y-1">
                {b.narrativeLines.map((line, j: number) => (
                  <p key={j} className="text-xs text-muted-foreground font-display italic">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
