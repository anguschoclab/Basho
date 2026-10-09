/**
 * RecapPage.tsx
 *
 * Post-Basho Narrative Recap & Association Wrappers.
 * Composition shell — event grouping lives in
 * ../components/recap/recapEventGroups.ts, derived state in
 * ../hooks/useRecapDerived.ts, and sections/modals in
 * ../components/recap/RecapSections.tsx.
 */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { useRequireWorld } from "@/hooks/useRequireWorld";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/control-center";

import { TournamentCeremony } from "@/components/recap/TournamentCeremony";
import { NarrativeSummary } from "@/components/recap/NarrativeSummary";
import { PlayoffBracket } from "@/components/game/PlayoffBracket";
import { BanzukeReveal } from "@/components/game/BanzukeReveal";
import { KeyBoutsSection } from "@/components/game/KeyBoutsSection";
import {
  RecapHeroActions,
  KihakuSection,
  KachiNokoriSection,
  ExhibitionSection,
  RecapModals,
} from "@/components/recap/RecapSections";
import { projectGovernanceSummary, projectBashoResults } from "@/presenters/uiDigest";
import { getHistory } from "@/presenters/worldAccess";
import type { HoFInductee } from "@/presenters/engineAccess";
import { useRecapDerived } from "@/hooks/useRecapDerived";

export default function RecapPage() {
  const { state, setPhase, applyPressConference } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const [showPressConference, setShowPressConference] = useState(false);
  const [showYokozunaDelib, setShowYokozunaDelib] = useState(false);
  const [showHoFCeremony, setShowHoFCeremony] = useState<HoFInductee | null>(null);
  const [showBanzukeReveal, setShowBanzukeReveal] = useState(false);

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
      applyPressConference(world.playerHeyaId, effects);
    }
  };

  const _history = world ? getHistory(world) : [];
  const lastBasho = _history[_history.length - 1];

  const hasWorld = useRequireWorld();
  const {
    intaiQueue,
    currentIntaiIndex,
    advanceIntai,
    banzukeEntries,
    keyMoments,
    getRikishiForBout,
    prestigeChanges,
    narrativeGroupedEvents,
  } = useRecapDerived(world, lastBasho);

  if (!hasWorld || !world) return null;

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
          <RecapHeroActions
            onFinalize={handleContinue}
            onBanzukeReveal={() => setShowBanzukeReveal(true)}
            onPressConference={() => setShowPressConference(true)}
          />
        </div>

        {/* ═══ CEREMONIAL LAYER ═══ */}
        {world && lastBasho && (
          <TournamentCeremony lastBasho={lastBasho} {...projectBashoResults(world, lastBasho)} />
        )}

        {/* ═══ BANZUKE REVEAL ═══ */}
        {showBanzukeReveal && (
          <BanzukeReveal entries={banzukeEntries} onComplete={() => setShowBanzukeReveal(false)} />
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

        {/* ═══ STAT SECTIONS ═══ */}
        <KihakuSection world={world} />
        <KachiNokoriSection world={world} />
        <ExhibitionSection world={world} />

        {/* ═══ MODALS & CEREMONIES ═══ */}
        <RecapModals
          world={world}
          showPressConference={showPressConference}
          showYokozunaDelib={showYokozunaDelib}
          showHoFCeremony={showHoFCeremony}
          intaiQueue={intaiQueue}
          currentIntaiIndex={currentIntaiIndex}
          onPressConferenceClose={handlePressConferenceClose}
          onYokozunaDelibClose={() => setShowYokozunaDelib(false)}
          onHoFCeremonyClose={() => setShowHoFCeremony(null)}
          onIntaiAdvance={advanceIntai}
        />
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
