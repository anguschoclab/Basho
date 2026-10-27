import { describe, it, expect } from "vitest";
import { getAllBookmarks, getBookmarksByType } from "@/presenters/worldAccess";
import type { WorldState } from "@/engine/types/world";

function worldWithBookmarks(bookmarks: any[]): WorldState {
  return { playerKnowledge: { scouting: {}, bookmarks } } as WorldState;
}

describe("worldAccess bookmark accessors", () => {
  it("getAllBookmarks returns every bookmark entry", () => {
    const world = worldWithBookmarks([
      { entityType: "rikishi", entityId: "r1" },
      { entityType: "heya", entityId: "h1" },
      { entityType: "rikishi", entityId: "r2" },
    ]);
    expect(getAllBookmarks(world)).toHaveLength(3);
  });

  it("getBookmarksByType filters to a single entityType", () => {
    const world = worldWithBookmarks([
      { entityType: "rikishi", entityId: "r1" },
      { entityType: "heya", entityId: "h1" },
      { entityType: "rikishi", entityId: "r2" },
    ]);
    const rikishi = getBookmarksByType(world, "rikishi");
    expect(rikishi.map((b) => b.entityId)).toEqual(["r1", "r2"]);
  });

  it("returns empty arrays when playerKnowledge is absent", () => {
    const world = {} as WorldState;
    expect(getAllBookmarks(world)).toEqual([]);
    expect(getBookmarksByType(world, "rikishi")).toEqual([]);
  });
});
