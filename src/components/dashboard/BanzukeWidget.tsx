import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { projectRosterEntry, type UIRosterEntry } from "@/presenters/uiModels";
import { BaseWidget } from "./BaseWidget";
import { RankInline } from "@/components/rikishi/RankBadge";
import { getActiveRikishi } from "@/engine/selectors";
import { EmptyState } from "@/components/ui/EmptyState";

import type { AvatarConfig } from "@/engine/types/avatar";

const RANK_ORDER: Record<string, number> = {
  yokozuna: 0,
  ozeki: 1,
  sekiwake: 2,
  komusubi: 3,
  maegashira: 4,
  juryo: 5,
};

const BanzukeEntryRow = React.memo(
  ({
    id,
    shikona,
    rank,
    rankNumber,
    side,
    record,
    isPlayer,
    i,
    avatarConfig,
  }: {
    id: string;
    shikona: string;
    rank: string;
    rankNumber?: number;
    side?: "east" | "west";
    record: string;
    isPlayer: boolean;
    i: number;
    avatarConfig: AvatarConfig | undefined;
  }) => {
    return (
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-md text-xs transition-colors ${
          isPlayer ? "bg-primary/10 border border-primary/20" : i % 2 === 0 ? "bg-muted/30" : ""
        } hover:bg-muted/40`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SumoAvatar
              config={avatarConfig}
              size="xs"
              showHairstyle={
                rank === "yokozuna" ||
                rank === "ozeki" ||
                rank === "sekiwake" ||
                rank === "komusubi" ||
                rank === "maegashira"
              }
              rankTier={rank}
              fallback={shikona}
            />
            <RankInline
              rank={rank}
              rankNumber={rankNumber}
              side={side}
              className="w-12 sm:w-16 shrink-0"
            />
          </div>
          <RikishiName id={id} name={shikona} className="flex-1 font-medium truncate" />
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums hidden sm:inline">
            {record}
          </span>
          {isPlayer && (
            <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary px-1">YOU</Badge>
          )}
        </div>
      </div>
    );
  }
);

type BanzukeEntry = {
  entry: UIRosterEntry;
  isPlayer: boolean;
  avatarConfig: AvatarConfig | undefined;
};

const BanzukeList = React.memo(({ topRanked }: { topRanked: BanzukeEntry[] }) => {
  if (topRanked.length === 0) {
    return <EmptyState icon={ScrollText} title="No active banzuke" compact />;
  }
  return (
    <>
      {(() => {
        const limit = topRanked.length;
        const nodes = new Array(limit);
        for (let i = 0; i < limit; i++) {
          const { entry, isPlayer, avatarConfig } = topRanked[i];
          nodes[i] = (
            <BanzukeEntryRow
              key={entry.id}
              id={entry.id}
              shikona={entry.shikona}
              rank={entry.rank}
              rankNumber={entry.rankNumber}
              side={entry.side as "east" | "west"}
              record={entry.record}
              isPlayer={isPlayer}
              i={i}
              avatarConfig={avatarConfig}
            />
          );
        }
        return nodes;
      })()}
    </>
  );
});

export function BanzukeWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const headerAction = useMemo(
    () => ({
      label: "Full Rankings",
      onClick: () => navigate({ to: "/basho/banzuke" }),
    }),
    [navigate]
  );
  const world = state.world;

  const topRanked = useMemo(() => {
    if (!world) return [];

    // ⚡ Bolt Performance Optimization: Collect all active rikishi
    const activeRikishi = getActiveRikishi(world);

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
        avatarConfig: r.avatarConfig,
      });
    }
    return result;
  }, [world]);

  if (!world) return null;

  return (
    <BaseWidget title="Banzuke" icon={ScrollText} headerAction={headerAction}>
      <div className="space-y-0.5 w-full overflow-x-auto sm:overflow-visible">
        <BanzukeList topRanked={topRanked} />
      </div>
    </BaseWidget>
  );
}
