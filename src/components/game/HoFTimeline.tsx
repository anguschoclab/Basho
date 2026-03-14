// HoFTimeline.tsx — Horizontal timeline of Hall of Fame inductions by year
// Shows year markers on a scrollable axis with inductee portrait clusters

import { useMemo, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RikishiName } from "@/components/ClickableName";
import { Trophy, Shield, Target } from "lucide-react";
import type { HoFInductee, HoFCategory } from "@/engine/hallOfFame";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

const CATEGORY_ACCENT: Record<HoFCategory, string> = {
  champion: "text-amber-400 border-amber-500/40",
  iron_man: "text-blue-400 border-blue-500/40",
  technician: "text-emerald-400 border-emerald-500/40",
};

const CATEGORY_BG: Record<HoFCategory, string> = {
  champion: "bg-amber-500/15",
  iron_man: "bg-blue-500/15",
  technician: "bg-emerald-500/15",
};

const CATEGORY_ICON: Record<HoFCategory, React.ElementType> = {
  champion: Trophy,
  iron_man: Shield,
  technician: Target,
};

function TimelinePortrait({
  inductee,
  rikishi,
}: {
  inductee: HoFInductee;
  rikishi: Rikishi | undefined;
}) {
  const accent = CATEGORY_ACCENT[inductee.category];
  const bg = CATEGORY_BG[inductee.category];
  const Icon = CATEGORY_ICON[inductee.category];
  const initials = rikishi?.shikona?.slice(0, 2) ?? "??";

  return (
    <div className="flex flex-col items-center gap-1 group relative">
      {/* Portrait circle */}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-display font-bold border-2 ${accent} ${bg} transition-transform group-hover:scale-110`}
      >
        {initials}
      </div>
      {/* Category icon badge */}
      <Icon className={`h-3 w-3 ${accent.split(" ")[0]}`} />
      {/* Name on hover */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 shadow-lg">
          {inductee.shikona}
        </Badge>
      </div>
    </div>
  );
}

interface HoFTimelineProps {
  inductees: HoFInductee[];
  world: WorldState;
}

export function HoFTimeline({ inductees, world }: HoFTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const yearGroups = useMemo(() => {
    const map = new Map<number, HoFInductee[]>();
    for (const ind of inductees) {
      const arr = map.get(ind.inductionYear) ?? [];
      arr.push(ind);
      map.set(ind.inductionYear, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]); // chronological
  }, [inductees]);

  if (yearGroups.length === 0) {
    return null; // Don't render timeline when empty
  }

  return (
    <div className="rounded-xl border bg-card/50 p-4 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Induction Timeline
      </div>
      <ScrollArea className="w-full">
        <div className="flex items-end gap-0 min-w-max pb-10 pt-2 px-2">
          {yearGroups.map(([year, inds], gi) => (
            <div key={year} className="flex flex-col items-center relative">
              {/* Portraits cluster */}
              <div className="flex gap-1.5 mb-3 px-3">
                {inds.map((ind, i) => (
                  <TimelinePortrait
                    key={`${ind.rikishiId}-${i}`}
                    inductee={ind}
                    rikishi={world.rikishi.get(ind.rikishiId)}
                  />
                ))}
              </div>

              {/* Year marker + line */}
              <div className="flex flex-col items-center">
                {/* Vertical connector */}
                <div className="w-px h-4 bg-border" />
                {/* Dot on the axis */}
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md z-10" />
                {/* Year label */}
                <div className="mt-1.5 text-xs font-display font-bold text-foreground">
                  {year}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {inds.length} inductee{inds.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Horizontal axis segment (except after last) */}
              {gi < yearGroups.length - 1 && (
                <div className="absolute bottom-[38px] left-[calc(50%+6px)] w-[calc(100%)] h-px bg-border" />
              )}
            </div>
          ))}
        </div>

        {/* Continuous axis line behind everything */}
        {yearGroups.length > 1 && (
          <div
            className="absolute h-px bg-border"
            style={{
              bottom: 38,
              left: 24,
              right: 24,
            }}
          />
        )}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
