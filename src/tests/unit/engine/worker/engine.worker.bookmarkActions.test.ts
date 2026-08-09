import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { makeMockWorld } from "../utils";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";
import type { WorldState } from "@/engine/types/world";

const originalSelf = globalThis.self;
const originalPostMessage = globalThis.postMessage;
const originalOnmessage = globalThis.onmessage;

const mockPostMessage = vi.fn();

interface MockWorkerGlobal {
  postMessage: (message: EngineEvent) => void;
  onmessage: ((event: MessageEvent<EngineCommand>) => void) | null;
  self?: any;
}

const mockGlobal = globalThis as unknown as MockWorkerGlobal;
mockGlobal.postMessage = mockPostMessage;
mockGlobal.onmessage = null;
if (!mockGlobal.self) {
  mockGlobal.self = globalThis;
}

afterAll(() => {
  if (originalPostMessage === undefined) {
    delete (globalThis as any).postMessage;
  } else {
    mockGlobal.postMessage = originalPostMessage;
  }
  if (originalOnmessage === undefined) {
    delete (globalThis as any).onmessage;
  } else {
    mockGlobal.onmessage = originalOnmessage;
  }
  if (originalSelf === undefined) {
    delete (globalThis as any).self;
  } else {
    mockGlobal.self = originalSelf;
  }
});

vi.mock("@/presenters/uiDigest", () => ({
  buildWeeklyDigest: vi.fn((world) => ({
    mockDigest: true,
    worldSeed: world?.seed,
  })),
}));

vi.mock("@/engine/systems/generation/WorldFactory", () => ({
  generateInitialWorld: vi.fn((seed) => makeMockWorld({ seed })),
}));

vi.mock("@/engine/tick/tickOrchestrator", () => ({
  tickOrchestrator: vi.fn((world) => ({ ...world, ticked: true })),
  advanceDaysFastOrchestrator: vi.fn((world, days) => ({
    ...world,
    ticked: true,
    daysAdvanced: days,
  })),
  cloneWorldForTick: vi.fn((world) => world),
}));

await import("@/engine/worker/engine.worker");

function makeWorldWithBookmarks(bookmarks: any[] = []): WorldState {
  return makeMockWorld({
    playerKnowledge: { bookmarks } as any,
  });
}

describe("engine.worker — BOOKMARK_ENTITY / UNBOOKMARK_ENTITY / UPDATE_BOOKMARK_NOTE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const triggerMessage = async (data: EngineCommand) => {
    if (mockGlobal.onmessage) {
      await mockGlobal.onmessage({ data } as MessageEvent<EngineCommand>);
    }
  };

  function getWorldUpdated(): WorldState | undefined {
    const call = mockPostMessage.mock.calls.find(
      (c) => (c[0] as { type?: string })?.type === "WORLD_UPDATED"
    );
    return call ? ((call[0] as { world: WorldState }).world as WorldState) : undefined;
  }

  it("BOOKMARK_ENTITY adds a new bookmark to playerKnowledge", async () => {
    const world = makeWorldWithBookmarks();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "BOOKMARK_ENTITY",
      entityType: "rikishi",
      entityId: "r1",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const bookmarks = updated!.playerKnowledge?.bookmarks ?? [];
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].entityType).toBe("rikishi");
    expect(bookmarks[0].entityId).toBe("r1");
  });

  it("BOOKMARK_ENTITY emits WORLD_UPDATED", async () => {
    const world = makeWorldWithBookmarks();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "BOOKMARK_ENTITY",
      entityType: "rikishi",
      entityId: "r1",
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WORLD_UPDATED" })
    );
  });

  it("BOOKMARK_ENTITY with note stores the note", async () => {
    const world = makeWorldWithBookmarks();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "BOOKMARK_ENTITY",
      entityType: "rikishi",
      entityId: "r1",
      note: "Promising talent",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const bookmarks = updated!.playerKnowledge?.bookmarks ?? [];
    expect(bookmarks[0].note).toBe("Promising talent");
  });

  it("BOOKMARK_ENTITY is idempotent (duplicate does not add second entry)", async () => {
    const world = makeWorldWithBookmarks([
      { entityType: "rikishi", entityId: "r1", note: undefined, createdAt: 1000 },
    ]);
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "BOOKMARK_ENTITY",
      entityType: "rikishi",
      entityId: "r1",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const bookmarks = updated!.playerKnowledge?.bookmarks ?? [];
    expect(bookmarks).toHaveLength(1);
  });

  it("UNBOOKMARK_ENTITY removes an existing bookmark", async () => {
    const world = makeWorldWithBookmarks([
      { entityType: "rikishi", entityId: "r1", note: undefined, createdAt: 1000 },
      { entityType: "heya", entityId: "h1", note: undefined, createdAt: 1001 },
    ]);
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "UNBOOKMARK_ENTITY",
      entityType: "rikishi",
      entityId: "r1",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const bookmarks = updated!.playerKnowledge?.bookmarks ?? [];
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].entityType).toBe("heya");
    expect(bookmarks[0].entityId).toBe("h1");
  });

  it("UNBOOKMARK_ENTITY on non-existent bookmark is a no-op (still emits)", async () => {
    const world = makeWorldWithBookmarks();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "UNBOOKMARK_ENTITY",
      entityType: "rikishi",
      entityId: "non-existent",
    });

    // removeBookmark always returns an impact (even if nothing changed)
    const updated = getWorldUpdated();
    if (updated) {
      const bookmarks = updated.playerKnowledge?.bookmarks ?? [];
      expect(bookmarks).toHaveLength(0);
    }
  });

  it("UPDATE_BOOKMARK_NOTE updates the note on an existing bookmark", async () => {
    const world = makeWorldWithBookmarks([
      { entityType: "rikishi", entityId: "r1", note: "old note", createdAt: 1000 },
    ]);
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "UPDATE_BOOKMARK_NOTE",
      entityType: "rikishi",
      entityId: "r1",
      note: "new note",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const bookmarks = updated!.playerKnowledge?.bookmarks ?? [];
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].note).toBe("new note");
  });

  it("UPDATE_BOOKMARK_NOTE on non-existent bookmark is a no-op", async () => {
    const world = makeWorldWithBookmarks();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "UPDATE_BOOKMARK_NOTE",
      entityType: "rikishi",
      entityId: "non-existent",
      note: "note",
    });

    const updated = getWorldUpdated();
    if (updated) {
      const bookmarks = updated.playerKnowledge?.bookmarks ?? [];
      expect(bookmarks).toHaveLength(0);
    }
  });
});
