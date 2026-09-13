import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { resolveBoutPhysics, type BoutContext } from "@/engine/bout/boutPhysics";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState, BoutResult } from "@/engine/types/basho";
import type { BoutTactic } from "@/engine/types/combat";

/**
 * WS1 contract tests — tactic physics must be symmetric across sides.
 *
 * RED phase contract being pinned here:
 * - bout.eastTactic / bout.westTactic drive the same physics the legacy
 *   playerTactic / cpuTacticOverride fields did.
 * - tachiaiPowerModifier applies to whichever side holds the tactic.
 * - HENKA can fire from either side's tactic field.
 */

/** BoutContext extended with the resolved per-side tactic fields. */
type TacticCtx = BoutContext & { eastTactic?: BoutTactic; westTactic?: BoutTactic };

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    division: "makuuchi",
    style: "hybrid",
    stats: {
      power: 60,
      speed: 60,
      technique: 60,
      weight: 140,
      stamina: 60,
      mental: 60,
      adaptability: 60,
      balance: 60,
      aggression: 60,
      experience: 20,
    },
    ...overrides,
  });
}

function makeBasho(): BashoState {
  return MockFactory.createBasho({ id: "sym-basho", day: 3 });
}

function baseCtx(overrides: Partial<TacticCtx> = {}): TacticCtx {
  return {
    id: "sym-bout",
    day: 3,
    rikishiEastId: "east",
    rikishiWestId: "west",
    ...overrides,
  };
}

function tachiaiEntry(result: BoutResult) {
  return result.log.find(
    (e) => e.phase === "tachiai" && typeof e.data?.eastPower === "number"
  );
}

describe("tactic symmetry — per-side physics", () => {
  it("eastTactic produces identical physics to legacy playerTactic on east", () => {
    const east = makeRikishi("east");
    const west = makeRikishi("west");
    const basho = makeBasho();
    // playerSide is carried on both ctxs — it controls NPC-vs-player
    // eligibility (counterFamily bonus, spontaneous henka), independent of
    // which field carries the resolved tactic.
    const legacy = resolveBoutPhysics(
      baseCtx({ playerSide: "east", playerTactic: "ALL_OUT" }),
      east,
      west,
      basho
    ).result;
    const perSide = resolveBoutPhysics(
      baseCtx({ playerSide: "east", eastTactic: "ALL_OUT" }),
      east,
      west,
      basho
    ).result;
    expect(perSide).toEqual(legacy);
  });

  it("westTactic produces identical physics to legacy cpuTacticOverride on west", () => {
    const east = makeRikishi("east");
    const west = makeRikishi("west");
    const basho = makeBasho();
    const legacy = resolveBoutPhysics(
      baseCtx({ playerSide: "east", cpuTacticOverride: "ALL_OUT" }),
      east,
      west,
      basho
    ).result;
    const perSide = resolveBoutPhysics(
      baseCtx({ playerSide: "east", westTactic: "ALL_OUT" }),
      east,
      west,
      basho
    ).result;
    expect(perSide).toEqual(legacy);
  });

  it("tachiaiPowerModifier applies to the west side's tactic", () => {
    const east = makeRikishi("east");
    const west = makeRikishi("west");
    const basho = makeBasho();
    const baseline = resolveBoutPhysics(baseCtx(), east, west, basho).result;
    const withTactic = resolveBoutPhysics(
      baseCtx({ westTactic: "ALL_OUT" }),
      east,
      west,
      basho
    ).result;
    const basePower = tachiaiEntry(baseline)?.data?.westPower as number;
    const tactPower = tachiaiEntry(withTactic)?.data?.westPower as number;
    expect(tactPower).toBeGreaterThan(basePower);
  });

  it("HENKA fires from the east side's tactic field", () => {
    const east = makeRikishi("east", {
      stats: {
        power: 60,
        speed: 90,
        technique: 100,
        weight: 140,
        stamina: 60,
        mental: 60,
        adaptability: 60,
        balance: 60,
        aggression: 40,
        experience: 20,
      },
    });
    const west = makeRikishi("west", {
      stats: {
        power: 80,
        speed: 90,
        technique: 30,
        weight: 160,
        stamina: 60,
        mental: 60,
        adaptability: 60,
        balance: 10,
        aggression: 100,
        experience: 20,
      },
    });
    const result = resolveBoutPhysics(
      baseCtx({ eastTactic: "HENKA" }),
      east,
      west,
      makeBasho()
    ).result;
    const henka = result.log.find(
      (e) => e.data?.event === "henka_success"
    );
    expect(henka, "east HENKA tactic must reach the henka resolution path").toBeDefined();
    expect(henka?.data?.attackerSide).toBe("east");
  });

  it("HENKA fires from the west side's tactic field", () => {
    const east = makeRikishi("east", {
      stats: {
        power: 80,
        speed: 90,
        technique: 30,
        weight: 160,
        stamina: 60,
        mental: 60,
        adaptability: 60,
        balance: 10,
        aggression: 100,
        experience: 20,
      },
    });
    const west = makeRikishi("west", {
      stats: {
        power: 60,
        speed: 90,
        technique: 100,
        weight: 140,
        stamina: 60,
        mental: 60,
        adaptability: 60,
        balance: 60,
        aggression: 40,
        experience: 20,
      },
    });
    const result = resolveBoutPhysics(
      baseCtx({ westTactic: "HENKA" }),
      east,
      west,
      makeBasho()
    ).result;
    const henka = result.log.find(
      (e) => e.data?.event === "henka_success"
    );
    expect(henka, "west HENKA tactic must reach the henka resolution path").toBeDefined();
    expect(henka?.data?.attackerSide).toBe("west");
  });

  it("legacy-only ctx without per-side tactics still resolves unchanged", () => {
    const east = makeRikishi("east");
    const west = makeRikishi("west");
    const basho = makeBasho();
    const a = resolveBoutPhysics(
      baseCtx({ playerSide: "west", playerTactic: "YOTSU_BELT", cpuTacticOverride: "OSHI_THRUST" }),
      east,
      west,
      basho
    ).result;
    const b = resolveBoutPhysics(
      baseCtx({ playerSide: "west", playerTactic: "YOTSU_BELT", cpuTacticOverride: "OSHI_THRUST" }),
      east,
      west,
      basho
    ).result;
    expect(a).toEqual(b);
    expect(a.winner).toBeDefined();
  });
});
