import { describe, it, expect } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/core/rng";

describe("BardEngine token-leak heuristic", () => {
  it("does NOT flag literal percent signs like (44%) as token leakage", async () => {
    // Regression: ui.labels.kimarite.display_format is "%NAME% (%PCT%%)" —
    // %PCT% resolves leaving a literal trailing '%'. Bare percents are text,
    // not leaked tokens, and must not warn/throw.
    await BardEngine.loadDomains();
    const rng = new SeededRNG("test::leak");
    const { text } = BardEngine.resolve(rng, "ui.labels.kimarite.display_format", {
      NAME: "Yorikiri",
      PCT: "44",
    });
    expect(text).toContain("(44%)");
  });

  it("still catches genuinely unresolved %TOKENS%", async () => {
    await BardEngine.loadDomains();
    const rng = new SeededRNG("test::leak2");
    expect(() =>
      BardEngine.resolve(rng, "ui.labels.kimarite.display_format", {
        NAME: "%BOGUS_TOKEN%",
        PCT: "44",
      })
    ).toThrow();
  });
});
