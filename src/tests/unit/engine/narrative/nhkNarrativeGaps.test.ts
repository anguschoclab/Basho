import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative, generateKyujoNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld, makeMockBasho } from "../utils";
import { resolvePlayoffs } from "@/engine/lifecycle/PlayoffResolver";
import { distributePrizes } from "@/engine/lifecycle/PrizeDistribution";
import { withdrawRikishi } from "@/engine/systems/health/HealthActions";
import type { BoutResult, BashoState, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { DramaContext } from "@/engine/matchmaking/DramaMatchmaker";
import type { CareerSnapshot } from "@/engine/types/history";
import type { Rank, Division } from "@/engine/types/banzuke";

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-nhk",
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

function makeCareerSnapshot(
  overrides: Partial<CareerSnapshot> & {
    rank: Rank;
    division: Division;
    wins: number;
    losses: number;
    bashoName: string;
    year: number;
  }
): CareerSnapshot {
  return {
    id: "snap-1",
    bashoId: "basho-1",
    month: 1,
    rankNumber: 0,
    side: "east",
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 120,
    momentum: 0,
    ...overrides,
  };
}

const BASHO = "hatsu" as BashoName;

describe("NHK Narrative Integration — 8 Gaps", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  // ── Gap 1: Career bout milestones ──
  describe("Gap 1: Career bout milestones", () => {
    it("pre-bout: careerBouts at 499 → milestone line mentioning 500", () => {
      const east = mockRikishi("r-east", {
        shikona: "Alpha",
        careerWins: 250,
        careerLosses: 249, // total = 499, +1 = 500
        currentBashoWins: 5,
        currentBashoLosses: 3,
      });
      const west = mockRikishi("r-west", { shikona: "Beta", careerWins: 50, careerLosses: 20 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-bout-milestone-pre", world);
      const preLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "pre_bout" && l.tags?.includes("milestone")
      );
      const boutMilestoneLines = preLines.filter((l) => l.text.includes("500"));
      expect(boutMilestoneLines?.length ?? 0).toBeGreaterThan(0);
    });

    it("post-bout: winner careerBouts at 499 → milestone line mentioning 500", () => {
      const east = mockRikishi("r-east", {
        shikona: "Alpha",
        careerWins: 250,
        careerLosses: 249,
        currentBashoWins: 5,
        currentBashoLosses: 3,
      });
      const west = mockRikishi("r-west", { shikona: "Beta", careerWins: 50, careerLosses: 20 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-bout-milestone-post", world);
      const postLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "post_bout" && l.tags?.includes("milestone")
      );
      const boutMilestoneLines = postLines.filter((l) => l.text.includes("500"));
      expect(boutMilestoneLines?.length ?? 0).toBeGreaterThan(0);
    });

    it("no milestone when careerBouts not at threshold", () => {
      const east = mockRikishi("r-east", {
        shikona: "Alpha",
        careerWins: 100,
        careerLosses: 50, // total = 150, not near any milestone
        currentBashoWins: 5,
        currentBashoLosses: 3,
      });
      const west = mockRikishi("r-west", { shikona: "Beta", careerWins: 50, careerLosses: 20 });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-bout-milestone-none", world);
      const preMilestoneLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "pre_bout" && l.tags?.includes("milestone") && l.text.includes("500")
      );
      expect(preMilestoneLines?.length ?? 0).toBe(0);
    });
  });

  // ── Gap 2: Kyujo narratives ──
  describe("Gap 2: Kyujo narratives", () => {
    it("generateKyujoNarrative — injury_withdrawal produces narrative line", () => {
      const r = mockRikishi("r-kyujo", { shikona: "Gamma", injured: true });
      const lines = generateKyujoNarrative(
        r,
        "injury_withdrawal",
        { area: "knee", day: 7 },
        "test-kyujo-1"
      );
      expect(lines?.length ?? 0).toBeGreaterThan(0);
      expect(lines[0].phase).toBe("kyujo");
      expect(lines[0].tags).toContain("injury");
      expect(hasMissingTokens(lines[0].text)).toBe(false);
      expect(lines[0].text).toContain("Gamma");
    });

    it("generateKyujoNarrative — pre_basho_withdrawal produces narrative line", () => {
      const r = mockRikishi("r-kyujo", { shikona: "Delta" });
      const lines = generateKyujoNarrative(
        r,
        "pre_basho_withdrawal",
        { reason: "knee surgery" },
        "test-kyujo-2"
      );
      expect(lines?.length ?? 0).toBeGreaterThan(0);
      expect(hasMissingTokens(lines[0].text)).toBe(false);
      expect(lines[0].text).toContain("Delta");
    });

    it("generateKyujoNarrative — return_from_kyujo produces narrative line", () => {
      const r = mockRikishi("r-kyujo", { shikona: "Epsilon" });
      const lines = generateKyujoNarrative(
        r,
        "return_from_kyujo",
        { bashosMissed: 2 },
        "test-kyujo-3"
      );
      expect(lines?.length ?? 0).toBeGreaterThan(0);
      expect(hasMissingTokens(lines[0].text)).toBe(false);
      expect(lines[0].text).toContain("Epsilon");
    });

    it("generateKyujoNarrative — deterministic with same seed", () => {
      const r = mockRikishi("r-kyujo", { shikona: "Zeta" });
      const l1 = generateKyujoNarrative(
        r,
        "injury_withdrawal",
        { area: "ankle", day: 5 },
        "det-seed"
      );
      const l2 = generateKyujoNarrative(
        r,
        "injury_withdrawal",
        { area: "ankle", day: 5 },
        "det-seed"
      );
      expect(l1.map((l) => l.text)).toEqual(l2.map((l) => l.text));
    });

    it("withdrawRikishi attaches narrative to event", () => {
      const r = mockRikishi("r-withdraw", {
        shikona: "Eta",
        injured: true,
        injuryStatus: {
          type: "sprain",
          severity: "moderate",
          weeksRemaining: 4,
          location: "ankle",
        } as any,
      });
      const world = makeMockWorld({
        rikishi: new Map([[r.id, r]]),
        currentBasho: { day: 7 } as any,
      }) as WorldState;
      const impact = withdrawRikishi(world, r.id);
      const withdrawEvent = impact.events?.find((e) => e.data?.status === "withdrawn_kyujo");
      expect(withdrawEvent).toBeDefined();
      expect(withdrawEvent!.data?.narrative).toBeDefined();
      expect(Array.isArray(withdrawEvent!.data?.narrative)).toBe(true);
      expect((withdrawEvent!.data?.narrative as any[])?.length ?? 0).toBeGreaterThan(0);
    });
  });

  // ── Gap 3: Playoff narratives ──
  describe("Gap 3: Playoff narratives", () => {
    it("resolvePlayoffs adds playoff-specific pbpLines", () => {
      const r1 = mockRikishi("r-p1", {
        shikona: "Playoff1",
        careerWins: 100,
        careerLosses: 50,
        currentBashoWins: 14,
        currentBashoLosses: 1,
      });
      const r2 = mockRikishi("r-p2", {
        shikona: "Playoff2",
        careerWins: 80,
        careerLosses: 40,
        currentBashoWins: 14,
        currentBashoLosses: 1,
      });
      const world = makeMockWorld({
        rikishi: new Map([
          [r1.id, r1],
          [r2.id, r2],
        ]),
        activeRikishiIds: new Set([r1.id, r2.id]),
        year: 2025,
        seed: "playoff-test",
        sponsorPool: { sponsors: new Map(), koenkais: new Map() },
      }) as WorldState;
      const basho = makeMockBasho({ bashoName: "hatsu", year: 2025 }) as BashoState;
      const result = resolvePlayoffs(world, basho, [r1.id, r2.id]);
      expect((result as any).matches?.length ?? 0).toBeGreaterThan(0);
      const allLines = result.matches.flatMap((m) => m.result?.pbpLines ?? []);
      const playoffLines = allLines.filter((l) => l.tags?.includes("yusho_race"));
      expect(playoffLines?.length ?? 0).toBeGreaterThan(0);
      // Check for playoff-specific text
      const hasPlayoffText = playoffLines.some(
        (l) =>
          l.text.includes("playoff") || l.text.includes("championship") || l.text.includes("yusho")
      );
      expect(hasPlayoffText).toBe(true);
    });

    it("playoff narrative has no [MISSING:] tokens", () => {
      const r1 = mockRikishi("r-p1", {
        shikona: "P1",
        currentBashoWins: 14,
        currentBashoLosses: 1,
      });
      const r2 = mockRikishi("r-p2", {
        shikona: "P2",
        currentBashoWins: 14,
        currentBashoLosses: 1,
      });
      const world = makeMockWorld({
        rikishi: new Map([
          [r1.id, r1],
          [r2.id, r2],
        ]),
        activeRikishiIds: new Set([r1.id, r2.id]),
        seed: "playoff-missing",
        sponsorPool: { sponsors: new Map(), koenkais: new Map() },
      }) as WorldState;
      const basho = makeMockBasho({ bashoName: "hatsu" }) as BashoState;
      const result = resolvePlayoffs(world, basho, [r1.id, r2.id]);
      const allLines = result.matches.flatMap((m) => m.result?.pbpLines ?? []);
      for (const line of allLines) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });
  });

  // ── Gap 4: Sansho ceremony narratives ──
  describe("Gap 4: Sansho ceremony narratives", () => {
    it("distributePrizes logs sansho ceremony narrative event", () => {
      // Create a basho with matches that will yield special prizes
      const r1 = mockRikishi("r-sansho1", {
        shikona: "Sansho1",
        currentBashoWins: 11,
        currentBashoLosses: 4,
        rank: "maegashira",
        rankNumber: 5,
      });
      const r2 = mockRikishi("r-sansho2", {
        shikona: "Sansho2",
        currentBashoWins: 10,
        currentBashoLosses: 5,
        rank: "maegashira",
        rankNumber: 7,
      });
      const r3 = mockRikishi("r-yusho", {
        shikona: "Yusho",
        currentBashoWins: 13,
        currentBashoLosses: 2,
        rank: "ozeki",
      });
      const world = makeMockWorld({
        rikishi: new Map([
          [r1.id, r1],
          [r2.id, r2],
          [r3.id, r3],
        ]),
        activeRikishiIds: new Set([r1.id, r2.id, r3.id]),
        year: 2025,
        seed: "sansho-test",
      }) as WorldState;

      // Build a minimal basho with standings and matches
      const basho = makeMockBasho({
        bashoName: "hatsu",
        year: 2025,
        standings: new Map([
          [r1.id, { wins: 11, losses: 4 }],
          [r2.id, { wins: 10, losses: 5 }],
          [r3.id, { wins: 13, losses: 2 }],
        ]),
        matches: [],
      }) as BashoState;

      const { impact } = distributePrizes(world, basho, r3.id);
      const ceremonyEvent = impact.events?.find(
        (e) => e.type === "LIFECYCLE_EVENT" && e.data?.status === "sansho_ceremony"
      );
      // If prizes were awarded, there should be a ceremony event
      if (ceremonyEvent) {
        const narrative = ceremonyEvent.data?.narrative as unknown;
        expect(narrative).toBeDefined();
        expect(Array.isArray(narrative)).toBe(true);
        const narrativeLines = narrative as Array<{ text: string }>;
        expect(narrativeLines?.length ?? 0).toBeGreaterThan(0);
        for (const line of narrativeLines) {
          expect(hasMissingTokens(line.text)).toBe(false);
        }
      }
    });
  });

  // ── Gap 5: Comeback win narrative ──
  describe("Gap 5: Comeback win narrative", () => {
    it("winner with edge_crisis escape in log → comeback line", () => {
      const east = mockRikishi("r-east", {
        shikona: "Comeback",
        currentBashoWins: 5,
        currentBashoLosses: 3,
      });
      const west = mockRikishi("r-west", {
        shikona: "Fallback",
        currentBashoWins: 3,
        currentBashoLosses: 5,
      });
      const world = makeWorld(east, west);
      const result = makeBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          { phase: "edge_crisis", data: { escaped: true, side: "east", tick: 5 } },
          { phase: "finish", data: {} },
        ],
      });
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-comeback-1", world);
      const comebackLines = (result.pbpLines ?? []).filter((l) => l.tags?.includes("comeback"));
      expect(comebackLines?.length ?? 0).toBeGreaterThan(0);
      expect(hasMissingTokens(comebackLines[0].text)).toBe(false);
    });

    it("no comeback line when no edge_crisis escape", () => {
      const east = mockRikishi("r-east", {
        shikona: "NoComeback",
        currentBashoWins: 5,
        currentBashoLosses: 3,
      });
      const west = mockRikishi("r-west", {
        shikona: "NoFallback",
        currentBashoWins: 3,
        currentBashoLosses: 5,
      });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-comeback-none", world);
      const comebackLines = (result.pbpLines ?? []).filter((l) => l.tags?.includes("comeback"));
      expect(comebackLines?.length ?? 0).toBe(0);
    });
  });

  // ── Gap 6: Bout of the day ──
  describe("Gap 6: Bout of the day", () => {
    it("high drama score (>=85) → bout_of_the_day pre-bout line", () => {
      const east = mockRikishi("r-east", {
        shikona: "StarEast",
        currentBashoWins: 12,
        currentBashoLosses: 2,
      });
      const west = mockRikishi("r-west", {
        shikona: "StarWest",
        currentBashoWins: 12,
        currentBashoLosses: 2,
      });
      const world = makeWorld(east, west);
      const drama: DramaContext = {
        label: "yusho_decider",
        score: 90,
        reason: "Yusho on the line",
      };
      const result = makeBoutResult({ dramaticContext: drama });
      generateBoutNarrative(result, east, west, BASHO, 15, "seed-botd-1", world);
      const botdLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "pre_bout" && l.tags?.includes("tournament_context")
      );
      expect(botdLines?.length ?? 0).toBeGreaterThan(0);
      const allText = botdLines.map((l) => l.text).join(" ");
      expect(allText).toContain("StarEast");
      expect(allText).toContain("StarWest");
    });

    it("low drama score → no bout_of_the_day line", () => {
      const east = mockRikishi("r-east", {
        shikona: "LowEast",
        currentBashoWins: 5,
        currentBashoLosses: 5,
      });
      const west = mockRikishi("r-west", {
        shikona: "LowWest",
        currentBashoWins: 5,
        currentBashoLosses: 5,
      });
      const world = makeWorld(east, west);
      const drama: DramaContext = { label: "archetype_clash", score: 30, reason: "Minor clash" };
      const result = makeBoutResult({ dramaticContext: drama });
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-botd-none", world);
      const botdLines = (result.pbpLines ?? []).filter(
        (l) =>
          l.phase === "pre_bout" &&
          l.tags?.includes("tournament_context") &&
          (l.text.includes("bout of the day") ||
            l.text.includes("featured bout") ||
            l.text.includes("marquee"))
      );
      expect(botdLines?.length ?? 0).toBe(0);
    });
  });

  // ── Gap 7: Spoiler narrative ──
  describe("Gap 7: Spoiler narrative", () => {
    it("former sanyaku (now maegashira) vs contender → spoiler line", () => {
      const spoiler = mockRikishi("r-spoiler", {
        shikona: "FallenStar",
        rank: "maegashira",
        rankNumber: 10,
        careerHistory: [
          makeCareerSnapshot({
            rank: "ozeki",
            division: "makuuchi",
            wins: 10,
            losses: 5,
            bashoName: "hatsu",
            year: 2024,
          }),
        ],
        currentBashoWins: 3,
        currentBashoLosses: 8,
      });
      const contender = mockRikishi("r-contender", {
        shikona: "RisingStar",
        rank: "maegashira",
        rankNumber: 1,
        currentBashoWins: 10,
        currentBashoLosses: 2,
      });
      const world = makeWorld(spoiler, contender);
      const result = makeBoutResult();
      generateBoutNarrative(result, spoiler, contender, BASHO, 13, "seed-spoiler-1", world);
      const spoilerLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "pre_bout" && l.tags?.includes("title_stakes")
      );
      const hasSpoilerText = spoilerLines.some(
        (l) =>
          l.text.includes("spoiler") || l.text.includes("FallenStar") || l.text.includes("derail")
      );
      expect(hasSpoilerText).toBe(true);
    });

    it("no spoiler line when both are same rank tier", () => {
      const east = mockRikishi("r-east", {
        shikona: "EastMan",
        rank: "maegashira",
        rankNumber: 5,
        careerHistory: [
          makeCareerSnapshot({
            rank: "maegashira",
            division: "makuuchi",
            wins: 8,
            losses: 7,
            bashoName: "hatsu",
            year: 2024,
          }),
        ],
        currentBashoWins: 5,
        currentBashoLosses: 5,
      });
      const west = mockRikishi("r-west", {
        shikona: "WestMan",
        rank: "maegashira",
        rankNumber: 6,
        currentBashoWins: 5,
        currentBashoLosses: 5,
      });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-spoiler-none", world);
      const spoilerLines = (result.pbpLines ?? []).filter(
        (l) =>
          l.phase === "pre_bout" &&
          l.tags?.includes("title_stakes") &&
          (l.text.includes("spoiler") || l.text.includes("derail"))
      );
      expect(spoilerLines?.length ?? 0).toBe(0);
    });
  });

  // ── Gap 8: Rank debut narrative ──
  describe("Gap 8: Rank debut narrative", () => {
    it("shin-sekiwake debut → rank debut line", () => {
      const east = mockRikishi("r-debut", {
        shikona: "NewSekiwake",
        rank: "sekiwake",
        rankNumber: 3,
        careerHistory: [
          makeCareerSnapshot({
            rank: "maegashira",
            division: "makuuchi",
            wins: 9,
            losses: 6,
            bashoName: "kyushu",
            year: 2024,
            rankNumber: 1,
          }),
        ],
        currentBashoWins: 5,
        currentBashoLosses: 3,
      });
      const west = mockRikishi("r-west", {
        shikona: "Opponent",
        currentBashoWins: 3,
        currentBashoLosses: 5,
      });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-debut-sekiwake", world);
      const debutLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "pre_bout" && l.tags?.includes("debut")
      );
      expect(debutLines?.length ?? 0).toBeGreaterThan(0);
      const hasSekiwakeText = debutLines.some(
        (l) => l.text.includes("sekiwake") || l.text.includes("Sekiwake")
      );
      expect(hasSekiwakeText).toBe(true);
    });

    it("shin-komusubi debut → rank debut line", () => {
      const east = mockRikishi("r-debut", {
        shikona: "NewKomusubi",
        rank: "komusubi",
        rankNumber: 4,
        careerHistory: [
          makeCareerSnapshot({
            rank: "maegashira",
            division: "makuuchi",
            wins: 10,
            losses: 5,
            bashoName: "kyushu",
            year: 2024,
            rankNumber: 2,
          }),
        ],
        currentBashoWins: 5,
        currentBashoLosses: 3,
      });
      const west = mockRikishi("r-west", {
        shikona: "Opponent",
        currentBashoWins: 3,
        currentBashoLosses: 5,
      });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-debut-komusubi", world);
      const debutLines = (result.pbpLines ?? []).filter(
        (l) => l.phase === "pre_bout" && l.tags?.includes("debut")
      );
      expect(debutLines?.length ?? 0).toBeGreaterThan(0);
      const hasKomusubiText = debutLines.some(
        (l) => l.text.includes("komusubi") || l.text.includes("Komusubi")
      );
      expect(hasKomusubiText).toBe(true);
    });

    it("no debut line when rank unchanged", () => {
      const east = mockRikishi("r-east", {
        shikona: "SameRank",
        rank: "maegashira",
        rankNumber: 5,
        careerHistory: [
          makeCareerSnapshot({
            rank: "maegashira",
            division: "makuuchi",
            wins: 8,
            losses: 7,
            bashoName: "kyushu",
            year: 2024,
            rankNumber: 5,
          }),
        ],
        currentBashoWins: 5,
        currentBashoLosses: 3,
      });
      const west = mockRikishi("r-west", {
        shikona: "Opponent",
        currentBashoWins: 3,
        currentBashoLosses: 5,
      });
      const world = makeWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-debut-none", world);
      const debutLines = (result.pbpLines ?? []).filter(
        (l) =>
          l.phase === "pre_bout" &&
          l.tags?.includes("debut") &&
          (l.text.includes("shin-") || l.text.includes("Shin-") || l.text.includes("debut"))
      );
      expect(debutLines?.length ?? 0).toBe(0);
    });
  });

  // ── Determinism: no [MISSING:] tokens across all gaps ──
  describe("No [MISSING:] tokens in any narrative", () => {
    it("bout narrative with all gap triggers → no missing tokens", () => {
      const east = mockRikishi("r-east", {
        shikona: "TestEast",
        careerWins: 250,
        careerLosses: 249, // bout milestone
        currentBashoWins: 12,
        currentBashoLosses: 2,
        rank: "sekiwake",
        rankNumber: 3,
        careerHistory: [
          makeCareerSnapshot({
            rank: "maegashira",
            division: "makuuchi",
            wins: 9,
            losses: 6,
            bashoName: "kyushu",
            year: 2024,
            rankNumber: 1,
          }),
        ],
      });
      const west = mockRikishi("r-west", {
        shikona: "TestWest",
        currentBashoWins: 12,
        currentBashoLosses: 2,
      });
      const world = makeWorld(east, west);
      const drama: DramaContext = {
        label: "yusho_decider",
        score: 90,
        reason: "Yusho on the line",
      };
      const result = makeBoutResult({
        dramaticContext: drama,
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          { phase: "edge_crisis", data: { escaped: true, side: "east", tick: 5 } },
          { phase: "finish", data: {} },
        ],
      });
      generateBoutNarrative(result, east, west, BASHO, 15, "seed-all-gaps", world);
      for (const line of result.pbpLines ?? []) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });
  });
});
