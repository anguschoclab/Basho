// InjuryRecoveryPage.tsx — Dedicated health & welfare management screen
import { useCallback, useMemo } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { HQ_TABS } from "@/constants/navigation";
import { useGame } from "@/contexts/GameContext";
import { InjuryRecoveryPanel } from "@/components/game/InjuryRecoveryPanel";
import { WelfarePanel } from "@/components/game/WelfarePanel";
import { setHeyaDiet } from "@/engine/welfare";
import type { DietRegimen } from "@/engine/types/economy";

/** injury recovery page. */
export default function InjuryRecoveryPage() {
  const { state, updateWorld } = useGame();
  const world = state.world;
  const heya = useMemo(() => {
    if (!world || !state.playerHeyaId) return null;
    return world.heyas.get(state.playerHeyaId) || null;
  }, [world, state.playerHeyaId]);

  const handleSetDiet = useCallback((diet: DietRegimen) => {
    if (!world || !state.playerHeyaId) return;
    setHeyaDiet(world, state.playerHeyaId, diet);
    updateWorld(world);
  }, [world, state.playerHeyaId, updateWorld]);

  if (!world || !heya) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      pageTitle="Performance Center" 
      subNavTabs={HQ_TABS} 
      activeSubTab="medical"
    >
      <Helmet>
        <title>Performance Center — {heya.name} | Basho</title>
      </Helmet>
      
      <div className="space-y-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Rehabilitation Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor and manage injured wrestlers. Better recovery facilities speed healing.
            </p>
          </div>
          <InjuryRecoveryPanel world={world} />
        </div>

        <div className="space-y-6">
          <WelfarePanel 
            world={world} 
            heya={heya} 
            isOwner={true} 
            onSetDiet={handleSetDiet} 
          />
        </div>
      </div>
    </AppLayout>
  );
}

