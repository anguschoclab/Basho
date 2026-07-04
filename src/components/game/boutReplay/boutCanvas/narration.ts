import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import type { ReplayPhase } from "./types";
import { PHASES } from "./constants";
import { clamp } from "./math";

export function getNarrationLines(result: BoutResult, east: UIRikishi, west: UIRikishi): string[] {
  if (result.pbpLines && result.pbpLines.length > 0) {
    return result.pbpLines.map((l) => l.text).filter((t) => t && t.length > 2);
  }

  if (import.meta.env.DEV) {
    console.warn(`[narration] bout ${result.boutId} has no pbpLines — falling back to hardcoded strings`);
  }

  const winner = result.winnerRikishiId === east.id ? east : west;
  const loser = result.winnerRikishiId === east.id ? west : east;

  const lines: string[] = [
    `${east.shikona} (East) faces ${west.shikona} (West).`,
    `They crouch at the shikiri-sen. Silence falls.`,
    `TACHIAI! The collision echoes through the hall.`,
    `${winner.shikona} drives forward with relentless pressure.`,
    `${loser.shikona} cannot find an answer.`,
    `${winner.shikona} wins by ${result.kimariteName || "yorikiri"}!`,
  ];
  if (result.upset) lines.push("UPSET! The arena is in disbelief!");
  if (result.isKinboshi) lines.push("KINBOSHI! The Yokozuna has been toppled!");
  return lines;
}

export function getPhaseNarrationIndex(
  phase: ReplayPhase,
  progress01: number,
  totalLines: number
): number {
  const phaseIdx = PHASES.indexOf(phase);
  const totalPhases = PHASES.length - 1;
  const overall = (phaseIdx + progress01) / totalPhases;
  return clamp(Math.floor(overall * totalLines), 0, totalLines - 1);
}
