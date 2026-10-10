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
import { useGame } from "@/contexts/useGame";
import { useRequireWorld } from "@/hooks/useRequireWorld";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/ui/navigation";
import { projectRikishi } from "@/presenters/uiModels";
import { getMentor, menteesOf } from "@/presenters/engineAccess";
import { getHealthBadge } from "@/presenters/PerceptionPresenter";
import type { CareerSnapshot } from "@/engine/types/history";
import {
  useCareerProgressionData,
  useEarningsProgressionData,
} from "@/components/rikishi/useRikishiData";
import { EntityCollection } from "@/presenters/engineAccess";
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

  // Get raw rikishi data safely
  const rawRikishi = world?.rikishi.get(rikishiId || "");
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
    <AppLayout
      pageTitle="Rikishi Profile"
      subNavTabs={STABLE_TABS}
      activeSubTab="roster"
      breadcrumbItems={[
        { label: "Home", href: "/dashboard" },
        { label: "Roster", href: "/stable/roster" },
        { label: rikishi.shikona, href: `/rikishi/${rikishiId}`, isCurrent: true },
      ]}
    >
      <title>{rikishi.shikona} — Official Association Profile | Basho</title>

      <RikishiProfileBody
        rikishi={rikishi}
        rawRikishi={rawRikishi}
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
