import { describe, it, expect } from "vitest";
import {
  getBoutAnimationFamily,
  buildBoutScript,
  getReplayPhaseDurations,
  type BoutScript,
} from "@/engine/bout/ReplayMetadata";
import { resolveBoutPhysics } from "@/engine/bout/boutPhysics";
import { mockRikishi, makeMockBasho } from "../utils";
import type { BoutResult, BoutLogEntry } from "@/engine/types/basho";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-001",
    winner: "east",
    winnerRikishiId: "r1",
    loserRikishiId: "r2",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: "east",
    duration: 10,
    excitementScore: 50,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    ...overrides,
  };
}

function logEntry(
  phase: BoutLogEntry["phase"],
  data: Record<string, unknown>,
): BoutLogEntry {
  return { phase, data };
}

// ---------------------------------------------------------------------------
// getBoutAnimationFamily
// ---------------------------------------------------------------------------

describe("getBoutAnimationFamily", () => {
  it("returns 'force_out' for force_out class kimarite", () => {
    expect(getBoutAnimationFamily("yorikiri")).toBe("force_out");
    expect(getBoutAnimationFamily("oshidashi")).toBe("force_out");
    expect(getBoutAnimationFamily("tsukidashi")).toBe("force_out");
  });

  it("returns 'throw' for throw/twist class kimarite", () => {
    expect(getBoutAnimationFamily("uwatenage")).toBe("throw");
    expect(getBoutAnimationFamily("shitatenage")).toBe("throw");
    expect(getBoutAnimationFamily("tsukiotoshi")).toBe("throw");
    expect(getBoutAnimationFamily("shitatehineri")).toBe("throw");
  });

  it("returns 'pull' for slap_pull class kimarite", () => {
    expect(getBoutAnimationFamily("hatakikomi")).toBe("pull");
    expect(getBoutAnimationFamily("hikiotoshi")).toBe("pull");
  });

  it("returns 'lift' for lift class kimarite", () => {
    expect(getBoutAnimationFamily("tsuridashi")).toBe("lift");
    expect(getBoutAnimationFamily("tsuriotoshi")).toBe("lift");
  });

  it("returns 'trip' for trip class kimarite", () => {
    expect(getBoutAnimationFamily("ashitori")).toBe("trip");
    expect(getBoutAnimationFamily("sotogake")).toBe("trip");
  });

  it("returns 'generic' for rear/evasion/special/result/forfeit", () => {
    expect(getBoutAnimationFamily("utchari")).toBe("generic");
    expect(getBoutAnimationFamily("isamiashi")).toBe("generic");
    expect(getBoutAnimationFamily("fusensho")).toBe("generic");
    expect(getBoutAnimationFamily("koshikudake")).toBe("generic");
  });

  it("returns 'generic' for unknown or missing kimarite", () => {
    expect(getBoutAnimationFamily("")).toBe("generic");
    expect(getBoutAnimationFamily("nonexistent")).toBe("generic");
  });
});

// ---------------------------------------------------------------------------
// buildBoutScript
// ---------------------------------------------------------------------------

