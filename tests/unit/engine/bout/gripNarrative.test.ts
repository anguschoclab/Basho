/**
 * W G — grip-battle PBP depth.
 *
 * handleGripTransitionFrame gains four narratable sub-paths on
 * grip_class_shift entries plus depth variants on depth_change:
 *
 *   favorite_grip — the gaining rikishi reached his configured
 *     preferredGrip (migi → right-hand inside, hidari → left-hand inside).
 *   makikae       — single-hand switch outside → inside.
 *   grip_denied   — one side secures an inside grip while the opponent
 *     remains at "none"/"outside".
 *   deep_grip / shallow_grip — depth_change variants keyed on the
 *     destination depth.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import type { BashoName, BoutLogEntry } from "@/engine/types/basho";
import type { GripClass } from "@/engine/types/combat-spatial";

function gripShift(overrides: {
  eastFrom?: GripClass;
  eastTo?: GripClass;
  westFrom?: GripClass;
  westTo?: GripClass;
  eastRightInside?: boolean;
  eastLeftInside?: boolean;
  westRightInside?: boolean;
  westLeftInside?: boolean;
}): BoutLogEntry {
  return {
    phase: "grip_transition",
    clock: 1,
    data: {
      type: "grip_class_shift",
      eastGripFrom: overrides.eastFrom ?? "none",
      eastGripTo: overrides.eastTo ?? "none",
      westGripFrom: overrides.westFrom ?? "none",
      westGripTo: overrides.westTo ?? "none",
      eastRightInside: overrides.eastRightInside ?? false,
      eastLeftInside: overrides.eastLeftInside ?? false,
      westRightInside: overrides.westRightInside ?? false,
      westLeftInside: overrides.westLeftInside ?? false,
    },
  } as BoutLogEntry;
}

function narrate(log: BoutLogEntry[], east = mockRikishi("r-e"), west = mockRikishi("r-w")) {
  const world = makeBoutWorld(east, west);
  const result = makeBoutResult({ log });
  generateBoutNarrative(result, east, west, "hatsu" as BashoName, 5, "seed-grip", world);
  return result.pbpLines ?? [];
}

beforeEach(() => BardEngine.resetCache());

describe("favorite_grip", () => {
  it("fires when a migi-preference rikishi secures right-inside", () => {
    const east = mockRikishi("r-e", {
      combatProfile: {
        ...mockRikishi("tmp").combatProfile!,
        preferredGrip: "migi",
      },
    });
    const lines = narrate(
      [gripShift({ eastTo: "shitate", eastRightInside: true })],
      east,
      mockRikishi("r-w")
    );
    expect(lines.some((l) => l.tags?.includes("favorite_grip"))).toBe(true);
  });

  it("does not fire when the inside hand mismatches the preference", () => {
    const east = mockRikishi("r-e", {
      combatProfile: {
        ...mockRikishi("tmp").combatProfile!,
        preferredGrip: "hidari", // wants LEFT inside; transition gives RIGHT inside
      },
    });
    const lines = narrate(
      [gripShift({ eastTo: "shitate", eastRightInside: true, eastLeftInside: false })],
      east,
      mockRikishi("r-w")
    );
    expect(lines.some((l) => l.tags?.includes("favorite_grip"))).toBe(false);
  });
});

describe("makikae", () => {
  it("fires on outside→inside single-hand switch", () => {
    const lines = narrate([
      gripShift({ eastFrom: "uwate", eastTo: "shitate", eastRightInside: true }),
    ]);
    expect(lines.some((l) => l.tags?.includes("makikae"))).toBe(true);
  });
});

describe("grip_denied", () => {
  it("fires when one side gains inside while the other holds nothing", () => {
    const lines = narrate([
      gripShift({ eastTo: "shitate", eastRightInside: true, westTo: "none" }),
    ]);
    expect(lines.some((l) => l.tags?.includes("grip_denied"))).toBe(true);
  });
});

describe("depth_change variants", () => {
  const depthEntry = (to: "shallow" | "deep" | "maemitsu" | "standard"): BoutLogEntry =>
    ({
      phase: "grip_transition",
      clock: 1,
      data: {
        type: "depth_change",
        eastDepthFrom: "standard",
        eastDepthTo: to,
        westDepthFrom: "standard",
        westDepthTo: "standard",
      },
    }) as BoutLogEntry;

  it("deep destination → deep_grip line", () => {
    // depth_change is chance-gated — run enough seeds to observe the variant
    let saw = false;
    for (let i = 0; i < 30 && !saw; i++) {
      const world = makeBoutWorld(mockRikishi("r-e"), mockRikishi("r-w"));
      const result = makeBoutResult({ log: [depthEntry("deep")] });
      generateBoutNarrative(
        result,
        world.rikishi.get("r-e")!,
        world.rikishi.get("r-w")!,
        "hatsu" as BashoName,
        5,
        `seed-depth-${i}`,
        world
      );
      saw = (result.pbpLines ?? []).some((l) => l.tags?.includes("deep_grip"));
    }
    expect(saw).toBe(true);
  });

  it("shallow destination → shallow_grip line", () => {
    let saw = false;
    for (let i = 0; i < 30 && !saw; i++) {
      const world = makeBoutWorld(mockRikishi("r-e"), mockRikishi("r-w"));
      const result = makeBoutResult({ log: [depthEntry("shallow")] });
      generateBoutNarrative(
        result,
        world.rikishi.get("r-e")!,
        world.rikishi.get("r-w")!,
        "hatsu" as BashoName,
        5,
        `seed-shallow-${i}`,
        world
      );
      saw = (result.pbpLines ?? []).some((l) => l.tags?.includes("shallow_grip"));
    }
    expect(saw).toBe(true);
  });
});
