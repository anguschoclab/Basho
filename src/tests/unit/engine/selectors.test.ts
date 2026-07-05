import { describe, it, expect } from "vitest";
import { getActiveRikishi, getEligibleOpponents, getAvailableStables, getStableFinances, selectRetiredRikishi, selectHeyasWithCriticalWelfare, selectMergerCandidates } from "@/engine/selectors";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

describe("selectors", () => {
  it("getActiveRikishi should return only active rikishi and memoize", () => {
    const r1 = MockFactory.createRikishi({ id: "r1", isRetired: false });
    const r2 = MockFactory.createRikishi({ id: "r2", isRetired: true });
    const world = MockFactory.createWorld();
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);
    world.activeRikishiIds = new Set(["r1"]);

    const active1 = getActiveRikishi(world);
    expect(active1).toEqual([r1]);

    // should hit cache
    const active2 = getActiveRikishi(world);
    expect(active1).toBe(active2);

    // cache invalidated on new tick
    world.dayIndexGlobal = 1;
    const active3 = getActiveRikishi(world);
    expect(active1).not.toBe(active3);
  });

  it("getEligibleOpponents should filter injured, self, and same heya", () => {
    const r1 = MockFactory.createRikishi({ id: "r1", heyaId: "h1", injured: false });
    const r2 = MockFactory.createRikishi({ id: "r2", heyaId: "h2", injured: false });
    const r3 = MockFactory.createRikishi({ id: "r3", heyaId: "h1", injured: false }); // same heya
    const r4 = MockFactory.createRikishi({ id: "r4", heyaId: "h3", injured: true });  // injured
    const world = MockFactory.createWorld();
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);
    world.rikishi.set("r3", r3);
    world.rikishi.set("r4", r4);
    world.activeRikishiIds = new Set(["r1", "r2", "r3", "r4"]);

    const opponents = getEligibleOpponents(world, "r1");
    expect(opponents).toEqual([r2]);
  });

  it("getAvailableStables should return all stables and memoize", () => {
    const h1 = MockFactory.createHeya("h1");
    const h2 = MockFactory.createHeya("h2");
    const world = MockFactory.createWorld();
    world.heyas.set("h1", h1);
    world.heyas.set("h2", h2);

    const stables1 = getAvailableStables(world);
    expect(stables1).toEqual([h1, h2]);

    // cache hit
    const stables2 = getAvailableStables(world);
    expect(stables1).toBe(stables2);

    // cache miss
    world.dayIndexGlobal = 1;
    const stables3 = getAvailableStables(world);
    expect(stables1).not.toBe(stables3);
  });

  it("getStableFinances should return funds or 0", () => {
    const h1 = MockFactory.createHeya("h1", { funds: 500 });
    const world = MockFactory.createWorld();
    world.heyas.set("h1", h1);

    expect(getStableFinances(world, "h1")).toBe(500);
    expect(getStableFinances(world, "h2")).toBe(0);
  });

  it("selectRetiredRikishi should return only retired rikishi", () => {
    const r1 = MockFactory.createRikishi({ id: "r1", isRetired: false });
    const r2 = MockFactory.createRikishi({ id: "r2", isRetired: true });
    const world = MockFactory.createWorld();
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);
    // activeRikishiIds shouldn't matter for this one as it iterates over values
    expect(selectRetiredRikishi(world)).toEqual([r2]);
  });

  it("selectHeyasWithCriticalWelfare should identify heyas by risk or compliance state", () => {
    const h1 = MockFactory.createHeya("h1");
    h1.welfareState = { welfareRisk: 10, complianceState: "compliant", stressPoints: 0, flags: [] };

    const h2 = MockFactory.createHeya("h2");
    h2.welfareState = { welfareRisk: 55, complianceState: "compliant", stressPoints: 0, flags: [] };

    const h3 = MockFactory.createHeya("h3");
    h3.welfareState = { welfareRisk: 10, complianceState: "investigation", stressPoints: 0, flags: [] };

    const world = MockFactory.createWorld();
    world.heyas.set("h1", h1);
    world.heyas.set("h2", h2);
    world.heyas.set("h3", h3);

    expect(selectHeyasWithCriticalWelfare(world)).toEqual([h2, h3]);
  });

  it("selectMergerCandidates should return heyas in debt with 3 or fewer rikishi", () => {
    const h1 = MockFactory.createHeya("h1", { funds: -10, rikishiIds: ["r1", "r2", "r3"] });
    const h2 = MockFactory.createHeya("h2", { funds: 10, rikishiIds: ["r1", "r2"] });
    const h3 = MockFactory.createHeya("h3", { funds: -10, rikishiIds: ["r1", "r2", "r3", "r4"] });

    const world = MockFactory.createWorld();
    world.heyas.set("h1", h1);
    world.heyas.set("h2", h2);
    world.heyas.set("h3", h3);

    expect(selectMergerCandidates(world)).toEqual([h1]);
  });
});
