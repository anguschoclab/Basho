import { describe, it, expect } from "vitest";
import { shouldHaltAdvance } from "@/engine/loop/shouldHaltAdvance";
import type { WorldState } from "@/engine/types/world";

const base = { pendingCrisis: undefined, pendingDecisions: [] } as unknown as WorldState;

describe("shouldHaltAdvance", () => {
  it("does not halt when there is no blocking decision", () => {
    expect(shouldHaltAdvance(base)).toBe(false);
  });
  it("halts when a pendingCrisis exists", () => {
    const w = {
      ...base,
      pendingCrisis: { id: "c1", type: "loop_decision", title: "x", description: "x", options: [] },
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(true);
  });
  it("halts when a required pendingDecision exists even without a crisis", () => {
    const w = {
      ...base,
      pendingDecisions: [
        { id: "d1", type: "x", description: "x", deadlineWeek: 1, required: true, options: [] },
      ],
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(true);
  });
});
