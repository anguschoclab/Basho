import { describe, it, expect } from "vitest";
import { 
  getActiveRikishi, 
  getEligibleOpponents, 
  getAvailableStables, 
  getStableFinances 
} from "../selectors";
import { WorldState } from "../types/world";
import { Rikishi } from "../types/rikishi";
import { Heya } from "../types/heya";

describe("Selectors", () => {
  const mockRikishi1 = { id: "r1", isRetired: false, heyaId: "h1", injured: false } as Rikishi;
  const mockRikishi2 = { id: "r2", isRetired: true, heyaId: "h1", injured: false } as Rikishi;
  const mockRikishi3 = { id: "r3", isRetired: false, heyaId: "h2", injured: true } as Rikishi;
  
  const mockHeya1 = { id: "h1", funds: 1000 } as Heya;
  const mockHeya2 = { id: "h2", funds: 2000 } as Heya;

  const createWorld = (dayIndexGlobal = 0): WorldState => ({
    dayIndexGlobal,
    rikishi: new Map([
      ["r1", mockRikishi1],
      ["r2", mockRikishi2],
      ["r3", mockRikishi3]
    ]),
    heyas: new Map([
      ["h1", mockHeya1],
      ["h2", mockHeya2]
    ])
  } as unknown as WorldState);

  it("getActiveRikishi should return non-retired rikishi", () => {
    const world = createWorld();
    const active = getActiveRikishi(world);
    expect(active).toHaveLength(2);
    expect(active.map(r => r.id)).toEqual(["r1", "r3"]);
  });

  it("getActiveRikishi should be memoized per tick", () => {
    const world = createWorld();
    const firstCall = getActiveRikishi(world);
    const secondCall = getActiveRikishi(world);
    expect(firstCall).toBe(secondCall); // Check reference equality

    // Change day index -> should recalculate
    world.dayIndexGlobal = 1;
    const thirdCall = getActiveRikishi(world);
    expect(thirdCall).not.toBe(firstCall);
  });

  it("getEligibleOpponents should return valid opponents", () => {
    const world = createWorld();
    const eligible = getEligibleOpponents(world, "r1");
    // r2 is retired, r3 is injured/same heya? No, r3 is in h2 but injured.
    // Result should be empty because r2 is retired and r3 is injured.
    expect(eligible).toHaveLength(0);

    // Make r3 healthy
    (world.rikishi.get("r3") as Rikishi).injured = false;
    world.dayIndexGlobal = 1; // Trigger cache invalidation
    const eligible2 = getEligibleOpponents(world, "r1");
    expect(eligible2).toHaveLength(1);
    expect(eligible2[0].id).toBe("r3");
  });

  it("getAvailableStables should return all stables", () => {
    const world = createWorld();
    const stables = getAvailableStables(world);
    expect(stables).toHaveLength(2);
  });

  it("getStableFinances should return heya funds", () => {
    const world = createWorld();
    expect(getStableFinances(world, "h1")).toBe(1000);
    expect(getStableFinances(world, "h2")).toBe(2000);
    expect(getStableFinances(world, "h3")).toBe(0);
  });
});
