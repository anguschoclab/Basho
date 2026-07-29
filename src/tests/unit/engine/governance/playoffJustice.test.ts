/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";

describe("playoff.justice_done — archive template", () => {
  it("has template entries for playoff.justice_done", () => {
    expect(BardEngine.has("playoff.justice_done")).toBe(true);
  });

  it("resolves with SHIKONA interpolation", () => {
    const rng = rngFromSeed("test-justice-1", "test", "resolve");
    const line = BardEngine.resolve(rng, "playoff.justice_done", {
      SHIKONA: "TestRikishi",
      rikishiId: "r1",
    });
    expect(line.text).toBeDefined();
    expect(line.text).toContain("TestRikishi");
  });

  it("produces text for different RNG seeds", () => {
    const rng1 = rngFromSeed("test-justice-2a", "test", "resolve");
    const rng2 = rngFromSeed("test-justice-2b", "test", "resolve");
    const line1 = BardEngine.resolve(rng1, "playoff.justice_done", {
      SHIKONA: "TestRiki",
      rikishiId: "r1",
    });
    const line2 = BardEngine.resolve(rng2, "playoff.justice_done", {
      SHIKONA: "TestRiki",
      rikishiId: "r1",
    });
    expect(line1.text).toBeDefined();
    expect(line2.text).toBeDefined();
  });
});

describe("playoff.schedule_delay — archive template", () => {
  it("has template entries for playoff.schedule_delay", () => {
    expect(BardEngine.has("playoff.schedule_delay")).toBe(true);
  });

  it("resolves without requiring any context variables", () => {
    const rng = rngFromSeed("test-delay-1", "test", "resolve");
    const line = BardEngine.resolve(rng, "playoff.schedule_delay", {});
    expect(line.text).toBeDefined();
    expect(line.text.length).toBeGreaterThan(10);
  });
});

describe("post_basho_press.champion — persona templates", () => {
  it("has persona_stoic template", () => {
    expect(BardEngine.has("post_basho_press.champion.persona_stoic")).toBe(true);
  });

  it("has persona_villain template", () => {
    expect(BardEngine.has("post_basho_press.champion.persona_villain")).toBe(true);
  });

  it("has persona_celebrity template", () => {
    expect(BardEngine.has("post_basho_press.champion.persona_celebrity")).toBe(true);
  });

  it("has persona_firebrand template", () => {
    expect(BardEngine.has("post_basho_press.champion.persona_firebrand")).toBe(true);
  });

  it("has persona_neutral template", () => {
    expect(BardEngine.has("post_basho_press.champion.persona_neutral")).toBe(true);
  });

  it("interpolates SHIKONA in persona templates", () => {
    const rng = rngFromSeed("test-persona-1", "test", "resolve");
    const line = BardEngine.resolve(rng, "post_basho_press.champion.persona_stoic", {
      SHIKONA: "StoicChamp",
      rikishiId: "r1",
    });
    expect(line.text).toContain("StoicChamp");
  });
});
