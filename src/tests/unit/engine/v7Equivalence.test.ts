/**
 * v7 consolidation — characterization/equivalence pins.
 *
 * Authored BEFORE any merge (strict test-first gate). Equivalence pins assert
 * observable outputs of code regions targeted by Bolt perf PRs; they must pass
 * on unmodified main AND post-merge. Semantic-change pins (#962 path selection,
 * V7-B12 injuredCount) are expected to FAIL on pre-merge main and turn GREEN
 * after the intentional change lands.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { MockFactory } from "../../helpers/utils/MockFactory";
import { clearQueryCaches } from "@/engine/queries";
import { phase05_monthly_boundary } from "@/engine/tick/phases/phase05_monthly_boundary";
import { phase01_week_welfare } from "@/engine/tick/phases/phase01_week_welfare";
import { buildAIContext } from "@/engine/npcAI/contextBuilder";
import { createPlan } from "@/engine/npcAI/StrategicPlanner";
import { projectTsukebito } from "@/presenters/tsukebitoProjections";
import { detectDueDecisions } from "@/engine/loop/LoopDecisionEngine";
import { generateH2HCommentary } from "@/engine/h2h";
import { BardEngine } from "@/engine/bard/BardEngine";
import { generateRecommendations } from "@/engine/advisor/AdvisorService";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

const mkWorld = (o: Partial<WorldState>) => MockFactory.createWorld(o);
const mkR = (id: string, o: Partial<Rikishi> = {}) => MockFactory.createRikishi({ id, ...o });
const mkH = (id: string, o: Record<string, unknown> = {}) => MockFactory.createHeya(id, o);

// ---------------------------------------------------------------------------
// Cluster B winner (#988): phase05 sekitori participant selection
// Observable surface: BASHO_STATUS "exhibition_tour" event participantCount.
// ---------------------------------------------------------------------------
describe("v7 equivalence — phase05 jungyo participant selection (#961/#969/#970/#973/#979/#988)", () => {
  function jungyoWorld(): WorldState {
    const rikishi = new Map([
      ["sek1", mkR("sek1", { heyaId: "hA", division: "makuuchi" })],
      ["sek2", mkR("sek2", { heyaId: "hA", division: "juryo" })],
      ["optOut", mkR("optOut", { heyaId: "hB", division: "makuuchi" })],
      ["lowDiv", mkR("lowDiv", { heyaId: "hA", division: "sandanme" })],
      ["retired", mkR("retired", { heyaId: "hA", division: "makuuchi", isRetired: true })],
      ["missing", undefined as unknown as Rikishi], // will be deleted below
    ]);
    rikishi.delete("missing");
    const world = mkWorld({
      heyas: new Map([
        ["hA", mkH("hA")],
        ["hB", mkH("hB", { jungyoOptOut: true })],
      ]),
      rikishi,
      calendar: { month: 2, currentWeek: 8 } as WorldState["calendar"],
      transientContext: {
        boundaries: { monthBoundary: true, yearBoundary: false },
      } as WorldState["transientContext"],
    });
    // Force a retired id into the active set to exercise the isRetired guard.
    (world.activeRikishiIds as Set<string>).add("retired");
    (world.activeRikishiIds as Set<string>).add("missing");
    return world;
  }

  it("selects exactly the 2 eligible sekitori (excludes opted-out heya, non-sekitori, retired, missing)", () => {
    const impact = phase05_monthly_boundary(jungyoWorld());
    const tour = (impact.events ?? []).find(
      (e) => (e.data as Record<string, unknown>)?.status === "exhibition_tour"
    );
    expect(tour).toBeDefined();
    expect((tour!.data as Record<string, unknown>).participantCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Cluster C (#991/#993): phase01_week_welfare injured/active partition
// Observable: encouragementLog world-field + NARRATIVE_CRISIS_TRIGGERED event.
// ---------------------------------------------------------------------------
describe("v7 equivalence — phase01_week_welfare injured/active partition (#991/#993)", () => {
  // getHeyaRoster is memoized module-wide by (heyaId, week) — V7-B13.
  // Clear between tests so each world sees its own roster.
  beforeEach(() => clearQueryCaches());

  it("injured non-retired rikishi encourage the first active stablemate only", () => {
    const heya = mkH("hW", { rikishiIds: ["inj", "act1", "act2", "ret"] });
    const rikishi = new Map([
      ["inj", mkR("inj", { heyaId: "hW", injured: true, shikona: "Injured" })],
      ["act1", mkR("act1", { heyaId: "hW", motivation: 50, shikona: "Active1" })],
      ["act2", mkR("act2", { heyaId: "hW", motivation: 40, shikona: "Active2" })],
      ["ret", mkR("ret", { heyaId: "hW", injured: true, isRetired: true, shikona: "Ret" })],
    ]);
    const world = mkWorld({ heyas: new Map([["hW", heya]]), rikishi });
    const impact = phase01_week_welfare(world);
    const encLog = impact.worldFields?.encouragementLog as
      | { from: string; to: string; basho: string }[]
      | undefined;
    // Retired-injured rikishi must NOT encourage; "inj" encourages first active only.
    expect(encLog).toEqual([{ from: "inj", to: "act1", basho: "off-season" }]);
    const evt = (impact.events ?? []).find((e) => e.type === "NARRATIVE_CRISIS_TRIGGERED");
    expect(evt).toBeDefined();
    expect((evt!.data as Record<string, unknown>).rikishiId).toBe("act1");
  });

  it("no encouragement when either partition is empty", () => {
    const heya = mkH("hW", { rikishiIds: ["a1", "a2"] });
    const rikishi = new Map([
      ["a1", mkR("a1", { heyaId: "hW" })],
      ["a2", mkR("a2", { heyaId: "hW" })],
    ]);
    const world = mkWorld({ heyas: new Map([["hW", heya]]), rikishi });
    const impact = phase01_week_welfare(world);
    expect(impact.worldFields?.encouragementLog).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// #991: StrategicPlanner createPlan — pinned output on a fixed world.
// Exercises the .filter().sort()[0] rival pick and Math.max runner-up loop.
// ---------------------------------------------------------------------------
describe("v7 equivalence — StrategicPlanner createPlan (#991)", () => {
  it("pins planId, reasoning, and constraints on a fixed world", () => {
    const world = mkWorld({
      heyas: new Map([
        ["h1", mkH("h1")],
        ["h2", mkH("h2")],
      ]),
      rivalriesState: {
        version: "1.0.0",
        pairs: {},
        heyaRivalryPairs: {
          h1_h2: { id: "h1_h2", heyaAId: "h1", heyaBId: "h2", heat: 90, aWins: 0, bWins: 0 },
          h2_h3: { id: "h2_h3", heyaAId: "h2", heyaBId: "h3", heat: 10, aWins: 0, bWins: 0 },
        },
      },
    });
    const ctx = buildAIContext(world, "h1", "o1");
    const plan = createPlan(ctx);
    expect(plan).toBeDefined();
    expect(plan!.planId).toBe("talent_pipeline");
    expect(plan!.reasoning).toEqual([
      "Selected talent_pipeline (score 55, runner-up 50).",
      "Long-term strength comes from a homegrown talent pipeline.",
    ]);
    expect(plan!.constraints).toEqual([
      { domain: "recruitment", type: "invest_academy", value: true },
      { domain: "finance", type: "min_reserve", value: 6 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// #993: AdvisorService — equivalence on standard case + V7-B12 semantic pin.
// ---------------------------------------------------------------------------
describe("v7 equivalence — AdvisorService roster counts (#993)", () => {
  it("emits injury-wave rec when injured share exceeds 1/3 of active (baseline)", () => {
    const heya = mkH("hA", { rikishiIds: ["r1", "r2", "r3", "r4"] });
    const rikishi = new Map([
      ["r1", mkR("r1", { heyaId: "hA", injured: true })],
      ["r2", mkR("r2", { heyaId: "hA", injured: true })],
      ["r3", mkR("r3", { heyaId: "hA" })],
      ["r4", mkR("r4", { heyaId: "hA" })],
    ]);
    const world = mkWorld({ heyas: new Map([["hA", heya]]), rikishi });
    const recs = generateRecommendations(world, "hA");
    const injuryRec = recs.find((r) => r.id === "health-injury-wave" || /injur/i.test(r.title));
    expect(injuryRec).toBeDefined();
  });

  it("V7-B12 semantic pin: retired-but-injured rikishi do NOT count toward the injury ratio", () => {
    // 3 healthy active + 2 retired-but-injured. Post-merge (intended) semantics:
    // injuredCount counts only non-retired → 0 → NO injury-wave rec.
    // Pre-merge main counts them → rec fires → this test is RED until #993 lands.
    const heya = mkH("hA", { rikishiIds: ["r1", "r2", "r3", "old1", "old2"] });
    const rikishi = new Map([
      ["r1", mkR("r1", { heyaId: "hA" })],
      ["r2", mkR("r2", { heyaId: "hA" })],
      ["r3", mkR("r3", { heyaId: "hA" })],
      ["old1", mkR("old1", { heyaId: "hA", injured: true, isRetired: true })],
      ["old2", mkR("old2", { heyaId: "hA", injured: true, isRetired: true })],
    ]);
    const world = mkWorld({ heyas: new Map([["hA", heya]]), rikishi });
    const recs = generateRecommendations(world, "hA");
    const injuryRec = recs.find((r) => r.id === "health-injury-wave" || /injur/i.test(r.title));
    expect(injuryRec).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// #964: projectTsukebito — pinned DTO.
// ---------------------------------------------------------------------------
describe("v7 equivalence — projectTsukebito (#964)", () => {
  it("pins the full projection DTO for a fixed stable", () => {
    const heya = mkH("hT", { rikishiIds: ["sen", "jr1", "jr2"] });
    const rikishi = new Map([
      ["sen", mkR("sen", { heyaId: "hT", rankNumber: 2, shikona: "Senior", tsukebitoIds: ["jr1"] })],
      ["jr1", mkR("jr1", { heyaId: "hT", rankNumber: 12, shikona: "JuniorOne" })],
      ["jr2", mkR("jr2", { heyaId: "hT", rankNumber: 15, shikona: "JuniorTwo" })],
    ]);
    const world = mkWorld({ heyas: new Map([["hT", heya]]), rikishi });
    expect(projectTsukebito(world, "hT")).toEqual({
      assignments: [
        {
          seniorId: "sen",
          seniorShikona: "Senior",
          seniorRankLabel: "maegashira",
          tsukebitoIds: ["jr1"],
          tsukebito: [{ id: "jr1", shikona: "JuniorOne", rankLabel: "maegashira" }],
        },
      ],
      eligibleSeniors: [
        { id: "sen", shikona: "Senior", rankLabel: "maegashira", currentCount: 1, maxCount: 2 },
      ],
      eligibleJuniors: [
        { id: "jr1", shikona: "JuniorOne", rankLabel: "maegashira", assignedTo: "sen" },
        { id: "jr2", shikona: "JuniorTwo", rankLabel: "maegashira", assignedTo: null },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// #993: detectDueDecisions — pinned at-risk count in description.
// ---------------------------------------------------------------------------
describe("v7 equivalence — detectDueDecisions pre_basho_readiness (#993)", () => {
  it("counts fatigued+injured active rikishi exactly", () => {
    const heya = mkH("hP", { rikishiIds: ["t1", "t2", "ok"] });
    const rikishi = new Map([
      ["t1", mkR("t1", { heyaId: "hP", fatigue: 80 })],
      ["t2", mkR("t2", { heyaId: "hP", injured: true })],
      ["ok", mkR("ok", { heyaId: "hP" })],
    ]);
    const world = mkWorld({
      playerHeyaId: "hP",
      heyas: new Map([["hP", heya]]),
      rikishi,
      cyclePhase: "pre_basho",
      week: 5,
    });
    const decisions = detectDueDecisions(world);
    const readiness = decisions.find((d) => d.type === "pre_basho_readiness");
    expect(readiness).toBeDefined();
    expect(readiness!.description).toBe(
      "2 wrestler(s) enter the basho fatigued or injured. Rest them or push for rank?"
    );
  });
});

// ---------------------------------------------------------------------------
// #962: directional h2h streak narrative — RED on pre-merge main.
// ---------------------------------------------------------------------------
describe("v7 behavior — #962 directional h2h streak paths", () => {
  beforeAll(async () => {
    await BardEngine.ensureDomains(["h2h", "pre_bout"]);
  });
  afterEach(() => vi.restoreAllMocks());

  const spyResolve = () => {
    const paths: string[] = [];
    const orig = BardEngine.resolve.bind(BardEngine);
    vi.spyOn(BardEngine, "resolve").mockImplementation(((rng: never, path: string, ctx: never) => {
      paths.push(path);
      return orig(rng, path as never, ctx);
    }) as typeof BardEngine.resolve);
    return paths;
  };

  it("positive streak resolves h2h.winning_streak", () => {
    const paths = spyResolve();
    const a = mkR("a", {
      shikona: "Alpha",
      h2h: { b: { wins: 6, losses: 4, streak: 4, lastMatch: null } },
    });
    const b = mkR("b", { shikona: "Beta" });
    generateH2HCommentary(a, b);
    expect(paths).toContain("h2h.winning_streak");
    expect(paths).not.toContain("h2h.streak");
  });

  it("negative streak resolves h2h.losing_streak", () => {
    const paths = spyResolve();
    const a = mkR("a", {
      shikona: "Alpha",
      h2h: { b: { wins: 4, losses: 6, streak: -4, lastMatch: null } },
    });
    const b = mkR("b", { shikona: "Beta" });
    generateH2HCommentary(a, b);
    expect(paths).toContain("h2h.losing_streak");
    expect(paths).not.toContain("h2h.streak");
  });
});

// ---------------------------------------------------------------------------
// #962 second site: boutNarrative pre_bout streak block — directional paths
// pre_bout.h2h_winning_streak / pre_bout.h2h_losing_streak (RED on main, which
// resolves the pooled pre_bout.h2h_streak).
// ---------------------------------------------------------------------------
describe("v7 behavior — #962 boutNarrative directional streak paths", () => {
  afterEach(() => vi.restoreAllMocks());

  const spyResolve = () => {
    const paths: string[] = [];
    const orig = BardEngine.resolve.bind(BardEngine);
    vi.spyOn(BardEngine, "resolve").mockImplementation(((rng: never, path: string, ctx: never) => {
      paths.push(path);
      return orig(rng, path as never, ctx);
    }) as typeof BardEngine.resolve);
    return paths;
  };

  const mkBout = () =>
    ({
      boutId: "v7-bout",
      winner: "east",
      winnerRikishiId: "e",
      loserRikishiId: "w",
      kimarite: "yorikiri",
      kimariteName: "Yorikiri",
      stance: "migi-yotsu",
      tachiaiWinner: "east",
      duration: 8,
      upset: false,
      isKinboshi: false,
      log: [{ phase: "tachiai", data: { tick: 0 } }],
      kenshoEnvelopes: 0,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
    }) as unknown as import("@/engine/types/basho").BoutResult;

  it("east winning streak resolves pre_bout.h2h_winning_streak", async () => {
    const { generateBoutNarrative } = await import("@/engine/bout/boutNarrative");
    const { mockRikishi, makeMockWorld } = await import("./utils");
    const paths = spyResolve();
    const east = mockRikishi("e", {
      shikona: "East",
      h2h: { w: { wins: 4, losses: 2, streak: 3, lastMatch: null } },
    });
    const west = mockRikishi("w", { shikona: "West" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["e", east],
        ["w", west],
      ]),
    }) as unknown as WorldState;
    const result = mkBout();
    generateBoutNarrative(result, east, west, "hatsu", 10, "v7-seed-1", world);
    expect(paths).toContain("pre_bout.h2h_winning_streak");
    expect(paths).not.toContain("pre_bout.h2h_streak");
  });

  it("east losing streak resolves pre_bout.h2h_losing_streak", async () => {
    const { generateBoutNarrative } = await import("@/engine/bout/boutNarrative");
    const { mockRikishi, makeMockWorld } = await import("./utils");
    const paths = spyResolve();
    const east = mockRikishi("e", {
      shikona: "East",
      h2h: { w: { wins: 2, losses: 4, streak: -3, lastMatch: null } },
    });
    const west = mockRikishi("w", { shikona: "West" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["e", east],
        ["w", west],
      ]),
    }) as unknown as WorldState;
    const result = mkBout();
    generateBoutNarrative(result, east, west, "hatsu", 10, "v7-seed-2", world);
    expect(paths).toContain("pre_bout.h2h_losing_streak");
    expect(paths).not.toContain("pre_bout.h2h_streak");
  });
});

// ---------------------------------------------------------------------------
// V7-B13 reproducer: queries.ts rosterCache is module-level and keyed only by
// (heyaId, week). A second world in the same process with the same heyaId +
// week receives the FIRST world's roster. RED until the cache is keyed by
// world identity (e.g. WeakMap<WorldState, ...>).
// ---------------------------------------------------------------------------
describe("V7-B13 reproducer — rosterCache cross-world contamination", () => {
  it("a second world at the same week does not inherit the first world's roster", async () => {
    const { getHeyaRoster } = await import("@/engine/queries");
    clearQueryCaches();
    const w1 = mkWorld({
      week: 5,
      heyas: new Map([["hW", mkH("hW", { rikishiIds: ["w1r"] })]]),
      rikishi: new Map([["w1r", mkR("w1r", { heyaId: "hW", shikona: "WorldOne" })]]),
    });
    const w2 = mkWorld({
      week: 5,
      heyas: new Map([["hW", mkH("hW", { rikishiIds: ["w2r"] })]]),
      rikishi: new Map([["w2r", mkR("w2r", { heyaId: "hW", shikona: "WorldTwo" })]]),
    });
    expect(getHeyaRoster(w1, "hW").map((r) => r.id)).toEqual(["w1r"]);
    expect(getHeyaRoster(w2, "hW").map((r) => r.id)).toEqual(["w2r"]);
    clearQueryCaches();
  });
});
