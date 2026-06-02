/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { projectSponsorUIDigest } from "../../../presenters/uiProjections/sponsorProjection";
import { createMockWorldState, createMockHeya } from "../../utils/testHelpers";

function makeSponsor(overrides: Record<string, any> = {}): any {
  return {
    id: `sponsor-${Math.random().toString(36).slice(2)}`,
    name: "Test Corp",
    tier: "T1",
    loyalty: 50,
    active: true,
    satisfaction: 75,
    relationships: [],
    ...overrides,
  };
}

function makeRel(overrides: Record<string, any> = {}): any {
  return {
    targetId: "player-heya-1",
    endsAtTick: 20,
    tier: "T1",
    strength: 50,
    since: 0,
    ...overrides,
  };
}

function makeWorld(heyaOverrides: Record<string, any> = {}, sponsors: any[] = [], worldOverrides: Record<string, any> = {}) {
  const heya = createMockHeya({ id: "player-heya-1", name: "Miyagino", ...heyaOverrides });
  const sponsorMap = new Map<string, any>();
  for (const s of sponsors) sponsorMap.set(s.id, s);
  return createMockWorldState({
    playerHeyaId: "player-heya-1",
    heyas: new Map([["player-heya-1", heya]]),
    sponsorPool: { sponsors: sponsorMap, koenkais: new Map() },
    week: 1,
    ...worldOverrides,
  });
}

