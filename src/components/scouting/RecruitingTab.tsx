// RecruitingTab.tsx — talent scouting and signing

import { useMemo, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { RecruitSigningDialog } from "@/components/game/RecruitSigningDialog";
import {
  projectRecruitmentUIDigest,
  scoutPool,
  scoutCandidate,
  offerCandidate,
  describeScoutingLevel,
  resolveRegistryLabel,
} from "@/presenters/uiDigest";
import { getHeyaForeignUsage } from "@/engine/utils/citizenshipUtils";
import type { TalentCandidate } from "@/engine/types/talent";
import { getStableRikishi } from "@/engine/queries";
import { CompareModePanel } from "./CompareModePanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function RecruitingTab({ playerHeyaId }: { playerHeyaId: string | null }) {
  const { state, updateWorld } = useGame();
  const world = state.world;
  const { toast } = useToast();
  const [activePool, setActivePool] = useState<"high_school" | "university" | "foreign">(
    "high_school"
  );
  const [citizensOnly, setCitizensOnly] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  type CandidateDigestEntry = TalentCandidate & {
    scoutLevel: number;
    scoutInfo: string;
    scoutedProgress?: number;
    scoutingInvestment?: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex candidate type from projectRecruitmentUIDigest
  const [signingCandidate, setSigningCandidate] = useState<any>(null);

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
    try {
      const result = scoutPool(world, activePool, {
        revealCount: 2,
      });
      updateWorld({ ...world });
      if (result.revealed.length > 0) {
        toast({
          title: "New prospects found",
          description: `${result.revealed.length} prospect(s) revealed.`,
        });
      } else {
        toast({
          title: "No new prospects",
          description: "No more hidden prospects in this pool right now.",
        });
      }
    } catch {
      toast({
        title: "Scouting failed",
        description: "Could not scout this pool.",
      });
    }
  };

  const handleScoutCandidate = (candidateId: string) => {
    if (!world) return;
    try {
      const result = scoutCandidate(world, candidateId, {
        effort: 1,
      });
      updateWorld({ ...world });
      if (result.ok) {
        toast({
          title: "Intel gathered",
          description: `Scouting level: ${describeScoutingLevel(result.scoutingLevel)}`,
        });
      }
    } catch {
      toast({ title: "Scout failed" });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex candidate type from projectRecruitmentUIDigest
  const handleOfferClick = (candidate: any) => {
    setSigningCandidate(candidate);
  };

  const handleConfirmSigning = (offer: {
    offerType: "standard" | "aggressive";
    interest: "low" | "medium" | "high" | "all_in";
  }) => {
    if (!world || !playerHeyaId || !signingCandidate) return;
    try {
      const result = offerCandidate(
        world,
        signingCandidate.candidateId,
        playerHeyaId,
        offer.offerType,
        offer.interest
      );
      updateWorld({ ...world });
      if (result.ok) {
        toast({
          title: "Offer submitted",
          description: "Decision pending — the prospect is considering offers.",
        });
      } else {
        toast({
          title: "Offer blocked",
          description: result.reason ?? "Cannot make this offer.",
        });
      }
    } catch {
      toast({ title: "Offer failed" });
    }
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

  const comparisonPair = useMemo(() => {
    if (selectedCandidates.length < 2) return null;
    const candidates = selectedCandidates
      .map((id) => digest.candidates.find((c: CandidateDigestEntry) => c.candidateId === id))
      .filter((c): c is CandidateDigestEntry => c !== undefined);
    if (candidates.length < 2) return null;
    return { a: candidates[0], b: candidates[1] };
  }, [selectedCandidates, digest.candidates]);

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
                        {c.age ? `Age ${c.age}` : "Age unknown"} • {c.height ? `${c.height}cm` : ""}{" "}
                        {c.weight ? `${c.weight}kg` : ""}
                      </div>

                      {c.scoutLevel >= 35 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {c.archetype && (
                            <span>Style: {resolveRegistryLabel("archetypes", c.archetype)}</span>
                          )}
                          {c.scoutLevel >= 65 && c.talentSeed && (
                            <span className="ml-3">
                              Potential:{" "}
                              {c.talentSeed > 0.7
                                ? "Promising"
                                : c.talentSeed > 0.4
                                  ? "Average"
                                  : "Modest"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <Search className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{c.scoutInfo}</span>
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
