import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as TalentPoolService from "@/engine/systems/generation/TalentPoolService";
import * as RegistryService from "@/engine/lifecycle/RegistryService";
import * as NPCStrategyService from "@/engine/strategy/NPCStrategyService";
import { SeededRNG } from "@/engine/rng";
import { EventBus } from "@/engine/events";

describe("Bard Engine Integration", () => {
  beforeEach(() => {
    vi.spyOn(EventBus, "recruitDiscovered").mockImplementation(() => ({}) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TalentPoolService logs RECRUIT_DISCOVERED with high_talent_signed status", () => {
    const world = {
      week: 2,
      dayIndexGlobal: 1,
      heyas: new Map([["heya-1", { id: "heya-1", name: "Test Heya", reputation: 50 }]]),
      rikishi: new Map(),
      activeRikishiIds: new Set(),
      talentPool: {
        candidates: {
          c1: {
            candidateId: "c1",
            personId: "c1",
            name: "Prospect",
            talentSeed: 95,
            availabilityState: "in_talks",
            competingSuitors: [{ heyaId: "heya-1", interestBand: "all_in", deadlineWeek: 1 }],
          },
        },
        pools: {
          high_school: { candidatesVisible: ["c1"], candidatesHidden: [] },
          university: { candidatesVisible: [], candidatesHidden: [] },
          foreign: { candidatesVisible: [], candidatesHidden: [] },
        },
      },
    } as any;

    const impact = TalentPoolService.tickWeekTalentPool(world);

    // tickWeekTalentPool now returns StateImpact with logged events
    const discoveredEvent = impact.events?.find(
      (e: { type: string; data?: { status?: string; rikishiId?: string } }) =>
        e.type === "RECRUIT_DISCOVERED" &&
        e.data?.status === "high_talent_signed" &&
        e.data?.rikishiId === "c1"
    );
    expect(discoveredEvent).toBeDefined();
  });

  it("RegistryService logs LIFECYCLE_EVENT with wins_milestone status", () => {
    const world = {
      history: [{}],

      rikishi: new Map([
        ["r1", { id: "r1", shikona: "Wrestler 1", careerWins: 100, currentBashoWins: 1 }],
      ]),
      activeRikishiIds: new Set(["r1"]),
    } as any;

    const impact = RegistryService.runCareerJournalUpdates(world);

    // runCareerJournalUpdates now returns StateImpact with logged events
    // Check that the impact contains a wins_milestone event

    const milestoneEvent = impact.events?.find(
      (e: { data?: { status?: string; rikishiId?: string } }) =>
        e.data?.status === "wins_milestone" && e.data?.rikishiId === "r1"
    );
    expect(milestoneEvent).toBeDefined();
  });

  it("NPCStrategyService resolves dynamic philosophy labels", () => {
    const perception = {
      welfareRiskBand: "safe",
      rikishiPerceptions: [],
      rosterSize: 0,
      fatigueRatio: 0,
    } as any;
    const rng = new SeededRNG("test");

    // Correct order: (perception, riskAppetite, welfareDiscipline, mood, complianceCap, philosophy, providedRng)
    const result = NPCStrategyService.decideTrainingIntensity(
      perception,
      0.5,
      0.5,
      undefined,
      undefined,
      "underdog_hunter",
      rng
    );

    expect(result.reason).toContain("Experimental Training");
  });
});
