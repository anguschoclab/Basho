import { describe, it, expect } from "vitest";
import { mockRikishi } from "./utils";
import {
  getRikishi,
  getHeya,
  getOyakataForHeya,
  getHeyaRosterIds,
  getHeyaRoster,
  getForeignCountInHeya,
  getSekitoriInHeya,
  getHeyaStyleBias,
  getAllHeyas,
  getNPCHeyas,
  getActiveRikishi,
  getRikishiByDivision,
} from "../queries";
import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Oyakata } from "../types/oyakata";

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    id: "test",
    seed: "test-seed",
    year: 2025,
    week: 10,
    dayIndexGlobal: 70,
    cyclePhase: "interim",
    heyas: new Map(),
    rikishi: new Map(),
    oyakata: new Map(),
    staff: new Map(),
    history: [],
    events: { log: [], lastEventId: 0 },
    ftue: { isActive: false, bashoCompleted: 0, suppressedEvents: [] },
    calendar: { year: 2025, month: 3, currentWeek: 10, currentDay: 1 },
    ...overrides,
  } as unknown as WorldState;
}

function makeHeya(id: string, overrides: Partial<Heya> = {}): Heya {
  return {
    id,
    name: `Stable ${id}`,
    oyakataId: `oyakata-${id}`,
    rikishiIds: [],
    statureBand: "established",
    prestigeBand: "respected",
    facilitiesBand: "decent",
    koenkaiBand: "modest",
    runwayBand: "comfortable",
    reputation: 50,
    funds: 100_000_000,
    scandalScore: 0,
    governanceStatus: "good_standing",
    facilities: { training: 50, recovery: 50, nutrition: 50 },
    riskIndicators: { financial: false, governance: false, rivalry: false },
    ...overrides,
  } as Heya;
}

function makeOyakata(id: string): Oyakata {
  return {
    id,
    name: `Master ${id}`,
    archetype: "traditionalist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
  } as Oyakata;
}

// ─── Tests ──────────────────────────────────────────────

describe("queries — single entity lookups", () => {
  it("getRikishi returns a rikishi by ID", () => {
    const r = mockRikishi("r1");
    const world = makeWorld();
    world.rikishi.set("r1", r);

    expect(getRikishi(world, "r1")).toBe(r);
    expect(getRikishi(world, "nope")).toBeUndefined();
  });

  it("getHeya returns a heya by ID", () => {
    const h = makeHeya("h1");
    const world = makeWorld();
    world.heyas.set("h1", h);

    expect(getHeya(world, "h1")).toBe(h);
    expect(getHeya(world, "nope")).toBeUndefined();
  });

  it("getOyakataForHeya resolves through heya → oyakataId", () => {
    const h = makeHeya("h1", { oyakataId: "o1" });
    const o = makeOyakata("o1");
    const world = makeWorld();
    world.heyas.set("h1", h);
    world.oyakata.set("o1", o);

    expect(getOyakataForHeya(world, "h1")).toBe(o);
    expect(getOyakataForHeya(world, "unknown")).toBeUndefined();
  });
});