describe("projectSponsorUIDigest", () => {
  it("returns null when no playerHeyaId", () => {
    const world = createMockWorldState({ playerHeyaId: undefined, sponsorPool: { sponsors: new Map(), koenkais: new Map() } });
    expect(projectSponsorUIDigest(world as any)).toBeNull();
  });

  it("returns null when player heya not found", () => {
    const world = createMockWorldState({
      playerHeyaId: "missing",
      heyas: new Map(),
      sponsorPool: { sponsors: new Map(), koenkais: new Map() },
    });
    expect(projectSponsorUIDigest(world as any)).toBeNull();
  });

  it("returns null when sponsorPool is absent", () => {
    const heya = createMockHeya({ id: "h1" });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      sponsorPool: undefined,
    });
    expect(projectSponsorUIDigest(world as any)).toBeNull();
  });

  it("returns empty activeSponsors and zero expiringCount when no sponsors", () => {
    const world = makeWorld();
    const result = projectSponsorUIDigest(world as any);
    expect(result?.activeSponsors).toEqual([]);
    expect(result?.expiringCount).toBe(0);
  });

  it("skips inactive sponsors", () => {
    const s = makeSponsor({ active: false, relationships: [makeRel()] });
    const world = makeWorld({}, [s]);
    const result = projectSponsorUIDigest(world as any);
    expect(result?.activeSponsors).toHaveLength(0);
  });

  it("skips sponsors whose rel.targetId does not match player heya", () => {
    const s = makeSponsor({ relationships: [makeRel({ targetId: "other-heya" })] });
    const world = makeWorld({}, [s]);
    const result = projectSponsorUIDigest(world as any);
    expect(result?.activeSponsors).toHaveLength(0);
  });

  it("includes sponsor whose rel.targetId matches player heya", () => {
    const s = makeSponsor({ relationships: [makeRel({ targetId: "player-heya-1" })] });
    const world = makeWorld({}, [s]);
    const result = projectSponsorUIDigest(world as any);
    expect(result?.activeSponsors).toHaveLength(1);
  });

  it("koenkaiName is <heyaName> Supporters Association", () => {
    const world = makeWorld({ name: "Miyagino" });
    expect(projectSponsorUIDigest(world as any)?.koenkaiName).toBe("Miyagino Supporters Association");
  });

  describe("monthlyIncome after Fix A", () => {
    it("sponsor tier T0 → monthlyIncome 100_000", () => {
      const s = makeSponsor({ tier: "T0", relationships: [makeRel()] });
      const world = makeWorld({}, [s]);
      expect(projectSponsorUIDigest(world as any)?.activeSponsors[0].monthlyIncome).toBe(100_000);
    });

    it("sponsor tier T1 → monthlyIncome 300_000", () => {
      const s = makeSponsor({ tier: "T1", relationships: [makeRel()] });
      const world = makeWorld({}, [s]);
      expect(projectSponsorUIDigest(world as any)?.activeSponsors[0].monthlyIncome).toBe(300_000);
    });

    it("sponsor tier T5 → monthlyIncome 8_000_000", () => {
      const s = makeSponsor({ tier: "T5", relationships: [makeRel()] });
      const world = makeWorld({}, [s]);
      expect(projectSponsorUIDigest(world as any)?.activeSponsors[0].monthlyIncome).toBe(8_000_000);
    });
  });

  describe("weeksRemaining calculation", () => {
    it("weeksRemaining = floor((endsAtTick - world.week) / 4)", () => {
      const s = makeSponsor({ relationships: [makeRel({ endsAtTick: 21 })] });
      const world = makeWorld({}, [s], { week: 1 });
      expect(projectSponsorUIDigest(world as any)?.activeSponsors[0].weeksRemaining).toBe(5);
    });

    it("weeksRemaining is clamped to 0 when endsAtTick <= world.week", () => {
      const s = makeSponsor({ relationships: [makeRel({ endsAtTick: 0 })] });
      const world = makeWorld({}, [s], { week: 10 });
      expect(projectSponsorUIDigest(world as any)?.activeSponsors[0].weeksRemaining).toBe(0);
    });
  });

  describe("isExpiringSoon", () => {
    it("isExpiringSoon is true when weeksRemaining <= 4", () => {
      const s = makeSponsor({ relationships: [makeRel({ endsAtTick: 17 })] });
      const world = makeWorld({}, [s], { week: 1 });
      const snap = projectSponsorUIDigest(world as any)?.activeSponsors[0];
      expect(snap?.weeksRemaining).toBe(4);
      expect(snap?.isExpiringSoon).toBe(true);
    });

    it("isExpiringSoon is false when weeksRemaining > 4", () => {
      const s = makeSponsor({ relationships: [makeRel({ endsAtTick: 22 })] });
      const world = makeWorld({}, [s], { week: 1 });
      const snap = projectSponsorUIDigest(world as any)?.activeSponsors[0];
      expect(snap?.weeksRemaining).toBe(5);
      expect(snap?.isExpiringSoon).toBe(false);
    });
  });

  it("expiringCount counts only isExpiringSoon sponsors", () => {
    const expiring = makeSponsor({ id: "s1", relationships: [makeRel({ endsAtTick: 5 })] });
    const notExpiring = makeSponsor({ id: "s2", relationships: [makeRel({ endsAtTick: 100 })] });
    const world = makeWorld({}, [expiring, notExpiring], { week: 1 });
    expect(projectSponsorUIDigest(world as any)?.expiringCount).toBe(1);
  });

  describe("tier sort after Fix A", () => {
    it("T5 sponsor sorted before T4 before T3", () => {
      const s3 = makeSponsor({ id: "s3", tier: "T3", relationships: [makeRel({ strength: 50 })] });
      const s5 = makeSponsor({ id: "s5", tier: "T5", relationships: [makeRel({ strength: 50 })] });
      const s4 = makeSponsor({ id: "s4", tier: "T4", relationships: [makeRel({ strength: 50 })] });
      const world = makeWorld({}, [s3, s5, s4]);
      const tiers = projectSponsorUIDigest(world as any)?.activeSponsors.map((s) => s.tier);
      expect(tiers).toEqual(["T5", "T4", "T3"]);
    });

    it("within same tier, higher strength sorted first", () => {
      const weak = makeSponsor({ id: "sw", tier: "T2", relationships: [makeRel({ strength: 20 })] });
      const strong = makeSponsor({ id: "ss", tier: "T2", relationships: [makeRel({ strength: 80 })] });
      const world = makeWorld({}, [weak, strong]);
      const ids = projectSponsorUIDigest(world as any)?.activeSponsors.map((s) => s.sponsorId);
      expect(ids![0]).toBe("ss");
    });
  });

  describe("koenkaiIncome after Fix B", () => {
    it("koenkaiBand=none → koenkaiIncome=0", () => {
      const world = makeWorld({ koenkaiBand: "none" });
      expect(projectSponsorUIDigest(world as any)?.koenkaiIncome).toBe(0);
    });

    it("koenkaiBand=weak → koenkaiIncome=100_000", () => {
      const world = makeWorld({ koenkaiBand: "weak" });
      expect(projectSponsorUIDigest(world as any)?.koenkaiIncome).toBe(100_000);
    });

    it("koenkaiBand=moderate → koenkaiIncome=200_000", () => {
      const world = makeWorld({ koenkaiBand: "moderate" });
      expect(projectSponsorUIDigest(world as any)?.koenkaiIncome).toBe(200_000);
    });

    it("koenkaiBand=strong → koenkaiIncome=400_000", () => {
      const world = makeWorld({ koenkaiBand: "strong" });
      expect(projectSponsorUIDigest(world as any)?.koenkaiIncome).toBe(400_000);
    });

    it("koenkaiBand=powerful → koenkaiIncome=800_000 (was 0 before Fix B)", () => {
      const world = makeWorld({ koenkaiBand: "powerful" });
      expect(projectSponsorUIDigest(world as any)?.koenkaiIncome).toBe(800_000);
    });

    it("absent koenkaiBand → koenkaiIncome=0", () => {
      const world = makeWorld({ koenkaiBand: undefined });
      expect(projectSponsorUIDigest(world as any)?.koenkaiIncome).toBe(0);
    });
  });

  it("totalMonthlyIncome = sum of sponsor monthlyIncomes + koenkaiIncome", () => {
    const s1 = makeSponsor({ id: "s1", tier: "T1", relationships: [makeRel()] });
    const world = makeWorld({ koenkaiBand: "strong" }, [s1]);
    const result = projectSponsorUIDigest(world as any);
    expect(result?.totalMonthlyIncome).toBe(300_000 + 400_000);
  });

  it("strength field = heya.koenkaiBand ?? none", () => {
    const world = makeWorld({ koenkaiBand: "moderate" });
    expect(projectSponsorUIDigest(world as any)?.strength).toBe("moderate");
  });

  it("strength defaults to none when koenkaiBand absent", () => {
    const world = makeWorld({ koenkaiBand: undefined });
    expect(projectSponsorUIDigest(world as any)?.strength).toBe("none");
  });
});
