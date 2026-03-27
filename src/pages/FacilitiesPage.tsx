import { useMemo, useCallback } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/navigation";
import { useGame } from "@/contexts/GameContext";
import { FacilitiesManagementPanel } from "@/components/game/FacilitiesManagementPanel";
import { investInFacility } from "@/engine/facilities";
import type { FacilityAxis } from "@/engine/facilities";

/** facilities page. */
export default function FacilitiesPage() {
  const { state, updateWorld } = useGame();
  const world = state.world;
  const heya = useMemo(() => {
    if (!world || !state.playerHeyaId) return null;
    return world.heyas.get(state.playerHeyaId) || null;
  }, [world, state.playerHeyaId]);

  const handleUpgrade = useCallback((axis: FacilityAxis, points: number) => {
    if (!world || !state.playerHeyaId) return undefined;
    
    const result = investInFacility(world, state.playerHeyaId, axis, points);
    
    if (result.success) {
      // Trigger context update to sync React state with engine mutations
      updateWorld(world);
    }
    
    return result;
  }, [world, state.playerHeyaId, updateWorld]);

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
    <AppLayout 
      subNavTabs={OFFICE_TABS} 
      activeSubTab="facilities" 
      pageTitle="Infrastructure"
    >
      <Helmet>
        <title>Infrastructure — {heya.name} | Basho</title>
      </Helmet>

      <div className="space-y-8">
        <FacilitiesManagementPanel 
          heya={heya} 
          world={world} 
          isOwner={true} 
          onUpgrade={handleUpgrade} 
        />
      </div>
    </AppLayout>
  );
}
