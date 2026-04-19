import React, { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BaseWidget } from "./BaseWidget";
import { Users, HeartPulse, AlertTriangle, Star, UserMinus, Layers } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { projectRosterEntry, type UIRosterEntry, projectRikishi } from "@/presenters/uiModels";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { getHealthBadge } from "@/presenters/PerceptionPresenter";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompareModePanel } from "../scouting/CompareModePanel";

type RosterEntryWithHealth = UIRosterEntry & { healthBadge: string };

const RosterEntryRow = React.memo(
  ({
    id,
    shikona,
    rank,
    isInjured,
    potentialBand,
    fatigue,
    healthBadge,
    isSelected,
    onWithdraw,
    onToggleSelect,
  }: {
    id: string;
    shikona: string;
    rank: string;
    isInjured: boolean;
    potentialBand: string;
    fatigue: number;
    healthBadge: string;
    isSelected: boolean;
    onWithdraw?: (id: string) => void;
    onToggleSelect: (id: string) => void;
  }) => {
    return (
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md text-xs transition-colors cursor-pointer group",
          isSelected ? "bg-primary/10 ring-1 ring-primary/30 shadow-sm" : "hover:bg-muted/50"
        )}
        onClick={() => onToggleSelect(id)}
      >
        <div
          className={cn(
            "w-1 h-3 rounded-full transition-all",
            isSelected ? "bg-primary" : "bg-muted group-hover:bg-muted-foreground/30"
          )}
        />
        <RikishiName id={id} name={shikona} className="flex-1 font-medium truncate" />
        <span className="text-[10px] text-muted-foreground capitalize w-14 text-right">{rank}</span>
        <Badge
          variant="outline"
          className={cn(
            "text-[8px] font-bold uppercase tracking-widest px-1.5 h-4 shrink-0",
            healthBadge === "Fresh" && "border-success text-success bg-success/10",
            healthBadge === "Worn" && "border-warning text-warning bg-warning/10",
            healthBadge === "Struggling" && "border-warning text-warning bg-warning/10",
            healthBadge === "Critical" && "border-destructive text-destructive bg-destructive/10",
            healthBadge === "Recovering" && "border-west text-west bg-west/10"
          )}
        >
          {healthBadge === "Fresh" ? "OK" : healthBadge.slice(0, 3)}
        </Badge>
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
        {isInjured && onWithdraw && (
          <TooltipWrap content="Withdraw from tournament (kyujo)" side="left">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Withdraw ${shikona} from tournament`}
              onClick={(e) => {
                e.stopPropagation();
                onWithdraw(id);
              }}
            >
              <UserMinus className="h-3 w-3" />
            </Button>
          </TooltipWrap>
        )}
      </div>
    );
  }
);

const RosterList = React.memo(
  ({
    roster,
    selectedIds,
    onWithdraw,
    onToggleSelect,
    onViewAll,
  }: {
    roster: RosterEntryWithHealth[];
    selectedIds: string[];
    onWithdraw: (id: string) => void;
    onToggleSelect: (id: string) => void;
    onViewAll: () => void;
  }) => {
    return (
      <>
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
                healthBadge={entry.healthBadge}
                isSelected={selectedIds.includes(entry.id)}
                onWithdraw={onWithdraw}
                onToggleSelect={onToggleSelect}
              />
            );
          }
          return nodes;
        })()}
        {roster.length > 8 && (
          <TooltipWrap content="Navigate to the full rikishi directory" side="top">
            <Button
              variant="ghost"
              onClick={onViewAll}
              className="w-full h-auto py-1.5 text-[11px] text-primary hover:text-primary/80 hover:bg-transparent rounded-sm"
            >
              +<span className="tabular-nums">{roster.length - 8}</span> more wrestlers →
            </Button>
          </TooltipWrap>
        )}
      </>
    );
  }
);

export function RosterWidget() {
  const { state, updateWorld } = useGame();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const headerAction = useMemo(
    () => ({
      label: "All Rikishi",
      onClick: () => navigate({ to: "/rikishi" }),
    }),
    [navigate]
  );
  const world = state.world;

  const handleWithdraw = React.useCallback(
    (rikishiId: string) => {
      if (!world) return;

      const rikishi = world.rikishi.get(rikishiId);
      if (rikishi && rikishi.injured) {
        const updatedWorld = {
          ...world,
          rikishi: new Map(world.rikishi).set(rikishiId, {
            ...rikishi,
            isKyujo: true,
            kyujoReason: "injury" as const,
            medicalCertificate: {
              injury: rikishi.injuryStatus?.type || "unknown",
              severity: rikishi.injuryStatus?.severity || "moderate",
              treatmentWeeks: rikishi.injuryWeeksRemaining,
              submittedDate: world.calendar.currentWeek,
            },
          }),
        };
        updateWorld(updatedWorld);
      }
    },
    [world, updateWorld]
  );

  const toggleSelection = React.useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : prev.length < 2
          ? [...prev, id]
          : [prev[1], id]
    );
  }, []);

  const comparisonPair = useMemo(() => {
    if (selectedIds.length < 2 || !world) return null;
    const coreA = world.rikishi.get(selectedIds[0]);
    const coreB = world.rikishi.get(selectedIds[1]);
    if (!coreA || !coreB) return null;
    return { a: projectRikishi(coreA), b: projectRikishi(coreB) };
  }, [selectedIds, world]);

  const { roster, injuredCount, avgFatigue } = useMemo(() => {
    if (!world?.playerHeyaId) return { roster: [], injuredCount: 0, avgFatigue: 0 };
    const heya = world.heyas.get(world.playerHeyaId);
    if (!heya) return { roster: [], injuredCount: 0, avgFatigue: 0 };

    // ⚡ Bolt Performance Optimization: Single-pass for loop over rikishiIds
    const entries: RosterEntryWithHealth[] = [];
    let injuries = 0;
    let totalFatigue = 0;

    for (const id of heya.rikishiIds ?? []) {
      const r = world.rikishi.get(id);
      if (r && !r.isRetired) {
        const entry = projectRosterEntry(r);
        const healthBadge = getHealthBadge(r);
        entries.push({ ...entry, healthBadge });
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
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-md">
          <Users className="h-3 w-3 text-primary" />
          <span className="font-bold text-primary tabular-nums">{roster.length}</span>
          <span className="text-muted-foreground">active</span>
        </div>
        {injuredCount > 0 && (
          <div className="flex items-center gap-1 bg-destructive/10 px-2 py-1 rounded-md text-destructive">
            <HeartPulse className="h-3 w-3" />
            <span className="font-bold tabular-nums">{injuredCount}</span>
            <span>hurt</span>
          </div>
        )}

        {selectedIds.length === 2 && (
          <Button
            variant="default"
            size="sm"
            className="h-7 text-[10px] uppercase tracking-widest font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 animate-in fade-in zoom-in duration-200 ml-1"
            onClick={() => setShowCompare(true)}
          >
            <Layers className="h-3 w-3" />
            Compare
          </Button>
        )}

        <div className="flex items-center gap-1 text-muted-foreground ml-auto">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-[10px]">
            Avg fatigue: <span className="tabular-nums">{avgFatigue}%</span>
          </span>
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
      <div className="space-y-0.5 w-full overflow-x-auto sm:overflow-visible transition-all">
        <RosterList
          roster={roster}
          selectedIds={selectedIds}
          onWithdraw={handleWithdraw}
          onToggleSelect={toggleSelection}
          onViewAll={handleViewAllRikishi}
        />
      </div>

      {/* Compare Mode Dialog */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Stablemate Comparison</DialogTitle>
          </DialogHeader>
          {comparisonPair && (
            <CompareModePanel
              rikishiA={comparisonPair.a}
              rikishiB={comparisonPair.b}
              onClose={() => setShowCompare(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </BaseWidget>
  );
}
