import React, { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import type {
  TrainingIntensity,
  TrainingFocus,
  RecoveryEmphasis,
  TrainingProfile,
} from "@/engine/types/training";
import { ensureHeyaTrainingState } from "@/presenters/uiDigest";
import { getPlayerHeya } from "@/engine/queries";
import {
  INTENSITY_OPTIONS,
  FOCUS_OPTIONS,
  RECOVERY_OPTIONS,
  FOCUS_LABELS,
  RECOVERY_LABELS,
  CAP_TO_INTENSITY,
} from "@/constants/ui/trainingWidget";

export function useTrainingProfile() {
  const { state, updateWorld } = useGame();
  const navigate = useNavigate();
  const world = state.world;
  const [expanded, setExpanded] = useState(false);

  const headerAction = useMemo(
    () => ({
      label: "Full Plan",
      onClick: () => navigate({ to: "/stable/training" }),
      tooltip: "Design and implement comprehensive training regimens for your rikishi",
    }),
    [navigate]
  );

  const INTENSITY_RANK = useMemo<TrainingIntensity[]>(
    () => ["conservative", "balanced", "intensive", "punishing"],
    []
  );

  const profile = useMemo(() => {
    if (!world?.playerHeyaId) return null;
    const ts = ensureHeyaTrainingState(world, world.playerHeyaId);
    return ts.activeProfile;
  }, [world]);

  const sanctionCap = useMemo(() => {
    if (!world?.playerHeyaId) return null;
    const ph = getPlayerHeya(world);
    return ph?.welfareState?.sanctions?.trainingIntensityCap ?? null;
  }, [world]);

  const maxIntensityIdx =
    sanctionCap != null
      ? INTENSITY_RANK.indexOf(CAP_TO_INTENSITY[sanctionCap] ?? "punishing")
      : INTENSITY_RANK.length - 1;

  const intensityOptions = useMemo(
    () =>
      INTENSITY_OPTIONS.map((v, i) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
        disabled: i > maxIntensityIdx,
      })),
    [maxIntensityIdx]
  );

  const focusOptions = useMemo(
    () =>
      FOCUS_OPTIONS.map((v) => ({
        value: v,
        label: FOCUS_LABELS[v],
      })),
    []
  );

  const recoveryOptions = useMemo(
    () =>
      RECOVERY_OPTIONS.map((v) => ({
        value: v,
        label: RECOVERY_LABELS[v],
      })),
    []
  );

  const updateProfile = React.useCallback(
    (patch: Partial<TrainingProfile>) => {
      if (!world?.playerHeyaId) return;
      const ts = ensureHeyaTrainingState(world, world.playerHeyaId);
      if (patch.intensity) {
        const chosenIdx = INTENSITY_RANK.indexOf(patch.intensity);
        if (chosenIdx > maxIntensityIdx) {
          patch = { ...patch, intensity: INTENSITY_RANK[maxIntensityIdx] };
        }
      }
      ts.activeProfile = { ...ts.activeProfile, ...patch };
      updateWorld({ ...world });
    },
    [world, maxIntensityIdx, updateWorld, INTENSITY_RANK]
  );

  const handleIntensityChange = React.useCallback(
    (v: string) => updateProfile({ intensity: v as TrainingIntensity }),
    [updateProfile]
  );

  const handleFocusChange = React.useCallback(
    (v: string) => updateProfile({ focus: v as TrainingFocus }),
    [updateProfile]
  );

  const handleRecoveryChange = React.useCallback(
    (v: string) => updateProfile({ recovery: v as RecoveryEmphasis }),
    [updateProfile]
  );

  const toggleExpanded = React.useCallback(() => setExpanded((prev) => !prev), []);

  return {
    world,
    expanded,
    headerAction,
    profile,
    sanctionCap,
    maxIntensityIdx,
    intensityOptions,
    focusOptions,
    recoveryOptions,
    INTENSITY_RANK,
    updateProfile,
    handleIntensityChange,
    handleFocusChange,
    handleRecoveryChange,
    toggleExpanded,
  };
}
