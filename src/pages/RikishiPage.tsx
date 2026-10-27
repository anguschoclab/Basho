/**
 * RikishiPage.tsx
 *
 * Individual Profile and Stable Roster Management.
 * Features a "Rich Aesthetics" Dossier design for rikishi profiles.
 * Architecturally decomposed to use RosterList for list views.
 * View sections live in src/components/rikishi/RikishiPageSections.tsx.
 */

import { useState, useMemo } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame } from "@/state/game/useGame";
import { useRequireWorld } from "@/hooks/useRequireWorld";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/ui/navigation";
import { projectRikishi } from "@/presenters/uiModels";
import { getMentor, menteesOf } from "@/presenters/engineAccess";
import { getHealthBadge } from "@/presenters/projections/PerceptionPresenter";
import type { CareerSnapshot } from "@/engine/types/history";
import type { Rikishi as RawRikishi } from "@/engine/types/rikishi";
import {
  useCareerProgressionData,
  useEarningsProgressionData,
} from "@/components/rikishi/useRikishiData";
import { EntityCollection } from "@/presenters/engineAccess";
import { getRikishiAnywhere, isRetiredRikishiSummaryEntry } from "@/presenters/worldAccess";
import { RetiredRikishiProfile } from "@/components/rikishi/RetiredRikishiProfile";
import {
  RosterListView,
  RikishiNotFound,
  RikishiProfileBody,
} from "@/components/rikishi/RikishiPageSections";

export default function RikishiPage() {
  const { rikishiId } = useParams({ strict: false });
  const { state, retireRikishi } = useGame();
  const { world, playerHeyaId } = state;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [showIntaiCeremony, setShowIntaiCeremony] = useState(false);

  // Prepare data for roster list view (before any early returns)
  const effectiveHeyaId = playerHeyaId || world?.playerHeyaId;
  const rikishiList = useMemo(() => {
    if (!world || rikishiId) return [];
    if (!effectiveHeyaId) return [];
    return EntityCollection.getHeyaRoster(world, effectiveHeyaId).map((r) =>
      projectRikishi(r, world)
    );
  }, [world, effectiveHeyaId, rikishiId]);

  // Get raw rikishi data — active map first, then historicalRikishi so
  // retired rikishi (full records pre-pruning, compact summaries after) are
  // reachable from search/links instead of dead-ending at RikishiNotFound.
  const entry = world && rikishiId ? getRikishiAnywhere(world, rikishiId) : undefined;
  const retiredSummary =
    entry && isRetiredRikishiSummaryEntry(entry) ? entry : undefined;
  const rawRikishi: RawRikishi | undefined =
    entry && !isRetiredRikishiSummaryEntry(entry) ? entry : undefined;
  const rikishi = rawRikishi && world ? projectRikishi(rawRikishi, world) : null;
  const history = rikishi?.careerHistory;

  // Prepare data using custom hooks
  const careerProgressionData = useCareerProgressionData(history as CareerSnapshot[] | undefined);
  const earningsProgressionData = useEarningsProgressionData(
    history as CareerSnapshot[] | undefined
  );

  const hasWorld = useRequireWorld();
  if (!hasWorld || !world) return null;

  // ── Roster List View ────────────────────────────────
  if (!rikishiId) {
    return (
      <RosterListView
        rikishiList={rikishiList}
        onRikishiClick={(id) => navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: id } })}
      />
    );
  }

  // ── Individual Profile View ─────────────────────────
  if (retiredSummary) return <RetiredRikishiProfile summary={retiredSummary} world={world} />;

  if (!rawRikishi || !rikishi)
    return <RikishiNotFound onBack={() => navigate({ to: "/stable/roster" })} />;

  const finalizeRetirement = () => {
    // Stage 2: Actually apply retirement to the world (via the worker, so it
    // survives the next tick).
    retireRikishi(rikishi.id, "player_initiated_intai");
    setShowIntaiCeremony(false);
    // Navigate back to roster
    navigate({ to: "/stable/roster" });
  };

  return (
    <AppLayout pageTitle="Rikishi Profile" subNavTabs={STABLE_TABS} activeSubTab="roster">
      <title>{rikishi.shikona} — Official Association Profile | Basho</title>

      <RikishiProfileBody
        rikishi={rikishi}
        rawRikishi={rawRikishi}
        readOnly={rawRikishi.isRetired === true}
        world={world}
        playerHeyaId={playerHeyaId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showIntaiCeremony={showIntaiCeremony}
        onShowIntaiCeremony={setShowIntaiCeremony}
        onBack={() => navigate({ to: "/stable/roster" })}
        onFinalizeRetirement={finalizeRetirement}
        careerProgressionData={careerProgressionData}
        earningsProgressionData={earningsProgressionData}
        healthBadge={getHealthBadge(rawRikishi)}
        mentor={getMentor(world, rawRikishi) ?? null}
        mentees={menteesOf(world, rawRikishi)}
      />
    </AppLayout>
  );
}