describe("buildBoutScript", () => {
  it("returns sensible defaults for empty log (fusensho)", () => {
    const result = makeBoutResult({
      kimarite: "fusensho",
      log: [{ phase: "finish", data: { event: "fusensho" } }],
    });
    const script = buildBoutScript(result);
    expect(script.family).toBe("generic");
    expect(script.winnerSide).toBe("east");
    expect(script.tachiaiMargin).toBe(0.5);
    expect(script.hasBeltBattle).toBe(false);
    expect(script.hasEdgeCrisisEscape).toBe(false);
    expect(script.isSpeedBout).toBe(false);
  });

  it("reads tachiai margin from first tachiai log entry", () => {
    const result = makeBoutResult({
      log: [logEntry("tachiai", { tachiaiWinner: "east", margin: 0.8 })],
    });
    expect(buildBoutScript(result).tachiaiMargin).toBe(0.8);
  });

  it("clamps tachiai margin above 1.0", () => {
    const result = makeBoutResult({
      log: [logEntry("tachiai", { margin: 1.5 })],
    });
    expect(buildBoutScript(result).tachiaiMargin).toBe(1.0);
  });

  it("clamps tachiai margin below 0", () => {
    const result = makeBoutResult({
      log: [logEntry("tachiai", { margin: -0.3 })],
    });
    expect(buildBoutScript(result).tachiaiMargin).toBe(0);
  });

  it("reads margin from first tachiai entry when henka adds a second", () => {
    const result = makeBoutResult({
      log: [
        logEntry("tachiai", { tachiaiWinner: "east", margin: 0.6 }),
        logEntry("tachiai", { event: "henka_success", attackerSide: "east" }),
      ],
    });
    expect(buildBoutScript(result).tachiaiMargin).toBe(0.6);
  });

  it("detects belt battle from engagement log", () => {
    const result = makeBoutResult({
      log: [
        logEntry("tachiai", { margin: 0.5 }),
        logEntry("engagement", { family: "belt", tick: 5 }),
      ],
    });
    expect(buildBoutScript(result).hasBeltBattle).toBe(true);
  });

  it("push engagement does not set hasBeltBattle", () => {
    const result = makeBoutResult({
      log: [logEntry("engagement", { family: "push" })],
    });
    expect(buildBoutScript(result).hasBeltBattle).toBe(false);
  });

  it("speed engagement does not set hasBeltBattle", () => {
    const result = makeBoutResult({
      log: [logEntry("engagement", { family: "speed" })],
    });
    expect(buildBoutScript(result).hasBeltBattle).toBe(false);
  });

  it("detects edge crisis escape", () => {
    const result = makeBoutResult({
      log: [logEntry("edge_crisis", { escaped: true, side: "west" })],
    });
    expect(buildBoutScript(result).hasEdgeCrisisEscape).toBe(true);
  });

  it("edge crisis non-escape does not set flag", () => {
    const result = makeBoutResult({
      log: [logEntry("edge_crisis", { escaped: false, side: "west" })],
    });
    expect(buildBoutScript(result).hasEdgeCrisisEscape).toBe(false);
  });

  it("edge crisis forced out does not set escape flag", () => {
    const result = makeBoutResult({
      log: [logEntry("edge_crisis", { escaped: false, forced: true })],
    });
    expect(buildBoutScript(result).hasEdgeCrisisEscape).toBe(false);
  });

  it("isSpeedBout is true when family is pull", () => {
    const result = makeBoutResult({ kimarite: "hatakikomi" });
    expect(buildBoutScript(result).isSpeedBout).toBe(true);
  });

  it("isSpeedBout is false for non-pull families", () => {
    const result = makeBoutResult({ kimarite: "yorikiri" });
    expect(buildBoutScript(result).isSpeedBout).toBe(false);
  });

  it("reads winnerSide from result.winner", () => {
    const result = makeBoutResult({ winner: "west" });
    expect(buildBoutScript(result).winnerSide).toBe("west");
  });

  it("does not crash on a real resolveBoutPhysics result", () => {
    const bout = { id: "test-real", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const basho = makeMockBasho();
    const { result } = resolveBoutPhysics(bout, east, west, basho);
    const script = buildBoutScript(result);
    expect(script.winnerSide).toBe(result.winner);
    expect(script.tachiaiMargin).toBeGreaterThanOrEqual(0);
    expect(script.tachiaiMargin).toBeLessThanOrEqual(1);
    expect(typeof script.hasBeltBattle).toBe("boolean");
    expect(typeof script.hasEdgeCrisisEscape).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// getReplayPhaseDurations
// ---------------------------------------------------------------------------

describe("getReplayPhaseDurations", () => {
  const baseResult = makeBoutResult({ kimarite: "yorikiri" });

  it("works without a script (backward compatible)", () => {
    const durations = getReplayPhaseDurations(baseResult);
    expect(durations.ritual).toBeGreaterThan(0);
    expect(durations.tachiai).toBeGreaterThan(0);
    expect(durations.complete).toBe(0);
  });

  it("throw family has longer finish and momentum than base", () => {
    const script: BoutScript = {
      family: "throw",
      winnerSide: "east",
      tachiaiMargin: 0.5,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: false,
      isSpeedBout: false,
    };
    const base = getReplayPhaseDurations(baseResult, {
      ...script,
      family: "force_out",
    });
    const throwD = getReplayPhaseDurations(baseResult, script);
    expect(throwD.finish).toBeGreaterThan(base.finish);
    expect(throwD.momentum).toBeGreaterThan(base.momentum);
  });

  it("pull family has shorter finish, momentum, and clinch than base", () => {
    const script: BoutScript = {
      family: "pull",
      winnerSide: "east",
      tachiaiMargin: 0.5,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: false,
      isSpeedBout: true,
    };
    const base = getReplayPhaseDurations(baseResult, {
      ...script,
      family: "force_out",
      isSpeedBout: false,
    });
    const pullD = getReplayPhaseDurations(baseResult, script);
    expect(pullD.finish).toBeLessThan(base.finish);
    expect(pullD.momentum).toBeLessThan(base.momentum);
    expect(pullD.clinch).toBeLessThan(base.clinch);
  });

  it("lift family has longer finish and momentum than base", () => {
    const script: BoutScript = {
      family: "lift",
      winnerSide: "east",
      tachiaiMargin: 0.5,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: false,
      isSpeedBout: false,
    };
    const base = getReplayPhaseDurations(baseResult, {
      ...script,
      family: "force_out",
    });
    const liftD = getReplayPhaseDurations(baseResult, script);
    expect(liftD.finish).toBeGreaterThan(base.finish);
    expect(liftD.momentum).toBeGreaterThan(base.momentum);
  });

  it("dominant tachiai (margin > 0.7) shortens tachiai duration", () => {
    const base = getReplayPhaseDurations(baseResult, {
      family: "force_out",
      winnerSide: "east",
      tachiaiMargin: 0.5,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: false,
      isSpeedBout: false,
    });
    const dominant = getReplayPhaseDurations(baseResult, {
      family: "force_out",
      winnerSide: "east",
      tachiaiMargin: 0.8,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: false,
      isSpeedBout: false,
    });
    expect(dominant.tachiai).toBeLessThan(base.tachiai);
  });

  it("stalemate tachiai (margin < 0.35) lengthens tachiai duration", () => {
    const base = getReplayPhaseDurations(baseResult, {
      family: "force_out",
      winnerSide: "east",
      tachiaiMargin: 0.5,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: false,
      isSpeedBout: false,
    });
    const stalemate = getReplayPhaseDurations(baseResult, {
      family: "force_out",
      winnerSide: "east",
      tachiaiMargin: 0.2,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: false,
      isSpeedBout: false,
    });
    expect(stalemate.tachiai).toBeGreaterThan(base.tachiai);
  });

  it("edge crisis escape extends ceremony", () => {
    const base = getReplayPhaseDurations(baseResult, {
      family: "force_out",
      winnerSide: "east",
      tachiaiMargin: 0.5,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: false,
      isSpeedBout: false,
    });
    const escaped = getReplayPhaseDurations(baseResult, {
      family: "force_out",
      winnerSide: "east",
      tachiaiMargin: 0.5,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: true,
      isSpeedBout: false,
    });
    expect(escaped.ceremony).toBeGreaterThan(base.ceremony);
  });

  it("upset extends ceremony and finish", () => {
    const upsetResult = makeBoutResult({ kimarite: "yorikiri", upset: true });
    const normal = getReplayPhaseDurations(baseResult, {
      family: "force_out",
      winnerSide: "east",
      tachiaiMargin: 0.5,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: false,
      isSpeedBout: false,
    });
    const upset = getReplayPhaseDurations(upsetResult, {
      family: "force_out",
      winnerSide: "east",
      tachiaiMargin: 0.5,
      hasBeltBattle: false,
      hasEdgeCrisisEscape: false,
      isSpeedBout: false,
    });
    expect(upset.ceremony).toBeGreaterThan(normal.ceremony);
    expect(upset.finish).toBeGreaterThan(normal.finish);
  });

  it("all durations are non-negative integers", () => {
    const durations = getReplayPhaseDurations(baseResult);
    for (const v of Object.values(durations)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("fusensho produces valid durations without crashing", () => {
    const fusensho = makeBoutResult({
      kimarite: "fusensho",
      log: [{ phase: "finish", data: { event: "fusensho" } }],
    });
    const durations = getReplayPhaseDurations(fusensho);
    expect(durations.ritual).toBeGreaterThan(0);
    expect(durations.complete).toBe(0);
  });
});
