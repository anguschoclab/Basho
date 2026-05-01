// InjuryRecoveryPage.tsx — Dedicated health & welfare management screen
import { useCallback, useMemo } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/navigation";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/GameContext";
import { InjuryRecoveryPanel } from "@/components/game/InjuryRecoveryPanel";
import { WelfarePanel } from "@/components/game/WelfarePanel";
import { projectMedicalUIDigest, setHeyaDietAction } from "@/presenters/uiDigest";
import type { DietRegimen } from "@/engine/types/economy";

/** injury recovery page. */
export default function InjuryRecoveryPage() {
  const { state, updateWorld } = useGame();
  const digest = useMemo(
    () => (state.world ? projectMedicalUIDigest(state.world) : null),
    [state.world]
  );

  const handleSetDiet = useCallback(
    (diet: DietRegimen) => {
      if (!state.world || !state.playerHeyaId) return;
      const success = setHeyaDietAction(state.world, state.playerHeyaId, diet);
      if (success) {
        updateWorld({ ...state.world });
      }
    },
    [state.world, state.playerHeyaId, updateWorld]
  );

  if (!digest) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Loading...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Performance Center" subNavTabs={STABLE_TABS} activeSubTab="medical">
      <Helmet>
        <title>Performance Center — {digest.heyaName} | Basho</title>
      </Helmet>

      <div className="space-y-8">
        <PageHeader
          eyebrow="── HQ ──"
          title="Rehabilitation Center"
          lede="Monitor and manage injured wrestlers. Better recovery facilities speed healing."
        />
        <div className="lg:col-span-2 space-y-6">
          <InjuryRecoveryPanel digest={digest} />
        </div>

        <div className="space-y-6">
          <WelfarePanel digest={digest} onSetDiet={handleSetDiet} />
        </div>
      </div>
    </AppLayout>
  );
}
