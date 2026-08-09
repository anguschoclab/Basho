import { describe, it, expect } from "vitest";
import { shouldHaltAdvance } from "@/engine/loop/shouldHaltAdvance";
import type { WorldState } from "@/engine/types/world";

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    cyclePhase: "interim",
    ...overrides,
  } as unknown as WorldState;
}

describe("P1.4: shouldHaltAdvance", () => {
  it("returns true when pendingCrisis is set", () => {
    const world = makeWorld({ pendingCrisis: { id: "c1" } as any });
    expect(shouldHaltAdvance(world)).toBe(true);
  });

  it("returns true when pendingDecisions has a required decision", () => {
    const world = makeWorld({
      pendingDecisions: [{ id: "d1", required: true } as any],
    });
    expect(shouldHaltAdvance(world)).toBe(true);
  });

  it("returns false when pendingDecisions has only non-required decisions", () => {
    const world = makeWorld({
      pendingDecisions: [{ id: "d1", required: false } as any],
    });
    expect(shouldHaltAdvance(world)).toBe(false);
  });

  it("returns false when pendingDecisions is empty", () => {
    const world = makeWorld({ pendingDecisions: [] });
    expect(shouldHaltAdvance(world)).toBe(false);
  });

  it("returns false when both pendingCrisis and pendingDecisions are empty", () => {
    const world = makeWorld();
    expect(shouldHaltAdvance(world)).toBe(false);
  });

  it("returns true when pendingCrisis set AND pendingDecisions has required (accumulated)", () => {
    const world = makeWorld({
      pendingCrisis: { id: "c1" } as any,
      pendingDecisions: [{ id: "d1", required: true } as any],
    });
    expect(shouldHaltAdvance(world)).toBe(true);
  });

  it("returns false when pendingDecisions is undefined", () => {
    const world = makeWorld({ pendingDecisions: undefined });
    expect(shouldHaltAdvance(world)).toBe(false);
  });

  it("returns true when multiple required decisions exist", () => {
    const world = makeWorld({
      pendingDecisions: [{ id: "d1", required: true } as any, { id: "d2", required: true } as any],
    });
    expect(shouldHaltAdvance(world)).toBe(true);
  });

  it("returns true when pendingDecisions has mixed required and non-required", () => {
    const world = makeWorld({
      pendingDecisions: [{ id: "d1", required: false } as any, { id: "d2", required: true } as any],
    });
    expect(shouldHaltAdvance(world)).toBe(true);
  });

  it("returns false when pendingDecisions is null (not undefined)", () => {
    const world = makeWorld({ pendingDecisions: null as unknown as undefined });
    expect(shouldHaltAdvance(world)).toBe(false);
  });
});
