import { describe, it, expect, beforeEach } from "vitest";
import {
  addBookmark,
  removeBookmark,
  updateBookmarkNote,
  isBookmarked,
  getBookmarksByType,
  getAllBookmarks,
} from "@/engine/systems/bookmark/BookmarkService";
import { makeMockWorld } from "../../utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";

describe("BookmarkService", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld();
  });

  describe("addBookmark", () => {
    it("should add a bookmark to an entity", () => {
      const impact = addBookmark(world, "rikishi", "r1", "Great prospect");
      const newWorld = resolveImpacts(world, [impact]);
      expect(isBookmarked(newWorld, "rikishi", "r1")).toBe(true);
      const bookmarks = getAllBookmarks(newWorld);
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].entityType).toBe("rikishi");
      expect(bookmarks[0].entityId).toBe("r1");
      expect(bookmarks[0].note).toBe("Great prospect");
      expect(bookmarks[0].createdAt).toBe(world.dayIndexGlobal);
    });

    it("should be idempotent when adding the same bookmark twice", () => {
      const impact1 = addBookmark(world, "rikishi", "r1");
      let newWorld = resolveImpacts(world, [impact1]);
      const impact2 = addBookmark(newWorld, "rikishi", "r1");
      newWorld = resolveImpacts(newWorld, [impact2]);
      expect(getAllBookmarks(newWorld)).toHaveLength(1);
    });

    it("should update note on duplicate bookmark if note differs", () => {
      const impact1 = addBookmark(world, "rikishi", "r1", "First note");
      let newWorld = resolveImpacts(world, [impact1]);
      const impact2 = addBookmark(newWorld, "rikishi", "r1", "Updated note");
      newWorld = resolveImpacts(newWorld, [impact2]);
      const bookmarks = getAllBookmarks(newWorld);
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].note).toBe("Updated note");
    });

    it("should allow bookmarking different entity types with same id", () => {
      const impact1 = addBookmark(world, "rikishi", "r1");
      let newWorld = resolveImpacts(world, [impact1]);
      const impact2 = addBookmark(newWorld, "heya", "r1");
      newWorld = resolveImpacts(newWorld, [impact2]);
      expect(getAllBookmarks(newWorld)).toHaveLength(2);
    });
  });

  describe("removeBookmark", () => {
    it("should remove an existing bookmark", () => {
      const impact1 = addBookmark(world, "rikishi", "r1");
      let newWorld = resolveImpacts(world, [impact1]);
      expect(isBookmarked(newWorld, "rikishi", "r1")).toBe(true);
      const impact2 = removeBookmark(newWorld, "rikishi", "r1");
      newWorld = resolveImpacts(newWorld, [impact2]);
      expect(isBookmarked(newWorld, "rikishi", "r1")).toBe(false);
      expect(getAllBookmarks(newWorld)).toHaveLength(0);
    });

    it("should be a no-op when removing a non-existent bookmark", () => {
      const impact = removeBookmark(world, "rikishi", "nonexistent");
      const newWorld = resolveImpacts(world, [impact]);
      expect(getAllBookmarks(newWorld)).toHaveLength(0);
    });
  });

  describe("updateBookmarkNote", () => {
    it("should update the note on an existing bookmark", () => {
      const impact1 = addBookmark(world, "rikishi", "r1", "Old note");
      let newWorld = resolveImpacts(world, [impact1]);
      const impact2 = updateBookmarkNote(newWorld, "rikishi", "r1", "New note");
      newWorld = resolveImpacts(newWorld, [impact2]);
      const bookmarks = getAllBookmarks(newWorld);
      expect(bookmarks[0].note).toBe("New note");
    });

    it("should be a no-op when updating a non-existent bookmark", () => {
      const impact = updateBookmarkNote(world, "rikishi", "nonexistent", "Note");
      const newWorld = resolveImpacts(world, [impact]);
      expect(getAllBookmarks(newWorld)).toHaveLength(0);
    });
  });

  describe("isBookmarked", () => {
    it("should return false when no bookmarks exist", () => {
      expect(isBookmarked(world, "rikishi", "r1")).toBe(false);
    });

    it("should return true when entity is bookmarked", () => {
      const impact = addBookmark(world, "rikishi", "r1");
      const newWorld = resolveImpacts(world, [impact]);
      expect(isBookmarked(newWorld, "rikishi", "r1")).toBe(true);
    });

    it("should distinguish between entity types with same id", () => {
      const impact = addBookmark(world, "rikishi", "r1");
      const newWorld = resolveImpacts(world, [impact]);
      expect(isBookmarked(newWorld, "rikishi", "r1")).toBe(true);
      expect(isBookmarked(newWorld, "heya", "r1")).toBe(false);
    });
  });

  describe("getBookmarksByType", () => {
    it("should filter bookmarks by entity type", () => {
      const impact1 = addBookmark(world, "rikishi", "r1");
      let newWorld = resolveImpacts(world, [impact1]);
      const impact2 = addBookmark(newWorld, "heya", "h1");
      newWorld = resolveImpacts(newWorld, [impact2]);
      const impact3 = addBookmark(newWorld, "rikishi", "r2");
      newWorld = resolveImpacts(newWorld, [impact3]);

      const rikishiBookmarks = getBookmarksByType(newWorld, "rikishi");
      expect(rikishiBookmarks).toHaveLength(2);
      expect(rikishiBookmarks.map((b) => b.entityId)).toContain("r1");
      expect(rikishiBookmarks.map((b) => b.entityId)).toContain("r2");

      const heyaBookmarks = getBookmarksByType(newWorld, "heya");
      expect(heyaBookmarks).toHaveLength(1);
      expect(heyaBookmarks[0].entityId).toBe("h1");
    });

    it("should return empty array when no bookmarks of type exist", () => {
      expect(getBookmarksByType(world, "rikishi")).toHaveLength(0);
    });
  });

  describe("getAllBookmarks", () => {
    it("should return all bookmarks", () => {
      const impact1 = addBookmark(world, "rikishi", "r1");
      let newWorld = resolveImpacts(world, [impact1]);
      const impact2 = addBookmark(newWorld, "heya", "h1");
      newWorld = resolveImpacts(newWorld, [impact2]);
      expect(getAllBookmarks(newWorld)).toHaveLength(2);
    });

    it("should return empty array when no bookmarks exist", () => {
      expect(getAllBookmarks(world)).toHaveLength(0);
    });
  });
});
