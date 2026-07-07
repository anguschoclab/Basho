import { describe, it, expect } from "vitest";
import { isValidStorageKey } from "@/utils/storageKeyValidation";

describe("isValidStorageKey", () => {
  it("rejects __proto__ keys (case-insensitive)", () => {
    expect(isValidStorageKey("__proto__")).toBe(false);
    expect(isValidStorageKey("__PROTO__")).toBe(false);
    expect(isValidStorageKey("__Proto__")).toBe(false);
  });

  it("rejects constructor keys (case-insensitive)", () => {
    expect(isValidStorageKey("constructor")).toBe(false);
    expect(isValidStorageKey("CONSTRUCTOR")).toBe(false);
    expect(isValidStorageKey("Constructor")).toBe(false);
  });

  it("rejects prototype keys (case-insensitive)", () => {
    expect(isValidStorageKey("prototype")).toBe(false);
    expect(isValidStorageKey("PROTOTYPE")).toBe(false);
    expect(isValidStorageKey("Prototype")).toBe(false);
  });

  it("rejects keys containing dangerous substrings", () => {
    expect(isValidStorageKey("__proto__.polluted")).toBe(false);
    expect(isValidStorageKey("constructor.prototype")).toBe(false);
    expect(isValidStorageKey("some.prototype.value")).toBe(false);
  });

  it("accepts normal storage keys", () => {
    expect(isValidStorageKey("saveSlot1")).toBe(true);
    expect(isValidStorageKey("settings.volume")).toBe(true);
    expect(isValidStorageKey("game_state")).toBe(true);
    expect(isValidStorageKey("")).toBe(true);
  });

  it("rejects non-string types", () => {
    expect(isValidStorageKey(123 as unknown as string)).toBe(false);
    expect(isValidStorageKey(null as unknown as string)).toBe(false);
    expect(isValidStorageKey(undefined as unknown as string)).toBe(false);
    expect(isValidStorageKey({} as unknown as string)).toBe(false);
  });
});
