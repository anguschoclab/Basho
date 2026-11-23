import { describe, it, expect } from "vitest";
import { fillVacanciesForNPCWithBidding } from "@/engine/generation/TalentPoolNPCRecruitment";
import { foreignSlotBidAggression } from "@/engine/npc/ForeignSlotPolicy";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { TalentCandidate } from "@/engine/types/talent";
import type { Id } from "@/engine/types/common";

/**
 * §5.x — the foreign pipeline is a relationship channel, not a pure talent
 * lottery. A heya with an established channel (hadForeigner) and an open
 * slot pursues a replacement aggressively; the 0.8 base damping must not
 * systematically lose the heya's vacancies to equal-talent domestics.
 */
describe("foreign pipeline — open-slot pursuit", () => {
  const HEYA = "pipeline-heya" as Id;

  function buildWorld(opts: {
    oyakataOverrides?: Parameters<typeof MockFactory.createOyakata>[1];
    heyaOverrides?: Parameters<typeof makeMockHeya>[1];
    candidates: TalentCandidate[];
  }) {
    const oyakata = MockFactory.createOyakata("oy-1" as Id, {
      heyaId: HEYA,
      age: 50,
      ...opts.oyakataOverrides,
    });
    const heya = makeMockHeya(HEYA, {
      oyakataId: "oy-1" as Id,
      rikishiIds: [],
      ...opts.heyaOverrides,
    });
    const candidates: Record<string, TalentCandidate> = {};
    for (const c of opts.candidates) candidates[c.candidateId] = c;
    const pool = MockFactory.createTalentPool({ candidates });
    pool.pools.foreign.candidatesVisible = opts.candidates
      .filter((c) => c.nationality !== "Japan")
      .map((c) => c.candidateId);
    pool.pools.high_school.candidatesVisible = opts.candidates
      .filter((c) => c.nationality === "Japan")
      .map((c) => c.candidateId);
    return makeMockWorld({
      heyas: new Map([[HEYA, heya]]),
      oyakata: new Map([["oy-1" as Id, oyakata]]),
      rikishi: new Map(),
      week: 1,
      talentPool: pool,
    });
  }

  function foreigner(id: string, talentSeed: number): TalentCandidate {
    return MockFactory.createCandidate(id as Id, {
      candidateId: id as Id,
      nationality: "Mongolia",
      talentSeed,
      availabilityState: "available",
    });
  }

  function domestic(id: string, talentSeed: number): TalentCandidate {
    return MockFactory.createCandidate(id as Id, {
      candidateId: id as Id,
      nationality: "Japan",
      talentSeed,
      availabilityState: "available",
    });
  }

  it("established-pipeline heya signs the competitive foreigner over equal domestics", () => {
    const world = buildWorld({
      heyaOverrides: { hadForeigner: true } as never,
      candidates: [foreigner("f-1", 85), domestic("d-1", 85), domestic("d-2", 80)],
    });
    const impact = fillVacanciesForNPCWithBidding(world, { [HEYA]: 1 }, { systemBackfill: true });
    const next = resolveImpacts(world, [impact]);
    const signed = Array.from(next.rikishi.values()).filter((r) => r.heyaId === HEYA);
    expect(signed).toHaveLength(1);
    expect(signed[0].nationality).toBe("Mongolia");
  });

  it("fresh heya (no pipeline) is NOT compelled to take a foreigner — domestic wins at parity", () => {
    const world = buildWorld({
      candidates: [foreigner("f-1", 85), domestic("d-1", 90), domestic("d-2", 85)],
    });
    const impact = fillVacanciesForNPCWithBidding(world, { [HEYA]: 1 }, { systemBackfill: true });
    const next = resolveImpacts(world, [impact]);
    const signed = Array.from(next.rikishi.values()).filter((r) => r.heyaId === HEYA);
    expect(signed).toHaveLength(1);
    expect(signed[0].nationality).toBe("Japan");
  });

  it("blocking-quirk oyakata never signs a slot-consuming foreigner", () => {
    const world = buildWorld({
      heyaOverrides: { hadForeigner: true } as never,
      oyakataOverrides: { quirks: ["Domestic-Only Traditionalist"] },
      candidates: [foreigner("f-1", 95), domestic("d-1", 60)],
    });
    const impact = fillVacanciesForNPCWithBidding(world, { [HEYA]: 1 }, { systemBackfill: true });
    const next = resolveImpacts(world, [impact]);
    const signed = Array.from(next.rikishi.values()).filter((r) => r.heyaId === HEYA);
    expect(signed).toHaveLength(1);
    expect(signed[0].nationality).toBe("Japan");
  });

  it("pipeline bonus raises an established channel's aggression above the base", () => {
    const o = MockFactory.createOyakata("oy-x" as Id, { age: 50 });
    const base = foreignSlotBidAggression(o);
    const pipelined = foreignSlotBidAggression(o, { heyaHadForeigner: true });
    expect(pipelined).toBeGreaterThan(base);
    expect(pipelined).toBeGreaterThanOrEqual(1);
  });

  it("signing a slot-consuming foreigner marks the heya's pipeline established", () => {
    const world = buildWorld({
      candidates: [foreigner("f-1", 95)],
    });
    const impact = fillVacanciesForNPCWithBidding(world, { [HEYA]: 1 }, { systemBackfill: true });
    const next = resolveImpacts(world, [impact]);
    const heya = next.heyas.get(HEYA);
    const signed = Array.from(next.rikishi.values()).filter((r) => r.heyaId === HEYA);
    expect(signed[0]?.nationality).toBe("Mongolia");
    expect((heya as { hadForeigner?: boolean }).hadForeigner).toBe(true);
  });
});
