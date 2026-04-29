// HoFTimeline.tsx — Horizontal timeline of Hall of Fame inductions by year
// Shows year markers on a scrollable axis with inductee portrait clusters

import { useMemo } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { HoFInductee } from "@/engine/hallOfFame";
import type { UIRikishi } from "@/presenters/uiModels";

/** Defines the structure for ho f timeline props. */
interface HoFTimelineProps {
  inductees: HoFInductee[];
  rikishiMap: Map<string, UIRikishi>;
}

/**
 * ho f timeline.
 *  * @param { inductees, rikishiMap } - The component props.
 */
/** Inline portrait used in the induction timeline. */
function TimelinePortrait({
  inductee,
  rikishi,
}: {
  inductee: HoFInductee;
  rikishi: UIRikishi | undefined;
}) {
  const name = rikishi?.shikona ?? inductee.rikishiId;
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[11px] font-bold text-primary">
        {initial}
      </div>
      <span className="text-[9px] text-muted-foreground max-w-[60px] truncate text-center">
        {name}
      </span>
    </div>
  );
}

export function HoFTimeline({ inductees, rikishiMap }: HoFTimelineProps) {
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
    <div className="rounded-lg border bg-card/50 p-4 space-y-2">
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
                    rikishi={rikishiMap.get(ind.rikishiId)}
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
                <div className="mt-1.5 text-xs font-display font-bold text-foreground">{year}</div>
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
