/**
 * autosaveRotation.test.ts
 *
 * T3.1 Phase B — autosave slot rotation. The autosave path previously kept
 * exactly one snapshot: a corrupt or mistimed write destroyed the only
 * recovery point for a decades-long save. `autosave` now rotates the last
 * N snapshots (autosave, autosave_1, autosave_2) so `loadAutosave` can fall
 * back to a previous good state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  autosave,
  loadAutosave,
  hasAutosave,
  getSaveSlotInfos,
} from "@/engine/persistence/saveload";
import { setStorageProvider, resetStorageProvider } from "@/engine/persistence/storageProvider";
import type { IStorageProvider } from "@/engine/persistence/storageProvider";
import { SaveSlotService } from "@/engine/persistence/SaveSlotService";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

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
      Reflect.deleteProperty(dump, k);
    },
    key: (i) => Object.keys(dump)[i] ?? null,
    get length() {
      return Object.keys(dump).length;
    },
  };
}

const KEY = SaveSlotService.getAutosaveKey();
const backupKey = (n: number) => `${SaveSlotService.toSlotKey(`autosave_${n}`)}`;

function worldAtYear(year: number) {
  return MockFactory.createWorld({ year });
}

describe("autosave rotation (T3.1)", () => {
  let storage: ReturnType<typeof createMemStorage>;

  beforeEach(() => {
    storage = createMemStorage();
    setStorageProvider(storage);
  });

  afterEach(() => {
    resetStorageProvider();
  });

  it("first autosave writes the primary slot only", () => {
    autosave(worldAtYear(2030), "2026-01-01T00:00:00Z");
    expect(storage.dump[KEY]).toBeDefined();
    expect(storage.dump[backupKey(1)]).toBeUndefined();
  });

  it("subsequent autosaves rotate the previous save into autosave_1", () => {
    autosave(worldAtYear(2030), "2026-01-01T00:00:00Z");
    autosave(worldAtYear(2031), "2026-02-01T00:00:00Z");
    const primary = JSON.parse(storage.dump[KEY]);
    const backup = JSON.parse(storage.dump[backupKey(1)]);
    expect(primary.world.year).toBe(2031);
    expect(backup.world.year).toBe(2030);
  });

  it("rotation is capped at N backups — no autosave_3 is created", () => {
    for (let i = 0; i < 5; i++) {
      autosave(worldAtYear(2030 + i), `2026-0${i + 1}-01T00:00:00Z`);
    }
    expect(JSON.parse(storage.dump[KEY]).world.year).toBe(2034);
    expect(JSON.parse(storage.dump[backupKey(1)]).world.year).toBe(2033);
    expect(JSON.parse(storage.dump[backupKey(2)]).world.year).toBe(2032);
    expect(storage.dump[backupKey(3)]).toBeUndefined();
  });

  it("loadAutosave falls back to the newest backup when the primary is corrupt", () => {
    autosave(worldAtYear(2030), "2026-01-01T00:00:00Z");
    autosave(worldAtYear(2031), "2026-02-01T00:00:00Z");
    storage.dump[KEY] = "{corrupt-json";
    const world = loadAutosave();
    expect(world?.year).toBe(2030);
  });

  it("hasAutosave is true when only a backup remains", () => {
    autosave(worldAtYear(2030), "2026-01-01T00:00:00Z");
    autosave(worldAtYear(2031), "2026-02-01T00:00:00Z");
    Reflect.deleteProperty(storage.dump, KEY);
    expect(hasAutosave()).toBe(true);
  });

  it("slot infos mark every rotated autosave as isAutosave, primary first", () => {
    autosave(worldAtYear(2030), "2026-01-01T00:00:00Z");
    autosave(worldAtYear(2031), "2026-02-01T00:00:00Z");
    const autosaves = getSaveSlotInfos().filter((s) => s.isAutosave);
    expect(autosaves.map((s) => s.slotName)).toEqual(["autosave", "autosave_1"]);
  });
});
