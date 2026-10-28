import { describe, it, expect } from "vitest";
import { isValidStorageKey } from "@/lib/storageKeyValidation";

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

  it("rejects keys with dangerous path segments", () => {
    expect(isValidStorageKey("__proto__.polluted")).toBe(false);
    expect(isValidStorageKey("constructor.prototype")).toBe(false);
    expect(isValidStorageKey("some.prototype.value")).toBe(false);
    expect(isValidStorageKey("a.constructor.b")).toBe(false);
  });

  it("rejects backslash-escaped dangerous segments", () => {
    // dot-prop decodes `\x` to literal `x` before checking path segments,
    // so `cons\tructor` reaches the sink as the segment `constructor`.
    expect(isValidStorageKey("cons\\tructor")).toBe(false);
    expect(isValidStorageKey("\\__proto__")).toBe(false);
    expect(isValidStorageKey("a.\\__proto__.b")).toBe(false);
    expect(isValidStorageKey("__pro\\to__")).toBe(false);
  });

  it("rejects dangerous segments in bracket notation", () => {
    expect(isValidStorageKey("__proto__[0]")).toBe(false);
    expect(isValidStorageKey("save[constructor]")).toBe(false);
    expect(isValidStorageKey("x[__proto__]")).toBe(false);
  });

  it("rejects Object.prototype member names that would shadow builtins", () => {
    expect(isValidStorageKey("toString")).toBe(false);
    expect(isValidStorageKey("ToString")).toBe(false);
    expect(isValidStorageKey("hasOwnProperty")).toBe(false);
    expect(isValidStorageKey("valueOf")).toBe(false);
    expect(isValidStorageKey("__defineGetter__")).toBe(false);
    expect(isValidStorageKey("settings.toString")).toBe(false);
    expect(isValidStorageKey("a.hasOwnProperty.b")).toBe(false);
  });

  it("rejects conf's reserved __internal__ key paths", () => {
    expect(isValidStorageKey("__internal__")).toBe(false);
    expect(isValidStorageKey("x.__internal__.y")).toBe(false);
  });

  it("rejects empty and separator-only keys", () => {
    expect(isValidStorageKey("")).toBe(false);
    expect(isValidStorageKey("...")).toBe(false);
    expect(isValidStorageKey("[]")).toBe(false);
  });

  it("accepts normal storage keys", () => {
    expect(isValidStorageKey("saveSlot1")).toBe(true);
    expect(isValidStorageKey("settings.volume")).toBe(true);
    expect(isValidStorageKey("game_state")).toBe(true);
  });

  it("accepts real key shapes used by the app", () => {
    expect(isValidStorageKey("basho_save_slot_1")).toBe(true);
    expect(isValidStorageKey("windowState")).toBe(true);
    expect(isValidStorageKey("basho:audio")).toBe(true);
    expect(isValidStorageKey("basho.events.readIds")).toBe(true);
  });

  it("accepts keys that merely contain blocked substrings", () => {
    // Segment-exact matching: a disallowed name inside a larger segment is
    // not a pollution vector and must not be rejected (silent data loss).
    expect(isValidStorageKey("constructorSettings")).toBe(true);
    expect(isValidStorageKey("myPrototypeData")).toBe(true);
    expect(isValidStorageKey("reconstructed_save")).toBe(true);
    expect(isValidStorageKey("ConstructorReport")).toBe(true);
  });

  it("rejects non-string types", () => {
    expect(isValidStorageKey(123 as unknown as string)).toBe(false);
    expect(isValidStorageKey(null as unknown as string)).toBe(false);
    expect(isValidStorageKey(undefined as unknown as string)).toBe(false);
    expect(isValidStorageKey({} as unknown as string)).toBe(false);
  });
});
