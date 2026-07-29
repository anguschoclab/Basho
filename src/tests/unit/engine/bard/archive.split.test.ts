import { describe, it, expect, beforeEach } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/rng";
import registryData from "@/engine/bard/registry.json";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ALL_DOMAINS = [
  "combat", "medical", "scouting", "institutional", "world", "media",
  "system", "events", "rikishi", "npc", "ui", "h2h", "training",
  "oyakata", "strategy", "dynasty", "pre_bout", "post_bout", "kyujo",
  "sansho_ceremony", "interview", "ydc_accountability",
  "post_basho_press", "playoff",
];

describe("Phase 2: Split archive.json into registry.json + domains.json", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  const rng = new SeededRNG("test-split");

  // ── registry.json is valid and complete ────────────────────────────────
  it("registry.json has expected top-level domains", () => {
    const reg = registryData as any;
    expect(reg.ranks).toBeDefined();
    expect(reg.styles).toBeDefined();
    expect(reg.archetypes).toBeDefined();
    expect(reg.kimarite).toBeDefined();
  });

  it("registry.json has yokozuna entry", () => {
    const reg = registryData as any;
    expect(reg.ranks.yokozuna).toBeDefined();
    expect(reg.ranks.yokozuna.label).toBe("Yokozuna");
  });

  // ── domains are valid and complete ─────────────────────────────────────
  it("all 24 domain keys are loadable via ensureDomains", async () => {
    await BardEngine.ensureDomains(ALL_DOMAINS);
    for (const domain of ALL_DOMAINS) {
      expect(BardEngine.isDomainLoaded(domain), `domain "${domain}" should be loaded`).toBe(true);
    }
  });

  // ── getRegistryEntry stays synchronous ─────────────────────────────────
  it("getRegistryEntry('ranks', 'yokozuna') returns entry synchronously", () => {
    const entry = BardEngine.getRegistryEntry("ranks", "yokozuna");
    expect(entry).not.toBeNull();
    expect(entry?.label).toBe("Yokozuna");
    expect(entry?.labelJa).toBe("横綱");
  });

  it("getRegistryEntry('kimarite', 'yorikiri') returns entry synchronously", () => {
    const entry = BardEngine.getRegistryEntry("kimarite", "yorikiri");
    expect(entry).not.toBeNull();
    expect(entry?.label).toBe("Yorikiri");
  });

  // ── resolve/has work after pre-warm via loadDomains() ──────────────────
  it("loadDomains() is callable and returns a promise", () => {
    const result = BardEngine.loadDomains();
    expect(result).toBeDefined();
    expect(typeof result.then).toBe("function");
  });

  it("resolve('combat.phases.finish.kinboshi') returns non-empty text after loadDomains()", async () => {
    await BardEngine.loadDomains();
    const result = BardEngine.resolve(rng, "combat.phases.finish.kinboshi");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("has('media.bout.upset') is true after loadDomains()", async () => {
    await BardEngine.loadDomains();
    expect(BardEngine.has("media.bout.upset")).toBe(true);
  });

  // ── loadDomains() caches ───────────────────────────────────────────────
  it("loadDomains() returns the same promise on repeated calls", async () => {
    const p1 = BardEngine.loadDomains();
    const p2 = BardEngine.loadDomains();
    expect(p1).toBe(p2);
    await p1;
  });

  // ── Registry paths work without loadDomains() ──────────────────────────
  it("resolve('registry.ranks.yokozuna') works without loadDomains()", () => {
    const result = BardEngine.resolve(rng, "registry.ranks.yokozuna");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("has('registry.kimarite.yorikiri') is true without loadDomains()", () => {
    expect(BardEngine.has("registry.kimarite.yorikiri")).toBe(true);
  });
});
