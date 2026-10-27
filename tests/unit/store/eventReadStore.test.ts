/**
 * eventReadStore.test.ts
 * ======================
 * Contract tests for event unread state: read ids persist to localStorage,
 * cap at MAX_READ_IDS, and drive the unread flag.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useEventReadStore } from "@/state/stores/eventReadStore";

const KEY = "basho.events.readIds";

beforeEach(() => {
  localStorage.clear();
  useEventReadStore.setState({ readIds: new Set() });
});

describe("eventReadStore", () => {
  it("treats unmarked ids as unread", () => {
    expect(useEventReadStore.getState().isUnread("e1")).toBe(true);
  });

  it("markRead flips an id to read and persists", () => {
    useEventReadStore.getState().markRead("e1");
    expect(useEventReadStore.getState().isUnread("e1")).toBe(false);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toContain("e1");
  });

  it("markRead is idempotent", () => {
    useEventReadStore.getState().markRead("e1");
    const size = useEventReadStore.getState().readIds.size;
    useEventReadStore.getState().markRead("e1");
    expect(useEventReadStore.getState().readIds.size).toBe(size);
  });

  it("markAllRead marks every supplied id", () => {
    useEventReadStore.getState().markAllRead(["a", "b", "c"]);
    const { isUnread } = useEventReadStore.getState();
    expect(isUnread("a")).toBe(false);
    expect(isUnread("b")).toBe(false);
    expect(isUnread("c")).toBe(false);
    expect(isUnread("d")).toBe(true);
  });

  it("caps the persisted set at 500 ids", () => {
    const ids = Array.from({ length: 600 }, (_, i) => `e${i}`);
    useEventReadStore.getState().markAllRead(ids);
    expect(useEventReadStore.getState().readIds.size).toBeLessThanOrEqual(500);
    const persisted = JSON.parse(localStorage.getItem(KEY)!);
    expect(persisted.length).toBeLessThanOrEqual(500);
  });
});
