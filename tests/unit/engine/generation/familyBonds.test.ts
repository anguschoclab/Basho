/**
 * W H — family-bond edge pins for mintFamilyBonds (siblingGeneration.test.ts
 * covers the happy path through materialization; these pin the untested
 * edges on the service itself):
 * - a slot-consuming foreign candidate must NEVER mint a sibling — an
 *   out-of-band kyodai would bypass the one-foreigner-per-heya invariant;
 * - linkKeikoPartners mutual-links same-school alumni in OTHER heyas only,
 *   honours PRACTICE_PARTNER_MAX, and is a no-op without schoolOrigin.
 */
import { describe, it, expect } from "vitest";
import { mintFamilyBonds } from "@/engine/generation/FamilyBondService";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { SeededRNG } from "@/engine/core/rng";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";

const SCHOOL = "Saitama Sakae";

function worldWith(rikishi: Rikishi[]) {
  return MockFactory.createWorld({
    year: 2026,
    seed: "bonds",
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    heyas: new Map(
      ["heya-1", "heya-2", "heya-3", "heya-4"].map((id) => [id, MockFactory.createHeya(id)])
    ),
  });
}

const recruit = (extra: Partial<Rikishi> = {}) =>
  MockFactory.createRikishi("new-guy", { heyaId: "heya-1", ...extra });

const japaneseCandidate = () => MockFactory.createCandidate("cand-1", { nationality: "Japan" });

describe("mintFamilyBonds — sibling foreign-slot guard", () => {
  // "bond-seed-22": first rng.next() ≈ 0.0126 < SIBLING_CHANCE, so the
  // sibling roll fires — only the citizenship guard can stop the mint.
  const FIRE_SEED = "bond-seed-22";

  it("mints a cross-linked sibling for a domestic candidate when the roll fires", () => {
    const rikishi = recruit();
    const builder = createImpactBuilder("test");
    mintFamilyBonds(
      worldWith([]),
      builder,
      rikishi,
      japaneseCandidate(),
      "heya-1",
      new SeededRNG(FIRE_SEED)
    );
    const siblings = builder.build().collections?.rikishiToAdd ?? [];
    expect(siblings).toHaveLength(1);
    expect(siblings[0].siblingIds).toEqual(["new-guy"]);
    expect(rikishi.siblingIds).toEqual([siblings[0].id]);
  });

  it("never mints a sibling for a foreign candidate (kyodai are domestic only)", () => {
    const rikishi = recruit();
    const foreign = MockFactory.createCandidate("cand-1", { nationality: "Mongolia" });
    const builder = createImpactBuilder("test");
    mintFamilyBonds(worldWith([]), builder, rikishi, foreign, "heya-1", new SeededRNG(FIRE_SEED));
    expect(builder.build().collections?.rikishiToAdd ?? []).toHaveLength(0);
    expect(rikishi.siblingIds ?? []).toHaveLength(0);
  });
});

describe("mintFamilyBonds — keiko partners", () => {
  const alum = (id: string, heyaId: string, extra: Partial<Rikishi> = {}) =>
    MockFactory.createRikishi(id, { heyaId, schoolOrigin: SCHOOL, ...extra });

  // Insertion order mixes ineligible rikishi between eligible alumni:
  // same-heya / other-school / retired must be skipped without consuming a roll.
  const roster = () => [
    alum("alum-a", "heya-2"),
    alum("same-heya", "heya-1"),
    alum("alum-b", "heya-3"),
    MockFactory.createRikishi("other-school", { heyaId: "heya-4", schoolOrigin: "Waseda" }),
    alum("alum-c", "heya-4"),
    alum("retired-alum", "heya-2", { isRetired: true }),
  ];

  it("mutual-links same-school alumni in other heyas, capped at PRACTICE_PARTNER_MAX", () => {
    // "keiko-seed-1": sibling gate 0.36 (no mint), then 0.17/0.04 link the
    // first two eligible alumni; the cap breaks before alum-c is evaluated.
    const rikishi = recruit({ schoolOrigin: SCHOOL });
    const builder = createImpactBuilder("test");
    mintFamilyBonds(
      worldWith(roster()),
      builder,
      rikishi,
      japaneseCandidate(),
      "heya-1",
      new SeededRNG("keiko-seed-1")
    );
    const impact = builder.build();
    expect(impact.collections?.rikishiToAdd ?? []).toHaveLength(0);
    expect(rikishi.practicePartners).toEqual(["alum-a", "alum-b"]);
    const updates = impact.entities?.rikishiUpdates ?? new Map();
    expect(updates.get("alum-a")?.practicePartners).toEqual(["new-guy"]);
    expect(updates.get("alum-b")?.practicePartners).toEqual(["new-guy"]);
    for (const skipped of ["alum-c", "same-heya", "other-school", "retired-alum"]) {
      expect(updates.has(skipped)).toBe(false);
    }
  });

  it("rolls per eligible partner — a failed roll skips that alumnus, not the rest", () => {
    // "keiko-seed-22": partner rolls 0.04 / 0.99 / 0.08 → links a & c, skips b.
    const rikishi = recruit({ schoolOrigin: SCHOOL });
    const builder = createImpactBuilder("test");
    mintFamilyBonds(
      worldWith(roster()),
      builder,
      rikishi,
      japaneseCandidate(),
      "heya-1",
      new SeededRNG("keiko-seed-22")
    );
    const updates = builder.build().entities?.rikishiUpdates ?? new Map();
    expect(rikishi.practicePartners).toEqual(["alum-a", "alum-c"]);
    expect(updates.has("alum-b")).toBe(false);
  });

  it("is a no-op when the recruit has no schoolOrigin", () => {
    const rikishi = recruit(); // no schoolOrigin
    const builder = createImpactBuilder("test");
    mintFamilyBonds(
      worldWith(roster()),
      builder,
      rikishi,
      japaneseCandidate(),
      "heya-1",
      new SeededRNG("keiko-seed-1")
    );
    expect(rikishi.practicePartners ?? []).toHaveLength(0);
    expect(builder.build().entities?.rikishiUpdates ?? new Map()).toHaveProperty("size", 0);
  });
});
