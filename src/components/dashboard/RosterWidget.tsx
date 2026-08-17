import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BaseWidget } from "./BaseWidget";
import { Users, HeartPulse, AlertTriangle, Activity, Star, UserMinus, Layers } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { EmptyState } from "@/components/ui/EmptyState";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompareModePanel } from "../scouting/CompareModePanel";
import { ROSTER_WIDGET_MAX_ITEMS } from "../../constants/ui/display";
import { FATIGUE_LABELS } from "@/constants/ui/labels";
import { useRosterData, type RosterEntryWithHealth } from "@/hooks/useRosterData";

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
          isSelected ? "bg-primary/10 ring-1 ring-primary/30 shadow-xs" : "hover:bg-muted/50",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background"
        )}
        onClick={() => onToggleSelect(id)}
        role="button"
        aria-label={`Toggle selection for ${shikona}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleSelect(id);
          }
        }}
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
              tooltip={`Withdraw ${shikona} from tournament`}
              tooltipSide="left"
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
    if (roster.length === 0) {
      return <EmptyState icon={Users} title="No wrestlers in roster" compact />;
    }

    return (
      <>
        {(() => {
          const limit = Math.min(ROSTER_WIDGET_MAX_ITEMS, roster.length);
          const selectedSet = new Set(selectedIds);
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
                isSelected={selectedSet.has(entry.id)}
                onWithdraw={onWithdraw}
                onToggleSelect={onToggleSelect}
              />
            );
          }
          return nodes;
        })()}
        {roster.length > ROSTER_WIDGET_MAX_ITEMS && (
          <TooltipWrap content="Navigate to the full rikishi directory" side="top">
            <Button
              variant="ghost"
              onClick={onViewAll}
              className="w-full h-auto py-1.5 text-[11px] text-primary hover:text-primary/80 hover:bg-transparent rounded-xs"
            >
              +<span className="tabular-nums">{roster.length - ROSTER_WIDGET_MAX_ITEMS}</span> more
              wrestlers →
            </Button>
          </TooltipWrap>
        )}
      </>
    );
  }
);

export function RosterWidget() {
  const {
    world,
    selectedIds,
    showCompare,
    setShowCompare,
    headerAction,
    handleWithdraw,
    toggleSelection,
    comparisonPair,
    roster,
    injuredCount,
    avgFatigueValue,
    avgFatigueBand,
    handleViewAllRikishi,
  } = useRosterData();

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
            className="h-7 text-[10px] uppercase tracking-widest font-bold gap-2 bg-success hover:bg-success/90 animate-in fade-in zoom-in duration-200 ml-1"
            onClick={() => setShowCompare(true)}
          >
            <Layers className="h-3 w-3" />
            Compare
          </Button>
        )}

        <div
          className={`flex items-center gap-1 ml-auto ${avgFatigueValue > 70 ? "text-destructive" : avgFatigueValue > 40 ? "text-warning" : "text-muted-foreground"}`}
        >
          {avgFatigueValue > 40 ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Activity className="h-3 w-3" />
          )}
          <span className="text-[10px]">Avg: {FATIGUE_LABELS[avgFatigueBand]}</span>
        </div>
      </div>

      {/* Team fatigue overview bar */}
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            avgFatigueValue > 70
              ? "bg-destructive"
              : avgFatigueValue > 40
                ? "bg-warning"
                : "bg-primary"
          }`}
          style={{ width: `${avgFatigueValue}%` }}
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
