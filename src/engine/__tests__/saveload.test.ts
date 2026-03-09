import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  serializeWorld,
  deserializeWorld,
  saveGame,
  loadGame,
  autosave,
  loadAutosave,
  hasAutosave,
  deleteSave,
  getSaveSlotInfos,
  quickSave
} from "../saveload";
import { WorldState, Rikishi, Heya, Oyakata } from "../types";

// Setup localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] || null
  };
})();

// Apply mock before all tests
beforeAll(() => {
  Object.defineProperty(global, 'localStorage', { value: localStorageMock });
  Object.defineProperty(global, 'window', { value: { localStorage: localStorageMock } });
});

// Helper to create basic world state
function createMockWorld(): WorldState {
  return {
    id: "test-world",
    seed: "seed123",
    year: 2026,
    week: 1,
    cyclePhase: "interim",
    currentBashoName: "hatsu",
    heyas: new Map<string, Heya>([
      ["heya1", { id: "heya1", name: "Test Heya", funds: 1000 } as Heya]
    ]),
    rikishi: new Map<string, Rikishi>([
      ["rik1", { id: "rik1", shikona: "Testyama", heyaId: "heya1" } as Rikishi]
    ]),
    oyakata: new Map<string, Oyakata>(),
    history: { bashoResults: [], yearEndAwards: [] },
    events: { version: "1.0.0", log: [], dedupe: {} },
    ftue: { hasCompletedTutorial: true },
    calendar: { year: 2026, month: 1, currentWeek: 1, currentDay: 1 },
    dayIndexGlobal: 0,
    almanacSnapshots: [],
    sponsorPool: { sponsors: new Map(), koenkais: new Map() },
    ozekiKadoban: {}
  } as unknown as WorldState;
}

describe("Save/Load System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should serialize and deserialize a WorldState correctly (Map translation)", () => {
    const original = createMockWorld();
    const serialized = serializeWorld(original);
    
    // Assert Maps are turned into Objects
    expect(serialized.seed).toBe("seed123");
    expect(serialized.year).toBe(2026);
    expect(serialized.heyas["heya1"].name).toBe("Test Heya");

    const deserialized = deserializeWorld(serialized);
    
    // Assert Objects are turned back into Maps
    expect(deserialized.seed).toBe("seed123");
    expect(deserialized.year).toBe(2026);
    expect(deserialized.heyas instanceof Map).toBe(true);
    expect(deserialized.heyas.get("heya1")?.name).toBe("Test Heya");
    expect(deserialized.rikishi.get("rik1")?.shikona).toBe("Testyama");
  });

  it("should save and load a game via localStorage", () => {
    const world = createMockWorld();
    
    const saveSuccess = saveGame(world, "slot_1");
    expect(saveSuccess).toBe(true);
    
    const loaded = loadGame("slot_1");
    expect(loaded).toBeDefined();
    expect(loaded?.seed).toBe("seed123");
    expect(loaded?.heyas.has("heya1")).toBe(true);
  });

  it("should handle autosaves properly", () => {
    const world = createMockWorld();
    
    expect(hasAutosave()).toBe(false);
    expect(autosave(world)).toBe(true);
    expect(hasAutosave()).toBe(true);
    
    const loaded = loadAutosave();
    expect(loaded).toBeDefined();
    expect(loaded?.seed).toBe("seed123");
  });

  it("should delete saves", () => {
    const world = createMockWorld();
    saveGame(world, "slot_1");
    
    expect(loadGame("slot_1")).toBeDefined();
    
    deleteSave("slot_1");
    expect(loadGame("slot_1")).toBeNull();
  });

  it("should quickSave into first available slot", () => {
    const world = createMockWorld();
    expect(quickSave(world)).toBe(true);
    
    const infos = getSaveSlotInfos();
    expect(infos.length).toBe(1);
    expect(infos[0].slotName).toBe("slot_1");
  });

  it("should correctly list save slot infos with metadata", () => {
    const world = createMockWorld();
    saveGame(world, "slot_1");
    saveGame(world, "autosave");
    
    const infos = getSaveSlotInfos();
    expect(infos.length).toBe(2);
    expect(infos.some(i => i.isAutosave)).toBe(true);
    expect(infos.some(i => i.slotName === "slot_1")).toBe(true);
    
    const slot1Info = infos.find(i => i.slotName === "slot_1");
    expect(slot1Info?.year).toBe(2026);
    expect(slot1Info?.bashoName).toBe("hatsu");
  });
});