describe("queries — roster queries", () => {
  it("getHeyaRosterIds returns IDs or empty array", () => {
    const h = makeHeya("h1", { rikishiIds: ["r1", "r2"] });
    const world = makeWorld();
    world.heyas.set("h1", h);

    expect(getHeyaRosterIds(world, "h1")).toEqual(["r1", "r2"]);
    expect(getHeyaRosterIds(world, "unknown")).toEqual([]);
  });

  it("getHeyaRoster resolves rikishi, skipping dangling refs", () => {
    const r1 = mockRikishi("r1");
    const r2 = mockRikishi("r2");
    const h = makeHeya("h1", { rikishiIds: ["r1", "r2", "r3_dangling"] });
    const world = makeWorld();
    world.heyas.set("h1", h);
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);

    const roster = getHeyaRoster(world, "h1");
    expect(roster).toHaveLength(2);
    expect(roster[0].id).toBe("r1");
    expect(roster[1].id).toBe("r2");
  });

  it("getForeignCountInHeya counts non-Japanese rikishi", () => {
    const world = makeWorld();
    world.rikishi.set("r1", mockRikishi("r1", { heyaId: "h1", nationality: "Japan" }));
    world.rikishi.set("r2", mockRikishi("r2", { heyaId: "h1", nationality: "Mongolia" }));
    world.rikishi.set("r3", mockRikishi("r3", { heyaId: "h1", nationality: "Georgia" }));
    world.rikishi.set("r4", mockRikishi("r4", { heyaId: "h2", nationality: "Mongolia" }));

    expect(getForeignCountInHeya(world, "h1")).toBe(2);
    expect(getForeignCountInHeya(world, "h2")).toBe(1);
    expect(getForeignCountInHeya(world, "h3")).toBe(0);
  });

  it("getSekitoriInHeya counts makuuchi + juryo", () => {
    const h = makeHeya("h1", { rikishiIds: ["r1", "r2", "r3", "r4"] });
    const world = makeWorld();
    world.heyas.set("h1", h);
    world.rikishi.set("r1", mockRikishi("r1", { division: "makuuchi" }));
    world.rikishi.set("r2", mockRikishi("r2", { division: "juryo" }));
    world.rikishi.set("r3", mockRikishi("r3", { division: "makushita" }));
    world.rikishi.set("r4", mockRikishi("r4", { division: "sandanme" }));

    expect(getSekitoriInHeya(world, "h1")).toBe(2);
    expect(getSekitoriInHeya(world, "unknown")).toBe(0);
  });

  it("getHeyaStyleBias counts oshi vs yotsu", () => {
    const h = makeHeya("h1", { rikishiIds: ["r1", "r2", "r3"] });
    const world = makeWorld();
    world.heyas.set("h1", h);
    world.rikishi.set("r1", mockRikishi("r1", { style: "oshi" }));
    world.rikishi.set("r2", mockRikishi("r2", { style: "oshi" }));
    world.rikishi.set("r3", mockRikishi("r3", { style: "yotsu" }));

    expect(getHeyaStyleBias(world, "h1")).toBe("oshi");

    // Even split → neutral
    world.rikishi.set("r4", mockRikishi("r4", { style: "yotsu" }));
    h.rikishiIds.push("r4");
    expect(getHeyaStyleBias(world, "h1")).toBe("neutral");

    // Unknown heya → neutral
    expect(getHeyaStyleBias(world, "unknown")).toBe("neutral");
  });
});

describe("queries — cross-heya queries", () => {
  it("getAllHeyas returns all heyas as array", () => {
    const world = makeWorld();
    world.heyas.set("h1", makeHeya("h1"));
    world.heyas.set("h2", makeHeya("h2"));

    expect(getAllHeyas(world)).toHaveLength(2);
  });

  it("getNPCHeyas excludes player heya", () => {
    const world = makeWorld({ playerHeyaId: "h1" });
    world.heyas.set("h1", makeHeya("h1"));
    world.heyas.set("h2", makeHeya("h2"));
    world.heyas.set("h3", makeHeya("h3"));

    const npc = getNPCHeyas(world);
    expect(npc).toHaveLength(2);
    expect(npc.map(h => h.id)).toEqual(["h2", "h3"]);
  });

  it("getNPCHeyas returns all if no player heya", () => {
    const world = makeWorld();
    world.heyas.set("h1", makeHeya("h1"));
    world.heyas.set("h2", makeHeya("h2"));

    expect(getNPCHeyas(world)).toHaveLength(2);
  });
});

describe("queries — rikishi collection queries", () => {
  it("getActiveRikishi returns all rikishi", () => {
    const world = makeWorld();
    world.rikishi.set("r1", mockRikishi("r1"));
    world.rikishi.set("r2", mockRikishi("r2"));

    expect(getActiveRikishi(world)).toHaveLength(2);
  });

  it("getRikishiByDivision filters correctly", () => {
    const world = makeWorld();
    world.rikishi.set("r1", mockRikishi("r1", { division: "makuuchi" }));
    world.rikishi.set("r2", mockRikishi("r2", { division: "juryo" }));
    world.rikishi.set("r3", mockRikishi("r3", { division: "makuuchi" }));
    world.rikishi.set("r4", mockRikishi("r4", { division: "makushita" }));

    const makuuchi = getRikishiByDivision(world, "makuuchi");
    expect(makuuchi).toHaveLength(2);
    expect(makuuchi.map(r => r.id).sort()).toEqual(["r1", "r3"]);

    expect(getRikishiByDivision(world, "jonokuchi")).toHaveLength(0);
  });
});
