import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative, generateKyujoNarrative } from "@/engine/bout/boutNarrative";
import { generateRetirementNarrative } from "@/engine/lifecycle/retirementNarrative";
import { computeMovementUnits } from "@/engine/banzuke/promotionLogic";
import { tickRikishiRecovery } from "@/engine/systems/health/RecoveryService";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import { MOMENTUM_NARRATIVE_THRESHOLD } from "@/constants/engine/generation";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoPerformance, BanzukeEntry } from "@/engine/types/banzuke";
import type { CombatArchetype } from "@/engine/types/combat";

 

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-holistic",
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 8.5,
    upset: false,
    isKinboshi: false,
    log: [
      { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
      { phase: "finish", data: {} },
    ],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  };
}

function makeWorld(east: Rikishi, west: Rikishi, overrides: Partial<WorldState> = {}): WorldState {
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
    ...overrides,
  }) as WorldState;
}

function hasMissingTokens(text: string): boolean {
  return text.includes("[MISSING:");
}

const BASHO = "hatsu" as BashoName;

describe("Holistic System Alignment — 10 Gaps", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  // ── Gap 1: Archetype counter pre-bout narrative ──
  describe("Gap 1: Archetype counter pre-bout narrative", () => {
    it("generates archetype_counter line when archetypeMatchup.counterActivated is true", () => {
      const east = mockRikishi("r-east", {
        shikona: "Alpha",
        combatProfile: {
          archetype: "oshi" as CombatArchetype,
          familyPreferences: { push: 50, belt: 0, trick: 0, speed: 0 },
          preferredGrip: "none",
          preferredGripDepth: "standard",
          statModifiers: {},
          counterFamily: "belt",
          archetypeBehavior: { tachiaiSpeedBonus: 0, lateralMovementBonus: 0, edgeEscapeBonus: 0, beltTorqueBonus: 0, pushVelocityBonus: 0 },
        },
      });
      const west = mockRikishi("r-west", {
        shikona: "Beta",
        combatProfile: {
          archetype: "yotsu" as CombatArchetype,
          familyPreferences: { push: 0, belt: 50, trick: 0, speed: 0 },
          preferredGrip: "migi",
          preferredGripDepth: "deep",
          statModifiers: {},
          counterFamily: "push",
          archetypeBehavior: { tachiaiSpeedBonus: 0, lateralMovementBonus: 0, edgeEscapeBonus: 0, beltTorqueBonus: 0, pushVelocityBonus: 0 },
        },
      });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        archetypeMatchup: {
          eastArchetype: "oshi" as CombatArchetype,
          westArchetype: "yotsu" as CombatArchetype,
          counterActivated: true,
        },
      });
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-arch-counter", world);
      const counterLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "pre_bout" && l.tags?.includes("archetype_counter")
      );
      expect(counterLines.length).toBeGreaterThan(0);
      expect(counterLines.some((l) => !hasMissingTokens(l.text))).toBe(true);
    });

    it("does not generate archetype_counter line when counterActivated is false", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        archetypeMatchup: {
          eastArchetype: "oshi" as CombatArchetype,
          westArchetype: "yotsu" as CombatArchetype,
          counterActivated: false,
        },
      });
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-arch-counter-none", world);
      const counterLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "pre_bout" && l.tags?.includes("archetype_counter")
      );
      expect(counterLines.length).toBe(0);
    });
  });

  // ── Gap 2: Counter tactic in-bout narrative ──
  describe("Gap 2: Counter tactic in-bout narrative", () => {
    it("generates counter_tactic line when log contains counter_tactic phase entry", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0 } },
          {
            phase: "counter_tactic",
            data: { attacker: "east", defender: "west", attackerFamily: "push", defenderFamily: "belt" },
          },
          { phase: "finish", data: {} },
        ],
      });
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-counter-tactic", world);
      const counterLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "counter_tactic" && l.tags?.includes("counter")
      );
      expect(counterLines.length).toBeGreaterThan(0);
      expect(counterLines.some((l) => !hasMissingTokens(l.text))).toBe(true);
    });

    it("limits counter_tactic narration to 2 lines per bout", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0 } },
          { phase: "counter_tactic", data: { attacker: "east", defender: "west" } },
          { phase: "counter_tactic", data: { attacker: "east", defender: "west" } },
          { phase: "counter_tactic", data: { attacker: "east", defender: "west" } },
          { phase: "counter_tactic", data: { attacker: "east", defender: "west" } },
          { phase: "counter_tactic", data: { attacker: "east", defender: "west" } },
          { phase: "finish", data: {} },
        ],
      });
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-counter-limit", world);
      const counterLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "counter_tactic"
      );
      expect(counterLines.length).toBe(2);
    });

    it("does not generate counter_tactic line when no counter_tactic log entry exists", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0 } },
          { phase: "finish", data: {} },
        ],
      });
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-no-counter", world);
      const counterLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "counter_tactic" && l.tags?.includes("counter")
      );
      expect(counterLines.length).toBe(0);
    });
  });

  // ── Gap 3: Retirement narrative wired into lifecycle ──
  describe("Gap 3: Retirement narrative generation", () => {
    it("generateRetirementNarrative produces lines without missing tokens", () => {
      const rikishi = mockRikishi("r-retire", {
        shikona: "OldTimer",
        careerWins: 300,
        careerLosses: 150,
        rank: "ozeki",
        birthYear: 1980,
        careerHistory: [
          { rank: "maegashira", division: "makuuchi", isYusho: false, wins: 8, losses: 7 },
          { rank: "ozeki", division: "makuuchi", isYusho: true, wins: 13, losses: 2 },
        ] as any,
        pressPersona: "stoic",
      });
      const world = makeMockWorld({
        rikishi: new Map([[rikishi.id, rikishi]]),
        year: 2025,
      }) as WorldState;
      const lines = generateRetirementNarrative(rikishi, world, "retire-test-seed");
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every((l) => !hasMissingTokens(l.text))).toBe(true);
    });

    it("generateRetirementNarrative includes ceremony and career_summary sections", () => {
      const rikishi = mockRikishi("r-retire2", {
        shikona: "Legend",
        careerWins: 500,
        careerLosses: 200,
        rank: "yokozuna",
        birthYear: 1975,
        careerHistory: [
          { rank: "yokozuna", division: "makuuchi", isYusho: true, wins: 14, losses: 1 },
        ] as any,
      });
      const world = makeMockWorld({
        rikishi: new Map([[rikishi.id, rikishi]]),
        year: 2025,
      }) as WorldState;
      const lines = generateRetirementNarrative(rikishi, world, "retire-test-seed2");
      const sections = lines.map((l) => l.section);
      expect(sections).toContain("ceremony");
      expect(sections).toContain("career_summary");
    });
  });

  // ── Gap 4+9: Kyujo return narrative and recentlyReturnedFromInjury ──
  describe("Gap 4+9: Kyujo return narrative", () => {
    it("generateKyujoNarrative with return_from_kyujo type produces lines", () => {
      const rikishi = mockRikishi("r-kyujo", {
        shikona: "Returner",
        injured: false,
        recentlyReturnedFromInjury: true,
      });
      const lines = generateKyujoNarrative(
        rikishi,
        "return_from_kyujo",
        { bashosMissed: 2 },
        "return-kyujo-test"
      );
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every((l) => !hasMissingTokens(l.text))).toBe(true);
    });

    it("tickRikishiRecovery sets recentlyReturnedFromInjury on recovery", () => {
      const rikishi = mockRikishi("r-injured", {
        shikona: "InjuredOne",
        injured: true,
        injuryWeeksRemaining: 1,
        isKyujo: true,
        kyujoReason: "injury",
        injuryStatus: { type: "strain", severity: "moderate", weeksRemaining: 1 },
      });
      expect(rikishi.recentlyReturnedFromInjury).toBeUndefined();
      const recovered = tickRikishiRecovery(rikishi, 1.0);
      expect(recovered).toBe(true);
      expect(rikishi.recentlyReturnedFromInjury).toBe(true);
      expect(rikishi.injured).toBe(false);
      expect(rikishi.isKyujo).toBe(false);
    });

    it("bout narrative generates return_from_kyujo line when recentlyReturnedFromInjury is set", () => {
      const east = mockRikishi("r-east", {
        shikona: "Returner",
        recentlyReturnedFromInjury: true,
        injured: false,
      });
      const west = mockRikishi("r-west", { shikona: "Opponent" });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-kyujo-return", world);
      const returnLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "pre_bout" && l.tags?.includes("comeback") && l.tags?.includes("injury")
      );
      expect(returnLines.length).toBeGreaterThan(0);
    });
  });

  // ── Gap 5: Sanyaku promotion flag connected to rank debut ──
  describe("Gap 5: Sanyaku promotion flag in rank debut", () => {
    it("rank debut narrative triggers when sanyakuPromotionThisBasho is true", () => {
      const east = mockRikishi("r-east", {
        shikona: "NewSekiwake",
        rank: "sekiwake",
        rankNumber: 3,
        sanyakuPromotionThisBasho: true,
        careerHistory: [
          { rank: "maegashira", division: "makuuchi", isYusho: false, wins: 11, losses: 4, rankNumber: 5 },
        ] as any,
      });
      const west = mockRikishi("r-west", { shikona: "Opponent" });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-sanyaku-debut", world);
      const debutLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "pre_bout" && l.tags?.includes("debut")
      );
      expect(debutLines.length).toBeGreaterThan(0);
    });
  });

  // ── Gap 6: Comeback wins and edge crisis in promotion scoring ──
  describe("Gap 6: Comeback wins and edge crisis in promotion scoring", () => {
    function makeBanzukeEntry(rikishiId: string, rank: string): BanzukeEntry {
      return {
        rikishiId,
        division: "makuuchi",
        position: { rank: rank as any, rankNumber: 5, side: "east" },
      } as BanzukeEntry;
    }

    it("comebackWins adds bonus to movement units", () => {
      const entry = makeBanzukeEntry("r-test", "maegashira");
      const perfWithout: BashoPerformance = {
        rikishiId: "r-test",
        wins: 8,
        losses: 7,
      };
      const perfWith: BashoPerformance = {
        rikishiId: "r-test",
        wins: 8,
        losses: 7,
        comebackWins: 2,
      };
      const demotedOzeki = new Set<string>();
      const without = computeMovementUnits(entry, perfWithout, demotedOzeki);
      const withCB = computeMovementUnits(entry, perfWith, demotedOzeki);
      expect(withCB).toBeGreaterThan(without);
    });

    it("edgeCrisisSurvived adds bonus to movement units", () => {
      const entry = makeBanzukeEntry("r-test", "maegashira");
      const perfWithout: BashoPerformance = {
        rikishiId: "r-test",
        wins: 8,
        losses: 7,
      };
      const perfWith: BashoPerformance = {
        rikishiId: "r-test",
        wins: 8,
        losses: 7,
        edgeCrisisSurvived: 4,
      };
      const demotedOzeki = new Set<string>();
      const without = computeMovementUnits(entry, perfWithout, demotedOzeki);
      const withEC = computeMovementUnits(entry, perfWith, demotedOzeki);
      expect(withEC).toBeGreaterThan(without);
    });
  });

  // ── Gap 7: Momentum score narrative ──
  describe("Gap 7: Momentum score narrative", () => {
    it("generates momentum_shift line when momentumScore exceeds threshold", () => {
      const east = mockRikishi("r-east", { shikona: "Dominant" });
      const west = mockRikishi("r-west", { shikona: "Overwhelmed" });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        momentumScore: MOMENTUM_NARRATIVE_THRESHOLD + 2,
      });
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-momentum", world);
      const momentumLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "post_bout" && l.tags?.includes("momentum_shift")
      );
      expect(momentumLines.length).toBeGreaterThan(0);
      expect(momentumLines.some((l) => !hasMissingTokens(l.text))).toBe(true);
    });

    it("does not generate momentum_shift line when momentumScore is below threshold", () => {
      const east = mockRikishi("r-east", { shikona: "Even" });
      const west = mockRikishi("r-west", { shikona: "Match" });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        momentumScore: 1,
      });
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-momentum-low", world);
      const momentumLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "post_bout" && l.tags?.includes("momentum_shift")
      );
      expect(momentumLines.length).toBe(0);
    });
  });

  // ── Gap 8: Injury-to-kyujo warning narrative ──
  describe("Gap 8: Injury-to-kyujo warning narrative", () => {
    it("generates injury_kyujo_warning line for moderate in-bout injury", () => {
      const east = mockRikishi("r-east", { shikona: "ToughGuy" });
      const west = mockRikishi("r-west", { shikona: "Rival" });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        inBoutInjury: {
          rikishiId: "r-east",
          area: "knee" as any,
          severity: "moderate",
          triggerEvent: "tachiai_collision",
        },
      });
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-injury-kyujo", world);
      // The injury_kyujo_warning templates use various phrases: "threaten", "kyujo", "doubt", "withdrawal", "worrying", "medical staff"
      const warningKeywords = ["threaten", "kyujo", "doubt", "withdrawal", "worrying", "medical staff"];
      const injuryLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "post_bout" && l.tags?.includes("injury")
      );
      const warningLines = injuryLines.filter((l) =>
        warningKeywords.some((kw) => l.text.toLowerCase().includes(kw))
      );
      expect(warningLines.length).toBeGreaterThan(0);
      expect(warningLines.some((l) => !hasMissingTokens(l.text))).toBe(true);
    });

    it("generates injury_kyujo_warning line for serious in-bout injury", () => {
      const east = mockRikishi("r-east", { shikona: "ToughGuy" });
      const west = mockRikishi("r-west", { shikona: "Rival" });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        inBoutInjury: {
          rikishiId: "r-east",
          area: "shoulder" as any,
          severity: "serious",
          triggerEvent: "throw",
        },
      });
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-injury-serious", world);
      const warningKeywords = ["threaten", "kyujo", "doubt", "withdrawal", "worrying", "medical staff"];
      const injuryLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "post_bout" && l.tags?.includes("injury")
      );
      const warningLines = injuryLines.filter((l) =>
        warningKeywords.some((kw) => l.text.toLowerCase().includes(kw))
      );
      expect(warningLines.length).toBeGreaterThan(0);
    });

    it("does not generate injury_kyujo_warning line for minor in-bout injury", () => {
      const east = mockRikishi("r-east", { shikona: "ToughGuy" });
      const west = mockRikishi("r-west", { shikona: "Rival" });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        inBoutInjury: {
          rikishiId: "r-east",
          area: "finger" as any,
          severity: "minor",
          triggerEvent: "grip_battle",
        },
      });
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-injury-minor", world);
      const warningKeywords = ["threaten", "kyujo", "doubt", "withdrawal", "worrying", "medical staff"];
      const injuryLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "post_bout" && l.tags?.includes("injury")
      );
      const warningLines = injuryLines.filter((l) =>
        warningKeywords.some((kw) => l.text.toLowerCase().includes(kw))
      );
      expect(warningLines.length).toBe(0);
    });
  });
});
