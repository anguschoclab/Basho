import { useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { OFFICE_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/useGame";
import { FacilitiesManagementPanel } from "@/components/game/FacilitiesManagementPanel";
import { InfrastructurePanel } from "@/components/game/InfrastructurePanel";
import type { FacilityAxis } from "@/presenters/engineAccess";
import type { FacilityId } from "@/engine/types/infrastructure";
import { FacilityROIChart } from "@/components/economy/FacilityROIChart";
import { getPlayerHeya } from "@/presenters/engineAccess";

/** facilities page. */
export default function FacilitiesPage() {
  const { state, buildInfrastructure, investInFacility: investInFacilityAction } = useGame();
  const world = state.world;
  const heya = useMemo(() => {
    if (!world || !state.playerHeyaId) return null;
    return getPlayerHeya(world) || null;
  }, [world, state.playerHeyaId]);

  const handleUpgrade = useCallback(
    (axis: FacilityAxis, points: number) => {
      if (!state.playerHeyaId) return;
      investInFacilityAction(state.playerHeyaId, axis, points);
    },
    [state.playerHeyaId, investInFacilityAction]
  );

  const handleBuildInfrastructure = useCallback(
    (facilityId: FacilityId) => {
      if (!state.playerHeyaId) return;
      buildInfrastructure(state.playerHeyaId, facilityId);
    },
    [state.playerHeyaId, buildInfrastructure]
  );

  if (!heya || !world) {
    return (
      <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="facilities" pageTitle="Infrastructure">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
          <div className="text-4xl animate-pulse font-display">⋯</div>
          <p className="text-sm font-display italic uppercase tracking-widest">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="facilities" pageTitle="Infrastructure">

        <title>Infrastructure — {heya.name} | Basho</title>


      <div className="space-y-8">
        <PageHeader
          eyebrow="── OFFICE ──"
          title="Infrastructure"
          lede="Facility upgrades, training grounds, and physical plant investments."
        />
        <FacilityROIChart heya={heya} />
        <FacilitiesManagementPanel heya={heya} isOwner={true} onUpgrade={handleUpgrade} />
        <InfrastructurePanel heya={heya} onBuild={handleBuildInfrastructure} />
      </div>
    </AppLayout>
  );
}
