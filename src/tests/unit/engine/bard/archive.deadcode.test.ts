import { describe, it, expect, beforeEach } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/rng";
import * as fs from "fs";
import * as path from "path";

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Phase 1: Dead-code removal — digests, matrix, vocabulary", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  const rng = new SeededRNG("test-deadcode");

  // ── digests (empty array, should be gone) ──────────────────────────────
  it("BardEngine.has('digests') is false", () => {
    expect(BardEngine.has("digests")).toBe(false);
  });

  it("resolve('digests.anything') returns empty text", () => {
    const result = BardEngine.resolve(rng, "digests.anything");
    expect(result.text).toBe("");
  });

  // ── matrix (should be gone after Phase 1) ──────────────────────────────
  it("BardEngine.has('matrix') is false", () => {
    expect(BardEngine.has("matrix")).toBe(false);
  });

  it("resolve('matrix.voices') returns empty text", () => {
    const result = BardEngine.resolve(rng, "matrix.voices");
    expect(result.text).toBe("");
  });

  it("resolve('matrix.dimensions.context') returns empty text", () => {
    const result = BardEngine.resolve(rng, "matrix.dimensions.context");
    expect(result.text).toBe("");
  });

  // ── vocabulary (unreachable, should be gone) ───────────────────────────
  it("BardEngine.has('vocabulary') is false", () => {
    expect(BardEngine.has("vocabulary")).toBe(false);
  });

  it("resolve('vocabulary.intensity_1.adjectives') returns empty text", () => {
    const result = BardEngine.resolve(rng, "vocabulary.intensity_1.adjectives");
    expect(result.text).toBe("");
  });

  // ── Registry paths still work (isRootKey whitelist trimmed to 'registry') ──
  it("BardEngine.has('registry.kimarite.yorikiri') is true", () => {
    expect(BardEngine.has("registry.kimarite.yorikiri")).toBe(true);
  });

  it("resolve('registry.ranks.yokozuna') returns non-empty text", () => {
    const result = BardEngine.resolve(rng, "registry.ranks.yokozuna");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("BardEngine.getRegistryEntry('kimarite', 'yorikiri') returns a valid entry", () => {
    const entry = BardEngine.getRegistryEntry("kimarite", "yorikiri");
    expect(entry).not.toBeNull();
    expect(entry?.label).toBe("Yorikiri");
  });

  // ── Domain paths still work (auto-prefixed with 'domains') ─────────────
  it("resolve('combat.phases.finish.kinboshi') returns non-empty text", () => {
    const result = BardEngine.resolve(rng, "combat.phases.finish.kinboshi");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("BardEngine.has('media.bout.upset') is true", () => {
    expect(BardEngine.has("media.bout.upset")).toBe(true);
  });

  // ── Orchestrator path fix ──────────────────────────────────────────────
  it("bard-orchestrator.ts ARCHIVE_PATH points to existing file", () => {
    // vitest runs from project root, so process.cwd() is reliable
    // After Phase 2 split, the orchestrator should point to registry.json
    const registryPath = path.resolve(process.cwd(), "src/engine/bard/registry.json");
    expect(fs.existsSync(registryPath)).toBe(true);
  });
});
