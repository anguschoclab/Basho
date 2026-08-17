/**
 * Yusho Race Widget
 * Shows top rikishi competing for the tournament championship
 * Features large avatars with rank-colored borders and medal indicators
 */

import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { Badge } from "@/components/ui/badge";
import { BaseWidget } from "./BaseWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { Trophy, Medal, Award } from "lucide-react";
import { getRikishiByDivision } from "@/presenters/engineAccess";
import { sortStandings } from "@/presenters/engineAccess";
import { type UIRosterEntry, projectRosterEntry } from "@/presenters/rikishi";
import type { Rikishi } from "@/engine/types/rikishi";

interface YushoContenderProps {
  entry: UIRosterEntry;
  rank: number;
}

const YushoContender = React.memo(({ entry, rank }: YushoContenderProps) => {
  const navigate = useNavigate();

  const medals = [
    { icon: Trophy, color: "text-gold", bg: "bg-gold/10", label: "1st" },
    { icon: Medal, color: "text-muted-foreground", bg: "bg-muted/30", label: "2nd" },
    { icon: Award, color: "text-gold", bg: "bg-gold/10", label: "3rd" },
  ];

  const medal = medals[rank - 1] || null;
  const MedalIcon = medal?.icon;

  return (
    <div
      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
      onClick={() => navigate({ to: "/rikishi", params: { id: entry.id } })}
      role="button"
      aria-label={`View profile for ${entry.shikona}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate({ to: "/rikishi", params: { id: entry.id } });
        }
      }}
    >
      {/* Avatar with medal */}
      <div className="relative">
        <SumoAvatar
          config={entry.avatarConfig}
          size="lg"
          showHairstyle={true}
          rankTier={entry.division === "makuuchi" ? entry.rank : undefined}
          showGlow={rank === 1}
          expression={rank === 1 ? "confident" : rank <= 3 ? "determined" : "neutral"}
          fallback={entry.shikona}
          className={rank === 1 ? "ring-2 ring-gold ring-offset-2" : ""}
        />
        {medal && MedalIcon && (
          <div
            className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full ${medal.bg} border-2 border-background flex items-center justify-center shadow-xs`}
          >
            <MedalIcon className={`w-4 h-4 ${medal.color}`} />
          </div>
        )}
      </div>

      {/* Rank and record */}
      <div className="text-center">
        <Badge
          variant="outline"
          className={`text-[10px] font-display ${
            rank === 1
              ? "border-gold text-gold"
              : rank === 2
                ? "border-muted-foreground text-muted-foreground"
                : rank === 3
                  ? "border-gold text-gold"
                  : ""
          }`}
        >
          {entry.rankLabel}
        </Badge>
        <p className="text-xs font-mono mt-1 text-muted-foreground tabular-nums">{entry.record}</p>
      </div>

      {/* Shikona */}
      <p className="text-sm font-bold text-center truncate w-20">{entry.shikona}</p>
    </div>
  );
});

export const YushoRaceWidget = () => {
  const { state } = useGame();
  const navigate = useNavigate();

  const topContenders = useMemo((): UIRosterEntry[] => {
    const world = state.world;
    if (!world?.currentBasho) return [];
    const standings = world.currentBasho.standings;

    const contenders: { r: Rikishi; wins: number }[] = [];
    for (const r of getRikishiByDivision(world, "makuuchi")) {
      const record = standings.get(r.id);
      contenders.push({ r, wins: record?.wins ?? r.currentBashoWins ?? 0 });
    }

    return sortStandings(contenders.map((c) => ({ r: c.r, wins: c.wins, losses: 0 })))
      .slice(0, 5)
      .map(({ r }) => projectRosterEntry(r, world));
  }, [state.world]);

  const headerAction = useMemo(
    () => ({
      label: "View Full Banzuke",
      onClick: () => navigate({ to: "/basho/banzuke" }),
      tooltip: "View Full Banzuke",
    }),
    [navigate]
  );

  if (topContenders.length === 0) {
    return (
      <BaseWidget title="Yūshō Race" icon={Trophy} headerAction={headerAction}>
        <EmptyState icon={Trophy} title="No active Yūshō race" compact />
      </BaseWidget>
    );
  }

  return (
    <BaseWidget title="Yūshō Race" icon={Trophy} headerAction={headerAction}>
      <div className="flex justify-around items-start">
        {topContenders.map((entry, index) => (
          <YushoContender key={entry.id} entry={entry} rank={index + 1} />
        ))}
      </div>

      {/* Race summary */}
      <div className="mt-4 pt-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Top <span className="tabular-nums">{topContenders.length}</span> contenders based on
          current tournament record
        </p>
      </div>
    </BaseWidget>
  );
};

export default YushoRaceWidget;
