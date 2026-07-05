import { describe, it, expect } from "vitest";
import {
  computeHeyaPrestigeScore,
  targetKoenkaiBandFromPrestige,
  recalculateKoenkaiBand,
  adjustKoenkaiBandToPrestige,
} from "@/engine/systems/economy/SponsorshipService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockHeya, makeMockWorld, mockRikishi } from "../../utils";
import type { Koenkai, Sponsor, SponsorPool } from "@/engine/types/sponsors";
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("computeHeyaPrestigeScore", () => {
  it("yokozuna contributes 40 points", () => {
    const r = mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(40);
  });

  it("ozeki contributes 30 points", () => {
    const r = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(30);
  });

  it("sekiwake contributes 20 points", () => {
    const r = mockRikishi("r1", { rank: "sekiwake", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(20);
  });

  it("komusubi contributes 15 points", () => {
    const r = mockRikishi("r1", { rank: "komusubi", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(15);
  });

  it("maegashira contributes 8 points", () => {
    const r = mockRikishi("r1", { rank: "maegashira", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(8);
  });

  it("juryo contributes 4 points", () => {
    const r = mockRikishi("r1", { rank: "juryo", division: "juryo" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(4);
  });

  it("capped at 100", () => {
    const rikishi: any[] = [];
    const rikishiMap = new Map();
    for (let i = 0; i < 4; i++) {
      const r = mockRikishi(`r${i}`, { rank: "yokozuna", division: "makuuchi" });
      rikishi.push(r);
      rikishiMap.set(`r${i}`, r);
    }
    const heya = makeMockHeya("h1", {
      rikishiIds: rikishi.map((r) => r.id),
    });
    const world = makeMockWorld({
      rikishi: rikishiMap,
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(100);
  });

  it("empty roster → 0", () => {
    const heya = makeMockHeya("h1", { rikishiIds: [] });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(0);
  });
});

describe("targetKoenkaiBandFromPrestige", () => {
  it("prestige ≥80 → powerful", () => {
    expect(targetKoenkaiBandFromPrestige(80)).toBe("powerful");
    expect(targetKoenkaiBandFromPrestige(100)).toBe("powerful");
  });

  it("prestige ≥55 → strong", () => {
    expect(targetKoenkaiBandFromPrestige(55)).toBe("strong");
    expect(targetKoenkaiBandFromPrestige(79)).toBe("strong");
  });

  it("prestige ≥30 → moderate", () => {
    expect(targetKoenkaiBandFromPrestige(30)).toBe("moderate");
    expect(targetKoenkaiBandFromPrestige(54)).toBe("moderate");
  });

  it("prestige ≥10 → weak", () => {
    expect(targetKoenkaiBandFromPrestige(10)).toBe("weak");
    expect(targetKoenkaiBandFromPrestige(29)).toBe("weak");
  });

  it("prestige <10 → none", () => {
    expect(targetKoenkaiBandFromPrestige(0)).toBe("none");
    expect(targetKoenkaiBandFromPrestige(9)).toBe("none");
  });
});

describe("recalculateKoenkaiBand — prestige-based", () => {
  it("heya with 2 yokozuna → prestige 80 → powerful", () => {
    const r1 = mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" });
    const r2 = mockRikishi("r2", { rank: "yokozuna", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1", "r2"] });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      heyas: new Map([["h1", heya]]),
    });
    expect(recalculateKoenkaiBand(heya, world)).toBe("powerful");
  });

  it("heya with 1 ozeki → prestige 30 → moderate", () => {
    const r = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(recalculateKoenkaiBand(heya, world)).toBe("moderate");
  });

  it("heya with only makushita → prestige 0 → none", () => {
    const r = mockRikishi("r1", { rank: "makushita", division: "makushita" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(recalculateKoenkaiBand(heya, world)).toBe("none");
  });
});

describe("adjustKoenkaiBandToPrestige", () => {
  function makeWorldWithKoenkai(
    heyaRikishiIds: string[],
    rikishiMap: Map<string, any>,
    currentBand: any,
    members: any[] = []
  ) {
    const heya = makeMockHeya("h1", { rikishiIds: heyaRikishiIds, koenkaiId: "k1" });
    const koenkai: Koenkai = {
      koenkaiId: "k1",
      heyaId: "h1",
      strengthBand: currentBand,
      members,
      createdAtTick: 0,
      lastChangedTick: 0,
    } as any;
    const sponsorPool: SponsorPool = {
      sponsors: new Map<string, Sponsor>(),
      koenkais: new Map([["k1", koenkai]]),
    } as any;
    return makeMockWorld({
      rikishi: rikishiMap,
      heyas: new Map([["h1", heya]]),
      sponsorPool,
    } as any);
  }

  it("downgrades band when prestige drops (powerful → none)", () => {
    const r = mockRikishi("r1", { rank: "makushita", division: "makushita" });
    const world = makeWorldWithKoenkai(
      ["r1"],
      new Map([["r1", r]]),
      "powerful",
      [
        { relId: "sr1", sponsorId: "s1", targetType: "heya", targetId: "h1", role: "koenkai_member", strength: 2, startedAtTick: 0 },
        { relId: "sr2", sponsorId: "s2", targetType: "heya", targetId: "h1", role: "koenkai_pillar", strength: 4, startedAtTick: 0 },
      ]
    );

    const impact = adjustKoenkaiBandToPrestige(world);
    const resolved = resolveImpacts(world, [impact]);

    const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1");
    expect(updatedKoenkai?.strengthBand).toBe("none");
    expect(updatedKoenkai?.members.length).toBe(0);
    expect(resolved.heyas.get("h1")?.koenkaiBand).toBe("none");
  });

  it("downgrades band and trims weakest members proportional to gap", () => {
    const r = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" }); // prestige 30 → moderate
    const world = makeWorldWithKoenkai(
      ["r1"],
      new Map([["r1", r]]),
      "powerful", // gap = 2 (powerful → strong → moderate)
      [
        { relId: "sr1", sponsorId: "s1", targetType: "heya", targetId: "h1", role: "koenkai_member", strength: 1, startedAtTick: 0 },
        { relId: "sr2", sponsorId: "s2", targetType: "heya", targetId: "h1", role: "koenkai_member", strength: 2, startedAtTick: 0 },
        { relId: "sr3", sponsorId: "s3", targetType: "heya", targetId: "h1", role: "koenkai_pillar", strength: 4, startedAtTick: 0 },
      ]
    );

    const impact = adjustKoenkaiBandToPrestige(world);
    const resolved = resolveImpacts(world, [impact]);

    const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1");
    expect(updatedKoenkai?.strengthBand).toBe("moderate");
    // gap = 2, so 2 weakest members removed (strength 1 and 2), leaving the pillar
    expect(updatedKoenkai?.members.length).toBe(1);
    expect(updatedKoenkai?.members[0].sponsorId).toBe("s3");
  });

  it("upgrades band when prestige rises (none → moderate)", () => {
    const r = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" }); // prestige 30 → moderate
    const sponsors = new Map<string, Sponsor>([
      ["s1", { sponsorId: "s1", active: false, tier: "T2" } as any],
      ["s2", { sponsorId: "s2", active: false, tier: "T1" } as any],
    ]);
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"], koenkaiId: "k1" });
    const koenkai: Koenkai = {
      koenkaiId: "k1",
      heyaId: "h1",
      strengthBand: "none",
      members: [],
      createdAtTick: 0,
      lastChangedTick: 0,
    } as any;
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
      sponsorPool: { sponsors, koenkais: new Map([["k1", koenkai]]) } as any,
    } as any);

    const impact = adjustKoenkaiBandToPrestige(world);
    const resolved = resolveImpacts(world, [impact]);

    const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1");
    expect(updatedKoenkai?.strengthBand).toBe("moderate");
    // gap = 3, capped at 2 new members
    expect(updatedKoenkai?.members.length).toBe(2);
    expect(resolved.sponsorPool?.sponsors.get("s1")?.active).toBe(true);
    expect(resolved.sponsorPool?.sponsors.get("s2")?.active).toBe(true);
    expect(resolved.heyas.get("h1")?.koenkaiBand).toBe("moderate");
  });

  it("no change when band already matches prestige", () => {
    const r = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" }); // prestige 30 → moderate
    const world = makeWorldWithKoenkai(
      ["r1"],
      new Map([["r1", r]]),
      "moderate",
      [{ relId: "sr1", sponsorId: "s1", targetType: "heya", targetId: "h1", role: "koenkai_member", strength: 2, startedAtTick: 0 }]
    );

    const impact = adjustKoenkaiBandToPrestige(world);
    const resolved = resolveImpacts(world, [impact]);

    const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1");
    expect(updatedKoenkai?.strengthBand).toBe("moderate");
    expect(updatedKoenkai?.members.length).toBe(1);
  });

  it("handles empty sponsor pool gracefully", () => {
    const r = mockRikishi("r1", { rank: "makushita", division: "makushita" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"], koenkaiId: "k1" });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    } as any);

    const impact = adjustKoenkaiBandToPrestige(world);
    expect(impact).toBeDefined();
  });
});
