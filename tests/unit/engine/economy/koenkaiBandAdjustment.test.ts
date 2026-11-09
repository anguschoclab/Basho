import { describe, it, expect } from "vitest";
import { adjustKoenkaiBandToPrestige } from "@/engine/economy/SponsorshipService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import { toKeyedMap } from "@/engine/utils/index";
import type { Sponsor, SponsorPool, Koenkai, SponsorRelationship } from "@/engine/types/sponsors";

function makeSponsor(id: string, tier: "T1" | "T2" | "T3" = "T2", active = false): Sponsor {
  return {
    sponsorId: id,
    active,
    tier,
    prestigeAffinity: 50,
  } as unknown as Sponsor;
}

function makeKoenkaiMember(sponsorId: string, strength = 10): SponsorRelationship {
  return {
    relId: `rel_${sponsorId}`,
    sponsorId,
    targetType: "heya",
    targetId: "h1",
    role: "koenkai_member",
    strength,
    startedAtTick: 0,
  } as unknown as SponsorRelationship;
}

function makeKoenkai(heyaId: string, band: string, members: SponsorRelationship[]): Koenkai {
  return {
    koenkaiId: `k_${heyaId}`,
    heyaId,
    strengthBand: band,
    members,
  } as unknown as Koenkai;
}

function makeWorldWithSponsors(
  sponsors: Sponsor[],
  koenkai: Koenkai,
  heyaBand: string = koenkai.strengthBand
) {
  const sponsorMap = toKeyedMap(sponsors, (s) => s.sponsorId);
  const sponsorPool: SponsorPool = {
    sponsors: sponsorMap,
    koenkais: new Map([[koenkai.koenkaiId, koenkai]]),
  } as unknown as SponsorPool;

  const heya = makeMockHeya("h1", { koenkaiBand: heyaBand as any, rikishiIds: ["r1"] });
  const r1 = mockRikishi("r1", { heyaId: "h1", rank: "yokozuna" });

  return makeMockWorld({
    heyas: new Map([["h1", heya]]),
    rikishi: new Map([["r1", r1]]),
    sponsorPool: sponsorPool as any,
  });
}

describe("adjustKoenkaiBandToPrestige — Set-based sponsor lookup", () => {
  it("does not add sponsors already in koenkai (no duplicates)", () => {
    const existingMember = makeKoenkaiMember("s1");
    const koenkai = makeKoenkai("h1", "weak", [existingMember]);
    const sponsors = [
      makeSponsor("s1", "T1", true),
      makeSponsor("s2", "T1", false),
      makeSponsor("s3", "T2", false),
    ];
    const world = makeWorldWithSponsors(sponsors, koenkai, "weak");

    const impact = adjustKoenkaiBandToPrestige(world);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.sponsorPool?.koenkais.get("k_h1");
    const sponsorIds = updated?.members.map((m) => m.sponsorId);
    const uniqueIds = new Set(sponsorIds);
    expect(sponsorIds?.length).toBe(uniqueIds.size);
  });

  it("handles empty sponsor pool without crashing", () => {
    const koenkai = makeKoenkai("h1", "weak", []);
    const world = makeWorldWithSponsors([], koenkai, "weak");

    const impact = adjustKoenkaiBandToPrestige(world);
    expect(impact).toBeDefined();
  });

  it("band upgrade adds eligible inactive sponsors", () => {
    const koenkai = makeKoenkai("h1", "weak", []);
    const sponsors = [makeSponsor("s1", "T1", false), makeSponsor("s2", "T2", false)];
    const world = makeWorldWithSponsors(sponsors, koenkai, "weak");

    const impact = adjustKoenkaiBandToPrestige(world);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.sponsorPool?.koenkais.get("k_h1");
    // Yokozuna prestige=40 → "moderate" band, upgrade from "weak" → addCount=1
    expect(updated?.members.length).toBe(1);
  });

  it("band downgrade trims weakest members", () => {
    const members = [
      makeKoenkaiMember("s1", 5),
      makeKoenkaiMember("s2", 15),
      makeKoenkaiMember("s3", 10),
    ];
    const koenkai = makeKoenkai("h1", "powerful", members);
    const sponsors = members.map((m) => makeSponsor(m.sponsorId, "T1", true));
    const world = makeWorldWithSponsors(sponsors, koenkai, "powerful");

    const impact = adjustKoenkaiBandToPrestige(world);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.sponsorPool?.koenkais.get("k_h1");
    expect(updated!.members.length).toBeLessThan(members.length);
    const remainingIds = updated!.members.map((m) => m.sponsorId);
    expect(remainingIds).not.toContain("s1");
  });

  it("all sponsors already active in koenkai — no new duplicates added", () => {
    const members = [makeKoenkaiMember("s1"), makeKoenkaiMember("s2")];
    const koenkai = makeKoenkai("h1", "moderate", members);
    const sponsors = [makeSponsor("s1", "T1", true), makeSponsor("s2", "T2", true)];
    const world = makeWorldWithSponsors(sponsors, koenkai, "moderate");

    const impact = adjustKoenkaiBandToPrestige(world);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.sponsorPool?.koenkais.get("k_h1");
    const sponsorIds = updated?.members.map((m) => m.sponsorId);
    // Band stays "moderate" (prestige=40 → moderate), no change → members stay as-is
    expect(sponsorIds?.length).toBe(2);
    expect(new Set(sponsorIds).size).toBe(2);
  });
});

