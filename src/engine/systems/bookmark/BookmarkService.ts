/**
 * BookmarkService.ts
 *
 * Pure helpers for bookmarking entities in WorldState.
 * All functions return StateImpact for transactional updates.
 */

import type { WorldState, BookmarkEntry } from "@/engine/types/world";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";

function getBookmarks(world: WorldState): BookmarkEntry[] {
  return world.playerKnowledge?.bookmarks ?? [];
}

function makeKey(entityType: string, entityId: string): string {
  return `${entityType}#${entityId}`;
}

function buildUpdatedKnowledge(world: WorldState, bookmarks: BookmarkEntry[]): StateImpact {
  const builder = createImpactBuilder("BookmarkService");
  const currentKnowledge = world.playerKnowledge || {};
  builder.updateWorldField("playerKnowledge", {
    ...currentKnowledge,
    bookmarks,
  });
  return builder.build();
}

export function addBookmark(
  world: WorldState,
  entityType: string,
  entityId: string,
  note?: string
): StateImpact {
  const bookmarks = getBookmarks(world);
  const key = makeKey(entityType, entityId);

  let existingIndex = -1;
  for (let i = 0; i < bookmarks.length; i++) {
    if (makeKey(bookmarks[i].entityType, bookmarks[i].entityId) === key) {
      existingIndex = i;
      break;
    }
  }

  if (existingIndex >= 0) {
    const existing = bookmarks[existingIndex];
    // Idempotent: update note if provided and different
    if (note !== undefined && note !== existing.note) {
      const updated = [...bookmarks];
      updated[existingIndex] = { ...existing, note };
      return buildUpdatedKnowledge(world, updated);
    }
    return buildUpdatedKnowledge(world, bookmarks);
  }

  const entry: BookmarkEntry = {
    entityType,
    entityId,
    note,
    createdAt: world.dayIndexGlobal,
  };
  return buildUpdatedKnowledge(world, [...bookmarks, entry]);
}

export function removeBookmark(
  world: WorldState,
  entityType: string,
  entityId: string
): StateImpact {
  const bookmarks = getBookmarks(world);
  const key = makeKey(entityType, entityId);
  const filtered = bookmarks.filter((b) => makeKey(b.entityType, b.entityId) !== key);
  return buildUpdatedKnowledge(world, filtered);
}

export function updateBookmarkNote(
  world: WorldState,
  entityType: string,
  entityId: string,
  note: string
): StateImpact {
  const bookmarks = getBookmarks(world);
  const key = makeKey(entityType, entityId);
  const updated = bookmarks.map((b) =>
    makeKey(b.entityType, b.entityId) === key ? { ...b, note } : b
  );
  return buildUpdatedKnowledge(world, updated);
}

export function isBookmarked(world: WorldState, entityType: string, entityId: string): boolean {
  const bookmarks = getBookmarks(world);
  const key = makeKey(entityType, entityId);
  return bookmarks.some((b) => makeKey(b.entityType, b.entityId) === key);
}

export function getBookmarksByType(world: WorldState, entityType: string): BookmarkEntry[] {
  return getBookmarks(world).filter((b) => b.entityType === entityType);
}

export function getAllBookmarks(world: WorldState): BookmarkEntry[] {
  return getBookmarks(world);
}
