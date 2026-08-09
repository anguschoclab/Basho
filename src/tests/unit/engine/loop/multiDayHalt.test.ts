import { describe, it, expect } from "vitest";
import { shouldHaltAdvance } from "@/engine/loop/shouldHaltAdvance";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { makeMockWorld } from "../utils";
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

  // P1.4: Accumulated decisions while crisis is pending must also halt.
  it("halts when pendingDecisions has a required decision AND pendingCrisis is already set", () => {
    const w = {
      ...base,
      pendingCrisis: { id: "c1", type: "loop_decision", title: "x", description: "x", options: [] },
      pendingDecisions: [
        { id: "d2", type: "y", description: "y", deadlineWeek: 2, required: true, options: [] },
      ],
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(true);
  });

  it("does not halt when pendingDecisions has only non-required decisions", () => {
    const w = {
      ...base,
      pendingDecisions: [
        { id: "d1", type: "x", description: "x", deadlineWeek: 1, required: false, options: [] },
      ],
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(false);
  });

  it("does not halt when pendingDecisions is empty and no pendingCrisis", () => {
    const w = {
      ...base,
      pendingDecisions: [],
      pendingCrisis: undefined,
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(false);
  });

  it("resolved decisions (removed from pendingDecisions) do not halt", () => {
    const w = {
      ...base,
      pendingDecisions: [],
      pendingCrisis: undefined,
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(false);
  });
});

describe("advanceOneDay halt behavior", () => {
  it("does not halt on pendingCrisis when _autonomousSim is true", () => {
    const world = makeMockWorld({
      _autonomousSim: true,
      pendingCrisis: {
        id: "c1",
        type: "loop_decision",
        title: "x",
        description: "x",
        options: [],
      } as any,
    });
    // Should run the full pipeline without early-return since _autonomousSim is true.
    const result = advanceOneDay(world);
    // The world should have advanced (dayIndexGlobal incremented by preflight)
    expect(result.dayIndexGlobal).toBe((world.dayIndexGlobal ?? 0) + 1);
  });

  it("halts early (returns before main phases) when pendingCrisis is set and not autonomous", () => {
    const world = makeMockWorld({
      pendingCrisis: {
        id: "c1",
        type: "loop_decision",
        title: "x",
        description: "x",
        options: [],
      } as any,
      _daysSinceLastWeeklyTick: 6, // Not a weekly tick, so no weekly phases would run anyway
    });
    const result = advanceOneDay(world);
    // Preflight still runs (advances calendar), but main phases should be skipped.
    // The day should advance but the weekly tick counter should NOT reset (no weekly phases ran).
    expect(result.dayIndexGlobal).toBe((world.dayIndexGlobal ?? 0) + 1);
    // _daysSinceLastWeeklyTick should be incremented by preflight but not reset to 0
    // (since no weekly pipeline ran). The preflight increments it, and the halt
    // happens before the weekly tick counter update at line 131-134.
    // Actually, the halt returns before the counter update, so the counter is
    // whatever preflight set it to.
    // The key assertion: the world didn't go through the full pipeline (no transientContext.lastReport).
    expect(result.transientContext?.lastReport).toBeUndefined();
  });
});
