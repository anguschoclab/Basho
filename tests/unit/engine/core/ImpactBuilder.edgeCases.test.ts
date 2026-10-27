import { describe, it, expect } from "vitest";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";

describe("createImpactBuilder edge cases", () => {
  it("falls back to 'unknown' source when given an empty string", () => {
    const impact = createImpactBuilder("").build();
    expect(impact.metadata?.source).toBe("unknown");
  });

  it("preserves whitespace-only source as-is", () => {
    const impact = createImpactBuilder("   ").build();
    expect(impact.metadata?.source).toBe("   ");
  });

  it("preserves special characters in source", () => {
    const source = "@#$%^&*()";
    const impact = createImpactBuilder(source).build();
    expect(impact.metadata?.source).toBe(source);
  });

  it("preserves very long source strings without truncation", () => {
    const source = "a".repeat(256);
    const impact = createImpactBuilder(source).build();
    expect(impact.metadata?.source).toBe(source);
    expect(impact.metadata?.source?.length).toBe(256);
  });

  it("builder from empty source is functional (can chain and build)", () => {
    const builder = createImpactBuilder("");
    builder.updateWorldField("year", 2026);
    const impact = builder.build();
    expect(impact.worldFields?.year).toBe(2026);
  });
});
