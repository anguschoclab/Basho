import { describe, it, expect } from "vitest";
import { assessMaezumo, MAEZUMO_DURATION_WEEKS } from "@/engine/systems/generation/MaezumoService";
import type { Rikishi } from "@/engine/types/rikishi";

function makeRecruit(id: string): Rikishi {
  return {
    id,
    shikona: `Recruit ${id}`,
    rank: "jonokuchi",
    division: "jonokuchi",
    rankNumber: 50,
    side: "east",
    heyaId: "test-heya",
    stats: {
      aggression: 50,
      mental: 50,
      power: 50,
      speed: 50,
      technique: 50,
      balance: 50,
      stamina: 50,
    },
  } as unknown as Rikishi;
}

describe("Maezumo assessment stage", () => {
  it("new recruit without maezumoCompleted gets assessed", () => {
    const recruit = makeRecruit("r1");
    const result = assessMaezumo(recruit, "test-seed");
    expect(result.maezumoCompleted).toBe(true);
    expect(result.rankNumber).toBeDefined();
    expect(result.rankNumber).not.toBe(50);
  });

  it("maezumo assessment determines initial jonokuchi rankNumber between 1 and 50", () => {
    const recruit = makeRecruit("r1");
    const result = assessMaezumo(recruit, "test-seed");
    expect(result.rankNumber!).toBeGreaterThanOrEqual(1);
    expect(result.rankNumber!).toBeLessThanOrEqual(50);
  });

  it("higher stat recruit gets better (lower) rankNumber", () => {
    const lowStatRecruit = makeRecruit("low");
    lowStatRecruit.stats = {
      aggression: 20,
      mental: 20,
      power: 20,
      speed: 20,
      technique: 20,
      balance: 20,
      stamina: 20,
    } as never;

    const highStatRecruit = makeRecruit("high");
    highStatRecruit.stats = {
      aggression: 80,
      mental: 80,
      power: 80,
      speed: 80,
      technique: 80,
      balance: 80,
      stamina: 80,
    } as never;

    const lowResult = assessMaezumo(lowStatRecruit, "stat-seed");
    const highResult = assessMaezumo(highStatRecruit, "stat-seed");

    expect(highResult.rankNumber!).toBeLessThan(lowResult.rankNumber!);
  });

  it("rikishi with maezumoCompleted already true is not re-assessed", () => {
    const recruit = makeRecruit("r1");
    recruit.maezumoCompleted = true;
    recruit.rankNumber = 15;
    const result = assessMaezumo(recruit, "test-seed");
    expect(result.maezumoCompleted).toBe(true);
    expect(result.rankNumber).toBe(15);
  });

  it("maezumo completes within 1 basho cycle (MAEZUMO_DURATION_WEEKS <= 2)", () => {
    expect(MAEZUMO_DURATION_WEEKS).toBeLessThanOrEqual(2);
  });

  it("assessment is deterministic based on seed", () => {
    const recruit1 = makeRecruit("r1");
    const recruit2 = makeRecruit("r2");
    // Same stats, same seed → same result
    recruit2.stats = { ...recruit1.stats };
    const result1 = assessMaezumo(recruit1, "deterministic-seed");
    const result2 = assessMaezumo(recruit2, "deterministic-seed");
    expect(result1.rankNumber).toBe(result2.rankNumber);
  });
});
