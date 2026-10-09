/**
 * useRecruitingState.ts
 *
 * RecruitingTab state & command handlers — pool/scope filters,
 * candidate selection, signing flow, and scouting commands.
 */

import { useMemo, useState } from "react";
import { useGame } from "@/contexts/useGame";
import { useToast } from "@/hooks/use-toast";
import { useGameStore } from "@/store/gameStore";
import { projectRecruitmentUIDigest } from "@/presenters/uiDigest";
import { getHeyaForeignUsage, getHeyaRoster } from "@/presenters/engineAccess";
import type { CandidateDigestEntry } from "@/presenters/projections/boutProjections";
import { compareBy, type SortDirection } from "@/lib/sortUtils";

export function useRecruitingState(playerHeyaId: string | null) {
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
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const [signingCandidate, setSigningCandidate] = useState<CandidateDigestEntry | null>(null);

  const digest = useMemo(() => {
    if (!world) return { candidates: [] };
    const d = projectRecruitmentUIDigest(world, activePool);
    if (citizensOnly) {
      d.candidates = d.candidates.filter(
        (c: CandidateDigestEntry) => c.nationality === "Japan" || c.nationality === "Japanese"
      );
    }
    const accessor: Record<string, (c: CandidateDigestEntry) => string | number | undefined> = {
      name: (c) => c.name,
      age: (c) => c.age,
      potential: (c) => c.talentSeed,
      scoutLevel: (c) => c.scoutLevel,
    };
    const fn = accessor[sortKey];
    if (fn) {
      d.candidates = [...d.candidates].sort((a, b) => compareBy(a, b, fn, sortOrder));
    }
    return d;
  }, [world, activePool, citizensOnly, sortKey, sortOrder]);

  const foreignUsage = useMemo(() => {
    if (!world || !playerHeyaId) return 0;
    const rikishi = getHeyaRoster(world, playerHeyaId);
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

  return {
    world,
    activePool,
    setActivePool,
    citizensOnly,
    setCitizensOnly,
    selectedCandidates,
    showCompare,
    setShowCompare,
    setSortKey,
    setSortOrder,
    signingCandidate,
    setSigningCandidate,
    digest,
    foreignUsage,
    limitReached,
    handleScoutPool,
    handleScoutCandidate,
    handleOfferClick,
    handleConfirmSigning,
    toggleSelection,
    comparisonPair,
    playerHeya,
  };
}
