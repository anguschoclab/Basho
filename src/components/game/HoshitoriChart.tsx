// HoshitoriChart.tsx — 15-day star chart (星取表)
// Renders the classic hoshitori: white star (shiroboshi) for a win, black star
// (kuroboshi) for a loss, gold star (kinboshi) for a maegashira-over-yokozuna
// upset, and a distinct dash for absence/fusensho days.

import { cn } from "@/lib/utils";
import type { MatchSchedule } from "@/engine/types/basho";
import type { DayResult } from "@/engine/types/history";

type Outcome = "win" | "loss" | "kinboshi" | "absence" | "pending";

interface HoshitoriChartProps {
  rikishiId: string;
  /** Resolved matches for the basho (current-basho data source). */
  matches?: MatchSchedule[];
  /** Pre-computed day cells (historical-basho data source). Wins over `matches` when both are given. */
  dayResults?: DayResult[];
  /** Number of tournament days to render. Defaults to the standard 15. */
  days?: number;
  className?: string;
}

function outcomeFromMatch(match: MatchSchedule, rikishiId: string): Outcome {
  const res = match.result;
  if (!res) return "pending";
  if (res.winnerRikishiId === rikishiId) {
    const kinboshi =
      res.isKinboshi === true || (res.awards?.some((a) => a.type === "kinboshi") ?? false);
    return kinboshi ? "kinboshi" : "win";
  }
  if (res.kimarite === "fusensho") return "absence";
  return "loss";
}

function outcomeFromDayResult(d: DayResult): Outcome {
  if (d.outcome === "win") return d.isKinboshi ? "kinboshi" : "win";
  if (d.outcome === "absence") return "absence";
  return "loss";
}

const CELL_STYLE: Record<Outcome, string> = {
  win: "bg-foreground/90 text-background",
  loss: "bg-muted text-muted-foreground",
  kinboshi: "bg-gold text-black",
  absence: "bg-muted/40 text-muted-foreground border border-dashed border-muted-foreground/40",
  pending: "bg-transparent text-muted-foreground/30 border border-dashed border-border/40",
};

const CELL_GLYPH: Record<Outcome, string> = {
  win: "○",
  loss: "●",
  kinboshi: "★",
  absence: "—",
  pending: "·",
};

const CELL_LABEL: Record<Outcome, string> = {
  win: "shiroboshi (win)",
  loss: "kuroboshi (loss)",
  kinboshi: "kinboshi (gold star)",
  absence: "absence",
  pending: "not yet fought",
};

/** The 15-day star chart for one rikishi in one basho. */
export function HoshitoriChart({
  rikishiId,
  matches,
  dayResults,
  days = 15,
  className,
}: HoshitoriChartProps) {
  const cells: Outcome[] = Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    if (dayResults) {
      const d = dayResults.find((r) => r.day === day);
      return d ? outcomeFromDayResult(d) : "pending";
    }
    const match = (matches ?? []).find(
      (m) => m.day === day && (m.eastRikishiId === rikishiId || m.westRikishiId === rikishiId)
    );
    return match ? outcomeFromMatch(match, rikishiId) : "pending";
  });

  return (
    <div className={cn("flex items-center gap-1", className)} role="img" aria-label="hoshitori">
      {cells.map((outcome, i) => (
        <div
          key={i + 1}
          data-testid={`hoshitori-day-${i + 1}`}
          data-outcome={outcome}
          title={`Day ${i + 1}: ${CELL_LABEL[outcome]}`}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-xs text-xs font-bold select-none",
            CELL_STYLE[outcome]
          )}
        >
          {CELL_GLYPH[outcome]}
        </div>
      ))}
    </div>
  );
}
