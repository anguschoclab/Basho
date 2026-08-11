/**
 * RecapPage.tsx
 *
 * Post-Basho Narrative Recap & Association Wrappers.
 * Architecturally decomposed into modular ceremonial and narrative sub-components.
 * Features a high-fidelity "Rich Aesthetics" orchestration.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { useRequireWorld } from "@/hooks/useRequireWorld";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/control-center";

import { TournamentCeremony } from "@/components/recap/TournamentCeremony";
import { NarrativeSummary } from "@/components/recap/NarrativeSummary";
import { PressConference } from "@/components/game/PressConference";
import { YokozunaDeliberation } from "@/components/game/YokozunaDeliberation";
import { HoFInductionCeremony } from "@/components/game/HoFInductionCeremony";
import { IntaiCeremony } from "@/components/game/IntaiCeremony";
import { PlayoffBracket } from "@/components/game/PlayoffBracket";
import { BanzukeReveal } from "@/components/game/BanzukeReveal";
import { KeyBoutsSection } from "@/components/game/KeyBoutsSection";
import { selectKeyBouts } from "@/presenters/projections/recapProjections";
import { compareBanzuke, formatRankPosition, RANK_HIERARCHY } from "@/presenters/engineAccess";
import { makeBashoKey } from "@/presenters/engineAccess";
import { EntityCollection } from "@/presenters/engineAccess";
import { getPlayerHeya } from "@/presenters/engineAccess";
import {
  getHeya,
  getRikishi,
  getRikishiAnywhere,
  getHistory,
  getRikishiMap,
} from "@/presenters/worldAccess";
import { projectRikishi } from "@/presenters/uiModels";
import type { WorldState } from "@/presenters/uiDigest";
import type { EngineEvent } from "@/engine/types/events";
import type { HoFInductee } from "@/presenters/engineAccess";
import type { UIRikishi } from "@/presenters/uiModels";
import {
  projectPressConferenceData,
  projectGovernanceSummary,
  projectBashoResults,
} from "@/presenters/uiDigest";

// Helper utilities for the Recap Page logic
function getBashoWrapEvents(events: EngineEvent[], bashoNumber?: number): EngineEvent[] {
  return events
    .filter(
      (e) =>
        (e.phase === "basho_wrap" ||
          e.category === "basho" ||
          e.category === "career" ||
          e.category === "promotion") &&
        (bashoNumber === undefined || e.bashoNumber === bashoNumber)
    )
    .slice(-50);
}

function groupEventsByNarrative(events: EngineEvent[]) {
  const groups = {
    yusho: [] as EngineEvent[],
    promotions: [] as EngineEvent[],
    retirements: [] as EngineEvent[],
    injuries: [] as EngineEvent[],
    governance: [] as EngineEvent[],
    ydcAccountability: [] as EngineEvent[],
    pressConference: [] as EngineEvent[],
    sponsors: [] as EngineEvent[],
    other: [] as EngineEvent[],
  };
  for (const e of events) {
    if (e.type.includes("YUSHO") || e.type.includes("CHAMPIONSHIP")) groups.yusho.push(e);
    else if (
      e.category === "promotion" ||
      e.type.includes("PROMOTION") ||
      e.type.includes("DEMOTION")
    )
      groups.promotions.push(e);
    else if (e.type.includes("RETIRE") || e.category === "career") groups.retirements.push(e);
    else if (e.category === "injury") groups.injuries.push(e);
    else if (
      e.type.includes("GOVERNANCE") &&
      e.data?.status &&
      typeof e.data.status === "string" &&
      [
        "praise",
        "warning",
        "demand_reflection",
        "encouragement",
        "absence_criticism",
        "private_cynicism",
      ].includes(e.data.status as string)
    )
      groups.ydcAccountability.push(e);
    else if (e.category === "discipline" || e.type.includes("GOVERNANCE"))
      groups.governance.push(e);
    else if (e.data?.incident === "Post-Basho Press Conference") groups.pressConference.push(e);
    else if (e.category === "sponsor") groups.sponsors.push(e);
    else groups.other.push(e);
  }
  return groups;
}

function getPrestigeChanges(
  world: WorldState
): Array<{ heya: { name: string; prestigeBand: string; reputation: number }; change: string }> {
  const changes: Array<{
    heya: { name: string; prestigeBand: string; reputation: number };
    change: string;
  }> = [];
  if (!world) return changes;
  const prestige_events = (world.events?.log || [])
    .filter(
      (e: EngineEvent) =>
        e.type.includes("PRESTIGE") || e.type.includes("STATURE") || e.category === "milestone"
    )
    .slice(-20);
  for (const e of prestige_events) {
    if (e.heyaId) {
      const heya = getHeya(world, e.heyaId);
      if (heya) changes.push({ heya, change: e.summary });
    }
  }
  return changes;
}

export default function RecapPage() {
  const { state, setPhase, applyPressConference } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const [showPressConference, setShowPressConference] = useState(false);
  const [showYokozunaDelib, setShowYokozunaDelib] = useState(false);
  const [showHoFCeremony, setShowHoFCeremony] = useState<HoFInductee | null>(null);
  const [showBanzukeReveal, setShowBanzukeReveal] = useState(false);
  const [intaiQueue, setIntaiQueue] = useState<{ rikishi: UIRikishi; reason: string }[]>([]);
  const [currentIntaiIndex, setCurrentIntaiIndex] = useState(0);

  const handleContinue = () => {
    setPhase("interim");
    navigate({ to: "/dashboard" });
  };

  const handlePressConferenceClose = (effects: {
    reputation: number;
    morale: number;
    mediaHeat: number;
  }) => {
    setShowPressConference(false);
    // Apply effects through the worker so the change survives the next tick.
    if (world?.playerHeyaId) {
      applyPressConference(world.playerHeyaId, effects.reputation);
    }
  };

  const _history = world ? getHistory(world) : [];
  const lastBasho = _history[_history.length - 1];

  const hasWorld = useRequireWorld();

  // Check for player rikishi retirements and populate intai ceremony queue
  useEffect(() => {
    if (!world || !world.playerHeyaId || !lastBasho) return;

    const retirementEvents = (world.events?.log || []).filter(
      (e: EngineEvent) => e.category === "career" && (e.type as string).includes("RETIRE")
    );

    const playerRetirements: { rikishi: UIRikishi; reason: string }[] = [];
    for (const event of retirementEvents) {
      if (event.rikishiId) {
        const rikishi = getRikishiAnywhere(world, event.rikishiId);
        if (rikishi && rikishi.heyaId === world.playerHeyaId) {
          playerRetirements.push({
            rikishi: projectRikishi(rikishi, world),
            reason: event.summary || (event.type as string) || "Retirement",
          });
        }
      }
    }

    if (playerRetirements.length > 0) {
      setIntaiQueue(playerRetirements);
      setCurrentIntaiIndex(0);
    }
  }, [world, lastBasho]);

  // Generate banzuke comparison data using real banzuke comparison
  const banzukeEntries = useMemo(() => {
    if (!world || !lastBasho) return [];

    const currentBanzuke = world.currentBanzuke;
    const historyIndex = world.historyIndex;

    if (!currentBanzuke || !historyIndex) return [];

    // Get previous basho key
    const prevYear = lastBasho.bashoNumber === 1 ? lastBasho.year - 1 : lastBasho.year;
    const prevBashoNum = lastBasho.bashoNumber === 1 ? 6 : lastBasho.bashoNumber - 1;
    const prevBashoKey = makeBashoKey(prevYear, prevBashoNum);

    const previousSnapshot = historyIndex.banzukeByBasho[prevBashoKey];

    // Get changes using comparison function
    const rikishiMap = getRikishiMap(world);
    const changes = compareBanzuke(currentBanzuke, previousSnapshot || null, rikishiMap);

    // Transform to reveal entries
    return changes
      .slice(0, 20)
      .map((change) => {
        const rikishi = rikishiMap.get(change.rikishiId);
        if (!rikishi) return null;

        let displayChange: "up" | "down" | "none" | "new" | "division_change" = change.change;

        // Detect division changes
        if (change.oldPosition && change.newPosition) {
          const oldDivision = RANK_HIERARCHY[change.oldPosition.rank].division;
          const newDivision = RANK_HIERARCHY[change.newPosition.rank].division;
          if (oldDivision !== newDivision) {
            displayChange = "division_change";
          }
        }

        return {
          id: change.rikishiId,
          shikona: rikishi.shikona,
          oldRank: change.oldPosition ? formatRankPosition(change.oldPosition) : "New Entry",
          newRank: formatRankPosition(change.newPosition),
          change: displayChange,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [world, lastBasho]);

  const handleBanzukeRevealComplete = () => {
    setShowBanzukeReveal(false);
  };

  const keyMoments = useMemo(() => (world ? selectKeyBouts(world) : []), [world]);
  const getRikishiForBout = useCallback(
    (id: string) => {
      if (!world) return null;
      const r = getRikishi(world, id);
      return r ? projectRikishi(r, world) : null;
    },
    [world]
  );

  if (!hasWorld || !world) return null;
  const events = world.events?.log || [];
  const bashoEvents = getBashoWrapEvents(events, lastBasho?.bashoNumber);
  const groupedEvents = groupEventsByNarrative(bashoEvents);
  const prestigeChanges = getPrestigeChanges(world);

  // Transform EngineEvent groups into the shape expected by NarrativeSummary
  const narrativeGroupedEvents = {
    promotions: groupedEvents.promotions.map((e) => ({
      title: e.title,
      summary: e.summary,
      type: e.type as string,
    })),
    retirements: groupedEvents.retirements.map((e) => ({
      title: e.title,
      summary: e.summary,
    })),
    governance: groupedEvents.governance.map((e) => ({
      title: e.title,
      summary: e.summary,
    })),
    ydcAccountability: groupedEvents.ydcAccountability.map((e) => ({
      title: e.title,
      summary: e.summary,
      status: (e.data?.status as string) ?? "unknown",
      chairmanName: e.data?.chairmanName as string | undefined,
      references: e.data?.references as string[] | undefined,
      publicStatement: e.data?.publicStatement as string | undefined,
      privateSentiment: e.data?.privateSentiment as string | undefined,
    })),
    pressConference: groupedEvents.pressConference.map((e) => ({
      title: e.title,
      summary: e.summary,
      narrative: e.data?.narrative as { text: string; id: string }[] | undefined,
    })),
  };

  const dashboardTabs = [
    { id: "overview", label: "Overview", href: "/dashboard" },
    { id: "basho", label: "Basho", href: "/basho" },
    { id: "recap", label: "Recap" },
    { id: "history", label: "History", href: "/history" },
    { id: "almanac", label: "Almanac", href: "/almanac" },
  ];

  const bashoTitle = lastBasho?.bashoName?.toUpperCase() || "RECENT";

  return (
    <AppLayout pageTitle="Post-Basho Recap" subNavTabs={dashboardTabs} activeSubTab="recap">

        <title>{bashoTitle} Recap | Basho</title>


      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        {/* ═══ HERO SECTION ═══ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-2 border-border/20">
          <PageHeader
            eyebrow="── POST-BASHO ──"
            title="Basho Recap"
            lede={`${bashoTitle} ${world.year} — The official ceremonial summary and world drift ledger.`}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-12 px-6 font-black uppercase tracking-widest border-2"
              onClick={() => navigate({ to: "/basho/banzuke" })}
            >
              Banzuke <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              className="h-12 px-6 font-black uppercase tracking-widest border-2"
              onClick={() => setShowBanzukeReveal(true)}
            >
              Banzuke Reveal
            </Button>
            <Button
              variant="outline"
              className="h-12 px-6 font-black uppercase tracking-widest border-2"
              onClick={() => setShowPressConference(true)}
            >
              Press Conference
            </Button>
            <Button
              className="h-12 px-10 gap-3 font-display font-black uppercase tracking-widest shadow-xl shadow-primary/20"
              onClick={handleContinue}
            >
              Finalize Basho <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* ═══ CEREMONIAL LAYER ═══ */}
        {world && lastBasho && (
          <TournamentCeremony lastBasho={lastBasho} {...projectBashoResults(world, lastBasho)} />
        )}

        {/* ═══ BANZUKE REVEAL ═══ */}
        {showBanzukeReveal && (
          <BanzukeReveal entries={banzukeEntries} onComplete={handleBanzukeRevealComplete} />
        )}

        {/* ═══ PLAYOFF BRACKET (if playoffs occurred) ═══ */}
        {lastBasho?.playoffMatches && lastBasho.playoffMatches.length > 0 && (
          <div className="pt-8">
            <PlayoffBracket matches={lastBasho.playoffMatches} world={world} />
          </div>
        )}

        {/* ═══ NARRATIVE LAYER ═══ */}
        <div className="pt-12">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-3xl font-display font-black uppercase tracking-tighter">
              Association Drift
            </h2>
            <div className="h-px flex-1 bg-border/20" />
          </div>
          <NarrativeSummary
            groupedEvents={narrativeGroupedEvents}
            prestigeChanges={prestigeChanges}
            narrativeSummaryData={{
              governanceLog: projectGovernanceSummary(world).governanceLog,
              year: projectGovernanceSummary(world).year,
              activeHeyasCount: projectGovernanceSummary(world).heyasCount,
            }}
          />
        </div>

        {/* ═══ BOUTS OF THE BASHO HIGHLIGHT REEL ═══ */}
        <KeyBoutsSection moments={keyMoments} getRikishi={getRikishiForBout} />

        {/* ═══ MODALS & CEREMONIES ═══ */}
        {showPressConference && (
          <PressConference
            pressData={projectPressConferenceData(world)}
            open={showPressConference}
            onClose={handlePressConferenceClose}
          />
        )}

        {showYokozunaDelib && (
          <YokozunaDeliberation
            open={showYokozunaDelib}
            rikishi={projectRikishi(EntityCollection.getActiveRikishi(world)[0], world)}
            heyaName={getPlayerHeya(world)?.name || "Unknown Stable"}
            isPlayerRikishi={true}
            verdict="deferred"
            reasoning={["Continued performance required."]}
            onClose={() => setShowYokozunaDelib(false)}
          />
        )}

        {showHoFCeremony && (
          <HoFInductionCeremony
            inductee={showHoFCeremony}
            heyaName={(() => {
              const r = getRikishiAnywhere(world, showHoFCeremony.rikishiId);
              const h = r ? getHeya(world, r.heyaId) : null;
              return h?.name || "Independent";
            })()}
            isPlayerRikishi={
              getRikishi(world, showHoFCeremony.rikishiId)?.heyaId === world.playerHeyaId
            }
            open={!!showHoFCeremony}
            onClose={() => setShowHoFCeremony(null)}
          />
        )}

        {intaiQueue.length > 0 && currentIntaiIndex < intaiQueue.length && (
          <IntaiCeremony
            heyaName={getPlayerHeya(world)?.name || "Unknown Stable"}
            isPlayerRikishi={true}
            open={true}
            rikishi={intaiQueue[currentIntaiIndex].rikishi}
            reason={intaiQueue[currentIntaiIndex].reason}
            onClose={() => {
              if (currentIntaiIndex < intaiQueue.length - 1) {
                setCurrentIntaiIndex(currentIntaiIndex + 1);
              } else {
                setIntaiQueue([]);
                setCurrentIntaiIndex(0);
              }
            }}
          />
        )}
      </div>

      {/* Floating Action Button for persistence */}
      <div className="fixed bottom-10 right-10 z-50">
        <Button
          size="lg"
          className="h-16 w-16 rounded shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)] border-4 border-white/20 p-0"
          onClick={handleContinue}
          title="Finalize Basho"
        >
          <ArrowRight className="h-8 w-8" />
        </Button>
      </div>
    </AppLayout>
  );
}
