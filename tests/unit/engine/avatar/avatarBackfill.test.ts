/**
 * Avatar backfill — `ensureAvatarIdentities(world)` assigns a deterministic
 * v2 AvatarIdentity to every person entity missing one, and is invoked by
 * `deserializeWorld` so old/partial saves are healed at load time.
 */

import { describe, it, expect } from "vitest";
import { ensureAvatarIdentities } from "@/engine/generation/avatarGenerator";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { SerializationService } from "@/engine/persistence/SerializationService";
import type { WorldState } from "@/engine/types/world";

function stripAvatars(world: WorldState): void {
  for (const r of world.rikishi.values()) delete r.avatarConfig;
  for (const o of world.oyakata.values()) delete o.avatarConfig;
  for (const s of world.staff.values()) delete s.avatarConfig;
  for (const g of world.gyojiPool ?? []) delete g.avatarConfig;
  for (const s of world.shimpanPool ?? []) delete s.avatarConfig;
  for (const c of Object.values(world.talentPool?.candidates ?? {})) delete c.avatarConfig;
  for (const c of Object.values(world.candidatePool?.candidates ?? {})) delete c.avatarConfig;
  for (const h of world.heyas.values()) {
    for (const p of h.youthAcademy?.prospects ?? []) delete p.avatarConfig;
    for (const s of h.youthAcademy?.staff ?? []) delete s.avatarConfig;
  }
}

describe("ensureAvatarIdentities", () => {
  it("fills v2 identities for every person entity missing one", () => {
    const world = generateInitialWorld("avatar-backfill");
    stripAvatars(world);

    ensureAvatarIdentities(world);

    for (const r of world.rikishi.values()) {
      expect(r.avatarConfig?.version).toBe(2);
      expect(r.avatarConfig?.seed).toBe(r.id);
    }
    for (const o of world.oyakata.values()) {
      expect(o.avatarConfig?.version).toBe(2);
      expect([o.id, o.formerRikishiId]).toContain(o.avatarConfig!.seed);
    }
    for (const g of world.gyojiPool ?? []) {
      expect(g.avatarConfig?.version).toBe(2);
      expect(g.avatarConfig?.seed).toBe(g.id);
    }
    for (const s of world.shimpanPool ?? []) {
      expect(s.avatarConfig?.version).toBe(2);
      expect(s.avatarConfig?.seed).toBe(s.id);
    }
    for (const c of Object.values(world.talentPool?.candidates ?? {})) {
      expect(c.avatarConfig?.version).toBe(2);
      expect(c.avatarConfig?.seed).toBe(c.personId);
    }
  });

  it("backfills pool candidates seeded by personId", () => {
    const world = generateInitialWorld("avatar-backfill-cand");
    const candidate = {
      candidateId: "cand-bf-1",
      personId: "PS-BF0001",
      name: "Backfill Test",
    } as any;
    world.candidatePool = { version: 1, candidates: { "cand-bf-1": candidate }, pools: {} } as any;

    ensureAvatarIdentities(world);

    expect(candidate.avatarConfig?.version).toBe(2);
    expect(candidate.avatarConfig?.seed).toBe("PS-BF0001");
  });

  it("backfills academy prospects and staff seeded by their own ids", () => {
    const world = generateInitialWorld("avatar-backfill-academy");
    const heya = Array.from(world.heyas.values())[0];
    heya.youthAcademy = {
      level: 1,
      budget: 0,
      totalGraduated: 0,
      lastIntakeYear: 0,
      prospects: [{ id: "pros-bf-1", shikona: "P", age: 16 } as any],
      staff: [{ id: "astaff-bf-1", role: "coach", name: "S", quality: 50, age: 45 } as any],
    } as any;

    ensureAvatarIdentities(world);

    expect(heya.youthAcademy!.prospects[0].avatarConfig?.seed).toBe("pros-bf-1");
    expect(heya.youthAcademy!.staff[0].avatarConfig?.seed).toBe("astaff-bf-1");
  });

  it("is deterministic — same entity id produces the same identity", () => {
    const a = generateInitialWorld("avatar-backfill-det");
    const b = generateInitialWorld("avatar-backfill-det");
    stripAvatars(a);
    stripAvatars(b);
    ensureAvatarIdentities(a);
    ensureAvatarIdentities(b);

    const [id] = a.rikishi.keys();
    expect(a.rikishi.get(id)!.avatarConfig).toEqual(b.rikishi.get(id)!.avatarConfig);
  });

  it("never overwrites a valid stored identity", () => {
    const world = generateInitialWorld("avatar-backfill-keep");
    const [id] = world.rikishi.keys();
    const stored = world.rikishi.get(id)!.avatarConfig;
    expect(stored).toBeDefined();

    ensureAvatarIdentities(world);

    expect(world.rikishi.get(id)!.avatarConfig).toBe(stored);
  });
});

describe("deserializeWorld — load-time avatar backfill", () => {
  it("repopulates stripped avatarConfig fields on load", () => {
    const world = generateInitialWorld("avatar-backfill-load");
    const serialized = SerializationService.serializeWorld(world);

    // Simulate a save that predates stored identities.
    for (const r of Object.values(serialized.rikishi ?? {})) delete (r as any).avatarConfig;
    for (const o of Object.values(serialized.oyakata ?? {})) delete (o as any).avatarConfig;
    for (const g of serialized.gyojiPool ?? []) delete (g as any).avatarConfig;
    for (const c of Object.values(serialized.talentPool?.candidates ?? {}))
      delete (c as any).avatarConfig;
    for (const c of Object.values(serialized.candidatePool?.candidates ?? {}))
      delete (c as any).avatarConfig;

    const loaded = SerializationService.deserializeWorld(serialized);

    for (const r of loaded.rikishi.values()) {
      expect(r.avatarConfig?.version, `rikishi ${r.id}`).toBe(2);
      expect(r.avatarConfig?.seed).toBe(r.id);
    }
    for (const o of loaded.oyakata.values()) {
      expect(o.avatarConfig?.version, `oyakata ${o.id}`).toBe(2);
    }
    for (const g of loaded.gyojiPool ?? []) {
      expect(g.avatarConfig?.version, `gyoji ${g.id}`).toBe(2);
      expect(g.avatarConfig?.seed).toBe(g.id);
    }
    for (const c of Object.values(loaded.talentPool?.candidates ?? {})) {
      expect(c.avatarConfig?.version, `candidate ${c.candidateId}`).toBe(2);
      expect(c.avatarConfig?.seed).toBe(c.personId);
    }
    for (const c of Object.values(loaded.candidatePool?.candidates ?? {})) {
      expect(c.avatarConfig?.version, `candidate ${c.candidateId}`).toBe(2);
      expect(c.avatarConfig?.seed).toBe(c.personId);
    }
  });
});
