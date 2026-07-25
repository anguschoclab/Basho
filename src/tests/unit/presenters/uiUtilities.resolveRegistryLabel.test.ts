import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveRegistryLabel, resolveRegistryLabelJa } from "@/presenters/uiUtilities";
import { BardEngine } from "@/engine/bard/BardEngine";

describe("resolveRegistryLabel", () => {
  it("returns label for ranks/yokozuna", () => {
    const label = resolveRegistryLabel("ranks", "yokozuna");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  it("returns fallback id for unknown rank", () => {
    expect(resolveRegistryLabel("ranks", "unknown_rank")).toBe("unknown_rank");
  });

  it("returns label for archetypes/hybrid", () => {
    const label = resolveRegistryLabel("archetypes", "hybrid");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  it("returns fallback id for unknown archetype", () => {
    expect(resolveRegistryLabel("archetypes", "unknown_archetype")).toBe("unknown_archetype");
  });

  it("returns label for styles", () => {
    const label = resolveRegistryLabel("styles", "oshi");
    expect(typeof label).toBe("string");
  });

  it("supports Japanese label with useJa=true", () => {
    const enLabel = resolveRegistryLabel("ranks", "yokozuna", false);
    const jaLabel = resolveRegistryLabel("ranks", "yokozuna", true);
    expect(enLabel).not.toBe(jaLabel);
  });

  it("useJa=false (default) returns entry.label", () => {
    const label = resolveRegistryLabel("ranks", "yokozuna");
    const entry = BardEngine.getRegistryEntry("ranks", "yokozuna");
    expect(label).toBe(entry?.label);
  });

  it("useJa=true returns labelJa when available", () => {
    const jaLabel = resolveRegistryLabel("ranks", "yokozuna", true);
    const entry = BardEngine.getRegistryEntry("ranks", "yokozuna");
    expect(jaLabel).toBe(entry?.labelJa ?? entry?.label);
  });

  it("returns fallback id for unknown domain", () => {
    expect(resolveRegistryLabel("nonexistent", "some_id")).toBe("some_id");
  });

  it("returns fallback for empty string id", () => {
    expect(resolveRegistryLabel("ranks", "")).toBe("");
  });

  it("returns fallback id when domain has entries but missing specific id", () => {
    expect(resolveRegistryLabel("ranks", "totally_made_up_rank_xyz")).toBe(
      "totally_made_up_rank_xyz"
    );
  });
});

describe("resolveRegistryLabelJa", () => {
  it("returns Japanese label for ranks/yokozuna", () => {
    const jaLabel = resolveRegistryLabelJa("ranks", "yokozuna");
    const enLabel = resolveRegistryLabel("ranks", "yokozuna", false);
    expect(jaLabel).not.toBe(enLabel);
  });

  it("falls back to English label when labelJa is undefined", () => {
    const spy = vi
      .spyOn(BardEngine, "getRegistryEntry")
      .mockReturnValue({ label: "TestLabel", labelJa: undefined });

    const result = resolveRegistryLabelJa("x", "y");
    expect(result).toBe("TestLabel");
    spy.mockRestore();
  });

  it("returns fallback id when entry is null", () => {
    const spy = vi.spyOn(BardEngine, "getRegistryEntry").mockReturnValue(null);
    expect(resolveRegistryLabelJa("x", "y")).toBe("y");
    spy.mockRestore();
  });
});

describe("resolveRegistryLabel — spy verification", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls BardEngine.getRegistryEntry with correct args", () => {
    const spy = vi.spyOn(BardEngine, "getRegistryEntry");
    resolveRegistryLabel("ranks", "yokozuna", true);
    expect(spy).toHaveBeenCalledWith("ranks", "yokozuna");
  });

  it("calls BardEngine.getRegistryEntry with useJa=false by default", () => {
    const spy = vi.spyOn(BardEngine, "getRegistryEntry");
    const result = resolveRegistryLabel("ranks", "ozeki");
    const entry = BardEngine.getRegistryEntry("ranks", "ozeki");
    expect(spy).toHaveBeenCalledWith("ranks", "ozeki");
    expect(result).toBe(entry?.label);
  });
});
