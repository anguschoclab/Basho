import { describe, it, expect } from "vitest";
import {
  selectKadobanRikishi,
  selectPromotionCandidates,
  selectYokozunaCandidates,
  selectRecentEvents,
} from "../selectors";
import type { WorldState } from "../../engine/types/world";
import type { Rikishi } from "../../engine/types/rikishi";
import { mockRikishi } from "../engine/utils";

describe("selectKadobanRikishi", () => {
  it("should return an empty array if world.ozekiKadoban is undefined", () => {
    const world = {
      ozekiKadoban: undefined,
      rikishi: new Map(),
    } as unknown as WorldState;

    const result = selectKadobanRikishi(world);
    expect(result).toEqual([]);
  });

  it("should return an empty array if world.ozekiKadoban is empty", () => {
    const world = {
      ozekiKadoban: {},
      rikishi: new Map(),
    } as unknown as WorldState;

    const result = selectKadobanRikishi(world);
    expect(result).toEqual([]);
  });

  it("should return Rikishi objects for each ID in ozekiKadoban", () => {
    const r1 = mockRikishi("r1", { rank: "ozeki" });
    const r2 = mockRikishi("r2", { rank: "ozeki" });
    const r3 = mockRikishi("r3", { rank: "ozeki" });

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r1", r1);
    rikishiMap.set("r2", r2);
    rikishiMap.set("r3", r3);

    const world = {
      ozekiKadoban: {
        r1: true,
        r3: true,
      },
      rikishi: rikishiMap,
    } as unknown as WorldState;

    const result = selectKadobanRikishi(world);
    expect(result).toHaveLength(2);
    expect(result).toContain(r1);
    expect(result).toContain(r3);
    expect(result).not.toContain(r2);
  });

  it("should skip IDs in ozekiKadoban that do not exist in world.rikishi", () => {
    const r1 = mockRikishi("r1", { rank: "ozeki" });

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r1", r1);

    const world = {
      ozekiKadoban: {
        r1: true,
        missing_id: true,
      },
      rikishi: rikishiMap,
    } as unknown as WorldState;

    const result = selectKadobanRikishi(world);
    expect(result).toHaveLength(1);
    expect(result).toContain(r1);
  });

  it("should memoize the result if the world object is the same", () => {
    const r1 = mockRikishi("r1", { rank: "ozeki" });

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r1", r1);

    const world = {
      ozekiKadoban: {
        r1: true,
      },
      rikishi: rikishiMap,
    } as unknown as WorldState;

    const result1 = selectKadobanRikishi(world);
    const result2 = selectKadobanRikishi(world);

    // Check strict equality to ensure it's the exact same array reference
    expect(result1).toBe(result2);
  });
});

describe("selectPromotionCandidates", () => {
  it("should return an empty array if there are no rikishi", () => {
    const world = {
      rikishi: new Map(),
    } as unknown as WorldState;

    const result = selectPromotionCandidates(world);
    expect(result).toEqual([]);
  });

  it("should return only non-retired sekiwake and komusubi", () => {
    const r1 = mockRikishi("r1", { rank: "sekiwake", isRetired: false });
    const r2 = mockRikishi("r2", { rank: "komusubi", isRetired: false });
    const r3 = mockRikishi("r3", { rank: "ozeki", isRetired: false });
    const r4 = mockRikishi("r4", { rank: "sekiwake", isRetired: true });
    const r5 = mockRikishi("r5", { rank: "maegashira", isRetired: false });

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r1", r1);
    rikishiMap.set("r2", r2);
    rikishiMap.set("r3", r3);
    rikishiMap.set("r4", r4);
    rikishiMap.set("r5", r5);

    const world = {
      rikishi: rikishiMap,
    } as unknown as WorldState;

    const result = selectPromotionCandidates(world);
    expect(result).toEqual([r1, r2]);
  });

  it("should memoize the result if the world object is the same", () => {
    const r1 = mockRikishi("r1", { rank: "sekiwake", isRetired: false });

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r1", r1);

    const world = {
      rikishi: rikishiMap,
    } as unknown as WorldState;

    const result1 = selectPromotionCandidates(world);
    const result2 = selectPromotionCandidates(world);

    // Check strict equality to ensure it's the exact same array reference
    expect(result1).toBe(result2);
  });
});

