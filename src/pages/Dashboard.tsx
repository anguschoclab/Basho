import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/useGame";
import { Badge } from "@/components/ui/badge";
import { ProgressionTracker } from "@/components/game/ProgressionTracker";
import {
  getOzekiRunCandidates,
  getYokozunaCandidates,
  getKadobanDrama,
} from "@/presenters/projections/promotionProjections";
import { getHeyaCount } from "@/presenters/worldAccess";

import { OnboardingTourDialog } from "@/components/onboarding/OnboardingTourDialog";

import { PageHeader } from "@/components/layout/control-center";
import {
  FinancesWidget,
  EventFeed,
  ActionQueueWidget,
} from "@/components/dashboard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useGameStore } from "@/store/gameStore";
import { useSuccessionDismissal } from "@/hooks/useSuccessionDismissal";
import { useDashboardDerived } from "@/hooks/useDashboardDerived";
import {
  DashboardStableColumn,
  DashboardBashoColumn,
  DashboardTrainingColumn,
} from "@/components/dashboard/DashboardColumns";
import {
  DashboardExhibitionSection,
  DashboardHolidayDigest,
  DashboardPhaseWidgets,
  DashboardSuccessionModal,
} from "@/components/dashboard/DashboardStatusSections";

/** Control Center — main dashboard. */
export default function Dashboard() {
  const { state, hasAutosave, loadFromAutosave } = useGame();
  const navigate = useNavigate();
  const world = state.world;
  const isLoaded = !!world;
  const [deliberationCandidateId, setDeliberationCandidateId] = useState<string | null>(null);
  const { isDismissed: successionDismissed, dismiss: dismissSuccession } = useSuccessionDismissal(
    world?.week ?? 0
  );
  const derived = useDashboardDerived(world ?? undefined);

  useEffect(() => {
    if (state.phase === "basho_recap" || state.phase === "basho_results")
      navigate({ to: "/recap" });
  }, [state.phase, navigate]);

  const workerWorld = useGameStore((s) => s.workerWorld);

  useEffect(() => {
    // workerWorld leads state.world (it's set synchronously on WORLD_UPDATED,
    // before the transition that lands it in the reducer). If it exists, a
    // world update is in transit — restoring the autosave here would clobber
    // both the reducer and the worker's authoritative copy with stale state.
    if (isLoaded || workerWorld) return;
    if (hasAutosave()) {
      loadFromAutosave();
    } else {
      navigate({ to: "/main-menu", replace: true });
    }
  }, [isLoaded, workerWorld, hasAutosave, loadFromAutosave, navigate]);

  // Additional check: if world is loaded but empty, try to load autosave
  useEffect(() => {
    if (isLoaded && world && hasAutosave() && getHeyaCount(world) === 0) {
      loadFromAutosave();
    }
  }, [isLoaded, world, hasAutosave, loadFromAutosave]);

  useEffect(() => {
    if (!world?.events?.log) return;
    const evt = world.events.log
      .slice()
      .reverse()
      .find((e) => (e as { type?: string }).type === "PROMOTION_DELIBERATION");
    if (evt && !deliberationCandidateId) {
      setDeliberationCandidateId(
        (evt as { context?: { rikishiId?: string } }).context?.rikishiId ?? null
      );
    }
  }, [world?.events?.log, deliberationCandidateId]);

  if (!isLoaded || !world) {
    return (
      <div className="min-h-screen p-6 space-y-6 animate-pulse">
        <SkeletonCard hasHeader rows={3} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard rows={4} />
          <SkeletonCard rows={2} />
          <SkeletonCard rows={3} />
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-10 animate-fade-in">
        {/* ── PAGE HEADER ── */}
        <PageHeader
          eyebrow="── CONTROL CENTER ──"
          title={derived.playerHeya ? derived.playerHeya.name : "Your Stable"}
          lede={`Year ${world.year} · Week ${world.week} · ${derived.phaseLabel}`}
          actions={
            <Badge
              variant="outline"
              className="text-[10px] font-bold uppercase text-gold border-gold/30"
            >
              司令塔
            </Badge>
          }
        />

        {/* ── ACTION QUEUE ── */}
        {derived.queue.length > 0 && <ActionQueueWidget items={derived.queue} />}

        {/* ── PROMOTION ARCS ── */}
        <ProgressionTracker
          ozekiRuns={getOzekiRunCandidates(world)}
          yokozunaCandidates={getYokozunaCandidates(world)}
          kadobanDrama={getKadobanDrama(world)}
          playerHeyaId={world.playerHeyaId ?? ""}
        />

        {/* ── THREE-COLUMN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── COL 1: STABLE OVERVIEW ── */}
          <DashboardStableColumn derived={derived} />

          {/* ── COL 2: TOURNAMENT + CALENDAR ── */}
          <DashboardBashoColumn world={world} />

          {/* ── COL 3: TRAINING + TRENDS ── */}
          <DashboardTrainingColumn training={derived.training} />
        </div>

        {/* ── FULL-WIDTH: FINANCES CHART ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinancesWidget />
          <EventFeed maxEvents={12} minImportance="notable" />
        </div>

        {/* ── EXHIBITION INVITATIONS & GOMENFUDA STATUS ── */}
        <DashboardExhibitionSection
          heyaId={derived.playerHeya?.id ?? ""}
          exhibitionProjection={derived.exhibitionProjection}
          gomenfudaProjection={derived.gomenfudaProjection}
        />

        {/* ── HOLIDAY RETURN DIGEST ── */}
        <DashboardHolidayDigest world={world} />

        {/* ── ADDITIONAL WIDGETS GRID ── */}
        <DashboardPhaseWidgets
          world={world}
          playerHeya={derived.playerHeya}
          phase={derived.phase}
          advisorRecs={derived.advisorRecs}
        />
      </div>

      <OnboardingTourDialog />

      <DashboardSuccessionModal
        world={world}
        playerHeyaId={state.playerHeyaId ?? ""}
        successionDismissed={successionDismissed}
        onDismiss={dismissSuccession}
      />
    </AppLayout>
  );
}
