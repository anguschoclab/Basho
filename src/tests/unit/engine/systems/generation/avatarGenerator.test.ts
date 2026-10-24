/**
 * Avatar Generator Tests (v2 — pixel identity + derived stage)
 *
 * Covers:
 *  - identity determinism & stability (seeded by person/entity id)
 *  - nationality feature biases (probabilistic, loose bounds)
 *  - stage derivation: rank→topknot/attire, age→wrinkles/graying,
 *    weight→fullness, injury→bandage, glasses quirk, gyoji/staff attire,
 *    retiree→oyakata identity preservation
 */

import { describe, it, expect } from "vitest";
import {
  generateAvatarIdentity,
  deriveAvatarStage,
  resolveAvatar,
  rikishiStageInput,
  staffStageInput,
  gyojiStageInput,
  prospectStageInput,
} from "@/engine/avatarGenerator";
import type { Staff } from "@/engine/types/staff";
import type { Gyoji } from "@/engine/types/gyoji";

const gen = (over: Partial<Parameters<typeof generateAvatarIdentity>[0]> = {}) =>
  generateAvatarIdentity({
    seed: "test-rikishi-001",
    nationality: "Japan",
    role: "rikishi",
    ...over,
  });

describe("generateAvatarIdentity", () => {
  it("is deterministic for the same seed", () => {
    expect(gen()).toEqual(gen());
  });

  it("produces different faces for different seeds", () => {
    const a = gen({ seed: "a" });
    const b = gen({ seed: "b" });
    const c = gen({ seed: "c" });
    const sigs = [a, b, c].map((i) => JSON.stringify(i));
    expect(new Set(sigs).size).toBeGreaterThan(1);
  });

  it("tags identity with version 2 and the requested role", () => {
    const id = gen({ role: "gyoji" });
    expect(id.version).toBe(2);
    expect(id.role).toBe("gyoji");
  });

  it("varies skin tone by nationality (mongolia vs estonia differ in output distribution)", () => {
    const tones = new Set<string>();
    for (let i = 0; i < 30; i++)
      tones.add(gen({ seed: `m-${i}`, nationality: "Mongolia" }).skinTone);
    expect(tones.size).toBeGreaterThan(1);
  });

  it("never gives active rikishi/prospects facial hair", () => {
    for (let i = 0; i < 40; i++) {
      expect(gen({ seed: `r-${i}`, role: "rikishi" }).facialHair).toBe("none");
      expect(gen({ seed: `p-${i}`, role: "prospect" }).facialHair).toBe("none");
    }
  });

  it("sometimes gives oyakata/staff facial hair", () => {
    let count = 0;
    for (let i = 0; i < 60; i++) {
      if (gen({ seed: `o-${i}`, role: "oyakata" }).facialHair !== "none") count++;
      if (gen({ seed: `s-${i}`, role: "staff" }).facialHair !== "none") count++;
    }
    expect(count).toBeGreaterThan(0);
  });

  it("biases mongolian wrestlers toward narrower/upturned eyes", () => {
    let narrowish = 0;
    let japaneseNarrowish = 0;
    for (let i = 0; i < 100; i++) {
      const m = gen({ seed: `mm-${i}`, nationality: "Mongolia" });
      const j = gen({ seed: `jj-${i}`, nationality: "Japan" });
      if (m.eyes === "narrow" || m.eyes === "upturned") narrowish++;
      if (j.eyes === "narrow" || j.eyes === "upturned") japaneseNarrowish++;
    }
    expect(narrowish).toBeGreaterThan(japaneseNarrowish);
  });
});

