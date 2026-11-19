/**
 * W O — Post-henka scrutiny in NPC tactic selection & repeat-henka defense physics.
 */
import { describe, it, expect } from "vitest";
import { mockRikishi } from "@tests/unit/engine/utils";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { chooseTactic, type BoutAIContext } from "@/engine/bout/BoutAI";
import { resolveTachiaiV2 } from "@/engine/bout/physics/tachiai";
import { initEngineStateV2 } from "@/engine/bout/physics/initState";
import { rngFromSeed, type SeededRNG } from "@/engine/core/rng";
import type { BashoState, BoutLogEntry } from "@/engine/types/basho";

/** Deterministic rng stub: roll 0.99 → HENKA for every style. */
const henkaRng = () =>
  ({ next: () => 0.99, int: (_a: number, b: number) => b, bool: () => true }) as unknown as SeededRNG;

/** Deterministic rng stub: roll 0.15 → YOTSU_BELT for yotsu style. */
const beltRng = () =>
  ({ next: () => 0.15, int: (_a: number, b: number) => b, bool: () => false }) as unknown as SeededRNG;

function ctx(overrides: Partial<BoutAIContext> = {}): BoutAIContext {
  return { rng: henkaRng(), ...overrides };
}

const base = { style: "hybrid" as const, stats: { speed: 60, power: 60 } as never };

describe("chooseTactic — O2 post-henka scrutiny", () => {
  it("avoids back-to-back HENKA when usedHenkaYesterday is true and not desperate", () => {
    const cpu = mockRikishi("cpu", { ...base, currentLossStreak: 1, currentBashoLosses: 3 });
    expect(chooseTactic(cpu, mockRikishi("opp"), ctx({ usedHenkaYesterday: true }))).toBe(
      "STANDARD"
    );
  });

  it("still allows HENKA on consecutive days when desperate", () => {
    const cpu = mockRikishi("cpu", { ...base, currentLossStreak: 5 });
    expect(chooseTactic(cpu, mockRikishi("opp"), ctx({ usedHenkaYesterday: true }))).toBe("HENKA");
  });

  it("counters yesterday's trickster with OSHI_THRUST instead of YOTSU_BELT or HENKA", () => {
    const cpu = mockRikishi("cpu", { style: "yotsu", stats: { power: 65, speed: 60 } as never });
    expect(
      chooseTactic(
        cpu,
        mockRikishi("opp"),
        ctx({ rng: beltRng(), opponentUsedHenkaYesterday: true })
      )
    ).toBe("OSHI_THRUST");

    const weakCpu = mockRikishi("weak", { style: "yotsu", stats: { power: 30, speed: 60 } as never });
    expect(
      chooseTactic(
        weakCpu,
        mockRikishi("opp"),
        ctx({ rng: beltRng(), opponentUsedHenkaYesterday: true })
      )
    ).toBe("STANDARD");
  });
});

describe("resolveTachiaiV2 — repeat-henka defense bonus", () => {
  it("makes consecutive-day henka noticeably harder to pull off", () => {
    const east = mockRikishi("e1", { technique: 45, speed: 70, power: 50, aggression: 50 });
    const west = mockRikishi("w1", { balance: 95, speed: 30, aggression: 20, power: 50 });

    const countHenkaWins = (basho?: BashoState) => {
      let wins = 0;
      for (let i = 0; i < 30; i++) {
        const bout = {
          id: `repeat-${i}`,
          day: 11,
          rikishiEastId: east.id,
          rikishiWestId: west.id,
          eastTactic: "HENKA" as const,
        };
        const st = initEngineStateV2(bout, east, west);
        const log: BoutLogEntry[] = [];
        resolveTachiaiV2(rngFromSeed(`repeat-${i}`, "bout", "t"), bout, east, west, st, log, basho);
        if (log.some((e) => e.data?.event === "henka_success")) wins++;
      }
      return wins;
    };

    const freshWins = countHenkaWins(undefined);
    const repeatBasho = MockFactory.createBasho({
      day: 11,
      boutMetrics: {
        e1: {
          kimariteUsed: {},
          upsetCount: 0,
          boutDurations: [],
          edgeCrisisSurvived: 0,
          comebackWins: 0,
          opponentTiers: [],
          lastHenkaDay: 10,
        },
      },
    }) as BashoState;
    const repeatWins = countHenkaWins(repeatBasho);

    expect(freshWins).toBeGreaterThan(20);
    expect(repeatWins).toBeLessThan(freshWins);
    expect(repeatWins).toBeLessThan(10);
  });
});

