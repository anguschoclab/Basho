import { useMemo, useCallback } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
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

  const officeTabs = [
    { id: "economy", label: "Economy", href: "/office/finances" },
    { id: "scouting", label: "Scouting", href: "/office/scouting" },
    { id: "sponsors", label: "Sponsors", href: "/office/sponsors" },
    { id: "facilities", label: "Facilities" },
    { id: "governance", label: "Governance", href: "/governance" },
  ];

  if (!heya || !world) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Loading stable data...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout subNavTabs={officeTabs} activeSubTab="facilities">
      <Helmet>
        <title>Facilities — {heya.name} | Basho</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Facilities Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Maintain and upgrade your heya's infrastructure to improve training results and wrestler welfare.
          </p>
        </div>

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