describe("deriveAvatarStage", () => {
  it("gives jonokuchi recruits a shaved head", () => {
    const s = deriveAvatarStage({ role: "rikishi", division: "jonokuchi", age: 18 });
    expect(s.hairstyle).toBe("shaved");
    expect(s.attire).toBe("bare");
  });

  it("gives lower-division rikishi a chonmage", () => {
    const s = deriveAvatarStage({ role: "rikishi", division: "makushita", age: 22 });
    expect(s.hairstyle).toBe("chonmage");
  });

  it("gives sekitori the oichomage ginkgo topknot", () => {
    const s = deriveAvatarStage({ role: "rikishi", division: "makuuchi", age: 28 });
    expect(s.hairstyle).toBe("oichomage");
  });

  it("flags yokozuna with a tsuna accent", () => {
    const s = deriveAvatarStage({
      role: "rikishi",
      division: "makuuchi",
      rank: "yokozuna",
      age: 30,
    });
    expect(s.tsuna).toBe(true);
    expect(s.hairstyle).toBe("oichomage");
  });

  it("retired rikishi drop the topknot", () => {
    const s = deriveAvatarStage({
      role: "rikishi",
      division: "makuuchi",
      age: 36,
      isRetired: true,
    });
    expect(["short", "receding", "bald"]).toContain(s.hairstyle);
    expect(s.attire).not.toBe("bare");
  });

  it("ages: young has no wrinkles/gray, elder has both", () => {
    const young = deriveAvatarStage({ role: "oyakata", age: 24 });
    const elder = deriveAvatarStage({ role: "oyakata", age: 62 });
    expect(young.wrinkleTier).toBe(0);
    expect(young.graying).toBe(0);
    expect(elder.wrinkleTier).toBe(3);
    expect(elder.graying).toBe(2);
  });

  it("scales fullness with weight", () => {
    const light = deriveAvatarStage({
      role: "rikishi",
      division: "jonokuchi",
      age: 20,
      weight: 100,
    });
    const heavy = deriveAvatarStage({
      role: "rikishi",
      division: "jonokuchi",
      age: 20,
      weight: 200,
    });
    expect(heavy.fullness).toBeGreaterThan(light.fullness);
  });

  it("shows a bandage when injured", () => {
    const s = deriveAvatarStage({ role: "rikishi", division: "juryo", age: 25, injured: true });
    expect(s.bandage).toBe(true);
  });

  it("honors the glasses quirk", () => {
    const s = deriveAvatarStage({ role: "rikishi", division: "juryo", age: 25, glasses: true });
    expect(s.glasses).toBe(true);
  });

  it("maps gyoji rank to robe tier", () => {
    expect(deriveAvatarStage({ role: "gyoji", gyojiRank: "tate", age: 55 }).attire).toBe(
      "gyoji_tate"
    );
    expect(deriveAvatarStage({ role: "gyoji", gyojiRank: "sanyaku", age: 45 }).attire).toBe(
      "gyoji_sanyaku"
    );
    expect(deriveAvatarStage({ role: "gyoji", gyojiRank: "makushita", age: 30 }).attire).toBe(
      "gyoji_standard"
    );
  });

  it("maps staff roles to attire", () => {
    expect(deriveAvatarStage({ role: "staff", staffRole: "medical_staff", age: 40 }).attire).toBe(
      "coat"
    );
    expect(deriveAvatarStage({ role: "staff", staffRole: "technique_coach", age: 40 }).attire).toBe(
      "tracksuit"
    );
    expect(deriveAvatarStage({ role: "staff", staffRole: "administrator", age: 40 }).attire).toBe(
      "suit"
    );
    expect(deriveAvatarStage({ role: "staff", staffRole: "scout", age: 40 }).attire).toBe("shirt");
  });

  it("expression follows aggression/momentum/injury unless overridden", () => {
    expect(
      deriveAvatarStage({ role: "rikishi", division: "juryo", age: 25, aggression: 80 }).expression
    ).toBe("intense");
    expect(
      deriveAvatarStage({ role: "rikishi", division: "juryo", age: 25, momentum: 80 }).expression
    ).toBe("confident");
    expect(
      deriveAvatarStage({ role: "rikishi", division: "juryo", age: 25, injured: true }).expression
    ).toBe("worried");
    expect(
      deriveAvatarStage({ role: "rikishi", division: "juryo", age: 25, expression: "determined" })
        .expression
    ).toBe("determined");
  });
});

describe("resolveAvatar", () => {
  it("uses stored v2 identity when present and seeded by the entity id", () => {
    const stored = gen({ seed: "stored-1" });
    const r = resolveAvatar({ id: "stored-1", stored, division: "juryo", age: 25 });
    expect(r.identity).toBe(stored);
  });

  it("accepts stored identity seeded by a declared alias", () => {
    const stored = gen({ seed: "former-rikishi-1" });
    const r = resolveAvatar({
      id: "oyakata-1",
      stored,
      seedAliases: ["former-rikishi-1"],
      role: "oyakata",
      age: 55,
    });
    expect(r.identity).toBe(stored);
  });

  it("rejects stored identity whose seed belongs to a different entity", () => {
    const stored = gen({ seed: "other-entity" });
    const r = resolveAvatar({ id: "x", stored, division: "juryo", age: 25 });
    expect(r.identity).not.toBe(stored);
    expect(r.identity.seed).toBe("x");
  });

  it("derives identity deterministically when stored is missing or stale", () => {
    const a = resolveAvatar({ id: "person-1", nationality: "Japan", division: "juryo", age: 25 });
    const b = resolveAvatar({ id: "person-1", nationality: "Japan", division: "juryo", age: 25 });
    expect(a.identity).toEqual(b.identity);
    // stale v1-shaped config ignored
    const stale = { seed: "old", faceShape: "round" } as never;
    const c = resolveAvatar({
      id: "person-1",
      stored: stale,
      nationality: "Japan",
      division: "juryo",
      age: 25,
    });
    expect(c.identity).toEqual(a.identity);
  });
});

describe("entity stage-input helpers", () => {
  it("rikishiStageInput maps a rikishi entity", () => {
    const r = {
      birthYear: 2001,
      division: "makuuchi",
      rank: "maegashira",
      weight: 170,
      injured: true,
      isKyujo: false,
      quirks: { glasses: { style: "round", acquiredBasho: "2025-1" } },
      stats: { aggression: 72 },
      momentum: 60,
    } as never;
    const input = rikishiStageInput(r, 2025);
    const s = deriveAvatarStage({ role: "rikishi", ...input });
    expect(s.ageStage).toBe("young");
    expect(s.hairstyle).toBe("oichomage");
    expect(s.bandage).toBe(true);
    expect(s.glasses).toBe(true);
    expect(s.expression).toBe("worried");
    expect(s.fullness).toBe(2);
  });

  it("staffStageInput maps staff role and age", () => {
    const s = { role: "medical_staff", age: 52 } as Staff;
    expect(staffStageInput(s).staffRole).toBe("medical_staff");
    expect(staffStageInput(s).age).toBe(52);
  });

  it("gyojiStageInput maps gyoji rank", () => {
    const g = { rank: "tate", age: 58 } as Gyoji;
    expect(gyojiStageInput(g).gyojiRank).toBe("tate");
    expect(gyojiStageInput(g).role).toBe("gyoji");
  });

  it("prospectStageInput gives young recruits short hair/bare shoulders", () => {
    const s = deriveAvatarStage(prospectStageInput({ age: 16 }));
    expect(s.hairstyle).toBe("short");
    expect(s.attire).toBe("bare");
    expect(s.ageStage).toBe("teen");
  });
});
