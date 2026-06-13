// RecruitingTab.tsx — talent scouting and signing

import { useMemo, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useToast } from "@/hooks/use-toast";
import { useGameStore } from "@/store/gameStore";
import { RecruitSigningDialog } from "@/components/game/RecruitSigningDialog";
import { projectRecruitmentUIDigest, resolveRegistryLabel } from "@/presenters/uiDigest";
import { getHeyaForeignUsage } from "@/engine/utils/citizenshipUtils";
import type { CandidateDigestEntry } from "@/presenters/projections/boutProjections";
import { getStableRikishi } from "@/engine/queries";
import { CompareModePanel } from "./CompareModePanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layers } from "lucide-react";
import { getCombatArchetypeDescription } from "@/engine/archetype";
import { cn } from "@/lib/utils";
import { toPotentialBand } from "@/engine/descriptorBands";
import { POTENTIAL_LABELS } from "@/constants/ui/labels";

/**
 * Displays scouting confidence as star rating (1-5 stars).
 * Shows "est." label when scouting view is still biased by initial misvaluation.
 *
 * @param scoutLevel - Current scouting level (0-100)
 * @param hasBias - Whether the candidate's stats are still biased by initial misvaluation
 */
function ScoutingConfidenceBadge({
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

export function RecruitingTab({ playerHeyaId }: { playerHeyaId: string | null }) {
  const { state } = useGame();
  const { sendCommand } = useGameStore();
  const world = state.world;
  const { toast } = useToast();
  const [activePool, setActivePool] = useState<"high_school" | "university" | "foreign">(
    "high_school"
  );
  const [citizensOnly, setCitizensOnly] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const [signingCandidate, setSigningCandidate] = useState<CandidateDigestEntry | null>(null);

  const digest = useMemo(() => {
    if (!world) return { candidates: [] };
    const d = projectRecruitmentUIDigest(world, activePool);
    if (citizensOnly) {
      d.candidates = d.candidates.filter(
        (c: CandidateDigestEntry) => c.nationality === "Japan" || c.nationality === "Japanese"
      );
    }
    return d;
  }, [world, activePool, citizensOnly]);

  const foreignUsage = useMemo(() => {
    if (!world || !playerHeyaId) return 0;
    const rikishi = getStableRikishi(world, playerHeyaId);
    return getHeyaForeignUsage(rikishi, world.year);
  }, [world, playerHeyaId]);

  const limitReached = foreignUsage >= 2;

  const handleScoutPool = () => {
    if (!world) return;
    sendCommand({
      type: "SCOUT_POOL",
      pool: activePool,
      revealCount: 2,
    });
    toast({
      title: "Scouting initiated",
      description: "Dispatching scouts to the pool...",
    });
  };

  const handleScoutCandidate = (candidateId: string) => {
    if (!world) return;
    sendCommand({
      type: "SCOUT_CANDIDATE",
      candidateId,
      effort: 1,
    });
    toast({
      title: "Intel requested",
      description: "Gathering deeper intelligence on this prospect...",
    });
  };

  const handleOfferClick = (candidate: CandidateDigestEntry) => {
    setSigningCandidate(candidate);
  };

  const handleConfirmSigning = (_offer: {
    offerType: "standard" | "aggressive";
    interest: "low" | "medium" | "high" | "all_in";
  }) => {
    if (!world || !playerHeyaId || !signingCandidate) return;
    sendCommand({
      type: "OFFER_CONTRACT",
      candidateId: signingCandidate.candidateId,
      heyaId: playerHeyaId,
    });
    toast({
      title: "Offer submitted",
      description: "Decision pending — the prospect is considering offers.",
    });
    setSigningCandidate(null);
  };

  const toggleSelection = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : prev.length < 2
          ? [...prev, id]
          : [prev[1], id]
    );
  };

  const candidateById = useMemo(
    () => new Map(digest.candidates.map((c) => [c.candidateId, c])),
    [digest.candidates]
  );

  const comparisonPair = useMemo(() => {
    if (selectedCandidates.length < 2) return null;
    const a = candidateById.get(selectedCandidates[0]);
    const b = candidateById.get(selectedCandidates[1]);
    if (!a || !b) return null;
    return { a, b };
  }, [selectedCandidates, candidateById]);

  const playerHeya = playerHeyaId ? world?.heyas?.get(playerHeyaId) : null;

  const poolIcons = {
    high_school: <School className="h-4 w-4" />,
    university: <GraduationCap className="h-4 w-4" />,
    foreign: <Globe className="h-4 w-4" />,
  };

  const poolLabels = {
    high_school: "High School",
    university: "University",
    foreign: "Foreign",
  };

  return (
    <div className="space-y-4">
      {/* Pool selector */}
      <div className="flex gap-2 flex-wrap items-center">
        {(["high_school", "university", "foreign"] as const).map((pool) => (
          <Button
            key={pool}
            variant={activePool === pool ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePool(pool)}
            className="gap-2"
          >
            {poolIcons[pool]}
            {poolLabels[pool]}
          </Button>
        ))}

        <Button variant="secondary" size="sm" onClick={handleScoutPool} className="ml-auto gap-2">
          <Binoculars className="h-4 w-4" />
          Scout Pool
        </Button>
      </div>

      {/* Quota & Filters */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
              limitReached ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            Foreign Quota: {foreignUsage}/2
          </div>
          {limitReached && (
            <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-medium animate-pulse">
              <AlertCircle className="h-3 w-3" />
              Stable is at its foreign limit
            </div>
          )}
        </div>

        <Button
          variant={citizensOnly ? "default" : "outline"}
          size="sm"
          className="h-8 text-[10px] uppercase tracking-widest font-bold gap-2"
          onClick={() => setCitizensOnly(!citizensOnly)}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Citizens Only
        </Button>
        {selectedCandidates.length === 2 && (
          <Button
            variant="default"
            size="sm"
            className="h-8 text-[10px] uppercase tracking-widest font-bold gap-2 bg-success hover:bg-success/90"
            onClick={() => setShowCompare(true)}
          >
            <Layers className="h-3.5 w-3.5" />
            Compare Selected
          </Button>
        )}
      </div>

      <ScrollArea className="h-[550px]">
        <div className="space-y-3 pr-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex candidate type from projectRecruitmentUIDigest */}
          {digest.candidates.map((c: any) => {
            const isSelected = selectedCandidates.includes(c.candidateId);
            const visLabel =
              c.visibilityBand === "public"
                ? "Public"
                : c.visibilityBand === "rumored"
                  ? "Rumored"
                  : "Obscure";

            return (
              <Card
                key={c.candidateId}
                className={cn(
                  "paper cursor-pointer transition-all border-primary/10",
                  isSelected
                    ? "ring-2 ring-primary border-primary shadow-lg scale-[1.01] bg-primary/5"
                    : "hover:border-primary/40"
                )}
                onClick={() => toggleSelection(c.candidateId)}
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
                          {c.poolType?.replace("_", " ") ?? activePool.replace("_", " ")}
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
                              <TooltipWrap
                                content={getCombatArchetypeDescription(c.archetype as any)}
                              >
                                <span className="cursor-help border-b border-dotted border-muted-foreground/30 hover:border-muted-foreground/60">
                                  {resolveRegistryLabel("archetypes", c.archetype)}
                                </span>
                              </TooltipWrap>
                            </span>
                          )}
                          {c.scoutLevel >= 65 && c.talentSeed && (
                            <span className="ml-3">
                              Potential:{" "}
                              {POTENTIAL_LABELS[toPotentialBand((c.talentSeed ?? 0) * 100)]}
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
                            handleScoutCandidate(c.candidateId);
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
                              limitReached &&
                              c.nationality !== "Japan" &&
                              c.nationality !== "Japanese"
                            }
                            className="h-7 text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOfferClick(c);
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
          })}

          {digest.candidates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Binoculars className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No visible prospects in this pool yet.</p>
              <p className="text-xs mt-1">Use "Scout Pool" to reveal hidden prospects.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Signing confirmation dialog */}
      <RecruitSigningDialog
        open={!!signingCandidate}
        onConfirm={handleConfirmSigning}
        onCancel={() => setSigningCandidate(null)}
        candidate={signingCandidate}
        playerHeyaName={playerHeya?.name}
        rosterSize={playerHeya?.rikishiIds?.length}
      />

      {/* Compare Mode Dialog */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Prospect Comparison</DialogTitle>
          </DialogHeader>
          {comparisonPair && comparisonPair.a && comparisonPair.b && (
            <CompareModePanel
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              rikishiA={comparisonPair.a as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              rikishiB={comparisonPair.b as any}
              onClose={() => setShowCompare(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
