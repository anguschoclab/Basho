/**
 * RecruitingTabSections.tsx
 *
 * Sections of RecruitingTab — confidence badge, pool controls,
 * quota/filter row, candidate card, and the signing/compare dialogs.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import {
  Search,
  Eye,
  UserPlus,
  Binoculars,
  Globe,
  GraduationCap,
  School,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { RecruitSigningDialog } from "@/components/game/RecruitSigningDialog";
import { resolveRegistryLabel } from "@/presenters/uiDigest";
import type { CandidateDigestEntry } from "@/presenters/projections/boutProjections";
import { CompareModePanel } from "./CompareModePanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layers } from "lucide-react";
import { getCombatArchetypeDescription } from "@/presenters/engineAccess";
import { cn } from "@/lib/utils";
import { toPotentialBand } from "@/presenters/engineAccess";
import { POTENTIAL_LABELS } from "@/constants/ui/labels";
import { SortMenu, type SortOption } from "@/components/ui/SortMenu";
import type { UIRikishi } from "@/presenters/uiModels";
import type { useRecruitingState } from "@/hooks/useRecruitingState";

type State = ReturnType<typeof useRecruitingState>;

const SORT_OPTIONS: SortOption[] = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age" },
  { key: "potential", label: "Potential" },
  { key: "scoutLevel", label: "Scout Level" },
];

/**
 * Displays scouting confidence as star rating (1-5 stars).
 * Shows "est." label when scouting view is still biased by initial misvaluation.
 *
 * @param scoutLevel - Current scouting level (0-100)
 * @param hasBias - Whether the candidate's stats are still biased by initial misvaluation
 */
export function ScoutingConfidenceBadge({
  scoutLevel,
  hasBias,
}: {
  scoutLevel: number;
  hasBias: boolean;
}) {
  const stars =
    scoutLevel >= 90 ? 5 : scoutLevel >= 70 ? 4 : scoutLevel >= 45 ? 3 : scoutLevel >= 20 ? 2 : 1;
  return (
    <div className="flex items-center gap-1 font-mono">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i >= stars ? "text-muted-foreground/30" : undefined}
          style={i < stars ? { color: "hsl(var(--gold))" } : undefined}
        >
          ★
        </span>
      ))}
      {hasBias && (
        <span className="text-xs ml-1" style={{ color: "hsl(var(--warning))" }}>
          est.
        </span>
      )}
    </div>
  );
}

const POOL_ICONS = {
  high_school: <School className="h-4 w-4" />,
  university: <GraduationCap className="h-4 w-4" />,
  foreign: <Globe className="h-4 w-4" />,
};

const POOL_LABELS = {
  high_school: "High School",
  university: "University",
  foreign: "Foreign",
};

/** Pool selector row + "Scout Pool" dispatch button. */
export function PoolSelector({ state }: { state: State }) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {(["high_school", "university", "foreign"] as const).map((pool) => (
        <Button
          key={pool}
          variant={state.activePool === pool ? "default" : "outline"}
          size="sm"
          onClick={() => state.setActivePool(pool)}
          className="gap-2"
        >
          {POOL_ICONS[pool]}
          {POOL_LABELS[pool]}
        </Button>
      ))}

      <Button
        variant="secondary"
        size="sm"
        onClick={state.handleScoutPool}
        className="ml-auto gap-2"
      >
        <Binoculars className="h-4 w-4" />
        Scout Pool
      </Button>
    </div>
  );
}

/** Foreign quota + sort/citizens/compare filter row. */
export function QuotaFilterRow({ state }: { state: State }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
            state.limitReached ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}
        >
          <Globe className="h-3.5 w-3.5" />
          Foreign Quota: {state.foreignUsage}/2
        </div>
        {state.limitReached && (
          <div className="flex items-center gap-1.5 text-[10px] text-destructive font-medium animate-pulse">
            <AlertCircle className="h-3 w-3" />
            Stable is at its foreign limit
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <SortMenu
          options={SORT_OPTIONS}
          storageKey="basho_sort_recruiting"
          defaultSortKey="name"
          defaultSortOrder="asc"
          onSortChange={(key, order) => {
            state.setSortKey(key);
            state.setSortOrder(order);
          }}
        />
        <Button
          variant={state.citizensOnly ? "default" : "outline"}
          size="sm"
          className="h-8 text-[10px] uppercase tracking-widest font-bold gap-2"
          onClick={() => state.setCitizensOnly(!state.citizensOnly)}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Citizens Only
        </Button>
        {state.selectedCandidates.length === 2 && (
          <Button
            variant="default"
            size="sm"
            className="h-8 text-[10px] uppercase tracking-widest font-bold gap-2 bg-success hover:bg-success/90"
            onClick={() => state.setShowCompare(true)}
          >
            <Layers className="h-3.5 w-3.5" />
            Compare Selected
          </Button>
        )}
      </div>
    </div>
  );
}

