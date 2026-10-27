/**
 * eventReadStore.ts
 * =================
 * Tracks which event-log entries the player has opened, persisted to
 * localStorage so "unread" survives reloads. Read set is capped so the
 * persisted array stays small.
 */

import { create } from "zustand";

const STORAGE_KEY = "basho.events.readIds";
const MAX_READ_IDS = 500;

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function capped(ids: Set<string>): Set<string> {
  if (ids.size <= MAX_READ_IDS) return ids;
  return new Set([...ids].slice(-MAX_READ_IDS));
}

function persist(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage full/blocked — non-fatal */
  }
}

interface EventReadStore {
  readIds: Set<string>;
  isUnread: (id: string) => boolean;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
}

export const useEventReadStore = create<EventReadStore>((set, get) => ({
  readIds: loadReadIds(),
  isUnread: (id) => !get().readIds.has(id),
  markRead: (id) =>
    set((s) => {
      if (s.readIds.has(id)) return s;
      const next = new Set(s.readIds);
      next.add(id);
      const cappedNext = capped(next);
      persist(cappedNext);
      return { readIds: cappedNext };
    }),
  markAllRead: (ids) =>
    set((s) => {
      const next = new Set(s.readIds);
      for (const id of ids) next.add(id);
      const cappedNext = capped(next);
      persist(cappedNext);
      return { readIds: cappedNext };
    }),
}));
