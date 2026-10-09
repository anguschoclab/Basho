/**
 * useExhibitionBout.ts
 *
 * State and handlers for ExhibitionBout — picks the exhibition pair,
 * resolves the bout once, and drives reveal + mentor-overlay flow.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useGame } from "@/contexts/useGame";
import { resolveBout } from "@/presenters/engineAccess";
import type { BoutContext } from "@/presenters/engineAccess";
import type { BashoState } from "@/engine/types/basho";
import type { BoutResult } from "@/engine/types/basho";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import type { MentorStep } from "@/components/onboarding/MentorOverlay";

const MENTOR_SEQUENCE: MentorStep[] = ["stamina", "grip", "momentum", "basho_record"];

/** Picks two makuuchi rikishi from the world to fight. */
function pickExhibitionPair(world: import("@/engine/types/world").WorldState) {
  const candidates = [];
  for (const r of world.rikishi.values()) {
    if (isSekitoriDivision(r.division)) {
      candidates.push(r);
      if (candidates.length === 2) break;
    }
  }

  if (candidates.length < 2) {
    // Fallback: any two rikishi
    const fallback = [];
    for (const r of world.rikishi.values()) {
      fallback.push(r);
      if (fallback.length === 2) break;
    }
    return fallback.length >= 2 ? ([fallback[0], fallback[1]] as const) : null;
  }
  return [candidates[0], candidates[1]] as const;
}

export function useExhibitionBout(onComplete: () => void) {
  const { state, setTutorialFlag, finishExhibition } = useGame();
  const world = state.world;

  const finishRequestedRef = useRef(false);
  const tutorialCompleted = world?.tutorialState?.completed ?? false;

  useEffect(() => {
    if (finishRequestedRef.current && tutorialCompleted) {
      finishRequestedRef.current = false;
      onComplete();
    }
  }, [tutorialCompleted, onComplete]);

  const pair = useMemo(() => (world ? pickExhibitionPair(world) : null), [world]);

  // Resolve bout once, deterministically, on mount
  const boutResult = useMemo<BoutResult | null>(() => {
    if (!pair || !world) return null;
    const [east, west] = pair;

    const ctx: BoutContext = {
      id: "exhibition-bout-001",
      day: 1,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
    };

    const mockBasho: BashoState = {
      year: world.year,
      bashoNumber: 1,
      bashoName: "hatsu",
      day: 1,
      matches: [],
      standings: new Map(),
      schedule: [],
      results: [],
      name: "hatsu",
      isActive: false,
    };

    try {
      const resolved = resolveBout(ctx, east, west, mockBasho);
      return resolved?.result ?? null;
    } catch {
      return null;
    }
  }, [pair, world]);

  const [revealedCount, setRevealedCount] = useState(0);
  const [mentorStepIdx, setMentorStepIdx] = useState(0);
  const [mentorDismissed, setMentorDismissed] = useState(false);

  const logLines = boutResult?.pbpLines ?? [];
  const isFullyRevealed = revealedCount >= logLines.length;
  const currentMentorStep: MentorStep =
    !mentorDismissed && mentorStepIdx < MENTOR_SEQUENCE.length
      ? MENTOR_SEQUENCE[mentorStepIdx]
      : null;

  const handleNextLine = useCallback(() => {
    if (!isFullyRevealed) {
      setRevealedCount((c) => c + 1);
    }
  }, [isFullyRevealed]);

  const handleMentorDismiss = useCallback(() => {
    setMentorDismissed(true);
    setTutorialFlag("seenBashoRecordTooltip");
  }, [setTutorialFlag]);

  const handleMentorNext = useCallback(() => {
    if (mentorStepIdx < MENTOR_SEQUENCE.length - 1) {
      const flagMap: Record<string, keyof import("@/engine/types/tutorial").TutorialFlags> = {
        stamina: "seenStaminaTooltip",
        grip: "seenGripTooltip",
        momentum: "seenMomentumTooltip",
        basho_record: "seenBashoRecordTooltip",
      };
      const current = MENTOR_SEQUENCE[mentorStepIdx];
      if (current && flagMap[current]) setTutorialFlag(flagMap[current]);
      setMentorStepIdx((i) => i + 1);
    } else {
      handleMentorDismiss();
    }
  }, [mentorStepIdx, setTutorialFlag, handleMentorDismiss]);

  const handleFinish = useCallback(() => {
    finishRequestedRef.current = true;
    finishExhibition("finishedExhibition", "FIRST_BASHO_STARTED");
  }, [finishExhibition]);

  return {
    world,
    pair,
    boutResult,
    logLines,
    revealedCount,
    isFullyRevealed,
    mentorStepIdx,
    currentMentorStep,
    mentorStepCount: MENTOR_SEQUENCE.length,
    handleNextLine,
    handleMentorDismiss,
    handleMentorNext,
    handleFinish,
  };
}