/**
 * V18 — cross-koenkai pick dedup in one adjustment pass.
 *
 * `adjustKoenkaiBandToPrestige` re-scans `world.sponsorPool.sponsors` for
 * every koenkai — the `active: true` marks for already-picked sponsors live
 * only inside the impact being built, so a second upgrading koenkai picks
 * the same inactive sponsor, mints an identical `sr_${id}_${day}` rel id,
 * and its `updateSponsor` write overwrites the first relationship.
 */
describe("V18 — one inactive sponsor cannot join two koenkais in one pass", () => {
  it("two upgrading koenkais must not draft the same sponsor", () => {
    const k1 = makeKoenkai("h1", "weak", []);
    const k2 = makeKoenkai("h2", "weak", []);
    const sponsorPool = {
      sponsors: toKeyedMap([makeSponsor("s1", "T1", false)], (s) => s.sponsorId),
      koenkais: new Map([
        [k1.koenkaiId, k1],
        [k2.koenkaiId, k2],
      ]),
    } as unknown as SponsorPool;
    // Each heya upgrades weak→moderate (yokozuna prestige=40).
    const world = makeMockWorld({
      heyas: new Map([
        ["h1", makeMockHeya("h1", { koenkaiBand: "weak", rikishiIds: ["r1"] })],
        ["h2", makeMockHeya("h2", { koenkaiBand: "weak", rikishiIds: ["r2"] })],
      ]),
      rikishi: new Map([
        ["r1", mockRikishi("r1", { heyaId: "h1", rank: "yokozuna" })],
        ["r2", mockRikishi("r2", { heyaId: "h2", rank: "yokozuna" })],
      ]),
      sponsorPool: sponsorPool as never,
    });

    const resolved = resolveImpacts(world, [adjustKoenkaiBandToPrestige(world)]);
    const m1 = resolved.sponsorPool!.koenkais.get("k_h1")!.members;
    const m2 = resolved.sponsorPool!.koenkais.get("k_h2")!.members;

    const s1Memberships = [...m1, ...m2].filter((m) => m.sponsorId === "s1").length;
    expect(s1Memberships).toBeLessThanOrEqual(1);

    // Rel ids must be unique pool-wide — the second pick re-mints `sr_s1_<day>`.
    const relIds = [...m1, ...m2].map((m) => m.relId);
    expect(new Set(relIds).size).toBe(relIds.length);

    // The sponsor's own relationship list must cover every membership it
    // actually holds — today the second updateSponsor write clobbers the
    // first, leaving a member the sponsor can't see.
    const sponsor = resolved.sponsorPool!.sponsors.get("s1")!;
    expect((sponsor.relationships ?? []).length).toBe(s1Memberships);
  });
});
