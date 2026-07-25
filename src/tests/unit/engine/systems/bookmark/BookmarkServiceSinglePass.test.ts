import { describe, it, expect, beforeEach } from "vitest";
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
  getBookmarksByType,
  getAllBookmarks,
} from "@/engine/systems/bookmark/BookmarkService";
import { makeMockWorld } from "../../utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";

describe("BookmarkService — single-pass add behavior", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld();
  });

  it("add with existing entry updates note in-place", () => {
    const impact1 = addBookmark(world, "rikishi", "r1", "First note");
    let newWorld = resolveImpacts(world, [impact1]);

    const impact2 = addBookmark(newWorld, "rikishi", "r1", "Updated note");
    newWorld = resolveImpacts(newWorld, [impact2]);

    const bookmarks = getAllBookmarks(newWorld);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].note).toBe("Updated note");
  });

  it("add with new entry appends to bookmark list", () => {
    const impact1 = addBookmark(world, "rikishi", "r1");
    let newWorld = resolveImpacts(world, [impact1]);

    const impact2 = addBookmark(newWorld, "rikishi", "r2");
    newWorld = resolveImpacts(newWorld, [impact2]);

    const bookmarks = getAllBookmarks(newWorld);
    expect(bookmarks).toHaveLength(2);
    expect(bookmarks[0].entityId).toBe("r1");
    expect(bookmarks[1].entityId).toBe("r2");
  });

  it("add with same note is idempotent", () => {
    const impact1 = addBookmark(world, "rikishi", "r1", "Same note");
    let newWorld = resolveImpacts(world, [impact1]);

    const impact2 = addBookmark(newWorld, "rikishi", "r1", "Same note");
    newWorld = resolveImpacts(newWorld, [impact2]);

    const bookmarks = getAllBookmarks(newWorld);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].note).toBe("Same note");
  });

  it("add without note on existing entry preserves original note", () => {
    const impact1 = addBookmark(world, "rikishi", "r1", "Original note");
    let newWorld = resolveImpacts(world, [impact1]);

    const impact2 = addBookmark(newWorld, "rikishi", "r1");
    newWorld = resolveImpacts(newWorld, [impact2]);

    const bookmarks = getAllBookmarks(newWorld);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].note).toBe("Original note");
  });

  it("add with different note on existing entry updates note", () => {
    const impact1 = addBookmark(world, "rikishi", "r1", "First");
    let newWorld = resolveImpacts(world, [impact1]);

    const impact2 = addBookmark(newWorld, "rikishi", "r1", "Second");
    newWorld = resolveImpacts(newWorld, [impact2]);

    const impact3 = addBookmark(newWorld, "rikishi", "r1", "Third");
    newWorld = resolveImpacts(newWorld, [impact3]);

    const bookmarks = getAllBookmarks(newWorld);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].note).toBe("Third");
  });

  it("multiple distinct bookmarks can be added and removed", () => {
    let newWorld = resolveImpacts(world, [addBookmark(world, "rikishi", "r1")]);
    newWorld = resolveImpacts(newWorld, [addBookmark(newWorld, "rikishi", "r2")]);
    newWorld = resolveImpacts(newWorld, [addBookmark(newWorld, "heya", "h1")]);

    expect(getAllBookmarks(newWorld)).toHaveLength(3);

    newWorld = resolveImpacts(newWorld, [removeBookmark(newWorld, "rikishi", "r1")]);
    expect(getAllBookmarks(newWorld)).toHaveLength(2);
    expect(isBookmarked(newWorld, "rikishi", "r1")).toBe(false);
    expect(isBookmarked(newWorld, "rikishi", "r2")).toBe(true);
    expect(isBookmarked(newWorld, "heya", "h1")).toBe(true);
  });

  it("getBookmarksByType filters correctly", () => {
    let newWorld = resolveImpacts(world, [addBookmark(world, "rikishi", "r1")]);
    newWorld = resolveImpacts(newWorld, [addBookmark(newWorld, "rikishi", "r2")]);
    newWorld = resolveImpacts(newWorld, [addBookmark(newWorld, "heya", "h1")]);

    const rikishiBookmarks = getBookmarksByType(newWorld, "rikishi");
    const heyaBookmarks = getBookmarksByType(newWorld, "heya");

    expect(rikishiBookmarks).toHaveLength(2);
    expect(heyaBookmarks).toHaveLength(1);
  });
});
