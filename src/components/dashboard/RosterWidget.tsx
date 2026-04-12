import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { BaseWidget } from "./BaseWidget";
import { Users, HeartPulse, AlertTriangle, Star } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { projectRosterEntry, type UIRosterEntry } from "@/presenters/uiModels";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";

const RosterEntryRow = React.memo(
  ({
    id,
    shikona,
    rank,
    isInjured,
    potentialBand,
    fatigue,
  }: {
    id: string;
    shikona: string;
    rank: string;
    isInjured: boolean;
    potentialBand: string;
    fatigue: number;
  }) => {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md text-xs hover:bg-muted/50 transition-colors group">
        <RikishiName id={id} name={shikona} className="flex-1 font-medium truncate" />
        <span className="text-[10px] text-muted-foreground capitalize w-14 text-right">{rank}</span>
        {isInjured && <HeartPulse className="h-3 w-3 text-destructive shrink-0" />}
        {(potentialBand === "star" || potentialBand === "generational") && (
          <Star className="h-3 w-3 text-gold shrink-0" />
        )}
        {/* Fatigue bar */}
        <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              fatigue > 70 ? "bg-destructive" : fatigue > 40 ? "bg-warning" : "bg-primary/60"
            }`}
            style={{ width: `${fatigue}%` }}
          />
        </div>
      </div>
    );
  }
);

export function RosterWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const headerAction = useMemo(
    () => ({
      label: "All Rikishi",
      onClick: () => navigate({ to: "/rikishi" as any }),
    }),
    [navigate]
  );
  const world = state.world;

  const { roster, injuredCount, avgFatigue } = useMemo(() => {
    if (!world?.playerHeyaId) return { roster: [], injuredCount: 0, avgFatigue: 0 };
    const heya = world.heyas.get(world.playerHeyaId);
    if (!heya) return { roster: [], injuredCount: 0, avgFatigue: 0 };

    // ⚡ Bolt Performance Optimization: Single-pass for loop over rikishiIds
    const entries: UIRosterEntry[] = [];
    let injuries = 0;
    let totalFatigue = 0;

    for (const id of heya.rikishiIds ?? []) {
      const r = world.rikishi.get(id);
      if (r && !r.isRetired) {
        const entry = projectRosterEntry(r);
        entries.push(entry);
        if (entry.isInjured) injuries++;
        totalFatigue += entry.fatigue;
      }
    }

    entries.sort((a, b) => b.momentum - a.momentum);

    return {
      roster: entries,
      injuredCount: injuries,
      avgFatigue: entries.length ? Math.round(totalFatigue / entries.length) : 0,
    };
  }, [world]);

  const handleViewAllRikishi = React.useCallback(() => navigate({ to: "/rikishi" }), [navigate]);

  if (!world) return null;

  return (
    <BaseWidget title="My Roster" icon={Users} headerAction={headerAction}>
      {/* Summary row with visual indicators */}
      <div className="flex gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-md">
          <Users className="h-3 w-3 text-primary" />
          <span className="font-bold text-primary">{roster.length}</span>
          <span className="text-muted-foreground">active</span>
        </div>
        {injuredCount > 0 && (
          <div className="flex items-center gap-1 bg-destructive/10 px-2 py-1 rounded-md text-destructive">
            <HeartPulse className="h-3 w-3" />
            <span className="font-bold">{injuredCount}</span>
            <span>hurt</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-muted-foreground ml-auto">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-[10px]">Avg fatigue: {avgFatigue}%</span>
        </div>
      </div>

      {/* Team fatigue overview bar */}
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            avgFatigue > 70 ? "bg-destructive" : avgFatigue > 40 ? "bg-warning" : "bg-primary"
          }`}
          style={{ width: `${avgFatigue}%` }}
        />
      </div>

      {/* Roster list */}
      <div className="space-y-0.5 w-full overflow-x-auto sm:overflow-visible">
        {(() => {
          const limit = Math.min(8, roster.length);
          const nodes = new Array(limit);
          for (let i = 0; i < limit; i++) {
            const entry = roster[i];
            nodes[i] = (
              <RosterEntryRow
                key={entry.id}
                id={entry.id}
                shikona={entry.shikona}
                rank={entry.rank}
                isInjured={entry.isInjured}
                potentialBand={entry.potentialBand}
                fatigue={entry.fatigue}
              />
            );
          }
          return nodes;
        })()}
        {roster.length > 8 && (
          <TooltipWrap content="Navigate to the full rikishi directory" side="top">
            <Button
              variant="ghost"
              onClick={handleViewAllRikishi}
              className="w-full h-auto py-1.5 text-[11px] text-primary hover:text-primary/80 hover:bg-transparent rounded-sm"
            >
              +{roster.length - 8} more wrestlers →
            </Button>
          </TooltipWrap>
        )}
      </div>
    </BaseWidget>
  );
}
