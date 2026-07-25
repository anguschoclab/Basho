import { describe, it, expect } from "vitest";
import { resolveRegistryLabel } from "@/presenters/uiUtilities";

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

  it("returns 'Rikishi' fallback for unknown archetype", () => {
    expect(resolveRegistryLabel("archetypes", "unknown_archetype")).toBe(
      "unknown_archetype"
    );
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
});
