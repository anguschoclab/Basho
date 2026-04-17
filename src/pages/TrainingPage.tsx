/**
 * TrainingPage.tsx
 *
 * Dedicated stable training management.
 * Features a "Rich Aesthetics" Dossier style with pro-management dashboards.
 * FM-style layout for beya-wide training controls and individual development plans.
 */

import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useGame } from "@/contexts/GameContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/navigation";
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
import type { DrillType, DaySchedule } from "@/engine/types/training";
import type { Rikishi } from "@/engine/types/rikishi";

export default function TrainingPage() {
  const { state, updateWorld } = useGame();
  const { world, playerHeyaId } = state;
  const heya = world?.heyas.get(playerHeyaId || "") ?? null;

  const [trainingState, setTrainingState] = useState<HeyaTrainingState>(() => {
    if (!world || !playerHeyaId) return createDefaultTrainingState(playerHeyaId || "");
    const existing = world.trainingState?.get(playerHeyaId);
    if (existing) return existing;
    const legacy = (heya as Heya & { trainingState?: HeyaTrainingState }).trainingState;
    return legacy ?? createDefaultTrainingState(playerHeyaId || "");
  });

  const rikishiList = useMemo(() => {
    if (!heya || !world) return [];
    const rikishi = (heya.rikishiIds ?? [])
      .map((id) => world.rikishi.get(id))
      .filter((r) => r != null) as Rikishi[];
    return rikishi.sort((a, b) => {
      const tierA = RANK_HIERARCHY[a.rank]?.tier ?? 99;
      const tierB = RANK_HIERARCHY[b.rank]?.tier ?? 99;
      if (tierA !== tierB) return tierA - tierB;
      return a.id.localeCompare(b.id);
    });
  }, [heya, world]);

  // Prepare training effectiveness data for chart (moved before early return)
  const trainingEffectivenessData = useMemo(() => {
    return (Object.keys(INTENSITY_MULTIPLIERS) as TrainingIntensity[]).map((intensity) => {
      const effect = INTENSITY_MULTIPLIERS[intensity];
      return {
        intensity: intensity.charAt(0).toUpperCase() + intensity.slice(1),
        growth: effect.growth,
        fatigue: effect.fatigue,
        injuryRisk: effect.injuryRisk || 0,
      };
    });
  }, []);

  // Prepare focus bias data for chart (moved before early return)
  const focusBiasData = useMemo(() => {
    return (Object.keys(FOCUS_BIAS_MATRIX) as TrainingFocus[]).map((focus) => {
      const bias = FOCUS_BIAS_MATRIX[focus];
      return {
        focus: focus.charAt(0).toUpperCase() + focus.slice(1),
        strength: bias.strength || 0,
        speed: bias.speed || 0,
        technique: bias.technique || 0,
        balance: bias.balance || 0,
      };
    });
  }, []);

  if (!world || !playerHeyaId || !heya) return null;

  const persistTrainingState = (next: HeyaTrainingState) => {
    if (!world.trainingState) world.trainingState = new Map();
    world.trainingState.set(playerHeyaId, next);
    const heyaWithTrainingState = heya as Heya & { trainingState?: unknown };
    if (heyaWithTrainingState.trainingState) delete heyaWithTrainingState.trainingState;
    updateWorld({ ...world });
  };

  const handleIntensityChange = (intensity: TrainingIntensity) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, intensity } };
      persistTrainingState(next);
      return next;
    });
  };

  const handleFocusChange = (focus: TrainingFocus) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, focus } };
      persistTrainingState(next);
      return next;
    });
  };

  const handleRecoveryChange = (recovery: RecoveryEmphasis) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, recovery } };
      persistTrainingState(next);
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
      persistTrainingState(next);
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
      persistTrainingState(next);
      return next;
    });
  };

  const handleBulkUpdate = (rikishiId: string, daySchedule: DaySchedule) => {
    setTrainingState((prev) => {
      const plan = { ...(prev.weeklyPlan || {}) };
      plan[rikishiId] = daySchedule;
      const next = { ...prev, weeklyPlan: plan };
      persistTrainingState(next);
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
      persistTrainingState(next);
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
