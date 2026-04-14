import { useMemo, useCallback } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/navigation";
import { useGame } from "@/contexts/GameContext";
import { FacilitiesManagementPanel } from "@/components/game/FacilitiesManagementPanel";
import { investInFacility } from "@/engine/facilities";
import type { FacilityAxis, UpgradeResult } from "@/engine/facilities";

/** facilities page. */
export default function FacilitiesPage() {
  const { state, updateWorld } = useGame();
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

  if (!heya || !world) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-muted-foreground italic">
          Fetching institutional infrastructure records...
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
        <FacilitiesManagementPanel heya={heya} isOwner={true} onUpgrade={handleUpgrade} />
      </div>
    </AppLayout>
  );
}
