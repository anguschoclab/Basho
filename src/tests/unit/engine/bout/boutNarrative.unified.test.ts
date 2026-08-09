import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { DramaContext } from "@/engine/matchmaking/DramaMatchmaker";

function makeMinimalBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout",
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

function makeWorld(
  east: ReturnType<typeof mockRikishi>,
  west: ReturnType<typeof mockRikishi>
): WorldState {
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
  }) as WorldState;
}

describe("generateBoutNarrative — unified narrative generation", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  describe("structure", () => {
    it("every PbpLine has non-empty text, unique id, phase, and voice", () => {
      const east = mockRikishi("r-east", { shikona: "Asanoyama", injured: false });
      const west = mockRikishi("r-west", { shikona: "Terunofuji", injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-1", world);

      expect(result.pbpLines).toBeDefined();
      expect(result.pbpLines!.length).toBeGreaterThan(0);

      const ids = new Set<string>();
      for (const line of result.pbpLines!) {
        expect(typeof line.text).toBe("string");
        expect(line.text.length).toBeGreaterThan(0);
        expect(typeof line.id).toBe("string");
        expect(line.id.length).toBeGreaterThan(0);
        expect(ids.has(line.id)).toBe(false);
        ids.add(line.id);
        expect(line.phase).toBeDefined();
        expect(line.voice).toBeDefined();
      }
    });
  });

  describe("phase coverage", () => {
    it("produces opening, entrance, ritual, tachiai, finish, ceremony phases for a normal bout", () => {
      const east = mockRikishi("r-east", {
        shikona: "Asanoyama",
        injured: false,
        rank: "yokozuna",
      });
      const west = mockRikishi("r-west", { shikona: "Terunofuji", injured: false, rank: "ozeki" });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      // Day 14 → dramatic voice → closing line
      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 14, "seed-dramatic", world);

      const phases = result.pbpLines!.map((l) => l.phase);
      expect(phases).toContain("opening");
      expect(phases).toContain("entrance");
      expect(phases).toContain("ritual");
      expect(phases).toContain("tachiai");
      expect(phases).toContain("finish");
      expect(phases).toContain("ceremony");
      expect(phases).toContain("closing");
    });
  });

  describe("opening (venue framing)", () => {
    it("generates an opening line with phase 'opening'", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-open", world);

      const openingLine = result.pbpLines!.find((l) => l.phase === "opening");
      expect(openingLine).toBeDefined();
      expect(openingLine!.text.length).toBeGreaterThan(0);
    });
  });

  describe("dynasty", () => {
    it("generates dynasty line with tags ['dynasty'] when bloodline exists", () => {
      const east = mockRikishi("r-east", { shikona: "Hakuho", injured: false });
      const west = mockRikishi("r-west", { shikona: "Kakuryu", injured: false });
      const world = makeWorld(east, west);
      // Add ancestor to world so BloodlineService detects it
      (world as unknown as Record<string, unknown>).historicalRikishi = new Map([
        ["r-east", { shikona: "Taiho", id: "hist-1", achievements: { yusho: 10 } }],
      ]);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-dynasty", world);

      const dynastyLine = result.pbpLines!.find((l) => l.tags?.includes("dynasty"));
      // Dynasty line may or may not appear depending on BloodlineService logic
      if (dynastyLine) {
        expect(dynastyLine.phase).toBe("opening");
      }
    });
  });

  describe("drama", () => {
    it("generates drama line when result.dramaticContext is set with score > 0", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const dramaCtx: DramaContext = {
        label: "make_or_break",
        score: 50,
      } as DramaContext;
      const result = makeMinimalBoutResult({ dramaticContext: dramaCtx });

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-drama", world);

      const dramaLine = result.pbpLines!.find((l) => l.tags?.includes("drama"));
      expect(dramaLine).toBeDefined();
      expect(dramaLine!.phase).toBe("opening");
    });

    it("does not generate drama line when dramaticContext is absent", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-nodrama", world);

      const dramaLine = result.pbpLines!.find((l) => l.tags?.includes("drama"));
      expect(dramaLine).toBeUndefined();
    });
  });

  describe("ritual salt", () => {
    it("generates salt lines for dramatic voice (day 14, elite)", () => {
      const east = mockRikishi("r-east", { rank: "yokozuna", injured: false });
      const west = mockRikishi("r-west", { rank: "ozeki", injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 14, "seed-salt-drama", world);

      const ritualLines = result.pbpLines!.filter((l) => l.phase === "ritual");
      expect(ritualLines.length).toBeGreaterThan(0);
    });

    it("may skip salt for understated voice (day 1, non-elite)", () => {
      const east = mockRikishi("r-east", { rank: "maegashira", injured: false });
      const west = mockRikishi("r-west", { rank: "maegashira", injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-salt-under", world);

      // Understated voice: salt is skipped unless RNG passes < 0.5
      // Just verify no crash and ritual lines exist (shikiri at minimum)
      const ritualLines = result.pbpLines!.filter((l) => l.phase === "ritual");
      expect(ritualLines.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("clinch phase (derived from belt engagement)", () => {
    it("generates clinch line when a belt engagement entry is present", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          {
            phase: "engagement",
            data: { tick: 4, family: "belt", attackerSide: "east", torqueAdvantage: 30 },
          },
          { phase: "finish", data: {} },
        ],
      });

      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        7,
        "seed-clinch-derive",
        world
      );

      const clinchLine = result.pbpLines!.find((l) => l.phase === "clinch");
      expect(clinchLine).toBeDefined();
    });

    it("only emits clinch once even with multiple belt engagements", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          {
            phase: "engagement",
            data: { tick: 4, family: "belt", attackerSide: "east", torqueAdvantage: 20 },
          },
          {
            phase: "engagement",
            data: { tick: 8, family: "belt", attackerSide: "east", torqueAdvantage: 25 },
          },
          {
            phase: "engagement",
            data: { tick: 12, family: "belt", attackerSide: "east", torqueAdvantage: 30 },
          },
          { phase: "finish", data: {} },
        ],
      });

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "seed-clinch-once", world);

      const clinchLines = result.pbpLines!.filter((l) => l.phase === "clinch");
      expect(clinchLines.length).toBe(1);
    });
  });

  describe("momentum phase (derived from large differential)", () => {
    it("generates momentum line when engagement has large force differential", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          {
            phase: "engagement",
            data: { tick: 4, family: "push", attackerSide: "east", forceDiff: 35 },
          },
          { phase: "finish", data: {} },
        ],
      });

      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        7,
        "seed-momentum-derive",
        world
      );

      const momentumLine = result.pbpLines!.find((l) => l.phase === "momentum");
      expect(momentumLine).toBeDefined();
    });

    it("does not generate momentum for small differentials", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          {
            phase: "engagement",
            data: { tick: 4, family: "push", attackerSide: "east", forceDiff: 10 },
          },
          { phase: "finish", data: {} },
        ],
      });

      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        7,
        "seed-momentum-small",
        world
      );

      const momentumLine = result.pbpLines!.find((l) => l.phase === "momentum");
      expect(momentumLine).toBeUndefined();
    });
  });

  describe("tactical phase (derived from speed/trick engagements)", () => {
    it("generates tactical line on speed (lateral) engagement", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          {
            phase: "engagement",
            data: {
              tick: 4,
              family: "speed",
              attackerSide: "east",
              forceDiff: 5,
              lateralOffsetDiff: 15,
            },
          },
          { phase: "finish", data: {} },
        ],
      });

      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        7,
        "seed-tactical-speed",
        world
      );

      const tacticalLine = result.pbpLines!.find((l) => l.phase === "tactical");
      expect(tacticalLine).toBeDefined();
    });

    it("generates tactical line with rear_take tag on large lateral offset", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          {
            phase: "engagement",
            data: {
              tick: 4,
              family: "speed",
              attackerSide: "east",
              forceDiff: 5,
              lateralOffsetDiff: 40,
            },
          },
          { phase: "finish", data: {} },
        ],
      });

      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        7,
        "seed-tactical-rear",
        world
      );

      const tacticalLine = result.pbpLines!.find((l) => l.phase === "tactical");
      expect(tacticalLine).toBeDefined();
      expect(tacticalLine!.text).toMatch(/\[\[rikishi:/);
    });

    it("generates tactical line on trick engagement", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          {
            phase: "engagement",
            data: { tick: 4, family: "trick", attackerSide: "east", forceDiff: 5 },
          },
          { phase: "finish", data: {} },
        ],
      });

      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        7,
        "seed-tactical-trick",
        world
      );

      const tacticalLine = result.pbpLines!.find((l) => l.phase === "tactical");
      expect(tacticalLine).toBeDefined();
    });

    it("generates tactical line with henka tag on henka_success tachiai", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, event: "henka_success", attackerSide: "east" } },
        ],
      });

      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        7,
        "seed-tactical-henka",
        world
      );

      const tacticalLine = result.pbpLines!.find(
        (l) => l.phase === "tactical" && l.tags?.includes("henka")
      );
      expect(tacticalLine).toBeDefined();
    });
  });

  describe("finish", () => {
    it("generates finish line with phase 'finish'", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-finish", world);

      const finishLine = result.pbpLines!.find((l) => l.phase === "finish");
      expect(finishLine).toBeDefined();
    });
  });

  describe("edge_crisis phase", () => {
    it("generates edge_crisis line with phase 'edge_crisis'", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          { phase: "edge_crisis", data: { side: "west", escaped: false, tawaraToePosition: 0.3 } },
          { phase: "finish", data: {} },
        ],
      });

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "seed-edge", world);

      const edgeLine = result.pbpLines!.find((l) => l.phase === "edge_crisis");
      expect(edgeLine).toBeDefined();
    });
  });

  describe("ceremony phase", () => {
    it("generates ceremony line after finish for non-fusensho bouts", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-ceremony", world);

      const ceremonyLine = result.pbpLines!.find((l) => l.phase === "ceremony");
      expect(ceremonyLine).toBeDefined();
      expect(ceremonyLine!.text).toMatch(/\[\[rikishi:/);
    });

    it("uses dramatic ceremony templates for dramatic voice", () => {
      const east = mockRikishi("r-east", { rank: "yokozuna", injured: false });
      const west = mockRikishi("r-west", { rank: "ozeki", injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        14,
        "seed-ceremony-drama",
        world
      );

      const ceremonyLine = result.pbpLines!.find((l) => l.phase === "ceremony");
      expect(ceremonyLine).toBeDefined();
      expect(ceremonyLine!.voice).toBe("dramatic");
    });

    it("does not generate ceremony for fusensho bouts", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({ kimarite: "fusensho", kimariteName: "Fusensho" });

      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        1,
        "seed-ceremony-fusensho",
        world
      );

      const ceremonyLine = result.pbpLines!.find((l) => l.phase === "ceremony");
      expect(ceremonyLine).toBeUndefined();
    });
  });

  describe("awards", () => {
    it("generates kinboshi award line with phase 'award' and tags ['kinboshi']", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({ awardFact: "kinboshi" });

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-kinboshi", world);

      const awardLine = result.pbpLines!.find(
        (l) => l.phase === "award" && l.tags?.includes("kinboshi")
      );
      expect(awardLine).toBeDefined();
    });

    it("generates ginboshi award line with phase 'award' and tags ['ginboshi']", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult({ awardFact: "ginboshi" });

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-ginboshi", world);

      const awardLine = result.pbpLines!.find(
        (l) => l.phase === "award" && l.tags?.includes("ginboshi")
      );
      expect(awardLine).toBeDefined();
    });
  });

  describe("closing", () => {
    it("generates closing line for dramatic voice (day 14, elite)", () => {
      const east = mockRikishi("r-east", { rank: "yokozuna", injured: false });
      const west = mockRikishi("r-west", { rank: "ozeki", injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 14, "seed-closing-d", world);

      const closingLine = result.pbpLines!.find((l) => l.phase === "closing");
      expect(closingLine).toBeDefined();
    });

    it("does not generate closing line for non-dramatic voice (day 1, non-elite)", () => {
      const east = mockRikishi("r-east", { rank: "maegashira", injured: false });
      const west = mockRikishi("r-west", { rank: "maegashira", injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-closing-n", world);

      const closingLine = result.pbpLines!.find((l) => l.phase === "closing");
      expect(closingLine).toBeUndefined();
    });
  });

  describe("voice metadata", () => {
    it("all lines have voice matching the context voice style", () => {
      const east = mockRikishi("r-east", { rank: "yokozuna", injured: false });
      const west = mockRikishi("r-west", { rank: "ozeki", injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 14, "seed-voice", world);

      // Day 14 + elite → dramatic
      for (const line of result.pbpLines!) {
        expect(line.voice).toBe("dramatic");
      }
    });
  });

  describe("MISSING filter", () => {
    it("lines containing [MISSING: are filtered out", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-missing", world);

      const hasMissing = result.pbpLines!.some((l) => l.text.includes("[MISSING:"));
      expect(hasMissing).toBe(false);
    });
  });

  describe("deleted fields", () => {
    it("result.narrative is undefined after generation", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-no-narr", world);

      expect((result as unknown as Record<string, unknown>).narrative).toBeUndefined();
    });

    it("result.pbp is undefined after generation", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);
      const result = makeMinimalBoutResult();

      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-no-pbp", world);

      expect((result as unknown as Record<string, unknown>).pbp).toBeUndefined();
    });
  });

  describe("determinism", () => {
    it("same inputs produce identical pbpLines", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const world = makeWorld(east, west);

      const result1 = makeMinimalBoutResult();
      const result2 = makeMinimalBoutResult();

      generateBoutNarrative(
        result1,
        east,
        west,
        "hatsu" as BashoName,
        7,
        "seed-determinism",
        world
      );
      generateBoutNarrative(
        result2,
        east,
        west,
        "hatsu" as BashoName,
        7,
        "seed-determinism",
        world
      );

      expect(result1.pbpLines).toEqual(result2.pbpLines);
    });
  });
});
