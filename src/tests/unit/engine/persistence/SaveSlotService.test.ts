import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaveSlotService } from "@/engine/persistence/SaveSlotService";

// Mock the storage provider
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  getAllKeys: vi.fn(),
};

vi.mock("@/engine/storageProvider", () => ({
  getStorageProvider: () => mockStorage,
}));

describe("SaveSlotService.isValidSave", () => {
  it("returns false for null", () => {
    expect(SaveSlotService.isValidSave(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(SaveSlotService.isValidSave(undefined)).toBe(false);
  });

  it("returns false for primitive values", () => {
    expect(SaveSlotService.isValidSave(42)).toBe(false);
    expect(SaveSlotService.isValidSave("string")).toBe(false);
    expect(SaveSlotService.isValidSave(true)).toBe(false);
  });

  it("returns false for object without version", () => {
    expect(SaveSlotService.isValidSave({ world: {} })).toBe(false);
  });

  it("returns false for object without world", () => {
    expect(SaveSlotService.isValidSave({ version: "1.0" })).toBe(false);
  });

  it("returns true for valid save object with version and world", () => {
    expect(
      SaveSlotService.isValidSave({ version: "1.0.0", world: { year: 2025 } })
    ).toBe(true);
  });

  it("returns false for empty object", () => {
    expect(SaveSlotService.isValidSave({})).toBe(false);
  });

  it("returns false for an unknown version string", () => {
    expect(
      SaveSlotService.isValidSave({ version: "0.9.0", world: { year: 2025 } })
    ).toBe(false);
  });

  it("returns true for version 1.0.0", () => {
    expect(
      SaveSlotService.isValidSave({ version: "1.0.0", world: { year: 2025 } })
    ).toBe(true);
  });

  it("returns true for version 1.1.0", () => {
    expect(
      SaveSlotService.isValidSave({ version: "1.1.0", world: { year: 2025 } })
    ).toBe(true);
  });
});
