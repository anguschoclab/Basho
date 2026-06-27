import { describe, it, expect } from "vitest";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts, mergeImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya } from "./utils";

describe("addHeya impact op", () => {
  it("adds a new heya to the world via resolveImpacts", () => {
    const world = makeMockWorld({
      heyas: new Map([
        ["heya-1", makeMockHeya("heya-1")],
        ["heya-2", makeMockHeya("heya-2")],
      ]),
    });

    const newHeya = makeMockHeya("heya-new");
    const impact = createImpactBuilder("t").addHeya(newHeya).build();

    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.heyas.size).toBe(3);
    expect(resolved.heyas.get("heya-new")).toBeDefined();
  });

  it("merges two impacts each founding one heya — both appear", () => {
    const world = makeMockWorld({
      heyas: new Map([["heya-1", makeMockHeya("heya-1")]]),
    });

    const impactA = createImpactBuilder("a").addHeya(makeMockHeya("heya-a")).build();
    const impactB = createImpactBuilder("b").addHeya(makeMockHeya("heya-b")).build();

    const merged = mergeImpacts([impactA, impactB]);
    const resolved = resolveImpacts(world, [merged]);
    expect(resolved.heyas.size).toBe(3);
    expect(resolved.heyas.get("heya-a")).toBeDefined();
    expect(resolved.heyas.get("heya-b")).toBeDefined();
  });
});
