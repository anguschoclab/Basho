import { describe, it, expect } from "vitest";
import { CANVAS_PHASE_TO_PBP_PHASE, PHASES } from "@/components/game/boutReplay/boutCanvas/constants";
import type { ReplayPhase } from "@/components/game/boutReplay/boutCanvas/types";
import type { PbpPhase } from "@/engine/bout/boutNarrative";

const VALID_PBP_PHASES: PbpPhase[] = [
  "opening", "entrance", "ritual", "tactical", "tachiai",
  "engagement", "clinch", "momentum", "edge_crisis",
  "finish", "award", "ceremony", "closing",
];

describe("CANVAS_PHASE_TO_PBP_PHASE", () => {
  it("every ReplayPhase key is present in the mapping", () => {
    for (const phase of PHASES) {
      expect(CANVAS_PHASE_TO_PBP_PHASE[phase]).toBeDefined();
    }
  });

  it("ritual maps to [ritual, opening, entrance]", () => {
    expect(CANVAS_PHASE_TO_PBP_PHASE.ritual).toEqual(["ritual", "opening", "entrance"]);
  });

  it("clinch maps to [clinch, engagement]", () => {
    expect(CANVAS_PHASE_TO_PBP_PHASE.clinch).toEqual(["clinch", "engagement"]);
  });

  it("momentum maps to [momentum, tactical, edge_crisis]", () => {
    expect(CANVAS_PHASE_TO_PBP_PHASE.momentum).toEqual(["momentum", "tactical", "edge_crisis"]);
  });

  it("ceremony maps to [ceremony, award, closing]", () => {
    expect(CANVAS_PHASE_TO_PBP_PHASE.ceremony).toEqual(["ceremony", "award", "closing"]);
  });

  it("complete maps to empty array", () => {
    expect(CANVAS_PHASE_TO_PBP_PHASE.complete).toEqual([]);
  });

  it("all values in arrays are valid PbpPhase values", () => {
    for (const key of PHASES) {
      const phases = CANVAS_PHASE_TO_PBP_PHASE[key as ReplayPhase];
      for (const p of phases) {
        expect(VALID_PBP_PHASES).toContain(p);
      }
    }
  });
});
