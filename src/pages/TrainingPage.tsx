/**
 * TrainingPage.tsx
 *
 * Dedicated stable training management.
 * Features a "Rich Aesthetics" Dossier style with pro-management dashboards.
 * FM-style layout for beya-wide training controls and individual development plans.
 * State/handlers live in useTrainingState; derived data in useTrainingDerived.
 */

import { useGame } from "@/state/game/useGame";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/ui/navigation";
import type { TrainingIntensity } from "@/engine/types/training";
import { TrainingHeader } from "@/components/training/TrainingHeader";
import { BeyaWideRegime } from "@/components/training/BeyaWideRegime";
import { TrainingAnalytics } from "@/components/training/TrainingAnalytics";
import { IndividualFocusSlots } from "@/components/training/IndividualFocusSlots";
import { WeeklyDrillPlanner } from "@/components/training/WeeklyDrillPlanner";
import { ReferenceLegend } from "@/components/training/ReferenceLegend";
import { SparringPanel } from "@/components/training/SparringPanel";
import { WeightJourneysSection } from "@/components/training/WeightJourneysSection";
import { projectAdvisorRecommendations } from "@/presenters/projections/advisorProjections";
import { getPlayerHeya, calculateGains } from "@/presenters/engineAccess";
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

        {/* W10/V21 — advisor recommendations surface (coach advisory notes) */}
        {playerHeyaId && (() => {
          const notes = projectAdvisorRecommendations(world, playerHeyaId).slice(0, 4);
          if (notes.length === 0) return null;
          return (
            <section className="rounded-md border border-border/50 p-4 space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Coach Advisory
              </h3>
              <ul className="space-y-1.5 text-xs">
                {notes.map((n) => (
                  <li key={n.id} className="flex gap-2">
                    <span className="shrink-0 font-semibold text-primary uppercase text-[10px] pt-0.5 w-16">
                      {n.priority}
                    </span>
                    <span>
                      <span className="font-medium">{n.title}</span>
                      {n.detail ? ` — ${n.detail}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        {/* P2 Phase O: Weekly Drill Scheduler */}
        <WeeklyDrillPlanner
          rikishiList={rikishiList}
          weeklyPlan={trainingState.weeklyPlan || {}}
          onPlanUpdate={handlePlanUpdate}
          onBulkUpdate={handleBulkUpdate}
          onMultiBulkUpdate={handleMultiBulkUpdate}
          currentYear={world.year}
        />

        <SparringPanel
          heyaRikishi={rikishiList}
          currentYear={world.year}
          pairs={Object.values(world.sparringPairs?.get(playerHeyaId)?.pairs ?? {})}
          onAddPair={(aId, bId) => addSparringPair(playerHeyaId, aId, bId)}
          onRemovePair={(aId, bId) => removeSparringPair(playerHeyaId, aId, bId)}
        />

        <WeightJourneysSection rikishiList={rikishiList} currentYear={world.year} />

        <IndividualFocusSlots
          rikishiList={rikishiList}
          trainingState={trainingState}
          currentYear={world.year}
          onIndividualFocusChange={handleIndividualFocusChange}
        />

        {/* P3 — predicted weekly gains preview via production calculateGains */}
        {(() => {
          const am = world.transientContext?.activeModifiers;
          if (!am) return null;
          const raw = [...rikishiList]
            .map((r) => {
              const raw_r = world.rikishi.get(r.id);
              if (!raw_r) return null;
              const g = calculateGains(raw_r, am, trainingState.activeProfile, undefined, world.year);
              const top = Object.entries(g).sort((a, b) => b[1] - a[1])[0];
              return top ? { name: r.shikona, stat: top[0], gain: top[1] } : null;
            })
            .filter((x): x is { name: string; stat: string; gain: number } => !!x && x.gain > 0)
            .slice(0, 6);
          if (raw.length === 0) return null;
          return (
            <section className="rounded-md border border-border/50 p-4 space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Projected Weekly Gains
              </h3>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                {raw.map((r) => (
                  <li key={r.name}>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {r.stat} +{r.gain.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        <ReferenceLegend />
      </div>
    </AppLayout>
  );
}
