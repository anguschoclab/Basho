import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, ChevronRight } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { projectRosterEntry } from "@/engine/uiModels";

const RANK_ORDER: Record<string, number> = {
  yokozuna: 0, ozeki: 1, sekiwake: 2, komusubi: 3, maegashira: 4, juryo: 5,
};

const RANK_STYLE: Record<string, string> = {
  yokozuna: "text-gold font-bold",
  ozeki: "text-silver font-semibold",
  sekiwake: "text-bronze font-medium",
  komusubi: "text-bronze",
  maegashira: "text-foreground",
  juryo: "text-muted-foreground",
};

const RANK_BG: Record<string, string> = {
  yokozuna: "rank-shimmer",
  ozeki: "bg-silver/5",
};

export function BanzukeWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const topRanked = useMemo(() => {
    if (!world) return [];

    // ⚡ Bolt Performance Optimization: Collect all active rikishi
    const activeRikishi = [];
    for (const r of world.rikishi.values()) {
      if (!r.isRetired) activeRikishi.push(r);
    }

    // Sort, slice, and project in a minimal pipeline
    activeRikishi.sort((a, b) => {
      const ra = RANK_ORDER[a.rank] ?? 99;
      const rb = RANK_ORDER[b.rank] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.rankNumber || 0) - (b.rankNumber || 0);
    });

    const top10 = activeRikishi.slice(0, 10);
    const result = [];
    for (const r of top10) {
      result.push({
        entry: projectRosterEntry(r),
        isPlayer: r.heyaId === world.playerHeyaId,
      });
    }
    return result;
  }, [world]);

  if (!world) return null;

  return (
    <div className="widget-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Banzuke</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/banzuke")} className="h-6 text-xs gap-1 text-muted-foreground" aria-label="View full banzuke rankings">
          Full Rankings <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-0.5">
        {topRanked.map(({ entry, isPlayer }, i) => (
          <div
            key={entry.id}
            className={`flex items-center gap-2 py-1.5 px-2 rounded-md text-xs transition-colors ${
              isPlayer ? "bg-primary/10 border border-primary/20" : RANK_BG[entry.rank] || (i % 2 === 0 ? "bg-muted/30" : "")
            } hover:bg-muted/40`}
          >
            <span className={`w-16 shrink-0 capitalize text-[11px] font-display ${RANK_STYLE[entry.rank] || ""}`}>
              {entry.rank === "maegashira" ? `M${entry.rankNumber || ""}` : entry.rank === "juryo" ? `J${entry.rankNumber || ""}` : entry.rank}
            </span>
            <span className={`text-[10px] w-4 ${entry.side === "east" ? "text-east" : "text-west"}`}>
              {entry.side === "east" ? "E" : "W"}
            </span>
            <RikishiName id={entry.id} name={entry.shikona}  className="flex-1 font-medium truncate" />
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{entry.record}</span>
            {isPlayer && <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary px-1">YOU</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}
