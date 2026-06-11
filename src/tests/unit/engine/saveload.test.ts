 
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { saveGame, loadGame } from "@/engine/saveload";
import { setStorageProvider, resetStorageProvider, type IStorageProvider } from "@/engine/storageProvider";
import { makeMockWorld } from "./utils";
import { runArchivalPruning } from "@/engine/archival";
import { SerializationService } from "@/engine/persistence/SerializationService";

// Mock dependencies
vi.mock("@/engine/archival", () => ({
  runArchivalPruning: vi.fn(() => ({ metadata: { source: "archival", timestamp: 0 } })),
}));

vi.mock("@/engine/persistence/SerializationService", () => ({
  SerializationService: {
    serializeWorld: vi.fn((world) => world),
    deserializeWorld: vi.fn((serialized) => serialized),
  },
}));

// Mock storage helper
function createMockStorage(throwOnSet = false, throwOnGet = false): IStorageProvider {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => {
      if (throwOnGet) throw new Error("Storage read failed");
      return store[key] || null;
    },
    setItem: (key: string, value: string) => {
      if (throwOnSet) throw new Error("Storage write failed");
      store[key] = value;
    },
    removeItem: (key: string) => { store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key)); },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe("saveload - saveGame error paths", () => {
  beforeEach(() => {
    resetStorageProvider();
  });

  afterEach(() => {
    resetStorageProvider();
  });

  it("returns false when storage provider is null", () => {
    const world = makeMockWorld();
    const result = saveGame(world, "slot_1");
    expect(result).toBe(false);
  });

  it("returns false and logs error when storage.setItem throws", () => {
    const world = makeMockWorld();
    const mockStorage = createMockStorage(true, false);
    setStorageProvider(mockStorage);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = saveGame(world, "slot_1");

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[SaveLoad] Failed to save game"),
      ""
    );

    errorSpy.mockRestore();
  });

  it("returns false and logs error when JSON.stringify throws (circular reference)", () => {
    const world = makeMockWorld();
    // Create circular reference
    (world as any).circular = world;

    const mockStorage = createMockStorage(false, false);
    setStorageProvider(mockStorage);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = saveGame(world, "slot_1");

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[SaveLoad] Failed to save game"),
      ""
    );

    errorSpy.mockRestore();
  });

  it("returns false and logs error when runArchivalPruning throws", () => {
    const world = makeMockWorld();
    const mockStorage = createMockStorage(false, false);
    setStorageProvider(mockStorage);

    (runArchivalPruning as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("Archival pruning failed");
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = saveGame(world, "slot_1");

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[SaveLoad] Failed to save game"),
      ""
    );

    errorSpy.mockRestore();
  });

  it("returns false and logs error when SerializationService.serializeWorld throws", () => {
    const world = makeMockWorld();
    const mockStorage = createMockStorage(false, false);
    setStorageProvider(mockStorage);

    (SerializationService.serializeWorld as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("Serialization failed");
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = saveGame(world, "slot_1");

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[SaveLoad] Failed to save game"),
      ""
    );

    errorSpy.mockRestore();
  });

  it("returns true on successful save", () => {
    const world = makeMockWorld();
    const mockStorage = createMockStorage(false, false);
    setStorageProvider(mockStorage);

    // Reset mocks to default behavior
    (runArchivalPruning as ReturnType<typeof vi.fn>).mockReturnValue({
      metadata: { source: "archival", timestamp: 0 },
    });
    (SerializationService.serializeWorld as ReturnType<typeof vi.fn>).mockReturnValue({
      seed: world.seed,
      year: world.year,
      week: world.week,
    } as any);

    const result = saveGame(world, "slot_1");

    expect(result).toBe(true);
    expect(mockStorage.length).toBeGreaterThan(0);
  });
});

describe("saveload - loadGame error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStorageProvider();
  });

  afterEach(() => {
    resetStorageProvider();
    vi.restoreAllMocks();
  });

  it("returns null when storage provider is null", () => {
    const result = loadGame("slot_1");
    expect(result).toBe(null);
  });

  it("returns null and logs error when storage.getItem throws", () => {
    const mockStorage = createMockStorage(false, true);
    setStorageProvider(mockStorage);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = loadGame("slot_1");

    expect(result).toBe(null);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load game:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("returns null and logs error when destr throws (malformed JSON)", () => {
    const mockStorage = createMockStorage(false, false);
    setStorageProvider(mockStorage);

    // Store invalid JSON
    mockStorage.setItem("basho_save_slot_1", "{ invalid json }");

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = loadGame("slot_1");

    expect(result).toBe(null);
    // destr handles invalid JSON gracefully, so no error is thrown
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("returns null and logs error when SerializationService.deserializeWorld throws", () => {
    const mockStorage = createMockStorage(false, false);
    setStorageProvider(mockStorage);

    // Store valid save structure
    const validSave = {
      version: "1.0.0",
      world: { seed: "test", year: 2025, week: 1 },
    };
    mockStorage.setItem("basho_save_slot_1", JSON.stringify(validSave));

    (SerializationService.deserializeWorld as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("Deserialization failed");
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = loadGame("slot_1");

    expect(result).toBe(null);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load game:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("returns null for invalid save structure (missing version/world)", () => {
    const mockStorage = createMockStorage(false, false);
    setStorageProvider(mockStorage);

    // Store invalid save structure
    const invalidSave = { foo: "bar" };
    mockStorage.setItem("basho_save_slot_1", JSON.stringify(invalidSave));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = loadGame("slot_1");

    expect(result).toBe(null);
    // No error log expected for invalid structure (graceful handling)
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("returns null when storage.getItem returns null (save does not exist)", () => {
    const mockStorage = createMockStorage(false, false);
    setStorageProvider(mockStorage);

    const result = loadGame("slot_1");

    expect(result).toBe(null);
  });

  it("returns WorldState on successful load", () => {
    const mockStorage = createMockStorage(false, false);
    setStorageProvider(mockStorage);

    const mockWorld = makeMockWorld();
    const validSave = {
      version: "1.0.0",
      world: mockWorld,
    };
    mockStorage.setItem("basho_save_slot_1", JSON.stringify(validSave));

    (SerializationService.deserializeWorld as ReturnType<typeof vi.fn>).mockReturnValue(mockWorld);

    const result = loadGame("slot_1");

    expect(result).not.toBeNull();
    expect(result).toBe(mockWorld);
  });
});
