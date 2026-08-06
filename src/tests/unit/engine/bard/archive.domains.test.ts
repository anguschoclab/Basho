import { describe, it, expect, beforeEach } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/rng";

 

const ALL_DOMAINS = [
  "combat", "medical", "scouting", "institutional", "world", "media",
  "system", "events", "rikishi", "npc", "ui", "h2h", "training",
  "oyakata", "strategy", "dynasty", "pre_bout", "post_bout", "kyujo",
  "sansho_ceremony", "interview", "ydc_accountability",
  "post_basho_press", "playoff",
];

describe("Phase 3: Per-domain lazy loading", () => {
  beforeEach(() => {
    BardEngine.resetCache();
    BardEngine.resetDomains();
  });

  const rng = new SeededRNG("test-domains");

  // ── Each domain file is independently loadable ─────────────────────────
  describe.each(ALL_DOMAINS)("domain %s", (domain) => {
    it("is independently loadable via ensureDomains", async () => {
      await BardEngine.ensureDomains([domain]);
      // After loading, resolve should work for this domain
      expect(BardEngine.isDomainLoaded(domain)).toBe(true);
    });
  });

  // ── ensureDomains loads only requested domains ─────────────────────────
  it("ensureDomains(['combat']) loads combat but not media", async () => {
    await BardEngine.ensureDomains(["combat"]);
    expect(BardEngine.isDomainLoaded("combat")).toBe(true);
    expect(BardEngine.isDomainLoaded("media")).toBe(false);
  });

  it("resolve('combat.phases.finish.kinboshi') works after ensureDomains(['combat'])", async () => {
    await BardEngine.ensureDomains(["combat"]);
    const result = BardEngine.resolve(rng, "combat.phases.finish.kinboshi");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("resolve('media.bout.upset') returns empty when media not loaded", async () => {
    await BardEngine.ensureDomains(["combat"]);
    const result = BardEngine.resolve(rng, "media.bout.upset");
    expect(result.text).toBe("");
  });

  // ── ensureDomains is idempotent ────────────────────────────────────────
  it("ensureDomains(['combat']) is idempotent", async () => {
    await BardEngine.ensureDomains(["combat"]);
    await BardEngine.ensureDomains(["combat"]);
    expect(BardEngine.isDomainLoaded("combat")).toBe(true);
  });

  // ── Registry paths work without any domain loaded ──────────────────────
  it("registry paths work without ensureDomains", () => {
    const result = BardEngine.resolve(rng, "registry.ranks.yokozuna");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("getRegistryEntry works without ensureDomains", () => {
    const entry = BardEngine.getRegistryEntry("kimarite", "yorikiri");
    expect(entry).not.toBeNull();
    expect(entry?.label).toBe("Yorikiri");
  });

  // ── loadDomains still works (backward compat) ──────────────────────────
  it("loadDomains() loads all domains", async () => {
    await BardEngine.loadDomains();
    for (const domain of ALL_DOMAINS) {
      expect(BardEngine.isDomainLoaded(domain), `domain "${domain}" should be loaded`).toBe(true);
    }
  });

  it("resolve works for all domains after loadDomains()", async () => {
    await BardEngine.loadDomains();
    const result = BardEngine.resolve(rng, "combat.phases.finish.kinboshi");
    expect(result.text.length).toBeGreaterThan(0);
  });
});
