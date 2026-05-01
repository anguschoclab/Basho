import { useMemo, useCallback } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { OFFICE_TABS } from "@/constants/navigation";
import { useGame } from "@/contexts/GameContext";
import { FacilitiesManagementPanel } from "@/components/game/FacilitiesManagementPanel";
import { InfrastructurePanel } from "@/components/game/InfrastructurePanel";
import { investInFacility } from "@/engine/facilities";
import type { FacilityAxis, UpgradeResult } from "@/engine/facilities";
import type { FacilityId } from "@/engine/types/infrastructure";
import { FacilityROIChart } from "@/components/economy/FacilityROIChart";

/** facilities page. */
export default function FacilitiesPage() {
  const { state, buildInfrastructure, updateWorld } = useGame();
  const world = state.world;
  const heya = useMemo(() => {
    if (!world || !state.playerHeyaId) return null;
    return world.heyas.get(state.playerHeyaId) || null;
  }, [world, state.playerHeyaId]);

  const handleUpgrade = useCallback(
    (axis: FacilityAxis, points: number): UpgradeResult | undefined => {
      if (!world || !state.playerHeyaId) return undefined;

      const oldLevel = heya?.facilities[axis] || 0;
      const result = investInFacility(world, state.playerHeyaId, axis, points);

      // Convert StateImpact to UpgradeResult
      const upgradeResult: UpgradeResult = {
        success: !!result.entities?.heyaUpdates?.has(state.playerHeyaId),
        axis,
        oldLevel,
        newLevel:
          result.entities?.heyaUpdates?.get(state.playerHeyaId)?.facilities?.[axis] || oldLevel,
        cost: points * 100, // Simplified cost calculation
      };

      if (upgradeResult.success) {
        // Trigger context update to sync React state with engine mutations
        updateWorld(world);
      }

      return upgradeResult;
    },
    [world, state.playerHeyaId, updateWorld, heya]
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
      <Helmet>
        <title>Infrastructure — {heya.name} | Basho</title>
      </Helmet>

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
