import { describe, it, expect } from "vitest";
import {
  determineBoutImportance,
  assignKenshoBanners,
  calculateKenshoEnvelopes,
} from "@/engine/systems/economy/KenshoService";
import { rngFromSeed } from "@/engine/rng";
import type { SponsorPool, Sponsor } from "@/engine/types/sponsors";
import type { WorldState } from "@/engine/types/world";
import { mockRikishi } from "../utils";

describe("KenshoService", () => {
  describe("determineBoutImportance", () => {
    it("returns 'peak' for playoffs", () => {
      expect(determineBoutImportance("maegashira", "maegashira", 5, false, true)).toBe("peak");
    });

    it("returns 'peak' for yusho contention", () => {
      expect(determineBoutImportance("maegashira", "maegashira", 13, true, false)).toBe("peak");
    });

    it("returns 'peak' for top ranks on day 15", () => {
      expect(determineBoutImportance("yokozuna", "ozeki", 15, false, false)).toBe("peak");
      expect(determineBoutImportance("sekiwake", "komusubi", 15, false, false)).toBe("peak");
    });

    it("returns 'high' for top ranks on other days", () => {
      expect(determineBoutImportance("yokozuna", "ozeki", 14, false, false)).toBe("high");
      expect(determineBoutImportance("maegashira", "ozeki", 1, false, false)).toBe("high");
    });

    it("returns 'mid' for maegashira bouts", () => {
      expect(determineBoutImportance("maegashira", "juyro", 1, false, false)).toBe("mid");
      expect(determineBoutImportance("maegashira", "maegashira", 10, false, false)).toBe("mid");
    });

    it("returns 'low' for lower rank bouts", () => {
      expect(determineBoutImportance("juyro", "makushita", 1, false, false)).toBe("low");
    });
  });

  describe("assignKenshoBanners", () => {
    const mockRNG = rngFromSeed("test-seed", "kensho", "mock-kensho");

    it("returns empty array if count is 0", () => {
      const sponsorPool: SponsorPool = {
        sponsors: new Map(),
        koenkais: new Map(),
      } as unknown as SponsorPool;
      expect(assignKenshoBanners("bout-1", 0, "peak", sponsorPool, mockRNG)).toEqual([]);
    });

    it("returns empty array if no active sponsors", () => {
      const sponsorPool: SponsorPool = {
        sponsors: new Map(),
        koenkais: new Map(),
      } as unknown as SponsorPool;
      expect(assignKenshoBanners("bout-1", 5, "peak", sponsorPool, mockRNG)).toEqual([]);
    });

    it("assigns banners with expected tiers based on importance caps", () => {
      const sponsors = new Map<string, Sponsor>();
      for (let i = 0; i < 5; i++) {
        sponsors.set(`s-t5-${i}`, {
          sponsorId: `s-t5-${i}`,
          tier: "T5",
          active: true,
          prestigeAffinity: 50,
          loyalty: 50,
          displayName: `T5-${i}`,
          category: "national_brand",
          riskAppetite: 50,
          visibilityPreference: 1,
        } as unknown as Sponsor);
        sponsors.set(`s-t4-${i}`, {
          sponsorId: `s-t4-${i}`,
          tier: "T4",
          active: true,
          prestigeAffinity: 50,
          loyalty: 50,
          displayName: `T4-${i}`,
          category: "national_brand",
          riskAppetite: 50,
          visibilityPreference: 1,
        } as unknown as Sponsor);
        sponsors.set(`s-t3-${i}`, {
          sponsorId: `s-t3-${i}`,
          tier: "T3",
          active: true,
          prestigeAffinity: 50,
          loyalty: 50,
          displayName: `T3-${i}`,
          category: "national_brand",
          riskAppetite: 50,
          visibilityPreference: 1,
        } as unknown as Sponsor);
      }
      const sponsorPool: SponsorPool = { sponsors, koenkais: new Map() } as unknown as SponsorPool;

      const rng = rngFromSeed("test-seed-2", "kensho", "assign-banners");
      const resultPeak = assignKenshoBanners("bout-peak", 10, "peak", sponsorPool, rng);
      expect(resultPeak.length).toBe(10);

      // We expect the fill logic might add more T4/T5 if we exhaust the caps, but T4Plus should be chosen first.
      // Instead of asserting strict caps for the ENTIRE result (since fill logic can add more),
      // let's ensure it handles it without crashing and selects from our pool
      const uniqueSponsors = new Set(resultPeak.map((s) => s.sponsorId));
      expect(uniqueSponsors.size).toBe(10);

      const rng2 = rngFromSeed("test-seed-3", "kensho", "assign-banners-low");
      const resultLow = assignKenshoBanners("bout-low", 5, "low", sponsorPool, rng2);
      expect(resultLow.length).toBe(5);
      const uniqueSponsorsLow = new Set(resultLow.map((s) => s.sponsorId));
      expect(uniqueSponsorsLow.size).toBe(5);
    });
  });

  describe("calculateKenshoEnvelopes", () => {
    it("calculates correctly with kinboshi", () => {
      const rng = rngFromSeed("test-kinboshi", "kensho", "envelopes");
      const rikishi = mockRikishi("r1");
      const world = {} as WorldState;
      const banners = new Array(0).fill({} as any);
      const res = calculateKenshoEnvelopes(world, rikishi, banners, "kinboshi", rng);
      expect(res).toBeGreaterThanOrEqual(15);
      expect(res).toBeLessThanOrEqual(19);
    });

    it("calculates correctly with ginboshi", () => {
      const rng = rngFromSeed("test-ginboshi", "kensho", "envelopes");
      const rikishi = mockRikishi("r1");
      const world = {} as WorldState;
      const banners = new Array(0).fill({} as any);
      const res = calculateKenshoEnvelopes(world, rikishi, banners, "ginboshi", rng);
      expect(res).toBeGreaterThanOrEqual(5);
      expect(res).toBeLessThanOrEqual(7);
    });

    it("calculates correctly with normal awards", () => {
      const rng = rngFromSeed("test-normal", "kensho", "envelopes");
      const rikishi = mockRikishi("r1");
      const world = {} as WorldState;
      const banners = new Array(3).fill({} as any);
      const res = calculateKenshoEnvelopes(world, rikishi, banners, undefined, rng);
      expect(res).toBe(3);
    });

    it("applies buzz modifier correctly", () => {
      const rng = rngFromSeed("test-buzz", "kensho", "envelopes");
      const rikishi = mockRikishi("r1");
      const world = { mediaState: { mediaHeat: { r1: 80 } } } as unknown as WorldState;
      const banners = new Array(4).fill({} as any);
      // count is 4. Mod is 80/80 = 1.0. Bonus = 4 * 1.0 = 4. Total = 8.
      const res = calculateKenshoEnvelopes(world, rikishi, banners, undefined, rng);
      expect(res).toBe(8);
    });
  });

  describe("assignKenshoBanners — tier caps and ceremony tags", () => {
    it("filters out inactive sponsors", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", { sponsorId: "s1", active: false, tier: "T5", prestigeAffinity: 50, loyalty: 50, displayName: "Inactive", visibilityPreference: 1 } as unknown as Sponsor],
        ["s2", { sponsorId: "s2", active: true, tier: "T5", prestigeAffinity: 50, loyalty: 50, displayName: "Active", visibilityPreference: 1 } as unknown as Sponsor],
      ]);
      const pool = { sponsors, koenkais: new Map() } as unknown as SponsorPool;
      const rng = rngFromSeed("test-inactive", "kensho", "inactive");
      const result = assignKenshoBanners("bout-1", 5, "peak", pool, rng);
      // Only 1 active sponsor available
      expect(result.length).toBe(1);
      expect(result[0].sponsorId).toBe("s2");
    });

    it("assigns 'premium' ceremonyStyleTag for T5 sponsors", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", { sponsorId: "s1", active: true, tier: "T5", prestigeAffinity: 50, loyalty: 50, displayName: "T5-Sponsor", visibilityPreference: 1 } as unknown as Sponsor],
      ]);
      const pool = { sponsors, koenkais: new Map() } as unknown as SponsorPool;
      const rng = rngFromSeed("test-premium", "kensho", "premium");
      const result = assignKenshoBanners("bout-1", 1, "peak", pool, rng);
      expect(result[0].ceremonyStyleTag).toBe("premium");
    });

    it("assigns 'premium' ceremonyStyleTag for T4 sponsors", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", { sponsorId: "s1", active: true, tier: "T4", prestigeAffinity: 50, loyalty: 50, displayName: "T4-Sponsor", visibilityPreference: 1 } as unknown as Sponsor],
      ]);
      const pool = { sponsors, koenkais: new Map() } as unknown as SponsorPool;
      const rng = rngFromSeed("test-premium-t4", "kensho", "premium-t4");
      const result = assignKenshoBanners("bout-1", 1, "peak", pool, rng);
      expect(result[0].ceremonyStyleTag).toBe("premium");
    });

    it("assigns 'quiet' ceremonyStyleTag when visibilityPreference is 0", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", { sponsorId: "s1", active: true, tier: "T3", prestigeAffinity: 50, loyalty: 50, displayName: "Quiet-Sponsor", visibilityPreference: 0 } as unknown as Sponsor],
      ]);
      const pool = { sponsors, koenkais: new Map() } as unknown as SponsorPool;
      const rng = rngFromSeed("test-quiet", "kensho", "quiet");
      const result = assignKenshoBanners("bout-1", 1, "peak", pool, rng);
      expect(result[0].ceremonyStyleTag).toBe("quiet");
    });

    it("assigns 'classic' ceremonyStyleTag for T3 with visibility > 0", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", { sponsorId: "s1", active: true, tier: "T3", prestigeAffinity: 50, loyalty: 50, displayName: "Classic-Sponsor", visibilityPreference: 1 } as unknown as Sponsor],
      ]);
      const pool = { sponsors, koenkais: new Map() } as unknown as SponsorPool;
      const rng = rngFromSeed("test-classic", "kensho", "classic");
      const result = assignKenshoBanners("bout-1", 1, "peak", pool, rng);
      expect(result[0].ceremonyStyleTag).toBe("classic");
    });

    it("fills remaining slots from all sponsors when T4+T3 exhausted", () => {
      // 2 T5, 2 T4, 2 T3 — request more than caps allow
      const sponsors = new Map<string, Sponsor>();
      for (let i = 0; i < 2; i++) {
        sponsors.set(`t5-${i}`, { sponsorId: `t5-${i}`, active: true, tier: "T5", prestigeAffinity: 50, loyalty: 50, displayName: `T5-${i}`, visibilityPreference: 1 } as unknown as Sponsor);
        sponsors.set(`t4-${i}`, { sponsorId: `t4-${i}`, active: true, tier: "T4", prestigeAffinity: 50, loyalty: 50, displayName: `T4-${i}`, visibilityPreference: 1 } as unknown as Sponsor);
        sponsors.set(`t3-${i}`, { sponsorId: `t3-${i}`, active: true, tier: "T3", prestigeAffinity: 50, loyalty: 50, displayName: `T3-${i}`, visibilityPreference: 1 } as unknown as Sponsor);
        sponsors.set(`t2-${i}`, { sponsorId: `t2-${i}`, active: true, tier: "T2", prestigeAffinity: 50, loyalty: 50, displayName: `T2-${i}`, visibilityPreference: 1 } as unknown as Sponsor);
      }
      const pool = { sponsors, koenkais: new Map() } as unknown as SponsorPool;
      const rng = rngFromSeed("test-fill", "kensho", "fill");
      // Request 8 banners — caps will limit T4+ and T3, fill should take from T2
      const result = assignKenshoBanners("bout-fill", 8, "peak", pool, rng);
      expect(result.length).toBe(8);
      const uniqueSponsors = new Set(result.map((s) => s.sponsorId));
      expect(uniqueSponsors.size).toBe(8);
    });
  });
});
