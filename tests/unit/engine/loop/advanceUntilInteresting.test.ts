import { describe, it, expect } from "vitest";
import { shouldHaltAdvance } from "@/engine/npc/decision/shouldHaltAdvance";
import { makeMockWorld } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";

function base(): WorldState {
  return makeMockWorld({ year: 2030, week: 5, playerHeyaId: "h-player" });
}

describe("shouldHaltAdvance — advance-until-interesting", () => {
  it("halts on a non-required decision posted this week", () => {
    const world = base();
    world.pendingDecisions = [
      { id: "training-y2030-w5", type: "training", description: "d", deadlineWeek: 6, options: [], required: false },
    ] as never;
    expect(shouldHaltAdvance(world)).toBe(true);
  });

  it("does not halt on stale non-required decisions from prior weeks", () => {
    const world = base();
    world.pendingDecisions = [
      { id: "training-y2030-w4", type: "training", description: "d", deadlineWeek: 6, options: [], required: false },
    ] as never;
    expect(shouldHaltAdvance(world)).toBe(false);
  });

  it("halts on a new rikishi request created this week", () => {
    const world = base();
    world.pendingRikishiRequests = [
      { id: "req-1", rikishiId: "r1", heyaId: "h-player", type: "rest", createdWeek: 5, reason: "fatigue" },
    ] as never;
    expect(shouldHaltAdvance(world)).toBe(true);
  });

  it("halts on a major event scoped to the player's stable this week", () => {
    const world = base();
    world.events = { version: "1.0.0", dedupe: {}, log: [
      { id: "e1", type: "GOVERNANCE_RULING", year: 2030, week: 5, phase: "interim", category: "discipline", importance: "major", scope: "heya", heyaId: "h-player", title: "t", summary: "s" },
    ] } as never;
    expect(shouldHaltAdvance(world)).toBe(true);
  });

  it("does not halt on minor events or other stables' news", () => {
    const world = base();
    world.events = { version: "1.0.0", dedupe: {}, log: [
      { id: "e1", type: "GOVERNANCE_RULING", year: 2030, week: 5, phase: "interim", category: "discipline", importance: "minor", scope: "heya", heyaId: "h-player", title: "t", summary: "s" },
      { id: "e2", type: "GOVERNANCE_RULING", year: 2030, week: 5, phase: "interim", category: "discipline", importance: "headline", scope: "heya", heyaId: "h-other", title: "t", summary: "s" },
    ] } as never;
    expect(shouldHaltAdvance(world)).toBe(false);
  });

  it("halts on a major event scoped to the whole world this week", () => {
    const world = base();
    world.events = { version: "1.0.0", dedupe: {}, log: [
      { id: "e1", type: "BASHO_RESULT", year: 2030, week: 5, phase: "interim", category: "basho", importance: "major", scope: "world", title: "t", summary: "s" },
    ] } as never;
    expect(shouldHaltAdvance(world)).toBe(true);
  });

  it("halts on a headline event scoped to the player's stable", () => {
    const world = base();
    world.events = { version: "1.0.0", dedupe: {}, log: [
      { id: "e1", type: "GOVERNANCE_RULING", year: 2030, week: 5, phase: "interim", category: "discipline", importance: "headline", scope: "heya", heyaId: "h-player", title: "t", summary: "s" },
    ] } as never;
    expect(shouldHaltAdvance(world)).toBe(true);
  });

  it("does not halt on a rikishi request created in a prior week", () => {
    const world = base();
    world.pendingRikishiRequests = [
      { id: "req-1", rikishiId: "r1", heyaId: "h-player", type: "rest", createdWeek: 4, reason: "fatigue" },
    ] as never;
    expect(shouldHaltAdvance(world)).toBe(false);
  });

  it("does not halt on major events from a different week or year", () => {
    const world = base();
    world.events = { version: "1.0.0", dedupe: {}, log: [
      { id: "e1", type: "GOVERNANCE_RULING", year: 2030, week: 4, phase: "interim", category: "discipline", importance: "major", scope: "heya", heyaId: "h-player", title: "t", summary: "s" },
      { id: "e2", type: "GOVERNANCE_RULING", year: 2029, week: 5, phase: "interim", category: "discipline", importance: "headline", scope: "world", title: "t", summary: "s" },
    ] } as never;
    expect(shouldHaltAdvance(world)).toBe(false);
  });
});
