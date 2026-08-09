import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createKoenkai,
  calculateKoenkaiIncome,
  selectBenefactor,
  applyAchievementImpact,
  computeStarPower,
  processSponsorChurn,
  recruitSponsor,
  computeHeyaPrestigeScore,
  targetKoenkaiBandFromPrestige,
  recalculateKoenkaiBand,
  adjustKoenkaiBandToPrestige,
} from "@/engine/systems/economy/SponsorshipService";
import type { WorldState } from "@/engine/types/world";
import type {
  Sponsor,
  SponsorPool,
  Koenkai,
  KoenkaiBandType,
  SponsorRelationship,
} from "@/engine/types/sponsors";
import type { Heya } from "@/engine/types/heya";
import { mockRikishi } from "../utils";
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
        resolved.rikishi.get("r1")!,
        "ginboshi"
      );
      const resolved2 = resolveImpacts(resolved, [impact2]);
      expect(resolved2.rikishi.get("r1")?.economics?.popularity).toBe(38);

      const impact3 = applyAchievementImpact(
        resolved2 as WorldState,
        resolved2.rikishi.get("r1")!,
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
          category: "anonymous_patron",
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

      const metadata = result.metadata as { churned?: string[]; retained?: number } | undefined;
      expect(metadata?.churned?.length).toBe(2);
      expect(metadata?.churned).toContain("Local");
      expect(metadata?.churned).toContain("Corp");
      expect(metadata?.retained).toBe(0);
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
        reputation: 100,
        scandalScore: 0,
        // prestige = 40 (yokozuna) + 8 (maegashira) = 48
        // starPower = 30 (yokozuna) + 5 (maegashira) = 35; satisfaction = 48 + 35*0.3 = 58.5
        rikishiIds: ["r1", "r2"],
      } as unknown as Heya;

      const { sponsors, koenkais } = createSponsorsAndKoenkai(true);

      const world = {
        heyas: new Map([["h1", heya]]),
        rikishi: new Map([
          ["r1", mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" })],
          ["r2", mockRikishi("r2", { rank: "maegashira", division: "makuuchi" })],
        ]),
        sponsorPool: { sponsors, koenkais },
        events: [],
      } as unknown as WorldState;

      const result = processSponsorChurn(world);
      const resolvedWorld = resolveImpacts(world, [result]);
      Object.assign(world, resolvedWorld);

      const metadata2 = result.metadata as { churned?: string[]; retained?: number } | undefined;
      expect(metadata2?.churned?.length).toBe(1);
      expect(metadata2?.churned).toContain("Other");
      expect(metadata2?.retained).toBe(2);
      expect(resolvedWorld.sponsorPool?.sponsors.get("s_other")?.active).toBe(false);
      expect(resolvedWorld.sponsorPool?.sponsors.get("s_local")?.active).toBe(true);

      const updatedKoenkai = resolvedWorld.sponsorPool?.koenkais.get("koenkai_h1");
      expect(updatedKoenkai?.members.length).toBe(2);
      const updatedHeya = resolvedWorld.heyas.get("h1");
      expect(updatedHeya?.koenkaiBand).toBe("moderate"); // prestige 48 >= 30 -> moderate
    });
  });

  // ── recruitSponsor ─────────────────────────────────────────────────────

  describe("recruitSponsor", () => {
    const rng = rngFromSeed("test", "sponsorship", "recruit");

    const setupWorld = (
      opts: {
        funds?: number;
        sponsorTier?: any;
        sponsorActive?: boolean;
        existingMember?: boolean;
      } = {}
    ) => {
      const sponsor: Sponsor = {
        sponsorId: "sp1",
        active: opts.sponsorActive ?? true,
        tier: opts.sponsorTier ?? "T2",
        displayName: "Test Sponsor",
        prestigeAffinity: 50,
        riskAppetite: 50,
      } as unknown as Sponsor;

      const members = opts.existingMember
        ? [{ sponsorId: "sp1", role: "koenkai_member", strength: 2 }]
        : [];

      const koenkai: Koenkai = {
        koenkaiId: "k1",
        heyaId: "h1",
        strengthBand: "moderate",
        members,
      } as unknown as Koenkai;

      const heya: Heya = {
        id: "h1",
        funds: opts.funds ?? 10_000_000,
        rikishiIds: [],
      } as unknown as Heya;

      const world = {
        heyas: new Map([["h1", heya]]),
        rikishi: new Map(),
        sponsorPool: {
          sponsors: new Map([["sp1", sponsor]]),
          koenkais: new Map([["h1", koenkai]]),
        },
        week: 1,
      } as unknown as WorldState;

      return { world, heya, sponsor, koenkai };
    };

    it("returns empty impact when no sponsorPool", () => {
      const world = { heyas: new Map(), rikishi: new Map() } as unknown as WorldState;
      const impact = recruitSponsor(world, "h1", "sp1", rng);
      expect(impact.events ?? []).toHaveLength(0);
    });

    it("returns empty impact when heya not found", () => {
      const { world } = setupWorld();
      const impact = recruitSponsor(world, "nonexistent", "sp1", rng);
      expect(impact.events ?? []).toHaveLength(0);
    });

    it("returns empty impact when sponsor not found", () => {
      const { world } = setupWorld();
      const impact = recruitSponsor(world, "h1", "nonexistent", rng);
      expect(impact.events ?? []).toHaveLength(0);
    });

    it("returns empty impact when sponsor is inactive", () => {
      const { world } = setupWorld({ sponsorActive: false });
      const impact = recruitSponsor(world, "h1", "sp1", rng);
      expect(impact.events ?? []).toHaveLength(0);
    });

    it("returns empty impact when sponsor already in koenkai", () => {
      const { world } = setupWorld({ existingMember: true });
      const impact = recruitSponsor(world, "h1", "sp1", rng);
      expect(impact.events ?? []).toHaveLength(0);
    });

    it("returns empty impact when heya has insufficient funds", () => {
      const { world } = setupWorld({ funds: 100, sponsorTier: "T5" });
      const impact = recruitSponsor(world, "h1", "sp1", rng);
      expect(impact.events ?? []).toHaveLength(0);
    });

    it("deducts recruitment cost and adds sponsor to koenkai", () => {
      const { world, heya } = setupWorld({ funds: 10_000_000, sponsorTier: "T2" });
      const impact = recruitSponsor(world, "h1", "sp1", rng);
      const resolved = resolveImpacts(world, [impact]);

      const updatedHeya = resolved.heyas.get("h1")!;
      // T2 cost = 400,000
      expect(updatedHeya.funds).toBe(10_000_000 - 400_000);

      const updatedKoenkai = resolved.sponsorPool?.koenkais.get("h1")!;
      expect(updatedKoenkai.members.length).toBe(1);
      expect(updatedKoenkai.members[0].sponsorId).toBe("sp1");

      // Check event logged
      const hasEvent = impact.events?.some(
        (e: any) => e.type === "RECRUIT_DISCOVERED" && e.data?.sponsorId === "sp1"
      );
      expect(hasEvent).toBe(true);
    });
  });

  // ── computeHeyaPrestigeScore ───────────────────────────────────────────

  describe("computeHeyaPrestigeScore", () => {
    it("sums prestige weights for roster ranks", () => {
      const world = {
        rikishi: new Map([
          ["r1", mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" })],
          ["r2", mockRikishi("r2", { rank: "maegashira", division: "makuuchi" })],
        ]),
      } as unknown as WorldState;
      const heya = { id: "h1", rikishiIds: ["r1", "r2"] } as unknown as Heya;
      // yokozuna=40 + maegashira=8 = 48
      expect(computeHeyaPrestigeScore(heya, world)).toBe(48);
    });

    it("caps at 100", () => {
      const world = {
        rikishi: new Map([
          ["r1", mockRikishi("r1", { rank: "yokozuna" })],
          ["r2", mockRikishi("r2", { rank: "yokozuna" })],
          ["r3", mockRikishi("r3", { rank: "yokozuna" })],
        ]),
      } as unknown as WorldState;
      const heya = { id: "h1", rikishiIds: ["r1", "r2", "r3"] } as unknown as Heya;
      // 3*40 = 120 -> capped 100
      expect(computeHeyaPrestigeScore(heya, world)).toBe(100);
    });

    it("returns 0 for non-sekitori roster", () => {
      const world = {
        rikishi: new Map([["r1", mockRikishi("r1", { rank: "makushita", division: "makushita" })]]),
      } as unknown as WorldState;
      const heya = { id: "h1", rikishiIds: ["r1"] } as unknown as Heya;
      expect(computeHeyaPrestigeScore(heya, world)).toBe(0);
    });
  });

  // ── targetKoenkaiBandFromPrestige ──────────────────────────────────────

  describe("targetKoenkaiBandFromPrestige", () => {
    it("maps prestige >= 80 to powerful", () => {
      expect(targetKoenkaiBandFromPrestige(80)).toBe("powerful");
      expect(targetKoenkaiBandFromPrestige(100)).toBe("powerful");
    });

    it("maps prestige >= 55 to strong", () => {
      expect(targetKoenkaiBandFromPrestige(55)).toBe("strong");
      expect(targetKoenkaiBandFromPrestige(79)).toBe("strong");
    });

    it("maps prestige >= 30 to moderate", () => {
      expect(targetKoenkaiBandFromPrestige(30)).toBe("moderate");
    });

    it("maps prestige >= 10 to weak", () => {
      expect(targetKoenkaiBandFromPrestige(10)).toBe("weak");
    });

    it("maps prestige < 10 to none", () => {
      expect(targetKoenkaiBandFromPrestige(0)).toBe("none");
      expect(targetKoenkaiBandFromPrestige(9)).toBe("none");
    });
  });

  // ── recalculateKoenkaiBand ─────────────────────────────────────────────

  describe("recalculateKoenkaiBand", () => {
    it("returns band derived from heya prestige", () => {
      const world = {
        rikishi: new Map([
          ["r1", mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" })],
          ["r2", mockRikishi("r2", { rank: "ozeki", division: "makuuchi" })],
        ]),
      } as unknown as WorldState;
      const heya = { id: "h1", rikishiIds: ["r1", "r2"] } as unknown as Heya;
      // prestige = 40 + 30 = 70 -> strong
      expect(recalculateKoenkaiBand(heya, world)).toBe("strong");
    });
  });

  // ── adjustKoenkaiBandToPrestige ────────────────────────────────────────

  describe("adjustKoenkaiBandToPrestige", () => {
    it("does nothing when band matches target", () => {
      const heya = { id: "h1", rikishiIds: [], koenkaiBand: "none" } as unknown as Heya;
      const koenkai = {
        koenkaiId: "k1",
        heyaId: "h1",
        strengthBand: "none",
        members: [],
      } as unknown as Koenkai;
      const world = {
        heyas: new Map([["h1", heya]]),
        rikishi: new Map(),
        sponsorPool: {
          sponsors: new Map(),
          koenkais: new Map([["k1", koenkai]]),
        },
      } as unknown as WorldState;

      const impact = adjustKoenkaiBandToPrestige(world);
      // No events or updates when band matches
      expect(impact.events ?? []).toHaveLength(0);
    });

    it("trims weakest members on band downgrade", () => {
      const heya = { id: "h1", rikishiIds: [], koenkaiBand: "strong" } as unknown as Heya;
      const members = [
        { relId: "sr1", sponsorId: "s1", strength: 1, role: "koenkai_member" },
        { relId: "sr2", sponsorId: "s2", strength: 3, role: "koenkai_pillar" },
        { relId: "sr3", sponsorId: "s3", strength: 2, role: "koenkai_member" },
      ];
      const koenkai = {
        koenkaiId: "k1",
        heyaId: "h1",
        strengthBand: "strong",
        members,
      } as unknown as Koenkai;
      const world = {
        heyas: new Map([["h1", heya]]),
        rikishi: new Map(),
        sponsorPool: {
          sponsors: new Map(),
          koenkais: new Map([["k1", koenkai]]),
        },
      } as unknown as WorldState;

      const impact = adjustKoenkaiBandToPrestige(world);
      const resolved = resolveImpacts(world, [impact]);

      const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1")!;
      // Downgrade from strong (idx 3) to none (idx 0) = gap 3, remove 3 weakest
      // But only 3 members, so all removed
      expect(updatedKoenkai.strengthBand).toBe("none");
      expect(updatedKoenkai.members.length).toBe(0);
    });

    // ── Band upgrade branch (Set-based O(1) sponsor ID lookup) ──

    /**
     * Helper: build a world where the koenkai's strengthBand is below the
     * prestige-derived target, triggering the upgrade/recruit branch.
     * `currentBand` controls the koenkai's starting band; rikishi roster
     * is set to produce a prestige score that maps to `targetBand`.
     */
    const setupUpgradeWorld = (opts: {
      currentBand: KoenkaiBandType;
      targetBand: KoenkaiBandType;
      sponsors: Map<string, Sponsor>;
      existingMembers?: SponsorRelationship[];
    }) => {
      // Build a roster that produces the desired prestige target band
      let rikishiMap: Map<string, any>;
      switch (opts.targetBand) {
        case "weak": // prestige >= 10
          rikishiMap = new Map([
            ["r1", mockRikishi("r1", { rank: "maegashira", division: "makuuchi" })], // 8
            ["r2", mockRikishi("r2", { rank: "maegashira", division: "makuuchi" })], // 8 → total 16
          ]);
          break;
        case "moderate": // prestige >= 30
          rikishiMap = new Map([
            ["r1", mockRikishi("r1", { rank: "ozeki", division: "makuuchi" })], // 30
          ]);
          break;
        case "strong": // prestige >= 55
          rikishiMap = new Map([
            ["r1", mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" })], // 40
            ["r2", mockRikishi("r2", { rank: "sekiwake", division: "makuuchi" })], // 20 → total 60
          ]);
          break;
        case "powerful": // prestige >= 80
          rikishiMap = new Map([
            ["r1", mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" })], // 40
            ["r2", mockRikishi("r2", { rank: "ozeki", division: "makuuchi" })], // 30
            ["r3", mockRikishi("r3", { rank: "sekiwake", division: "makuuchi" })], // 20 → total 90
          ]);
          break;
        default:
          rikishiMap = new Map();
      }

      const heya = {
        id: "h1",
        rikishiIds: Array.from(rikishiMap.keys()),
        koenkaiBand: opts.currentBand,
      } as unknown as Heya;

      const koenkai = {
        koenkaiId: "k1",
        heyaId: "h1",
        strengthBand: opts.currentBand,
        members: opts.existingMembers ?? [],
      } as unknown as Koenkai;

      const world = {
        heyas: new Map([["h1", heya]]),
        rikishi: rikishiMap,
        sponsorPool: {
          sponsors: opts.sponsors,
          koenkais: new Map([["k1", koenkai]]),
        },
        dayIndexGlobal: 100,
      } as unknown as WorldState;

      return { world, heya, koenkai };
    };

    const makeInactiveSponsor = (id: string, tier: Sponsor["tier"]): Sponsor =>
      ({
        sponsorId: id,
        active: false,
        tier,
        displayName: `Sponsor ${id}`,
        prestigeAffinity: 50,
        riskAppetite: 50,
      }) as unknown as Sponsor;

    it("recruits eligible inactive sponsors on band upgrade", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", makeInactiveSponsor("s1", "T1")],
        ["s2", makeInactiveSponsor("s2", "T2")],
        ["s3", makeInactiveSponsor("s3", "T3")],
      ]);
      // none → moderate (gap 2, addCount 2)
      const { world } = setupUpgradeWorld({
        currentBand: "none",
        targetBand: "moderate",
        sponsors,
      });

      const impact = adjustKoenkaiBandToPrestige(world);
      const resolved = resolveImpacts(world, [impact]);

      const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1")!;
      expect(updatedKoenkai.strengthBand).toBe("moderate");
      expect(updatedKoenkai.members.length).toBe(2);
      // New members should have sponsorIds from the picked sponsors
      const newSponsorIds = updatedKoenkai.members.map((m) => m.sponsorId);
      expect(newSponsorIds).toContain("s1");
      expect(newSponsorIds).toContain("s2");
      // Recruited sponsors should be marked active
      expect(resolved.sponsorPool?.sponsors.get("s1")?.active).toBe(true);
      expect(resolved.sponsorPool?.sponsors.get("s2")?.active).toBe(true);
      // s3 should remain inactive (only 2 picked)
      expect(resolved.sponsorPool?.sponsors.get("s3")?.active).toBe(false);
    });

    it("respects max 2 sponsors per basho even with larger gap", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", makeInactiveSponsor("s1", "T1")],
        ["s2", makeInactiveSponsor("s2", "T2")],
        ["s3", makeInactiveSponsor("s3", "T3")],
        ["s4", makeInactiveSponsor("s4", "T1")],
      ]);
      // none → powerful (gap 4, but addCount capped at 2)
      const { world } = setupUpgradeWorld({
        currentBand: "none",
        targetBand: "powerful",
        sponsors,
      });

      const impact = adjustKoenkaiBandToPrestige(world);
      const resolved = resolveImpacts(world, [impact]);

      const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1")!;
      expect(updatedKoenkai.strengthBand).toBe("powerful");
      // Only 2 sponsors added despite gap of 4
      expect(updatedKoenkai.members.length).toBe(2);
    });

    it("skips sponsors already in koenkai (Set-based dedup)", () => {
      const sponsors = new Map<string, Sponsor>([
        // s1 is already a member — must not be re-picked
        ["s1", { ...makeInactiveSponsor("s1", "T1"), active: false } as unknown as Sponsor],
        ["s2", makeInactiveSponsor("s2", "T2")],
        ["s3", makeInactiveSponsor("s3", "T3")],
      ]);
      const existingMembers: SponsorRelationship[] = [
        {
          relId: "sr_existing",
          sponsorId: "s1",
          targetType: "heya",
          targetId: "h1",
          role: "koenkai_member",
          strength: 2,
          startedAtTick: 50,
        } as unknown as SponsorRelationship,
      ];
      // none → moderate (gap 2, addCount 2)
      const { world } = setupUpgradeWorld({
        currentBand: "none",
        targetBand: "moderate",
        sponsors,
        existingMembers,
      });

      const impact = adjustKoenkaiBandToPrestige(world);
      const resolved = resolveImpacts(world, [impact]);

      const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1")!;
      expect(updatedKoenkai.strengthBand).toBe("moderate");
      // Should have 3 members: 1 existing + 2 new (s2, s3)
      expect(updatedKoenkai.members.length).toBe(3);
      const sponsorIds = updatedKoenkai.members.map((m) => m.sponsorId);
      expect(sponsorIds).toContain("s1");
      expect(sponsorIds).toContain("s2");
      expect(sponsorIds).toContain("s3");
      // s1 should NOT be re-added as a duplicate
      const s1Count = sponsorIds.filter((id) => id === "s1").length;
      expect(s1Count).toBe(1);
    });

    it("only recruits T1/T2/T3 tier sponsors", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s_t0", makeInactiveSponsor("s_t0", "T0")],
        ["s_t4", makeInactiveSponsor("s_t4", "T4")],
        ["s_t5", makeInactiveSponsor("s_t5", "T5")],
        ["s_t1", makeInactiveSponsor("s_t1", "T1")],
      ]);
      // none → weak (gap 1, addCount 1)
      const { world } = setupUpgradeWorld({
        currentBand: "none",
        targetBand: "weak",
        sponsors,
      });

      const impact = adjustKoenkaiBandToPrestige(world);
      const resolved = resolveImpacts(world, [impact]);

      const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1")!;
      expect(updatedKoenkai.strengthBand).toBe("weak");
      // Only 1 sponsor should be picked, and it must be s_t1 (the only eligible tier)
      expect(updatedKoenkai.members.length).toBe(1);
      expect(updatedKoenkai.members[0].sponsorId).toBe("s_t1");
      // Ineligible tier sponsors should remain inactive
      expect(resolved.sponsorPool?.sponsors.get("s_t0")?.active).toBe(false);
      expect(resolved.sponsorPool?.sponsors.get("s_t4")?.active).toBe(false);
      expect(resolved.sponsorPool?.sponsors.get("s_t5")?.active).toBe(false);
    });

    it("skips active sponsors during upgrade recruitment", () => {
      const sponsors = new Map<string, Sponsor>([
        // s1 is active — should be skipped
        ["s1", { ...makeInactiveSponsor("s1", "T1"), active: true } as unknown as Sponsor],
        ["s2", makeInactiveSponsor("s2", "T2")],
      ]);
      // none → weak (gap 1, addCount 1)
      const { world } = setupUpgradeWorld({
        currentBand: "none",
        targetBand: "weak",
        sponsors,
      });

      const impact = adjustKoenkaiBandToPrestige(world);
      const resolved = resolveImpacts(world, [impact]);

      const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1")!;
      expect(updatedKoenkai.strengthBand).toBe("weak");
      // Only s2 should be picked (s1 is active, so skipped)
      expect(updatedKoenkai.members.length).toBe(1);
      expect(updatedKoenkai.members[0].sponsorId).toBe("s2");
    });

    it("updates heya koenkaiBand to match target band on upgrade", () => {
      const sponsors = new Map<string, Sponsor>([
        ["s1", makeInactiveSponsor("s1", "T1")],
        ["s2", makeInactiveSponsor("s2", "T2")],
      ]);
      // none → moderate (gap 2)
      const { world } = setupUpgradeWorld({
        currentBand: "none",
        targetBand: "moderate",
        sponsors,
      });

      const impact = adjustKoenkaiBandToPrestige(world);
      const resolved = resolveImpacts(world, [impact]);

      const updatedHeya = resolved.heyas.get("h1")!;
      expect(updatedHeya.koenkaiBand).toBe("moderate");
    });

    it("handles no eligible sponsors gracefully", () => {
      // No inactive T1/T2/T3 sponsors available
      const sponsors = new Map<string, Sponsor>([
        ["s1", { ...makeInactiveSponsor("s1", "T1"), active: true } as unknown as Sponsor],
        ["s2", makeInactiveSponsor("s2", "T0")], // wrong tier
      ]);
      // none → weak (gap 1, addCount 1)
      const { world } = setupUpgradeWorld({
        currentBand: "none",
        targetBand: "weak",
        sponsors,
      });

      const impact = adjustKoenkaiBandToPrestige(world);
      const resolved = resolveImpacts(world, [impact]);

      const updatedKoenkai = resolved.sponsorPool?.koenkais.get("k1")!;
      // Band should still update even with no new members
      expect(updatedKoenkai.strengthBand).toBe("weak");
      expect(updatedKoenkai.members.length).toBe(0);
    });
  });
});
