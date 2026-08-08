import { describe, it, expect } from "vitest";
import { phase01_daily_drama } from "@/engine/tick/phases/phase01_daily_drama";
import { makeMockWorld } from "../../utils";

describe("phase01_daily_drama", () => {
  it("returns a truthy StateImpact for a basic mock world", () => {
    const world = makeMockWorld();
    const result = phase01_daily_drama(world);
    expect(result).toBeTruthy();
  });

  it("returns impact with metadata.source set to 'merged'", () => {
    const world = makeMockWorld();
    const result = phase01_daily_drama(world);
    expect(result.metadata?.source).toBe("merged");
  });

  it("does not throw on empty/minimal world", () => {
    const world = makeMockWorld();
    expect(() => phase01_daily_drama(world)).not.toThrow();
  });

  it("returns an object with a metadata property", () => {
    const world = makeMockWorld();
    const result = phase01_daily_drama(world);
    expect("metadata" in result).toBe(true);
  });
});
