import { describe, it, expect } from "vitest";
import {
  createKoenkai,
  calculateKoenkaiIncome,
  selectBenefactor,
  applyAchievementImpact,
  computeStarPower,
  processSponsorChurn
} from "../SponsorshipService";
import { RNGRegistry } from "../../../core/RNGRegistry";
import type { SponsorPool, Sponsor, Koenkai, KoenkaiBandType } from "../../../types/sponsors";
import type { WorldState } from "../../../types/world";
import type { Heya } from "../../../types/heya";
import { mockRikishi } from "../../../__tests__/utils";

describe("SponsorshipService", () => {
  describe("createKoenkai", () => {
    it("creates a koenkai and determines strength band based on prestige", () => {
      const rng = RNGRegistry.getSystemRNG({ seed: "test" } as WorldState, "matchmaking");
      const sponsors = new Map<string, Sponsor>();
      for (let i = 0; i < 10; i++) {
        sponsors.set(`s${i}`, {
          sponsorId: `s${i}`,
          active: true,
          tier: i % 3 === 0 ? "T1" : "T2", // Eligible
          prestigeAffinity: i * 10
        } as Sponsor);
      }
      const sponsorPool = { sponsors, availableSponsors: [] } as SponsorPool;

      const koenkaiElite = createKoenkai("heya-1", sponsorPool, "elite", rng, 1);
      expect(koenkaiElite.strengthBand).toBe("powerful");
      expect(koenkaiElite.beyaId).toBe("heya-1");
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
      const sponsorPool = { sponsors: new Map() } as SponsorPool;
      const rng = RNGRegistry.getSystemRNG({ seed: "test" } as WorldState, "matchmaking");
      expect(selectBenefactor("heya-1", sponsorPool, undefined, rng)).toBeNull();
    });

    it("returns null if no pillar with risk appetite >= 50", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", { sponsorId: "s1", riskAppetite: 40 } as Sponsor]
      ]);
      const koenkai = {
        members: [{ role: "koenkai_pillar", sponsorId: "s1" }]
      } as Koenkai;
      const rng = RNGRegistry.getSystemRNG({ seed: "test" } as WorldState, "matchmaking");
      expect(selectBenefactor("heya-1", { sponsors } as SponsorPool, koenkai, rng)).toBeNull();
    });

    it("returns pillar with highest risk appetite >= 50", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", { sponsorId: "s1", riskAppetite: 60 } as Sponsor],
        ["s2", { sponsorId: "s2", riskAppetite: 80 } as Sponsor]
      ]);
      const koenkai = {
        members: [
          { role: "koenkai_pillar", sponsorId: "s1" },
          { role: "koenkai_pillar", sponsorId: "s2" }
        ]
      } as Koenkai;
      const rng = RNGRegistry.getSystemRNG({ seed: "test" } as WorldState, "matchmaking");
      const benefactor = selectBenefactor("heya-1", { sponsors } as SponsorPool, koenkai, rng);
      expect(benefactor?.sponsorId).toBe("s2");
    });
  });

  describe("applyAchievementImpact", () => {
    it("applies popularity boost based on award type", () => {
      const rikishi = mockRikishi("r1", { economics: { popularity: 10, kenshoPerBout: 0, kenshoEarned: 0, koenkaiIds: [] } } as any);

      applyAchievementImpact({} as WorldState, rikishi, "kinboshi");
      expect(rikishi.economics?.popularity).toBe(30);

      applyAchievementImpact({} as WorldState, rikishi, "ginboshi");
      expect(rikishi.economics?.popularity).toBe(38);

      applyAchievementImpact({} as WorldState, rikishi, "sansho");
      expect(rikishi.economics?.popularity).toBe(50);
    });

    it("caps popularity at 100", () => {
      const rikishi = mockRikishi("r1", { economics: { popularity: 90, kenshoPerBout: 0, kenshoEarned: 0, koenkaiIds: [] } } as any);
      applyAchievementImpact({} as WorldState, rikishi, "kinboshi");
      expect(rikishi.economics?.popularity).toBe(100);
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
          ["r5", mockRikishi("r5", { rank: "juyro", division: "juyro" })] // +0
        ])
      } as unknown as WorldState;

      const heya = {
        id: "heya-1",
        rikishiIds: ["r1", "r2", "r3", "r4", "r5"]
      } as Heya;

      expect(computeStarPower(heya, world)).toBe(65); // 30+20+10+5
    });

    it("caps star power at 100", () => {
      const world = {
        rikishi: new Map([
          ["r1", mockRikishi("r1", { rank: "yokozuna" })],
          ["r2", mockRikishi("r2", { rank: "yokozuna" })],
          ["r3", mockRikishi("r3", { rank: "yokozuna" })],
          ["r4", mockRikishi("r4", { rank: "yokozuna" })]
        ])
      } as unknown as WorldState;

      const heya = {
        id: "heya-1",
        rikishiIds: ["r1", "r2", "r3", "r4"]
      } as Heya;

      expect(computeStarPower(heya, world)).toBe(100); // 4*30 = 120 -> capped 100
    });
  });

  describe("processSponsorChurn", () => {
    it("returns empty values if no sponsors pool", () => {
      expect(processSponsorChurn({} as WorldState)).toEqual({ churned: [], retained: 0 });
    });

    it("evaluates satisfaction and updates koenkai band", () => {
      const heya = {
        id: "h1",
        name: "Heya 1",
        reputation: 20, // prestige * 0.5 = 10
        scandalScore: 0,
        rikishiIds: [] // star power 0. satisfaction = 10
      } as unknown as Heya;

      const sponsors = new Map<string, Sponsor>([
        // local threshold 20 (satisfaction 10 < 20, churn)
        ["s_local", { sponsorId: "s_local", active: true, category: "local_business", displayName: "Local" } as Sponsor],
        // corporate threshold 50 (satisfaction 10 < 50, churn)
        ["s_corp", { sponsorId: "s_corp", active: true, category: "national_brand", displayName: "Corp" } as Sponsor]
      ]);

      const koenkais = new Map<string, Koenkai>([
        ["koenkai_h1", {
          koenkaiId: "koenkai_h1",
          beyaId: "h1",
          members: [
            { sponsorId: "s_local", role: "koenkai_member" },
            { sponsorId: "s_corp", role: "koenkai_pillar" }
          ]
        } as Koenkai]
      ]);

      const world = {
        heyas: new Map([["h1", heya]]),
        rikishi: new Map(),
        sponsorPool: { sponsors, koenkais },
        events: []
      } as unknown as WorldState;

      // Ensure EventBus doesn't fail
      const result = processSponsorChurn(world);

      expect(result.churned.length).toBe(2);
      expect(result.churned).toContain("Local");
      expect(result.churned).toContain("Corp");
      expect(result.retained).toBe(0);
      expect(sponsors.get("s_local")?.active).toBe(false);

      const updatedKoenkai = koenkais.get("koenkai_h1");
      expect(updatedKoenkai?.members.length).toBe(0);
      expect(heya.koenkaiBand).toBe("none");
    });

    it("retains sponsors if satisfaction is high enough", () => {
      const heya = {
        id: "h1",
        name: "Heya 1",
        reputation: 100, // prestige * 0.5 = 50
        scandalScore: 0,
        rikishiIds: ["r1"] // star power 30 * 0.3 = 9. satisfaction = 59
      } as unknown as Heya;

      const sponsors = new Map<string, Sponsor>([
        // local threshold 20 (satisfaction 59 > 20, retain)
        ["s_local", { sponsorId: "s_local", active: true, category: "local_business", displayName: "Local" } as Sponsor],
        // corporate threshold 50 (satisfaction 59 > 50, retain)
        ["s_corp", { sponsorId: "s_corp", active: true, category: "national_brand", displayName: "Corp" } as Sponsor],
        // national threshold 70 (satisfaction 59 < 70, churn) - wait, national_brand is 'corporate' so threshold is 50. Let's do another one
        // actually threshold for non-local/corporate is 70
        ["s_other", { sponsorId: "s_other", active: true, category: "unknown", displayName: "Other" } as Sponsor]
      ]);

      const koenkais = new Map<string, Koenkai>([
        ["koenkai_h1", {
          koenkaiId: "koenkai_h1",
          beyaId: "h1",
          members: [
            { sponsorId: "s_local", role: "koenkai_member" },
            { sponsorId: "s_corp", role: "koenkai_pillar" },
            { sponsorId: "s_other", role: "koenkai_member" }
          ]
        } as Koenkai]
      ]);

      const world = {
        heyas: new Map([["h1", heya]]),
        rikishi: new Map([["r1", mockRikishi("r1", { rank: "yokozuna" })]]),
        sponsorPool: { sponsors, koenkais },
        events: []
      } as unknown as WorldState;

      const result = processSponsorChurn(world);

      expect(result.churned.length).toBe(1);
      expect(result.churned).toContain("Other");
      expect(result.retained).toBe(2);
      expect(sponsors.get("s_other")?.active).toBe(false);
      expect(sponsors.get("s_local")?.active).toBe(true);

      const updatedKoenkai = koenkais.get("koenkai_h1");
      expect(updatedKoenkai?.members.length).toBe(2);
      expect(heya.koenkaiBand).toBe("moderate"); // member count <= 4 -> moderate
    });
  });
});
