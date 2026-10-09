/**
 * TrainingPage.tsx
 *
 * Dedicated stable training management.
 * Features a "Rich Aesthetics" Dossier style with pro-management dashboards.
 * FM-style layout for beya-wide training controls and individual development plans.
 * State/handlers live in useTrainingState; derived data in useTrainingDerived.
 */

import { useGame } from "@/contexts/useGame";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/ui/navigation";
import type { TrainingIntensity } from "@/engine/types/training";
import { TrainingHeader } from "@/components/training/TrainingHeader";
import { BeyaWideRegime } from "@/components/training/BeyaWideRegime";
import { TrainingAnalytics } from "@/components/training/TrainingAnalytics";
import { IndividualFocusSlots } from "@/components/training/IndividualFocusSlots";
import { WeeklyDrillPlanner } from "@/components/training/WeeklyDrillPlanner";
import { ReferenceLegend } from "@/components/training/ReferenceLegend";
import { SparringPanel } from "@/components/game/SparringPanel";
import { WeightJourneysSection } from "@/components/training/WeightJourneysSection";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { useTrainingState } from "@/hooks/useTrainingState";
import { useTrainingDerived } from "@/hooks/useTrainingDerived";

export default function TrainingPage() {
  const { state, addSparringPair, removeSparringPair } = useGame();
  const { world, playerHeyaId } = state;
  const heya = world ? (getPlayerHeya(world) ?? null) : null;

  const { rikishiList, encouragementCount, trainingEffectivenessData, focusBiasData } =
    useTrainingDerived(world, heya);

  const {
    trainingState,
    handleIntensityChange,
    handleFocusChange,
    handleRecoveryChange,
    handleIndividualFocusChange,
    handlePlanUpdate,
    handleBulkUpdate,
    handleMultiBulkUpdate,
  } = useTrainingState(world, playerHeyaId);

  if (!world || !playerHeyaId || !heya) return null;

  const currentIntensity = trainingState.activeProfile.intensity as TrainingIntensity;

  return (
    <AppLayout pageTitle="Training Management" subNavTabs={STABLE_TABS} activeSubTab="training">
      <title>Training Ground — {heya.name} | Basho</title>

      <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
        <TrainingHeader heya={heya} rikishiList={rikishiList} currentIntensity={currentIntensity} />

        {encouragementCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {encouragementCount} encouragement interactions recorded this basho
          </p>
        )}

        <BeyaWideRegime
          trainingState={trainingState}
          onIntensityChange={handleIntensityChange}
          onFocusChange={handleFocusChange}
          onRecoveryChange={handleRecoveryChange}
        />

        <TrainingAnalytics
          trainingEffectivenessData={trainingEffectivenessData}
          focusBiasData={focusBiasData}
        />

        {/* P2 Phase O: Weekly Drill Scheduler */}
        <WeeklyDrillPlanner
          rikishiList={rikishiList}
          weeklyPlan={trainingState.weeklyPlan || {}}
          onPlanUpdate={handlePlanUpdate}
          onBulkUpdate={handleBulkUpdate}
          onMultiBulkUpdate={handleMultiBulkUpdate}
        />

        <SparringPanel
          heyaRikishi={rikishiList}
          pairs={Object.values(world.sparringPairs?.get(playerHeyaId)?.pairs ?? {})}
          onAddPair={(aId, bId) => addSparringPair(playerHeyaId, aId, bId)}
          onRemovePair={(aId, bId) => removeSparringPair(playerHeyaId, aId, bId)}
        />

        <WeightJourneysSection rikishiList={rikishiList} />

        <IndividualFocusSlots
          rikishiList={rikishiList}
          trainingState={trainingState}
          onIndividualFocusChange={handleIndividualFocusChange}
        />

        <ReferenceLegend />
      </div>
    </AppLayout>
  );
}
