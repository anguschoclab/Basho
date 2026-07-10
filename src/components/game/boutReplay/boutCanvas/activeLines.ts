import type { PbpLine } from "@/engine/bout/boutNarrative";
import { PHASES, CANVAS_PHASE_TO_PBP_PHASE } from "./constants";

export function computeActiveLineIndices(phaseIndex: number, pbpLines: PbpLine[]): Set<number> {
  if (pbpLines.length === 0) return new Set();
  if (phaseIndex < 0 || phaseIndex >= PHASES.length) return new Set();
  const phase = PHASES[phaseIndex];
  const targetPhases = CANVAS_PHASE_TO_PBP_PHASE[phase];
  if (!targetPhases || targetPhases.length === 0) return new Set();

  const result = new Set<number>();
  for (let i = 0; i < pbpLines.length; i++) {
    if (pbpLines[i].phase && targetPhases.includes(pbpLines[i].phase!)) {
      result.add(i);
    }
  }
  return result;
}