describe("selectYokozunaCandidates", () => {
  it("should return an empty array if there are no rikishi", () => {
    const world = {
      rikishi: new Map(),
    } as unknown as WorldState;

    const result = selectYokozunaCandidates(world);
    expect(result).toEqual([]);
  });

  it("should return only non-retired ozeki", () => {
    const r1 = mockRikishi("r1", { rank: "ozeki", isRetired: false });
    const r2 = mockRikishi("r2", { rank: "yokozuna", isRetired: false });
    const r3 = mockRikishi("r3", { rank: "ozeki", isRetired: true });
    const r4 = mockRikishi("r4", { rank: "sekiwake", isRetired: false });

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r1", r1);
    rikishiMap.set("r2", r2);
    rikishiMap.set("r3", r3);
    rikishiMap.set("r4", r4);

    const world = {
      rikishi: rikishiMap,
    } as unknown as WorldState;

    const result = selectYokozunaCandidates(world);
    expect(result).toEqual([r1]);
  });

  it("should memoize the result if the world object is the same", () => {
    const r1 = mockRikishi("r1", { rank: "ozeki", isRetired: false });

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r1", r1);

    const world = {
      rikishi: rikishiMap,
    } as unknown as WorldState;

    const result1 = selectYokozunaCandidates(world);
    const result2 = selectYokozunaCandidates(world);

    // Check strict equality to ensure it's the exact same array reference
    expect(result1).toBe(result2);
  });
});

describe("selectRecentEvents", () => {
  it("should return empty buckets if there are no events", () => {
    const world = {
      events: { log: [], dedupe: {} },
      week: 10,
    } as unknown as WorldState;

    const result = selectRecentEvents(world);
    expect(result).toEqual({
      media: [],
      economy: [],
      scouting: [],
      training: [],
      career: [],
      rivalry: [],
      governance: [],
      welfare: [],
    });
  });

  it("should filter out events older than thisWeek - 1", () => {
    const world = {
      events: {
        log: [
          {
            id: "e1",
            category: "media",
            week: 8,
            type: "TEST",
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // too old
          {
            id: "e2",
            category: "media",
            week: 9,
            type: "TEST",
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // valid
          {
            id: "e3",
            category: "media",
            week: 10,
            type: "TEST",
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // valid
          {
            id: "e4",
            category: "media",
            week: 11,
            type: "TEST",
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // future
        ],
        dedupe: {},
        version: "1.0.0",
      },
      week: 10,
    } as unknown as WorldState;

    const result = selectRecentEvents(world);
    expect(result.media).toHaveLength(2);
    expect(result.media.map((e) => e.id)).toEqual(["e3", "e2"]); // queryEvents sorts newest first
  });

  it("should correctly categorize events based on category and type", () => {
    const world = {
      events: {
        log: [
          {
            id: "e1",
            category: "misc",
            type: "SCANDAL_MINOR",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // media via type
          {
            id: "e2",
            category: "economy",
            type: "TEST",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // economy via category
          {
            id: "e3",
            category: "sponsor",
            type: "TEST",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // economy via category sponsor
          {
            id: "e4",
            category: "scouting",
            type: "TEST",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // scouting via category
          {
            id: "e5",
            category: "training",
            type: "TEST",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // training via category
          {
            id: "e6",
            category: "career",
            type: "TEST",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // career via category
          {
            id: "e7",
            category: "rivalry",
            type: "TEST",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // rivalry via category
          {
            id: "e8",
            category: "misc",
            type: "GOVERNANCE_WARNING",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // governance via type GOVERNANCE
          {
            id: "e9",
            category: "discipline",
            type: "TEST",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // governance via category discipline
          {
            id: "e10",
            category: "welfare",
            type: "TEST",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // welfare via category
          {
            id: "e11",
            category: "misc",
            type: "COMPLIANCE_CHECK",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // welfare via type COMPLIANCE
          {
            id: "e12",
            category: "misc",
            type: "WELFARE_BONUS",
            week: 10,
            year: 2025,
            phase: "weekly",
            importance: "minor",
            scope: "world",
            title: "",
            summary: "",
            data: {},
            truthLevel: "public",
          }, // welfare via type WELFARE
        ],
        dedupe: {},
        version: "1.0.0",
      },
      week: 10,
    } as unknown as WorldState;

    const result = selectRecentEvents(world);
    expect(result.media.map((e) => e.id)).toEqual(["e1"]);
    expect(result.economy.map((e) => e.id)).toEqual(["e3", "e2"]);
    expect(result.scouting.map((e) => e.id)).toEqual(["e4"]);
    expect(result.training.map((e) => e.id)).toEqual(["e5"]);
    expect(result.career.map((e) => e.id)).toEqual(["e6"]);
    expect(result.rivalry.map((e) => e.id)).toEqual(["e7"]);
    expect(result.governance.map((e) => e.id)).toEqual(["e9", "e8"]);
    expect(result.welfare.map((e) => e.id)).toEqual(["e12", "e11", "e10"]);
  });

  it("should memoize the result if the world object is the same", () => {
    const world = {
      events: { log: [], dedupe: {} },
      week: 10,
    } as unknown as WorldState;

    const result1 = selectRecentEvents(world);
    const result2 = selectRecentEvents(world);

    expect(result1).toBe(result2);
  });
});
