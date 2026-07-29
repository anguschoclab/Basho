import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import type { ReplayPhase } from "./types";
import { PHASES } from "./constants";
import { clamp } from "./math";
import { warn } from "@/engine/utils/Logger";

export function getNarrationLines(result: BoutResult, east: UIRikishi, west: UIRikishi): string[] {
  if (result.pbpLines && result.pbpLines.length > 0) {
    const lines: string[] = [];
    for (const l of result.pbpLines) {
      if (l.text && l.text.length > 2) lines.push(l.text);
    }
    return lines;
  }

  if (import.meta.env.DEV) {
    warn(`Bout ${result.boutId} has no pbpLines — falling back to hardcoded strings`, "Narration");
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
