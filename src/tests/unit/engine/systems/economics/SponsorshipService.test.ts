import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createKoenkai,
  calculateKoenkaiIncome,
  selectBenefactor,
  applyAchievementImpact,
  computeStarPower,
  processSponsorChurn,
} from "@/engine/systems/economy/SponsorshipService";
import type { WorldState } from "@/engine/types/world";
import type { Sponsor, SponsorPool, Koenkai } from "@/engine/types/sponsors";
import type { Heya } from "@/engine/types/heya";
import { mockRikishi } from "../../utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { rngFromSeed } from "@/engine/rng";

describe("SponsorshipService", () => {
  beforeEach(() => {
    // Reset any singleton state between tests
    vi.clearAllMocks();
  });

  describe("createKoenkai", () => {
    it("creates a koenkai and determines strength band based on prestige", () => {
      const rng = rngFromSeed("test", "sponsorship", "create-koenkai");
      const sponsors = new Map<string, Sponsor>();
      for (let i = 0; i < 10; i++) {
        sponsors.set(`s${i}`, {
          sponsorId: `s${i}`,
          active: true,
          tier: i % 3 === 0 ? "T1" : "T2", // Eligible
          prestigeAffinity: i * 10,
        } as unknown as Sponsor);
      }
      const sponsorPool = { sponsors, koenkais: new Map() } as unknown as SponsorPool;

      const koenkaiElite = createKoenkai("heya-1", sponsorPool, "elite", rng, 1);
      expect(koenkaiElite.strengthBand).toBe("powerful");
      expect(koenkaiElite.heyaId).toBe("heya-1");
      expect(koenkaiElite.members.length).toBeGreaterThan(0);

      const koenkaiWeak = createKoenkai("heya-2", sponsorPool, "weak", rng, 1);
      expect(koenkaiWeak.strengthBand).toBe("weak");
    });
  });

  describe("calculateKoenkaiIncome", () => {
    it("returns expected income for each band", () => {
      expect(calculateKoenkaiIncome("none")).toBe(0);
      expect(calculateKoenkaiIncome("weak")).toBe(500_000);
      expect(calculateKoenkaiIncome("moderate")).toBe(1_500_000);
      expect(calculateKoenkaiIncome("strong")).toBe(3_500_000);
      expect(calculateKoenkaiIncome("powerful")).toBe(7_000_000);
    });
  });

  describe("selectBenefactor", () => {
    it("returns null if koenkai is undefined", () => {
      const sponsorPool = { sponsors: new Map() } as unknown as SponsorPool;
      expect(selectBenefactor("heya-1", sponsorPool, undefined)).toBeNull();
    });

    it("returns null if no pillar with risk appetite >= 50", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", { sponsorId: "s1", riskAppetite: 40 } as unknown as Sponsor],
      ]);
      const koenkai = {
        members: [{ role: "koenkai_pillar", sponsorId: "s1" }],
      } as unknown as Koenkai;
      expect(
        selectBenefactor("heya-1", { sponsors } as unknown as SponsorPool, koenkai)
      ).toBeNull();
    });

    it("returns pillar with highest risk appetite >= 50", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", { sponsorId: "s1", riskAppetite: 60 } as unknown as Sponsor],
        ["s2", { sponsorId: "s2", riskAppetite: 80 } as unknown as Sponsor],
      ]);
      const koenkai = {
        members: [
          { role: "koenkai_pillar", sponsorId: "s1" },
          { role: "koenkai_pillar", sponsorId: "s2" },
        ],
      } as unknown as Koenkai;
      const benefactor = selectBenefactor(
        "heya-1",
        { sponsors } as unknown as SponsorPool,
        koenkai
      );
      expect(benefactor?.sponsorId).toBe("s2");
    });
  });

  describe("applyAchievementImpact", () => {
    it("applies popularity boost based on award type", () => {
      const rikishi = mockRikishi("r1", {
        economics: { popularity: 10, kenshoPerBout: 0, kenshoEarned: 0, koenkaiIds: [] },
      } as any);  
      const world = { rikishi: new Map([["r1", rikishi]]) } as any;

      const impact = applyAchievementImpact(world as WorldState, rikishi, "kinboshi");
      const resolved = resolveImpacts(world, [impact]);
      expect(resolved.rikishi.get("r1")?.economics?.popularity).toBe(30);

      const impact2 = applyAchievementImpact(
        resolved as WorldState,
        resolved.rikishi.get("r1"),
        "ginboshi"
      );
      const resolved2 = resolveImpacts(resolved, [impact2]);
      expect(resolved2.rikishi.get("r1")?.economics?.popularity).toBe(38);

      const impact3 = applyAchievementImpact(
        resolved2 as WorldState,
        resolved2.rikishi.get("r1"),
        "sansho"
      );
      const resolved3 = resolveImpacts(resolved2, [impact3]);
      expect(resolved3.rikishi.get("r1")?.economics?.popularity).toBe(50);
    });

    it("caps popularity at 100", () => {
      const rikishi = mockRikishi("r1", {
        economics: { popularity: 90, kenshoPerBout: 0, kenshoEarned: 0, koenkaiIds: [] },
      } as any);  
      const world = { rikishi: new Map([["r1", rikishi]]) } as any;
      const impact = applyAchievementImpact(world as WorldState, rikishi, "kinboshi");
      const resolved = resolveImpacts(world, [impact]);
      expect(resolved.rikishi.get("r1")?.economics?.popularity).toBe(100);
    });
  });

  describe("computeStarPower", () => {
    it("computes star power based on rikishi ranks", () => {
      const world = {
        rikishi: new Map([
          ["r1", mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" })], // +30
          ["r2", mockRikishi("r2", { rank: "ozeki", division: "makuuchi" })], // +20
          ["r3", mockRikishi("r3", { rank: "sekiwake", division: "makuuchi" })], // +10
          ["r4", mockRikishi("r4", { rank: "maegashira", division: "makuuchi" })], // +5
          ["r5", mockRikishi("r5", { rank: "juryo", division: "juryo" })], // +0
        ]),
      } as unknown as WorldState;

      const heya = {
        id: "heya-1",
        rikishiIds: ["r1", "r2", "r3", "r4", "r5"],
      } as unknown as Heya;

      expect(computeStarPower(heya, world)).toBe(65); // 30+20+10+5
    });

    it("caps star power at 100", () => {
      const world = {
        rikishi: new Map([
          ["r1", mockRikishi("r1", { rank: "yokozuna" })],
          ["r2", mockRikishi("r2", { rank: "yokozuna" })],
          ["r3", mockRikishi("r3", { rank: "yokozuna" })],
          ["r4", mockRikishi("r4", { rank: "yokozuna" })],
        ]),
      } as unknown as WorldState;

      const heya = {
        id: "heya-1",
        rikishiIds: ["r1", "r2", "r3", "r4"],
      } as unknown as Heya;

      expect(computeStarPower(heya, world)).toBe(100); // 4*30 = 120 -> capped 100
    });
  });

  describe("processSponsorChurn", () => {
    const createSponsorsAndKoenkai = (extraSponsor = false) => {
      const sponsors = new Map<string, Sponsor>([
        [
          "s_local",
          {
            sponsorId: "s_local",
            active: true,
            category: "local_business",
            displayName: "Local",
            tier: "T1",
          } as unknown as Sponsor,
        ],
        [
          "s_corp",
          {
            sponsorId: "s_corp",
            active: true,
            category: "national_brand",
            displayName: "Corp",
            tier: "T2",
          } as unknown as Sponsor,
        ],
      ]);
      const members = [
        { sponsorId: "s_local", role: "koenkai_member" },
        { sponsorId: "s_corp", role: "koenkai_pillar" },
      ];
      if (extraSponsor) {
        sponsors.set("s_other", {
          sponsorId: "s_other",
          active: true,
          category: "unknown",
          displayName: "Other",
          tier: "T1",
        } as unknown as Sponsor);
        members.push({ sponsorId: "s_other", role: "koenkai_member" });
      }

      const koenkais = new Map<string, Koenkai>([
        [
          "koenkai_h1",
          {
            koenkaiId: "koenkai_h1",
            heyaId: "h1",
            members,
          } as unknown as Koenkai,
        ],
      ]);
      return { sponsors, koenkais };
    };
    it("returns empty values if no sponsors pool", () => {
      const result = processSponsorChurn({} as WorldState);
      expect(result.metadata?.churned).toEqual([]);
      expect(result.metadata?.retained).toBe(0);
    });

    it("evaluates satisfaction and updates koenkai band", () => {
      const heya = {
        id: "h1",
        name: "Heya 1",
        koenkaiId: "koenkai_h1",
        reputation: 20, // prestige * 0.5 = 10
        scandalScore: 0,
        rikishiIds: [], // star power 0. satisfaction = 10
      } as unknown as Heya;

      const sponsors = new Map<string, Sponsor>([
        // local threshold 20 (satisfaction 10 < 20, churn)
        [
          "s_local",
          {
            sponsorId: "s_local",
            active: true,
            category: "local_business",
            displayName: "Local",
            tier: "T1",
          } as unknown as Sponsor,
        ],
        // corporate threshold 50 (satisfaction 10 < 50, churn)
        [
          "s_corp",
          {
            sponsorId: "s_corp",
            active: true,
            category: "national_brand",
            displayName: "Corp",
            tier: "T2",
          } as unknown as Sponsor,
        ],
      ]);

      const koenkais = new Map<string, Koenkai>([
        [
          "koenkai_h1",
          {
            koenkaiId: "koenkai_h1",
            heyaId: "h1",
            members: [
              { sponsorId: "s_local", role: "koenkai_member" },
              { sponsorId: "s_corp", role: "koenkai_pillar" },
            ],
          } as unknown as Koenkai,
        ],
      ]);

      const world = {
        heyas: new Map([["h1", heya]]),
        rikishi: new Map(),
        sponsorPool: { sponsors, koenkais },
        events: [],
      } as unknown as WorldState;

      const result = processSponsorChurn(world);
      const resolvedWorld = resolveImpacts(world, [result]);
      Object.assign(world, resolvedWorld);

      expect(result.metadata?.churned?.length).toBe(2);
      expect(result.metadata?.churned).toContain("Local");
      expect(result.metadata?.churned).toContain("Corp");
      expect(result.metadata?.retained).toBe(0);
      expect(resolvedWorld.sponsorPool?.sponsors.get("s_local")?.active).toBe(false);

      const updatedKoenkai = resolvedWorld.sponsorPool?.koenkais.get("koenkai_h1");
      expect(updatedKoenkai?.members.length).toBe(0);
      const updatedHeya = resolvedWorld.heyas.get("h1");
      expect(updatedHeya?.koenkaiBand).toBe("none");
    });

    it("retains sponsors if satisfaction is high enough", () => {
      const heya = {
        id: "h1",
        name: "Heya 1",
        koenkaiId: "koenkai_h1",
        reputation: 100, // prestige * 0.5 = 50
        scandalScore: 0,
        rikishiIds: ["r1"], // star power 30 * 0.3 = 9. satisfaction = 59
      } as unknown as Heya;

      const { sponsors, koenkais } = createSponsorsAndKoenkai(true);

      const world = {
        heyas: new Map([["h1", heya]]),
        rikishi: new Map([["r1", mockRikishi("r1", { rank: "yokozuna" })]]),
        sponsorPool: { sponsors, koenkais },
        events: [],
      } as unknown as WorldState;

      const result = processSponsorChurn(world);
      const resolvedWorld = resolveImpacts(world, [result]);
      Object.assign(world, resolvedWorld);

      expect(result.metadata?.churned?.length).toBe(1);
      expect(result.metadata?.churned).toContain("Other");
      expect(result.metadata?.retained).toBe(2);
      expect(resolvedWorld.sponsorPool?.sponsors.get("s_other")?.active).toBe(false);
      expect(resolvedWorld.sponsorPool?.sponsors.get("s_local")?.active).toBe(true);

      const updatedKoenkai = resolvedWorld.sponsorPool?.koenkais.get("koenkai_h1");
      expect(updatedKoenkai?.members.length).toBe(2);
      const updatedHeya = resolvedWorld.heyas.get("h1");
      expect(updatedHeya?.koenkaiBand).toBe("none"); // member count < 5 -> none
    });
  });
});
