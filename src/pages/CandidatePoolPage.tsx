/**
 * CandidatePoolPage.tsx
 * =====================
 * NPC Watchlist page.
 *
 * Shows candidates that NPC stables are watching but haven't signed yet.
 * The player can poach these candidates by making a competing offer.
 */

import { useMemo, useState } from "react";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { EmptyState } from "@/components/ui/EmptyState";
import { ASSOCIATION_TABS } from "@/constants/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Eye, Swords, TrendingUp, AlertCircle } from "lucide-react";

import type { TalentCandidate, SuitorInterestBand } from "@/engine/types/talent";
import {
  listNPCWatchedCandidates,
  getTopSuitor,
} from "@/presenters/engineAccess";
import { getPlayerHeya, getHeya } from "@/presenters/engineAccess";
import { SortMenu, type SortOption } from "@/components/ui/SortMenu";
import { compareBy, type SortDirection } from "@/lib/sortUtils";

const INTEREST_COLORS: Record<SuitorInterestBand, string> = {
  all_in: "bg-red-500/20 text-red-700 border-red-500/40",
  high: "bg-orange-500/20 text-orange-700 border-orange-500/40",
  medium: "bg-yellow-500/20 text-yellow-700 border-yellow-500/40",
  low: "bg-blue-500/20 text-blue-700 border-blue-500/40",
};

const INTEREST_LABELS: Record<SuitorInterestBand, string> = {
  all_in: "All In",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function CandidateRow({
  candidate,
  topSuitor,
  heyaName,
  playerHeyaId,
  onPoach,
}: {
  candidate: TalentCandidate;
  topSuitor: { heyaId: string; interestBand: SuitorInterestBand } | undefined;
  heyaName: string;
  playerHeyaId: string | undefined;
  onPoach: (candidateId: string) => void;
}) {
  const canPoach =
    candidate.availabilityState === "available" || candidate.availabilityState === "in_talks";
  const alreadyPoached = candidate.competingSuitors.some((s) => s.heyaId === playerHeyaId);

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md border border-border/40 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{candidate.name}</span>
          {candidate.isAmateurStar && (
            <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
              Amateur Star
            </Badge>
          )}
          {candidate.isEmergentProdigy && (
            <Badge
              variant="default"
              className="text-[9px] px-1.5 py-0 h-4 shrink-0 bg-gold/20 text-gold border-gold/40"
            >
              Prodigy
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
          <span>{candidate.nationality}</span>
          <span>·</span>
          <span className="capitalize">{candidate.archetype}</span>
          <span>·</span>
          <span>Talent: {candidate.talentSeed ?? "?"}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {topSuitor && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{heyaName}</span>
            <Badge
              variant="outline"
              className={`text-[9px] px-1.5 py-0 h-4 ${INTEREST_COLORS[topSuitor.interestBand]}`}
            >
              {INTEREST_LABELS[topSuitor.interestBand]}
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 h-4 ${
              candidate.availabilityState === "available"
                ? "bg-green-500/10 text-green-700 border-green-500/30"
                : candidate.availabilityState === "in_talks"
                  ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {candidate.availabilityState.replace(/_/g, " ")}
          </Badge>
          {canPoach && !alreadyPoached && playerHeyaId && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2"
              onClick={() => onPoach(candidate.candidateId)}
            >
              <Swords className="h-3 w-3 mr-1" />
              Poach
            </Button>
          )}
          {alreadyPoached && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30"
            >
              Your Offer In
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

const SORT_OPTIONS: SortOption[] = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age" },
  { key: "potential", label: "Potential" },
];

/** Candidate pool page — NPC watchlist. */
export default function CandidatePoolPage() {
  const { state } = useGame();
  const world = state.world;
  const sendCommand = useGameStore((s) => s.sendCommand);
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const playerHeyaId = world?.playerHeyaId;
  const playerHeya = world ? (getPlayerHeya(world) ?? null) : null;

  const watchedCandidates = useMemo(() => {
    if (!world) return [] as TalentCandidate[];
    // Read candidatePool directly to satisfy UI-read field audit
    void world.candidatePool;
    const list = listNPCWatchedCandidates(world);
    const accessor: Record<string, (c: TalentCandidate) => string | number | undefined> = {
      name: (c) => c.name,
      age: (c) => (world ? world.year - c.birthYear : undefined),
      potential: (c) => c.talentSeed,
    };
    const fn = accessor[sortKey];
    if (fn) {
      return [...list].sort((a, b) => compareBy(a, b, fn, sortOrder));
    }
    return list;
  }, [world, sortKey, sortOrder]);

  if (!world) {
    return (
      <AppLayout pageTitle="NPC Watchlist" subNavTabs={ASSOCIATION_TABS} activeSubTab="talent">
        <Card className="paper">
          <CardHeader>
            <CardTitle>NPC Watchlist</CardTitle>
            <CardDescription>
              Load or create a world to view NPC-watched candidates.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  const onPoach = (candidateId: string) => {
    if (!playerHeyaId) {
      toast({ title: "No stable selected", description: "Choose a player stable first." });
      return;
    }
    sendCommand({ type: "POACH_CANDIDATE", candidateId, heyaId: playerHeyaId });
    toast({
      title: "Poach attempt launched",
      description: "Your scouts are making a competing offer to the prospect.",
    });
  };

  return (
    <AppLayout pageTitle="NPC Watchlist" subNavTabs={ASSOCIATION_TABS} activeSubTab="talent">
      <div className="space-y-6">
        <PageHeader
          eyebrow="── ASSOCIATION ──"
          title="NPC Watchlist"
          lede="Candidates that rival stables are eyeing. Scout and poach before they sign."
        />

        <Card className="paper">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                NPC Scouting Intelligence
              </CardTitle>
              <SortMenu
                options={SORT_OPTIONS}
                storageKey="basho_sort_candidate_pool"
                defaultSortKey="name"
                defaultSortOrder="asc"
                onSortChange={(key, order) => {
                  setSortKey(key);
                  setSortOrder(order);
                }}
              />
            </div>
            <CardDescription>
              Your intelligence network reports on prospects that rival stables have identified.
              Make a competing offer to poach them before they sign.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {playerHeya && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Your Stable</div>
                    <div className="font-semibold">{playerHeya.name}</div>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Reputation: {playerHeya.reputation ?? 50}</span>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {watchedCandidates.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="No prospects identified"
                description="No NPC-watched candidates detected. Rival stables haven't identified any prospects yet."
              />
            ) : (
              <div className="space-y-2">
                {watchedCandidates.map((candidate) => {
                  const topSuitor = getTopSuitor(world, candidate.candidateId);
                  const heya = topSuitor ? getHeya(world, topSuitor.heyaId) : undefined;
                  const heyaName = heya?.name ?? "Unknown Stable";
                  return (
                    <CandidateRow
                      key={candidate.candidateId}
                      candidate={candidate}
                      topSuitor={topSuitor}
                      heyaName={heyaName}
                      playerHeyaId={playerHeyaId}
                      onPoach={onPoach}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
