import { describe, it, expect } from "vitest";
import { WorldState } from "../types/world";
import { generateInjuryWithdrawalHeadline } from "../media";
import { Rikishi } from "../types/rikishi";
import { Heya } from "../types/heya";

function createMockWorld(): WorldState {
  return {
    seed: "test-seed",
    year: 2026,
    week: 1,
    rikishi: new Map<string, Rikishi>(),
    heyas: new Map<string, Heya>(),
    events: { log: [], dedupe: {} },
    mediaState: {
      headlines: [],
      mediaHeat: {},
      heyaPressure: {},
      bashoStreaks: {},
      streakHeadlinesFired: {},
      promoWatchFired: {},
      retirementWatchFired: {},
      titleRaceDayFired: {},
      injuryWithdrawalFired: {},
      mediaHeatHistory: {},
    },
    currentBashoName: "Hatsu",
  } as unknown as WorldState;
}

describe("generateInjuryWithdrawalHeadline", () => {
  it("should return null if rikishi is not found", () => {
    const world = createMockWorld();
    const result = generateInjuryWithdrawalHeadline({
      world,
      rikishiId: "non-existent",
      severity: "moderate",
      area: "ankle",
      description: "sprain",
    });
    expect(result).toBeNull();
  });

  it("should return null if headline was already fired for the rikishi", () => {
    const world = createMockWorld();
    const rikishiId = "rikishi-1";
    world.rikishi.set(rikishiId, { id: rikishiId, shikona: "Testyama", rank: "ozeki", heyaId: "heya-1" } as Rikishi);

    // Simulate already fired
    world.mediaState!.injuryWithdrawalFired = { [rikishiId]: true };

    const result = generateInjuryWithdrawalHeadline({
      world,
      rikishiId,
      severity: "serious",
      area: "knee",
      description: "torn ACL",
    });
    expect(result).toBeNull();
  });

  it("should generate a headline for a serious injury", () => {
    const world = createMockWorld();
    const rikishiId = "rikishi-1";
    world.rikishi.set(rikishiId, {
      id: rikishiId,
      shikona: "Testyama",
      rank: "ozeki",
      heyaId: "heya-1",
    } as Rikishi);

    const result = generateInjuryWithdrawalHeadline({
      world,
      rikishiId,
      severity: "serious",
      area: "knee",
      description: "torn ACL",
      day: 5,
    });

    expect(result).not.toBeNull();
    expect(result?.tier).toBe("main_event"); // impact = 70 + 15 (high rank) = 85 -> main_event
    expect(result?.tone).toBe("concern");
    expect(result?.beat).toBe("injury");
    expect(result?.tags).toContain("basho");
    expect(result?.tags).toContain("injury");
    expect(result?.tags).toContain("serious");
    expect(result?.tags).toContain("knee");
    expect(result?.rikishiIds).toEqual([rikishiId]);

    // Verify it was marked as fired in the state
    expect(world.mediaState?.injuryWithdrawalFired?.[rikishiId]).toBe(true);

    // Verify it was added to headlines
    expect(world.mediaState?.headlines.length).toBeGreaterThan(0);
    expect(world.mediaState?.headlines[0].id).toBe(result?.id);
  });

  it("should include opponent info if opponentId is provided", () => {
    const world = createMockWorld();
    const rikishiId = "rikishi-1";
    const opponentId = "opponent-1";
    world.rikishi.set(rikishiId, { id: rikishiId, shikona: "Testyama", rank: "ozeki", heyaId: "heya-1" } as Rikishi);
    world.rikishi.set(opponentId, { id: opponentId, shikona: "OpponentYama", rank: "maegashira-1", heyaId: "heya-2" } as Rikishi);

    const result = generateInjuryWithdrawalHeadline({
      world,
      rikishiId,
      severity: "serious",
      area: "knee",
      description: "torn ACL",
      opponentId,
      day: 5,
    });

    expect(result).not.toBeNull();
    expect(result?.rikishiIds).toContain(rikishiId);
    expect(result?.rikishiIds).toContain(opponentId);
    expect(result?.heyaIds).toContain("heya-1");
    expect(result?.heyaIds).toContain("heya-2");
    expect(result?.bout?.winnerId).toBe(opponentId);
    expect(result?.bout?.loserId).toBe(rikishiId);
    expect(result?.subtitle).toContain("OpponentYama");
  });

  it("should generate appropriate headline for moderate injury", () => {
    const world = createMockWorld();
    const rikishiId = "rikishi-1";
    world.rikishi.set(rikishiId, { id: rikishiId, shikona: "Testyama", rank: "maegashira-5", heyaId: "heya-1" } as Rikishi);

    const result = generateInjuryWithdrawalHeadline({
      world,
      rikishiId,
      severity: "moderate",
      area: "shoulder",
      description: "dislocation",
    });

    expect(result).not.toBeNull();
    // It should be national tier since impact = 50 + 0 (not high rank) = 50 -> national (>= 40)
    expect(result?.tier).toBe("national");
    expect(result?.tone).toBe("concern");
    expect(result?.tags).toContain("moderate");
  });

  it("should generate local tier headline for minor injury to low rank", () => {
    const world = createMockWorld();
    const rikishiId = "rikishi-1";
    world.rikishi.set(rikishiId, { id: rikishiId, shikona: "Testyama", rank: "jonidan", heyaId: "heya-1" } as Rikishi);

    const result = generateInjuryWithdrawalHeadline({
      world,
      rikishiId,
      severity: "minor",
      area: "finger",
      description: "sprain",
    });

    expect(result).not.toBeNull();
    // impact = 35 + 0 (not high rank) = 35 -> local (< 40)
    expect(result?.tier).toBe("local");
    expect(result?.tone).toBe("neutral");
    expect(result?.tags).toContain("minor");
  });

  it("should create default media state if none exists", () => {
    const world = createMockWorld();
    delete world.mediaState;
    const rikishiId = "rikishi-1";
    world.rikishi.set(rikishiId, { id: rikishiId, shikona: "Testyama", rank: "ozeki", heyaId: "heya-1" } as Rikishi);

    const result = generateInjuryWithdrawalHeadline({
      world,
      rikishiId,
      severity: "serious",
      area: "knee",
      description: "torn ACL",
    });

    expect(result).not.toBeNull();
    expect(world.mediaState).toBeDefined();
    expect(world.mediaState?.injuryWithdrawalFired?.[rikishiId]).toBe(true);
  });
});