/** Single prospect card in the scrollable candidate list. */
export function CandidateCard({ c, state }: { c: CandidateDigestEntry; state: State }) {
  const isSelected = state.selectedCandidates.includes(c.candidateId);
  const visLabel =
    c.visibilityBand === "public"
      ? "Public"
      : c.visibilityBand === "rumored"
        ? "Rumored"
        : "Obscure";

  return (
    <Card
      className={cn(
        "paper cursor-pointer transition-all border-primary/10",
        isSelected
          ? "ring-2 ring-primary border-primary shadow-lg scale-[1.01] bg-primary/5"
          : "hover:border-primary/40"
      )}
      onClick={() => state.toggleSelection(c.candidateId)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isSelected && (
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
              <h3 className="font-display font-semibold">
                {c.visibilityBand === "hidden"
                  ? "Unknown Prospect"
                  : c.name || c.candidateId.slice(0, 8)}
              </h3>
              <Badge variant="outline" className="text-xs">
                {visLabel}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {c.poolType?.replace("_", " ") ?? state.activePool.replace("_", " ")}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              {c.nationality ?? "Unknown origin"} •{" "}
              {c.age
                ? `Age ${c.age} ${c.ageDescriptor ? `(${c.ageDescriptor})` : ""}`
                : "Age unknown"}{" "}
              •{" "}
              {c.height
                ? `${c.height}cm ${c.heightDescriptor ? `(${c.heightDescriptor})` : ""}`
                : ""}{" "}
              {c.weight
                ? `${c.weight}kg ${c.weightDescriptor ? `(${c.weightDescriptor})` : ""}`
                : ""}
            </div>

            {c.scoutLevel >= 35 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {c.archetype && (
                  <span>
                    Style:{" "}
                    <TooltipWrap content={getCombatArchetypeDescription(c.archetype)}>
                      <span className="cursor-help border-b border-dotted border-muted-foreground/30 hover:border-muted-foreground/60">
                        {resolveRegistryLabel("archetypes", c.archetype)}
                      </span>
                    </TooltipWrap>
                  </span>
                )}
                {c.scoutLevel >= 65 && c.talentSeed && (
                  <span className="ml-3">
                    Potential: {POTENTIAL_LABELS[toPotentialBand((c.talentSeed ?? 0) * 100)]}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
            <div className="flex items-center gap-1">
              <Search className="h-3 w-3 text-muted-foreground" />
              <ScoutingConfidenceBadge
                scoutLevel={c.scoutLevel}
                hasBias={c.hasBias ?? false}
              />
            </div>

            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  state.handleScoutCandidate(c.candidateId);
                }}
              >
                <Eye className="h-3 w-3" />
                Scout
              </Button>
              {c.availabilityState === "available" && (
                <Button
                  variant="default"
                  size="sm"
                  disabled={
                    state.limitReached &&
                    c.nationality !== "Japan" &&
                    c.nationality !== "Japanese"
                  }
                  className="h-7 text-xs gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    state.handleOfferClick(c);
                  }}
                >
                  <UserPlus className="h-3 w-3" />
                  Offer
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Signing confirmation + compare-mode dialogs. */
export function RecruitingDialogs({ state }: { state: State }) {
  return (
    <>
      <RecruitSigningDialog
        open={!!state.signingCandidate}
        onConfirm={state.handleConfirmSigning}
        onCancel={() => state.setSigningCandidate(null)}
        candidate={state.signingCandidate}
        playerHeyaName={state.playerHeya?.name}
        rosterSize={state.playerHeya?.rikishiIds?.length}
      />

      <Dialog open={state.showCompare} onOpenChange={state.setShowCompare}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Prospect Comparison</DialogTitle>
          </DialogHeader>
          {state.comparisonPair && state.comparisonPair.a && state.comparisonPair.b && (
            <CompareModePanel
              rikishiA={state.comparisonPair.a as unknown as UIRikishi}
              rikishiB={state.comparisonPair.b as unknown as UIRikishi}
              onClose={() => state.setShowCompare(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
