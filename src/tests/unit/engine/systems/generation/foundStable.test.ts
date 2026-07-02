import { describe, it, expect } from "vitest";
import { foundStable } from "@/engine/systems/generation/WorldFactory";
import { rngForWorld } from "@/engine/rng";
import { makeMockWorld, makeMockHeya } from "../../utils";
import { FOUNDING_SEED_FUNDS } from "@/constants/engine/economic";

describe("foundStable", () => {
  it("creates a heya with deterministic HY-prefixed id, seed funds, new stature, empty roster", () => {
    const world = makeMockWorld({
      heyas: new Map([["heya-1", makeMockHeya("heya-1")]]),
      oyakata: new Map([["oy-1", { id: "oy-1", name: "TestOyakata", heyaId: "heya-1" } as any]]),
    });

    const rng = rngForWorld(world, "found", "t");
    const { heya } = foundStable(world, "oy-1", "Newyama", rng);

    expect(heya.id).toMatch(/^HY-/);
    expect(heya.funds).toBe(FOUNDING_SEED_FUNDS);
    expect(heya.statureBand).toBe("new");
    expect(heya.prestigeBand).toBe("modest");
    expect(heya.rikishiIds).toEqual([]);
    expect(heya.oyakataId).toBe("oy-1");
    expect(heya.name).toBe("Newyama");
  });

  it("is deterministic across two calls with the same seed", () => {
    const world = makeMockWorld({
      heyas: new Map([["heya-1", makeMockHeya("heya-1")]]),
      oyakata: new Map([["oy-1", { id: "oy-1", name: "TestOyakata", heyaId: "heya-1" } as any]]),
    });

    const rng1 = rngForWorld(world, "found", "t");
    const rng2 = rngForWorld(world, "found", "t");
    const a = foundStable(world, "oy-1", "Newyama", rng1);
    const b = foundStable(world, "oy-1", "Newyama", rng2);

    expect(a.heya.id).toBe(b.heya.id);
    expect(a.heya.name).toBe(b.heya.name);
  });
});
