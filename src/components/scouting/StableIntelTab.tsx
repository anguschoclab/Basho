// StableIntelTab.tsx — Full visibility into your own stables

import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";
import { EntityCollection } from "@/engine/core/EntityCollection";
import { projectRikishi, RANK_HIERARCHY, RANK_NAMES } from "@/presenters/uiDigest";

export function StableIntelTab({ playerHeyaId }: { playerHeyaId: string | null }) {
  const navigate = useNavigate();
  const { state } = useGame();
  const world = state.world;

  const roster = useMemo(() => {
    if (!world || !playerHeyaId) return [];
    const list = EntityCollection.getHeyaRoster(world, playerHeyaId).map((r) =>
      projectRikishi(r, world)
    );
    list.sort((a, b) => {
      const ta = (RANK_HIERARCHY as Record<string, { tier: number }>)?.[a.rank]?.tier ?? 99;
      const tb = (RANK_HIERARCHY as Record<string, { tier: number }>)?.[b.rank]?.tier ?? 99;
      return ta - tb || (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
    });
    return list;
  }, [world, playerHeyaId]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Full intel on your own wrestlers. You know everything about those who train under your roof.
      </p>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2 pr-2">
          {roster.map((r) => {
            const rankNames = RANK_NAMES[r.rank] || { ja: r.rank, en: r.rank };

            return (
              <div
                key={r.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/rikishi/$rikishiId",
                    params: { rikishiId: r.id },
                  })
                }
              >
                <div
                  className={`w-1 h-10 rounded-full ${r.side === "east" ? "bg-east" : "bg-west"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-medium truncate">{r.shikona}</div>
                  <div className="text-xs text-muted-foreground">
                    {rankNames.ja}
                    {r.rankNumber ? ` ${r.rankNumber}` : ""} • {r.powerBand} power •{" "}
                    {r.techniqueBand} technique
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-mono">
                    {r.currentBashoWins}-{r.currentBashoLosses}
                  </div>
                  {r.isInjured && (
                    <Badge variant="destructive" className="text-[10px]">
                      Injured
                    </Badge>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
