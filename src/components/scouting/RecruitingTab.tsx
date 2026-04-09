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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TacticalArchetype } from "@/engine/types/combat";
import { RecruitSigningDialog } from "@/components/game/RecruitSigningDialog";
import { 
  projectRecruitmentUIDigest, 
  scoutPool, 
  scoutCandidate, 
  offerCandidate, 
  describeScoutingLevel, 
  resolveRegistryLabel 
} from "@/presenters/uiDigest";

export function RecruitingTab({
  playerHeyaId,
}: {
  playerHeyaId: string | null;
}) {
  const { state, updateWorld } = useGame();
  const world = state.world;
  const { toast } = useToast();
  const [activePool, setActivePool] = useState<
    "high_school" | "university" | "foreign"
  >("high_school");
  const [signingCandidate, setSigningCandidate] = useState<any>(null);

  const digest = useMemo(() => {
    if (!world) return { candidates: [] };
    return projectRecruitmentUIDigest(world, activePool);
  }, [world, activePool]);

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
          description: `Scouting level: ${describeScoutingLevel(result.scoutingLevel).label}`,
        });
      }
    } catch {
      toast({ title: "Scout failed" });
    }
  };

  const handleOfferClick = (candidate: any) => {
    setSigningCandidate(candidate);
  };

  const handleConfirmSigning = (offer: any) => {
    if (!world || !playerHeyaId || !signingCandidate) return;
    try {
      const result = offerCandidate(
        world,
        signingCandidate.candidateId,
        playerHeyaId,
        offer.offerType,
        offer.interest,
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

        <Button
          variant="secondary"
          size="sm"
          onClick={handleScoutPool}
          className="ml-auto gap-2"
        >
          <Binoculars className="h-4 w-4" />
          Scout Pool
        </Button>
      </div>

      <ScrollArea className="h-[550px]">
        <div className="space-y-3 pr-2">
          {digest.candidates.map((c: any) => {
            const visLabel =
              c.visibilityBand === "public"
                ? "Public"
                : c.visibilityBand === "rumored"
                  ? "Rumored"
                  : "Obscure";

            return (
              <Card key={c.candidateId} className="paper">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold">
                          {c.visibilityBand === "hidden"
                            ? "Unknown Prospect"
                            : c.name || c.candidateId.slice(0, 8)}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {visLabel}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {c.poolType?.replace("_", " ") ??
                            activePool.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground mt-1">
                        {c.nationality ?? "Unknown origin"} •{" "}
                        {c.age ? `Age ${c.age}` : "Age unknown"} •{" "}
                        {c.height ? `${c.height}cm` : ""}{" "}
                        {c.weight ? `${c.weight}kg` : ""}
                      </div>

                      {c.scoutLevel >= 35 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {c.archetype && (
                            <span>
                              Style:{" "}
                              {resolveRegistryLabel('archetypes', c.archetype)}
                            </span>
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
                        <Search className={`h-3 w-3 ${c.scoutInfo.color}`} />
                        <span className={`text-xs ${c.scoutInfo.color}`}>
                          {c.scoutInfo.label}
                        </span>
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
              <p className="text-xs mt-1">
                Use "Scout Pool" to reveal hidden prospects.
              </p>
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
    </div>
  );
}
