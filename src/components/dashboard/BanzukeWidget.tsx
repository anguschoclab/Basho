import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { projectRosterEntry } from "@/presenters/uiModels";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { BaseWidget } from "./BaseWidget";

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

const BanzukeEntryRow = React.memo(({ entry, isPlayer, i }: { entry: import("@/presenters/uiModels").UIRosterEntry, isPlayer: boolean, i: number }) => {
  return (
    <div
      className={`flex items-center gap-2 py-1.5 px-2 rounded-md text-xs transition-colors ${
        isPlayer ? "bg-primary/10 border border-primary/20" : RANK_BG[entry.rank] || (i % 2 === 0 ? "bg-muted/30" : "")
      } hover:bg-muted/40`}
    >
      <span className={`w-12 sm:w-16 shrink-0 capitalize text-[10px] sm:text-[11px] font-display ${RANK_STYLE[entry.rank] || ""}`}>
        {entry.rank === "maegashira" ? `M${entry.rankNumber || ""}` : entry.rank === "juryo" ? `J${entry.rankNumber || ""}` : entry.rank}
      </span>
      <span className={`text-[10px] w-4 ${entry.side === "east" ? "text-east" : "text-west"}`}>
        {entry.side === "east" ? "E" : "W"}
      </span>
      <RikishiName id={entry.id} name={entry.shikona}  className="flex-1 font-medium truncate" />
      <span className="text-[10px] text-muted-foreground font-mono tabular-nums hidden sm:inline">{entry.record}</span>
      {isPlayer && <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary px-1">YOU</Badge>}
    </div>
  );
});

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
    <BaseWidget
      title="Banzuke"
      icon={ScrollText}
      headerAction={{ label: "Full Rankings", onClick: () => navigate({ to: "/banzuke" }) }}
    >
      <div className="space-y-0.5 w-full overflow-x-auto sm:overflow-visible">
        {topRanked.map(({ entry, isPlayer }, i) => (
          <BanzukeEntryRow key={entry.id} entry={entry as any} isPlayer={isPlayer} i={i} />
        ))}
      </div>
    </BaseWidget>
  );
}
