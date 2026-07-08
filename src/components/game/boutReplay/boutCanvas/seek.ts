import { clamp } from "./math";

export interface SeekTarget {
  phaseIndex: number;
  phaseProgress: number;
}

export function seekToPhase(globalProgress: number, phaseDurations: number[]): SeekTarget {
  const total = phaseDurations.reduce((a, b) => a + b, 0);
  if (total <= 0 || phaseDurations.length === 0) {
    return { phaseIndex: 0, phaseProgress: 0 };
  }

  const gp = clamp(globalProgress, 0, 1);
  const targetMs = gp * total;

  let elapsed = 0;
  for (let i = 0; i < phaseDurations.length; i++) {
    const dur = phaseDurations[i];
    if (dur <= 0) continue;
    if (targetMs <= elapsed + dur) {
      return { phaseIndex: i, phaseProgress: (targetMs - elapsed) / dur };
    }
    elapsed += dur;
  }

  // Target is at or past the end — find last non-zero-duration phase
  for (let i = phaseDurations.length - 1; i >= 0; i--) {
    if (phaseDurations[i] > 0) {
      return { phaseIndex: i, phaseProgress: 1 };
    }
  }
  return { phaseIndex: 0, phaseProgress: 0 };
}

export function computeGlobalProgress(
  phaseIndex: number,
  phaseProgress: number,
  phaseDurations: number[]
): { globalProgress: number; elapsedMs: number; totalDurationMs: number } {
  const total = phaseDurations.reduce((a, b) => a + b, 0);
  if (total <= 0 || phaseDurations.length === 0) {
    return { globalProgress: 0, elapsedMs: 0, totalDurationMs: 0 };
  }

  const clampedIdx = clamp(phaseIndex, 0, phaseDurations.length - 1);
  const clampedProgress = clamp(phaseProgress, 0, 1);

  let elapsed = 0;
  for (let i = 0; i < clampedIdx; i++) {
    elapsed += phaseDurations[i];
  }
  elapsed += phaseDurations[clampedIdx] * clampedProgress;

  return {
    globalProgress: clamp(elapsed / total, 0, 1),
    elapsedMs: elapsed,
    totalDurationMs: total,
  };
}
