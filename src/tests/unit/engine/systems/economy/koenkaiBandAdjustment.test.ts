import { describe, it, expect } from "vitest";
import { adjustKoenkaiBandToPrestige } from "@/engine/systems/economy/SponsorshipService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../../utils";
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
  const sponsorMap = new Map(sponsors.map((s) => [s.sponsorId, s]));
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
    const sponsors = [
      makeSponsor("s1", "T1", false),
      makeSponsor("s2", "T2", false),
    ];
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
    const sponsors = [
      makeSponsor("s1", "T1", true),
      makeSponsor("s2", "T2", true),
    ];
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
