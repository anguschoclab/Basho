// @ts-nocheck
/**
 * RecapPage.tsx
 *
 * Post-Basho Narrative Recap & Association Wrappers.
 * Architecturally decomposed into modular ceremonial and narrative sub-components.
 * Features a high-fidelity "Rich Aesthetics" orchestration.
 */

import { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
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
import { compareBanzuke, formatRankPosition, RANK_HIERARCHY } from "@/engine/banzuke";
import { makeBashoKey } from "@/engine/historyIndex";
import { projectRikishi } from "@/presenters/uiModels";
import type { EngineEvent } from "@/engine/types/events";
import type { HoFInductee } from "@/engine/hallOfFame";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
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
  const groups: Record<string, EngineEvent[]> = {
    yusho: [],
    promotions: [],
    retirements: [],
    injuries: [],
    governance: [],
    sponsors: [],
    other: [],
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
    else if (e.category === "discipline" || e.type.includes("GOVERNANCE"))
      groups.governance.push(e);
    else if (e.category === "sponsor") groups.sponsors.push(e);
    else groups.other.push(e);
  }
  return groups;
}

function getPrestigeChanges(world: WorldState): Array<{ heya: Heya; change: string }> {
  const changes: Array<{ heya: Heya; change: string }> = [];
  if (!world?.heyas) return changes;
  const prestige_events = (world.events?.log || [])
    .filter(
      (e: EngineEvent) =>
        e.type.includes("PRESTIGE") || e.type.includes("STATURE") || e.category === "milestone"
    )
    .slice(-20);
  for (const e of prestige_events) {
    if (e.heyaId) {
      const heya = world.heyas.get(e.heyaId);
      if (heya) changes.push({ heya, change: e.summary });
    }
  }
  return changes;
}

export default function RecapPage() {
  const { state, setPhase, updateWorld } = useGame();
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
    if (world && world.playerHeyaId) {
      const heya = world.heyas.get(world.playerHeyaId);
      if (heya) {
        const updatedHeya = {
          ...heya,
          reputation: Math.max(0, Math.min(100, (heya.reputation ?? 50) + effects.reputation)),
        };
        const updatedHeyas = new Map(world.heyas);
        updatedHeyas.set(world.playerHeyaId, updatedHeya);
        updateWorld({ ...world, heyas: updatedHeyas });
      }
    }
  };

  const lastBasho = world?.history?.[world.history.length - 1];

  // Redirect to main menu if world is not loaded
  useEffect(() => {
    if (!world) navigate({ to: "/main-menu", replace: true });
  }, [world, navigate]);

  // Check for player rikishi retirements and populate intai ceremony queue
  useEffect(() => {
    if (!world || !world.playerHeyaId || !lastBasho) return;

    const retirementEvents = (world.events?.log || []).filter(
      (e: EngineEvent) => e.category === "career" && (e.type as string).includes("RETIRE")
    );

    const playerRetirements: { rikishi: UIRikishi; reason: string }[] = [];
    for (const event of retirementEvents) {
      if (event.rikishiId) {
        const rikishi =
          world.rikishi.get(event.rikishiId) || world.historicalRikishi?.get(event.rikishiId);
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
    const rikishiMap = world.rikishi;
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

  if (!world) return null; // useEffect above handles redirect
  const events = world.events?.log || [];
  const bashoEvents = getBashoWrapEvents(events, lastBasho?.bashoNumber);
  const groupedEvents = groupEventsByNarrative(bashoEvents);
  const prestigeChanges = getPrestigeChanges(world);

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
      <Helmet>
        <title>{bashoTitle} Recap | Basho</title>
      </Helmet>

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
              onClick={() => navigate({ to: "/banzuke" })}
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
            groupedEvents={groupedEvents}
            prestigeChanges={prestigeChanges}
            narrativeSummaryData={{
              governanceLog: projectGovernanceSummary(world).governanceLog,
              year: projectGovernanceSummary(world).year,
              activeHeyasCount: projectGovernanceSummary(world).heyasCount,
            }}
          />
        </div>

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
            rikishi={Array.from(world.rikishi.values())[0]}
            heyaName={world.heyas.get(world.playerHeyaId || "")?.name || "Unknown Stable"}
            isPlayerRikishi={true}
            verdict="deferred"
            reasoning={["Continued performance required."]}
            onClose={() => setShowYokozunaDelib(false)}
          />
        )}

        {showHoFCeremony && (
          <HoFInductionCeremony
            inductee={showHoFCeremony}
            heyaName={
              world.heyas.get(showHoFCeremony.rikishiId)?.heyaId
                ? world.heyas.get(world.rikishi.get(showHoFCeremony.rikishiId)?.heyaId || "")
                    ?.name || "Unknown Stable"
                : "Independent"
            }
            isPlayerRikishi={
              world.rikishi.get(showHoFCeremony.rikishiId)?.heyaId === world.playerHeyaId
            }
            open={!!showHoFCeremony}
            onClose={() => setShowHoFCeremony(null)}
          />
        )}

        {intaiQueue.length > 0 && currentIntaiIndex < intaiQueue.length && (
          <IntaiCeremony
            heyaName={world.heyas.get(world.playerHeyaId || "")?.name || "Unknown Stable"}
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
