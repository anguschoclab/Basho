/**
 * TutorialService.ts
 *
 * Pure helpers for tutorial state transitions in WorldState.
 * All functions return StateImpact for transactional updates.
 * Mirrors the BookmarkService pattern.
 */

import type { WorldState } from "@/engine/types/world";
import type { TutorialStep, TutorialFlags } from "@/engine/types/tutorial";
import { createDefaultTutorialState } from "@/engine/types/tutorial";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";

export function advanceTutorialStep(
  world: WorldState,
  step: TutorialStep
): StateImpact {
  const builder = createImpactBuilder("advanceTutorialStep");
  const ts = world.tutorialState;
  builder.updateWorldField(
    "tutorialState",
    ts ? { ...ts, currentStep: step } : { ...createDefaultTutorialState(), currentStep: step }
  );
  return builder.build();
}

export function setTutorialFlag(
  world: WorldState,
  flag: keyof TutorialFlags
): StateImpact {
  const builder = createImpactBuilder("setTutorialFlag");
  if (!world.tutorialState) return builder.build();
  builder.updateWorldField("tutorialState", {
    ...world.tutorialState,
    flags: { ...world.tutorialState.flags, [flag]: true },
  });
  return builder.build();
}

export function completeTutorial(world: WorldState): StateImpact {
  const builder = createImpactBuilder("completeTutorial");
  builder.updateWorldField("tutorialState", {
    ...(world.tutorialState ?? createDefaultTutorialState()),
    completed: true,
    currentStep: "DONE" as const,
  });
  return builder.build();
}

export function finishExhibition(
  world: WorldState,
  flag: keyof TutorialFlags,
  _step: TutorialStep
): StateImpact {
  const builder = createImpactBuilder("finishExhibition");
  const currentTs = world.tutorialState ?? createDefaultTutorialState();
  builder.updateWorldField("tutorialState", {
    ...currentTs,
    completed: true,
    currentStep: "DONE" as const,
    flags: { ...currentTs.flags, [flag]: true },
  });
  return builder.build();
}
