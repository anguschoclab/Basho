/**
 * W N — Desperation tactic input.
 *
 * "Desperate times, desperate measures": a rikishi deep in a losing skid is
 * allowed to keep the crowd-disliked HENKA even under promotion pressure,
 * and the spontaneous-henka chance gets a bounded bump.
 */
import { describe, it, expect } from "vitest";
import { mockRikishi } from "@tests/unit/engine/utils";
import { chooseTactic, type BoutAIContext } from "@/engine/bout/BoutAI";
import { spontaneousHenkaChance } from "@/engine/bout/physics/tachiai";
import type { SeededRNG } from "@/engine/core/rng";

/** Deterministic rng stub: roll 0.99 → HENKA for every style. */
const henkaRng = () =>
  ({
    next: () => 0.99,
    int: (_a: number, b: number) => b,
    bool: () => true,
  }) as unknown as SeededRNG;

function ctx(overrides: Partial<BoutAIContext> = {}): BoutAIContext {
  return { rng: henkaRng(), ...overrides };
}

const base = { style: "hybrid" as const, stats: { speed: 60 } as never };

describe("chooseTactic — desperation keeps HENKA under promotion pressure", () => {
  it("promotion pressure normally swaps HENKA → OSHI_THRUST", () => {
    const cpu = mockRikishi("cpu", { ...base, currentLossStreak: 0, currentBashoLosses: 3 });
    const tactic = chooseTactic(cpu, mockRikishi("opp"), ctx({ rankPressure: "promotion" }));
    expect(tactic).toBe("OSHI_THRUST");
  });

  it("a 5+ loss streak is desperate — HENKA survives promotion pressure", () => {
    const cpu = mockRikishi("cpu", { ...base, currentLossStreak: 5 });
    const tactic = chooseTactic(cpu, mockRikishi("opp"), ctx({ rankPressure: "promotion" }));
    expect(tactic).toBe("HENKA");
  });

  it("8+ basho losses is desperate — HENKA survives promotion pressure", () => {
    const cpu = mockRikishi("cpu", { ...base, currentLossStreak: 2, currentBashoLosses: 8 });
    const tactic = chooseTactic(cpu, mockRikishi("opp"), ctx({ rankPressure: "promotion" }));
    expect(tactic).toBe("HENKA");
  });

  it("below the thresholds the swap still applies", () => {
    const cpu = mockRikishi("cpu", { ...base, currentLossStreak: 4, currentBashoLosses: 6 });
    const tactic = chooseTactic(cpu, mockRikishi("opp"), ctx({ rankPressure: "promotion" }));
    expect(tactic).toBe("OSHI_THRUST");
  });

  it("desperation does not change neutral-pressure choices", () => {
    const cpu = mockRikishi("cpu", { ...base, currentLossStreak: 9 });
    const tactic = chooseTactic(cpu, mockRikishi("opp"), ctx({ rankPressure: "neutral" }));
    expect(tactic).toBe("HENKA"); // base roll already produced HENKA
  });
});

describe("spontaneousHenkaChance — desperation bump", () => {
  // Base condition: technique>60, speed>60, opponent 15+ power stronger.
  const trickster = () =>
    mockRikishi("npc", {
      stats: { technique: 70, speed: 70, power: 40, aggression: 50 } as never,
    });
  const powerhouse = () =>
    mockRikishi("opp", {
      stats: { technique: 50, speed: 50, power: 95, aggression: 50 } as never,
    });

  it("returns 0 when the tech/speed/power-gap gates fail", () => {
    const weak = mockRikishi("npc", {
      stats: { technique: 40, speed: 40, power: 40 } as never,
    });
    expect(spontaneousHenkaChance(weak, powerhouse())).toBe(0);
  });

  it("desperation adds a bounded bonus on top of the base chance", () => {
    const calm = trickster();
    const desperate = mockRikishi("npc", {
      stats: { technique: 70, speed: 70, power: 40, aggression: 50 } as never,
      currentLossStreak: 6,
    });
    const base_ = spontaneousHenkaChance(calm, powerhouse());
    const boosted = spontaneousHenkaChance(desperate, powerhouse());
    expect(base_).toBeGreaterThan(0);
    expect(boosted).toBeGreaterThan(base_);
  });
});
