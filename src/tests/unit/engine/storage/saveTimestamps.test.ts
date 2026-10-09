/**
 * saveTimestamps.test.ts
 *
 * Regression tests for the epoch-timestamp bug (audit WS5-05).
 *
 * `saveGame` fell back to "1970-01-01T00:00:00Z" whenever callers omitted a
 * timestamp — and every production caller did. The fix threads a real
 * wall-clock ISO string from the UI layer (engine code may not call
 * `new Date()`). These tests pin the wire format that lands in storage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { saveGame, autosave, quickSave } from "@/engine/saveload";
import { setStorageProvider, resetStorageProvider } from "@/engine/storageProvider";
import { SaveSlotService } from "@/engine/persistence/SaveSlotService";
import type { IStorageProvider } from "@/engine/storageProvider";
import { MockFactory } from "../../../helpers/utils/MockFactory";

vi.mock("@/engine/persistence/SerializationService", () => ({
  SerializationService: {
    serializeWorld: vi.fn((world) => world),
    deserializeWorld: vi.fn((serialized) => serialized),
  },
}));

function createMemStorage(): IStorageProvider & { dump: Record<string, string> } {
  const dump: Record<string, string> = {};
  return {
    dump,
    getItem: (k) => dump[k] ?? null,
    setItem: (k, v) => {
      dump[k] = v;
    },
    removeItem: (k) => {
      delete dump[k];
    },
    key: (i) => Object.keys(dump)[i] ?? null,
    get length() {
      return Object.keys(dump).length;
    },
  };
}

describe("save timestamps (WS5-05)", () => {
  let storage: ReturnType<typeof createMemStorage>;

  beforeEach(() => {
    storage = createMemStorage();
    setStorageProvider(storage);
  });

  afterEach(() => {
    resetStorageProvider();
  });

  it("autosave writes the caller-supplied wall-clock timestamp", () => {
    const world = MockFactory.createWorld({});
    const ts = "2026-10-08T12:34:56.789Z";
    expect(autosave(world, ts)).toBe(true);
    const saved = JSON.parse(storage.dump[SaveSlotService.getAutosaveKey()]);
    expect(saved.lastSavedAtISO).toBe(ts);
    expect(saved.createdAtISO).toBe(ts);
  });

  it("a second save preserves createdAtISO and updates lastSavedAtISO", () => {
    const world = MockFactory.createWorld({});
    const first = "2026-10-08T12:00:00.000Z";
    const second = "2026-10-08T13:00:00.000Z";
    autosave(world, first);
    autosave(world, second);
    const saved = JSON.parse(storage.dump[SaveSlotService.getAutosaveKey()]);
    expect(saved.createdAtISO).toBe(first);
    expect(saved.lastSavedAtISO).toBe(second);
  });

  it("quickSave stamps the given timestamp (not epoch)", () => {
    const world = MockFactory.createWorld({});
    const ts = "2026-10-08T12:34:56.789Z";
    expect(quickSave(world, ts)).toBe(true);
    const key = Object.keys(storage.dump).find((k) => /slot_\d+/.test(k));
    expect(key).toBeDefined();
    const saved = JSON.parse(storage.dump[key!]);
    expect(saved.lastSavedAtISO).toBe(ts);
    expect(saved.lastSavedAtISO).not.toBe("1970-01-01T00:00:00Z");
  });
});
