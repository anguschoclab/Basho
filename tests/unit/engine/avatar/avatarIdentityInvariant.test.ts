/**
 * Avatar identity invariant — every person entity in a generated world carries
 * a v2 avatarConfig deterministically seeded by that entity's unique stable id.
 *
 * Officials additionally carry uuid-style ids (GY-/SH-) rather than positional
 * strings (`gyoji-tate-0`), so identity seeds remain unique across regenerations.
 */

import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { generateCandidate } from "@/engine/generation/CandidateGenerator";
import { rngFromSeed } from "@/engine/core/rng";

const UUID_RE = /^[A-Z]+-[0-9A-F]{8}$/;

describe("avatar identity invariant (generated world)", () => {
  const world = generateInitialWorld("avatar-invariant");

  it("every rikishi has a v2 avatarConfig seeded by its own id", () => {
    let count = 0;
    for (const r of world.rikishi.values()) {
      expect(r.avatarConfig, `rikishi ${r.id}`).toBeDefined();
      expect(r.avatarConfig!.version).toBe(2);
      expect(r.avatarConfig!.seed).toBe(r.id);
      count++;
    }
    expect(count).toBeGreaterThan(100);
  });

  it("every oyakata has a v2 avatarConfig seeded by id or formerRikishiId", () => {
    let count = 0;
    for (const o of world.oyakata.values()) {
      expect(o.avatarConfig, `oyakata ${o.id}`).toBeDefined();
      expect(o.avatarConfig!.version).toBe(2);
      expect([o.id, o.formerRikishiId]).toContain(o.avatarConfig!.seed);
      count++;
    }
    expect(count).toBeGreaterThan(10);
  });

  it("gyoji carry unique uuid-style GY- ids seeded into avatarConfig", () => {
    const pool = world.gyojiPool ?? [];
    expect(pool.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const g of pool) {
      expect(g.id).toMatch(UUID_RE);
      expect(g.id.startsWith("GY-")).toBe(true);
      expect(ids.has(g.id)).toBe(false);
      ids.add(g.id);
      expect(g.avatarConfig?.version).toBe(2);
      expect(g.avatarConfig?.seed).toBe(g.id);
    }
  });

  it("shimpan carry unique uuid-style SH- ids seeded into avatarConfig", () => {
    const pool = world.shimpanPool ?? [];
    expect(pool.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const s of pool) {
      expect(s.id).toMatch(UUID_RE);
      expect(s.id.startsWith("SH-")).toBe(true);
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(s.avatarConfig?.version).toBe(2);
      expect(s.avatarConfig?.seed).toBe(s.id);
    }
  });

  it("generated candidates have avatarConfig seeded by personId", () => {
    // Pools start empty at worldgen — materialize candidates directly.
    const rng = rngFromSeed("avatar-invariant", "test", "candidates");
    for (let i = 0; i < 5; i++) {
      const c = generateCandidate({
        id: `cand-${i}`,
        rng,
        currentYear: world.year,
        poolType: "high_school",
      });
      expect(c.avatarConfig, `candidate ${c.candidateId}`).toBeDefined();
      expect(c.avatarConfig!.version).toBe(2);
      expect(c.avatarConfig!.seed).toBe(c.personId);
    }
  });

  it("no two distinct persons share an avatar seed", () => {
    const seen = new Map<string, string>(); // seed -> owner label
    const claim = (seed: string | undefined, owner: string) => {
      if (!seed) return;
      const prior = seen.get(seed);
      expect(prior, `seed ${seed} shared by ${prior} and ${owner}`).toBeUndefined();
      seen.set(seed, owner);
    };
    for (const r of world.rikishi.values()) claim(r.avatarConfig?.seed, `rikishi:${r.id}`);
    for (const o of world.oyakata.values()) claim(o.avatarConfig?.seed, `oyakata:${o.id}`);
    for (const s of world.staff.values()) claim(s.avatarConfig?.seed, `staff:${s.id}`);
    for (const g of world.gyojiPool ?? []) claim(g.avatarConfig?.seed, `gyoji:${g.id}`);
    for (const s of world.shimpanPool ?? []) claim(s.avatarConfig?.seed, `shimpan:${s.id}`);
    for (const c of Object.values(world.talentPool?.candidates ?? {}))
      claim(c.avatarConfig?.seed, `candidate:${c.candidateId}`);
  });
});
