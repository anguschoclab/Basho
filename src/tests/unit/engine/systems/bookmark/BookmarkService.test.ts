import { describe, it, expect } from "vitest";
import { addBookmark, removeBookmark } from "@/engine/systems/bookmark/BookmarkService";
import type { WorldState } from "@/engine/types/world";

function makeWorld(): WorldState {
  return {
    id: "test-world",
    seed: "test-seed",
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    cyclePhase: "interim",
    heyas: new Map(),
    rikishi: new Map(),
    historicalRikishi: new Map(),
    activeRikishiIds: new Set(),
    oyakata: new Map(),
    staff: new Map(),
    history: [],
    globalKimariteStats: {},
    meta: { tone: "classic", drift: {} },
    events: { log: [], counter: 0 },
    records: {} as WorldState["records"],
    settings: { archiveMode: "standard" },
  } as unknown as WorldState;
}

function getBookmarksFromImpact(impact: { worldFields?: any }): any[] {
  return impact.worldFields?.playerKnowledge?.bookmarks ?? [];
}

describe("BookmarkService determinism", () => {
  it("addBookmark uses deterministic timestamp (world.dayIndexGlobal, not Date.now)", () => {
    const world = makeWorld();
    world.dayIndexGlobal = 42;
    const impact = addBookmark(world, "rikishi", "r1");
    const bk = getBookmarksFromImpact(impact);
    expect(bk).toHaveLength(1);
    expect(bk[0].createdAt).toBe(42);
    expect(bk[0].createdAt).not.toBe(Date.now());
  });

  it("addBookmark is idempotent for same entity", () => {
    const world = makeWorld();
    const impact1 = addBookmark(world, "rikishi", "r1", "first note");
    const world2: WorldState = {
      ...world,
      playerKnowledge: {
        bookmarks: getBookmarksFromImpact(impact1) as never,
      },
    };
    const impact2 = addBookmark(world2, "rikishi", "r1", "first note");
    const bookmarks = getBookmarksFromImpact(impact2);
    expect(bookmarks).toHaveLength(1);
  });

  it("addBookmark updates note when different", () => {
    const world = makeWorld();
    const impact1 = addBookmark(world, "rikishi", "r1", "note1");
    const world2: WorldState = {
      ...world,
      playerKnowledge: {
        bookmarks: getBookmarksFromImpact(impact1) as never,
      },
    };
    const impact2 = addBookmark(world2, "rikishi", "r1", "note2");
    const bookmarks = getBookmarksFromImpact(impact2);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].note).toBe("note2");
  });

  it("removeBookmark removes the correct entry", () => {
    const world = makeWorld();
    const impact1 = addBookmark(world, "rikishi", "r1");
    const impact2 = addBookmark(world, "rikishi", "r2");
    const world2: WorldState = {
      ...world,
      playerKnowledge: {
        bookmarks: [
          ...getBookmarksFromImpact(impact1),
          ...getBookmarksFromImpact(impact2),
        ] as never,
      },
    };
    const impact3 = removeBookmark(world2, "rikishi", "r1");
    const bookmarks = getBookmarksFromImpact(impact3);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].entityId).toBe("r2");
  });
});
