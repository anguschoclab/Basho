/**
 * GlobalCupWidget.tsx
 * ===================
 * Dashboard widget preview for Global Cup tournament.
 */

import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Trophy, Users, Calendar } from "lucide-react";
import { BaseWidget } from "./BaseWidget";

export function GlobalCupWidget() {
  const navigate = useNavigate();
  const { state } = useGame();
  const world = state.world;

  const cup = world?.globalCup;

  const content = useMemo(() => {
    if (!cup || !cup.isActive) {
      return (
        <div className="p-4 text-center text-muted-foreground text-sm">
          <Trophy className="h-8 w-8 mx-auto mb-2 text-muted" />
          <p>Global Cup will begin during interim weeks 10-11</p>
          <p className="text-xs mt-1">The Worlds Exhibition - 世界大相撲</p>
        </div>
      );
    }

    const phaseLabels: Record<string, string> = {
      registration: "Registration Open",
      quarterfinals: "Quarterfinals",
      semifinals: "Semifinals",
      finale: "Finale",
      complete: "Complete",
    };

    const completeMatches = cup.bracket.filter(
      (m: { winnerRikishiId?: string }) => m.winnerRikishiId
    ).length;
    const totalMatches = cup.bracket.length;

    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            <span className="font-bold">Worlds Exhibition</span>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-1 rounded bg-gold/20 text-gold">
            {phaseLabels[cup.phase]}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{cup.participants.length} Participants</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {completeMatches}/{totalMatches} Matches
            </span>
          </div>
        </div>

        {cup.championId && (
          <div className="p-2 rounded bg-gold/10 border border-gold/20">
            <span className="text-[10px] uppercase text-muted-foreground">Champion</span>
            <div className="font-bold text-gold">
              {world?.rikishi.get(cup.championId)?.shikona || "Unknown"}
            </div>
          </div>
        )}
      </div>
    );
  }, [cup, world]);

  return (
    <BaseWidget
      title="Global Cup"
      icon={Trophy}
      headerAction={{
        label: "View",
        onClick: () => navigate({ to: "/global-cup" }),
        tooltip: "View Global Cup tournament",
      }}
    >
      {content}
    </BaseWidget>
  );
}
