/**
 * TrainingPage.tsx
 *
 * Dedicated stable training management.
 * Features a "Rich Aesthetics" Dossier style with pro-management dashboards.
 * FM-style layout for beya-wide training controls and individual development plans.
 */

import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useGame } from "@/contexts/useGame";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/ui/navigation";
import {
  INTENSITY_MULTIPLIERS,
  FOCUS_BIAS_MATRIX,
  createDefaultTrainingState,
  RANK_HIERARCHY,
} from "@/presenters/uiDigest";
import type { Heya } from "@/engine/types/heya";
import type {
  IndividualFocusType,
  TrainingIntensity,
  TrainingFocus,
  RecoveryEmphasis,
  HeyaTrainingState,
} from "@/engine/types/training";
import { TrainingHeader } from "@/components/training/TrainingHeader";
import { BeyaWideRegime } from "@/components/training/BeyaWideRegime";
import { TrainingAnalytics } from "@/components/training/TrainingAnalytics";
import { IndividualFocusSlots } from "@/components/training/IndividualFocusSlots";
import { WeeklyDrillPlanner } from "@/components/training/WeeklyDrillPlanner";
import { ReferenceLegend } from "@/components/training/ReferenceLegend";
import { SparringPanel } from "@/components/game/SparringPanel";
import { WeightJourneyCard } from "@/components/training/WeightJourneyCard";
import type { DrillType, DaySchedule } from "@/engine/types/training";
import type { Rikishi } from "@/engine/types/rikishi";

import { useGameStore } from "@/store/gameStore";
import { getPlayerHeya } from "@/engine/queries";
import { selectEncouragementLog } from "@/presenters/selectors";

export default function TrainingPage() {
  const { state, addSparringPair, removeSparringPair } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const { world, playerHeyaId } = state;
  const heya = world ? getPlayerHeya(world) ?? null : null;
  const encouragementLog = useMemo(
    () => (world ? (world.encouragementLog ?? selectEncouragementLog(world)) : []),
    [world]
  );
  const encouragementCount = encouragementLog.length;

  const [trainingState, setTrainingState] = useState<HeyaTrainingState>(() => {
    if (!world || !playerHeyaId) return createDefaultTrainingState(playerHeyaId || "");
    const existing = world.trainingState?.get(playerHeyaId);
    if (existing) return existing;
    const legacy = (heya as Heya & { trainingState?: HeyaTrainingState }).trainingState;
    return legacy ?? createDefaultTrainingState(playerHeyaId || "");
  });

  const rikishiList = useMemo<Rikishi[]>(() => {
    if (!world || !heya) return [];
    return (heya.rikishiIds ?? [])
      .map((id) => world.rikishi.get(id))
      .filter((r): r is Rikishi => r !== undefined)
      .sort((a, b) => {
        const aTier = RANK_HIERARCHY[a.rank]?.tier ?? 999;
        const bTier = RANK_HIERARCHY[b.rank]?.tier ?? 999;
        return aTier - bTier;
      });
  }, [world, heya]);

  const trainingEffectivenessData = useMemo(
    () =>
      (
        Object.entries(INTENSITY_MULTIPLIERS) as Array<
          [TrainingIntensity, { growth: number; fatigue: number; injuryRisk: number }]
        >
      ).map(([intensity, eff]) => ({
        intensity: intensity.charAt(0).toUpperCase() + intensity.slice(1),
        growth: Math.round(eff.growth * 100),
        fatigue: Math.round(eff.fatigue * 100),
        injuryRisk: Math.round(eff.injuryRisk * 100),
      })),
    []
  );

  const focusBiasData = useMemo(
    () =>
      (Object.entries(FOCUS_BIAS_MATRIX) as Array<[TrainingFocus, Record<string, number>]>).map(
        ([focus, biases]) => ({
          focus: focus.charAt(0).toUpperCase() + focus.slice(1),
          strength: Math.round((biases.power ?? 1) * 100),
          speed: Math.round((biases.speed ?? 1) * 100),
          technique: Math.round((biases.technique ?? 1) * 100),
          balance: Math.round((biases.balance ?? 1) * 100),
        })
      ),
    []
  );

  if (!world || !playerHeyaId || !heya) return null;

  const handleIntensityChange = (intensity: TrainingIntensity) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, intensity } };
      sendCommand({ type: "SET_TRAINING_STATE", heyaId: playerHeyaId, trainingState: next });
      return next;
    });
  };

  const handleFocusChange = (focus: TrainingFocus) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, focus } };
      sendCommand({ type: "SET_TRAINING_STATE", heyaId: playerHeyaId, trainingState: next });
      return next;
    });
  };

  const handleRecoveryChange = (recovery: RecoveryEmphasis) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, recovery } };
      sendCommand({ type: "SET_TRAINING_STATE", heyaId: playerHeyaId, trainingState: next });
      return next;
    });
  };

  const handleIndividualFocusChange = (
    rikishiId: string,
    focusType: IndividualFocusType | null
  ) => {
    setTrainingState((prev) => {
      const slots = (prev.focusSlots || []).filter((s) => s.rikishiId !== rikishiId);
      if (focusType) slots.push({ rikishiId, focusType });
      const next = { ...prev, focusSlots: slots };
      sendCommand({ type: "SET_TRAINING_STATE", heyaId: playerHeyaId, trainingState: next });
      return next;
    });
  };

  const handlePlanUpdate = (rikishiId: string, day: number, drillType: DrillType) => {
    setTrainingState((prev) => {
      const plan = { ...(prev.weeklyPlan || {}) };
      const schedule = { ...(plan[rikishiId] || {}) };
      schedule[day] = drillType;
      plan[rikishiId] = schedule as DaySchedule;
      const next = { ...prev, weeklyPlan: plan };
      sendCommand({ type: "SET_TRAINING_STATE", heyaId: playerHeyaId, trainingState: next });
      return next;
    });
  };

  const handleBulkUpdate = (rikishiId: string, daySchedule: DaySchedule) => {
    setTrainingState((prev) => {
      const plan = { ...(prev.weeklyPlan || {}) };
      plan[rikishiId] = daySchedule;
      const next = { ...prev, weeklyPlan: plan };
      sendCommand({ type: "SET_TRAINING_STATE", heyaId: playerHeyaId, trainingState: next });
      return next;
    });
  };

  const handleMultiBulkUpdate = (rikishiIds: string[], daySchedule: DaySchedule) => {
    setTrainingState((prev) => {
      const plan = { ...(prev.weeklyPlan || {}) };
      rikishiIds.forEach((id) => {
        plan[id] = daySchedule;
      });
      const next = { ...prev, weeklyPlan: plan };
      sendCommand({ type: "SET_TRAINING_STATE", heyaId: playerHeyaId, trainingState: next });
      return next;
    });
  };

  const currentIntensity = trainingState.activeProfile.intensity as TrainingIntensity;

  return (
    <AppLayout pageTitle="Training Management" subNavTabs={STABLE_TABS} activeSubTab="training">
      <Helmet>
        <title>Training Ground — {heya.name} | Basho</title>
      </Helmet>

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

        {rikishiList.some((r) => r.weightJourney) && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold tracking-tight uppercase">
              Weight Journeys
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rikishiList
                .filter((r) => r.weightJourney)
                .map((r) => (
                  <WeightJourneyCard
                    key={r.id}
                    journey={r.weightJourney}
                    shikona={r.shikona}
                  />
                ))}
            </div>
          </div>
        )}

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
