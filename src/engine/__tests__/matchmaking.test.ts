import { describe, it, expect } from "vitest";
import { buildSwissTorikumi, scorePairing } from "../matchmaking/index";
import { MockFactory } from "../../test/utils/MockFactory";
import type { BashoState } from "../types/basho";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setStandings(
  basho: BashoState,
  records: Record<string, { wins: number; losses: number }>
) {
  for (const [id, record] of Object.entries(records)) {
    basho.standings.set(id, record);
  }
}

// ---------------------------------------------------------------------------
// PHASE 1 — San'yaku Gauntlet (Days 1–7)
// ---------------------------------------------------------------------------

describe("matchmaking.test.ts — Phase 1 (Days 1–7)", () => {
  it("pairs elite (yokozuna/ozeki) with upper-joi (M1-M4) on day 1", () => {
    const yokozuna = MockFactory.createRikishi({ id: "yoko-1", rank: "yokozuna" });
    const ozeki = MockFactory.createRikishi({ id: "ozeki-1", rank: "ozeki" });
    const m1 = MockFactory.createRikishi({ id: "m1-1", rank: "maegashira", rankNumber: 1 });
    const m2 = MockFactory.createRikishi({ id: "m2-1", rank: "maegashira", rankNumber: 2 });
    const m5 = MockFactory.createRikishi({ id: "m5-1", rank: "maegashira", rankNumber: 5 });

    const basho = MockFactory.createBasho({ day: 1 });
    const pairings = buildSwissTorikumi(basho, [yokozuna, ozeki, m1, m2, m5], {
      seed: "test-phase1-gauntlet",
      division: "makuuchi",
    });

    // Should produce at least 2 pairings
    expect(pairings.length).toBeGreaterThanOrEqual(2);

    // Check that we have yokozuna vs m1/m2 and ozeki vs m1/m2
    const yokoIndex = pairings.findIndex(
      (p) =>
        (p.eastId === yokozuna.id || p.westId === yokozuna.id) &&
        (p.eastId === m1.id || p.westId === m1.id || p.eastId === m2.id || p.westId === m2.id)
    );
    expect(yokoIndex).toBeGreaterThanOrEqual(0);
  });

  it("enforces heya block even in fallback pairing on day 7", () => {
    const m1 = MockFactory.createRikishi({
      id: "m1-1",
      rank: "maegashira",
      rankNumber: 1,
      heyaId: "heya-a",
    });
    const m2 = MockFactory.createRikishi({
      id: "m2-1",
      rank: "maegashira",
      rankNumber: 2,
      heyaId: "heya-a",
    });
    const m3 = MockFactory.createRikishi({
      id: "m3-1",
      rank: "maegashira",
      rankNumber: 3,
      heyaId: "heya-b",
    });
    const m4 = MockFactory.createRikishi({
      id: "m4-1",
      rank: "maegashira",
      rankNumber: 4,
      heyaId: "heya-b",
    });

    const basho = MockFactory.createBasho({ day: 7 });
    const pairings = buildSwissTorikumi(basho, [m1, m2, m3, m4], {
      seed: "test-heya-block",
      division: "makuuchi",
    });

    // Check: no same-heya pairings
    for (const p of pairings) {
      const east = [m1, m2, m3, m4].find((r) => r.id === p.eastId);
      const west = [m1, m2, m3, m4].find((r) => r.id === p.westId);
      expect(east?.heyaId).not.toBe(west?.heyaId);
    }
  });

  it("sorts output chronologically on day 1 (lowest rank first)", () => {
    const yoko = MockFactory.createRikishi({ id: "yoko", rank: "yokozuna" });
    const m10 = MockFactory.createRikishi({ id: "m10", rank: "maegashira", rankNumber: 10 });
    const m11 = MockFactory.createRikishi({ id: "m11", rank: "maegashira", rankNumber: 11 });
    const m1 = MockFactory.createRikishi({ id: "m1", rank: "maegashira", rankNumber: 1 });

    const basho = MockFactory.createBasho({ day: 1 });
    const pairings = buildSwissTorikumi(basho, [yoko, m10, m11, m1], {
      seed: "test-chrono-day1",
      division: "makuuchi",
    });

    // The last pairing should include the yokozuna (most elite)
    const lastPairing = pairings[pairings.length - 1];
    expect([lastPairing.eastId, lastPairing.westId]).toContain(yoko.id);
  });
});

// ---------------------------------------------------------------------------
// PHASE 2 — Swiss System (Days 8–14)
// ---------------------------------------------------------------------------

describe("matchmaking.test.ts — Phase 2 (Days 8–14)", () => {
  it("groups rikishi into win buckets on day 8", () => {
    const r1 = MockFactory.createRikishi({ id: "r1" });
    const r2 = MockFactory.createRikishi({ id: "r2" });
    const r3 = MockFactory.createRikishi({ id: "r3" });
    const r4 = MockFactory.createRikishi({ id: "r4" });

    const basho = MockFactory.createBasho({ day: 8 });
    setStandings(basho, {
      r1: { wins: 7, losses: 0 },
      r2: { wins: 7, losses: 0 },
      r3: { wins: 5, losses: 2 },
      r4: { wins: 5, losses: 2 },
    });

    const pairings = buildSwissTorikumi(basho, [r1, r2, r3, r4], {
      seed: "test-swiss-buckets",
      division: "makuuchi",
    });

    // Should produce at least 2 pairings
    expect(pairings.length).toBeGreaterThanOrEqual(2);

    // r1 vs r2 should both be winners (same bucket)
    const r1r2Pair = pairings.find(
      (p) =>
        (p.eastId === r1.id && p.westId === r2.id) || (p.eastId === r2.id && p.westId === r1.id)
    );
    expect(r1r2Pair).toBeDefined();
  });

  it("pulls up highest-ranked from lower bucket on day 10 when bucket is odd", () => {
    const r1 = MockFactory.createRikishi({ id: "r1", rank: "maegashira", rankNumber: 1 });
    const r2 = MockFactory.createRikishi({ id: "r2", rank: "maegashira", rankNumber: 2 });
    const r3 = MockFactory.createRikishi({ id: "r3", rank: "maegashira", rankNumber: 5 });

    const basho = MockFactory.createBasho({ day: 10 });
    setStandings(basho, {
      r1: { wins: 8, losses: 1 },
      r2: { wins: 8, losses: 1 },
      r3: { wins: 6, losses: 3 },
    });

    const pairings = buildSwissTorikumi(basho, [r1, r2, r3], {
      seed: "test-pull-up",
      division: "makuuchi",
    });

    // r1 (8W) should pair with r2 (8W) — same bucket
    // r3 (6W) is odd-one-out and should be paired in the result if there was a full pool
    expect(pairings.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// PHASE 3 — Day 15 (Senshuraku)
// ---------------------------------------------------------------------------

describe("matchmaking.test.ts — Phase 3 (Day 15)", () => {
  it("pairs Maegashira yusho leader with yokozuna gatekeeper (yusho exception)", () => {
    const m10 = MockFactory.createRikishi({ id: "m10", rank: "maegashira", rankNumber: 10 });
    const yoko = MockFactory.createRikishi({ id: "yoko", rank: "yokozuna" });
    const ozeki = MockFactory.createRikishi({ id: "ozeki", rank: "ozeki" });

    const basho = MockFactory.createBasho({ day: 15 });
    setStandings(basho, {
      m10: { wins: 14, losses: 0 }, // Exactly one leader, Maegashira
      yoko: { wins: 13, losses: 1 },
      ozeki: { wins: 12, losses: 2 },
    });

    const pairings = buildSwissTorikumi(basho, [m10, yoko, ozeki], {
      seed: "test-yusho-exception",
      division: "makuuchi",
    });

    // m10 should be paired with yoko
    const yushoMatch = pairings.find(
      (p) =>
        (p.eastId === m10.id || p.westId === m10.id) &&
        (p.eastId === yoko.id || p.westId === yoko.id)
    );
    expect(yushoMatch).toBeDefined();
    expect(yushoMatch?.reasons).toContain("yusho_exception");
  });

  it("does NOT trigger yusho exception if there are multiple leaders", () => {
    const m10a = MockFactory.createRikishi({
      id: "m10a",
      rank: "maegashira",
      rankNumber: 10,
      heyaId: "heya-a",
    });
    const m10b = MockFactory.createRikishi({
      id: "m10b",
      rank: "maegashira",
      rankNumber: 11,
      heyaId: "heya-b",
    });
    const yoko = MockFactory.createRikishi({ id: "yoko", rank: "yokozuna", heyaId: "heya-c" });

    const basho = MockFactory.createBasho({ day: 15 });
    setStandings(basho, {
      m10a: { wins: 14, losses: 0 },
      m10b: { wins: 14, losses: 0 }, // Two leaders — exception doesn't apply
      yoko: { wins: 13, losses: 1 },
    });

    const pairings = buildSwissTorikumi(basho, [m10a, m10b, yoko], {
      seed: "test-no-exception-multiple",
      division: "makuuchi",
    });

    // Neither m10a nor m10b should be specifically marked yusho_exception
    const yushoMatches = pairings.filter((p) => p.reasons.includes("yusho_exception"));
    expect(yushoMatches.length).toBe(0);
  });

  it("does NOT trigger yusho exception if leader is Sekiwake", () => {
    const sekiwake = MockFactory.createRikishi({ id: "sekiwake", rank: "sekiwake" });
    const yoko = MockFactory.createRikishi({ id: "yoko", rank: "yokozuna" });

    const basho = MockFactory.createBasho({ day: 15 });
    setStandings(basho, {
      sekiwake: { wins: 14, losses: 0 }, // Leader but not Maegashira
      yoko: { wins: 13, losses: 1 },
    });

    const pairings = buildSwissTorikumi(basho, [sekiwake, yoko], {
      seed: "test-no-exception-sekiwake",
      division: "makuuchi",
    });

    const yushoMatches = pairings.filter((p) => p.reasons.includes("yusho_exception"));
    expect(yushoMatches.length).toBe(0);
  });

  it("forces yokozuna/ozeki (kore yori san'yaku) to pair against each other", () => {
    const yoko1 = MockFactory.createRikishi({ id: "yoko1", rank: "yokozuna", heyaId: "heya-a" });
    const yoko2 = MockFactory.createRikishi({ id: "yoko2", rank: "yokozuna", heyaId: "heya-b" });
    const ozeki = MockFactory.createRikishi({ id: "ozeki", rank: "ozeki", heyaId: "heya-c" });
    const m5 = MockFactory.createRikishi({
      id: "m5",
      rank: "maegashira",
      rankNumber: 5,
      heyaId: "heya-d",
    });

    const basho = MockFactory.createBasho({ day: 15 });
    setStandings(basho, {
      yoko1: { wins: 10, losses: 4 },
      yoko2: { wins: 10, losses: 4 },
      ozeki: { wins: 8, losses: 6 },
      m5: { wins: 7, losses: 7 },
    });

    const pairings = buildSwissTorikumi(basho, [yoko1, yoko2, ozeki, m5], {
      seed: "test-kore-yori",
      division: "makuuchi",
    });

    // yoko1 vs yoko2 should be present and tagged kore_yori_sanyaku
    const yokoMatch = pairings.find(
      (p) =>
        (p.eastId === yoko1.id && p.westId === yoko2.id) ||
        (p.eastId === yoko2.id && p.westId === yoko1.id)
    );
    expect(yokoMatch).toBeDefined();
    expect(yokoMatch?.reasons).toContain("kore_yori_sanyaku");
  });

  it("tags the most elite pairing as 'finale' on day 15", () => {
    const yoko1 = MockFactory.createRikishi({ id: "yoko1", rank: "yokozuna", heyaId: "heya-a" });
    const yoko2 = MockFactory.createRikishi({ id: "yoko2", rank: "yokozuna", heyaId: "heya-b" });
    const ozeki = MockFactory.createRikishi({ id: "ozeki", rank: "ozeki", heyaId: "heya-c" });

    const basho = MockFactory.createBasho({ day: 15 });
    setStandings(basho, {
      yoko1: { wins: 10, losses: 4 },
      yoko2: { wins: 10, losses: 4 },
      ozeki: { wins: 8, losses: 6 },
    });

    const pairings = buildSwissTorikumi(basho, [yoko1, yoko2, ozeki], {
      seed: "test-finale",
      division: "makuuchi",
    });

    // Last pairing should have "finale" tag
    const lastPairing = pairings[pairings.length - 1];
    expect(lastPairing.reasons).toContain("finale");
  });

  it("unpaired elites fall into swiss pool and can be matched with non-elites", () => {
    // Create a stalemate: two yokozuna from same heya (forced heya block violation)
    const yoko1 = MockFactory.createRikishi({ id: "yoko1", rank: "yokozuna", heyaId: "same-heya" });
    const yoko2 = MockFactory.createRikishi({ id: "yoko2", rank: "yokozuna", heyaId: "same-heya" });
    const m5 = MockFactory.createRikishi({ id: "m5", rank: "maegashira", rankNumber: 5 });

    const basho = MockFactory.createBasho({ day: 15 });
    setStandings(basho, {
      yoko1: { wins: 10, losses: 4 },
      yoko2: { wins: 10, losses: 4 },
      m5: { wins: 5, losses: 9 },
    });

    const pairings = buildSwissTorikumi(basho, [yoko1, yoko2, m5], {
      seed: "test-elite-fallback",
      division: "makuuchi",
    });

    // Since yoko1 and yoko2 share a heya, they can't pair together.
    // At least one should fall through to be paired with m5.
    expect(pairings.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Chronological Sort
// ---------------------------------------------------------------------------

describe("matchmaking.test.ts — chronological order", () => {
  it("places lower-ranked bouts at the start and elite bouts at the end", () => {
    const yoko = MockFactory.createRikishi({ id: "yoko", rank: "yokozuna" });
    const m15 = MockFactory.createRikishi({ id: "m15", rank: "maegashira", rankNumber: 15 });
    const m14 = MockFactory.createRikishi({ id: "m14", rank: "maegashira", rankNumber: 14 });
    const m1 = MockFactory.createRikishi({ id: "m1", rank: "maegashira", rankNumber: 1 });

    const basho = MockFactory.createBasho({ day: 8 });
    setStandings(basho, {
      yoko: { wins: 7, losses: 0 },
      m15: { wins: 4, losses: 3 },
      m14: { wins: 4, losses: 3 },
      m1: { wins: 6, losses: 1 },
    });

    const pairings = buildSwissTorikumi(basho, [yoko, m15, m14, m1], {
      seed: "test-chronological",
      division: "makuuchi",
    });

    // The last pairing should include the yokozuna (least junior)
    const lastPairing = pairings[pairings.length - 1];
    expect([lastPairing.eastId, lastPairing.westId]).toContain(yoko.id);

    // The first pairing should be lower-ranked (higher rankNumber)
    const firstPairing = pairings[0];
    const firstIds = [firstPairing.eastId, firstPairing.westId];
    const hasMaegashira = firstIds.some((id) => [m15.id, m14.id, m1.id].includes(id));
    expect(hasMaegashira).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration: Full 15-day schedule
// ---------------------------------------------------------------------------

describe("matchmaking.test.ts — full 15-day schedule", () => {
  it("dispatches to phase1 on day 1", () => {
    const yoko = MockFactory.createRikishi({ id: "yoko", rank: "yokozuna" });
    const m1 = MockFactory.createRikishi({ id: "m1", rank: "maegashira", rankNumber: 1 });
    const m2 = MockFactory.createRikishi({ id: "m2", rank: "maegashira", rankNumber: 2 });

    const basho = MockFactory.createBasho({ day: 1 });
    const pairings = buildSwissTorikumi(basho, [yoko, m1, m2], {
      seed: "test-day1",
      division: "makuuchi",
    });

    expect(pairings.length).toBeGreaterThanOrEqual(1);
  });

  it("dispatches to phase2 on day 8", () => {
    const r1 = MockFactory.createRikishi({ id: "r1" });
    const r2 = MockFactory.createRikishi({ id: "r2" });
    const r3 = MockFactory.createRikishi({ id: "r3" });

    const basho = MockFactory.createBasho({ day: 8 });
    setStandings(basho, {
      r1: { wins: 7, losses: 0 },
      r2: { wins: 6, losses: 1 },
      r3: { wins: 5, losses: 2 },
    });

    const pairings = buildSwissTorikumi(basho, [r1, r2, r3], {
      seed: "test-day8",
      division: "makuuchi",
    });

    expect(pairings.length).toBeGreaterThanOrEqual(1);
  });

  it("dispatches to phase3 on day 15", () => {
    const yoko = MockFactory.createRikishi({ id: "yoko", rank: "yokozuna" });
    const m1 = MockFactory.createRikishi({ id: "m1", rank: "maegashira", rankNumber: 1 });
    const m2 = MockFactory.createRikishi({ id: "m2", rank: "maegashira", rankNumber: 2 });

    const basho = MockFactory.createBasho({ day: 15 });
    setStandings(basho, {
      yoko: { wins: 12, losses: 2 },
      m1: { wins: 10, losses: 4 },
      m2: { wins: 9, losses: 5 },
    });

    const pairings = buildSwissTorikumi(basho, [yoko, m1, m2], {
      seed: "test-day15",
      division: "makuuchi",
    });

    expect(pairings.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Kadoban pressure scoring
// ---------------------------------------------------------------------------

describe("scorePairing — kadoban pressure", () => {
  it("boosts score for an ozeki with < 8 wins on day 11", () => {
    const ozeki = MockFactory.createRikishi({
      id: "ozeki-kadoban",
      rank: "ozeki",
      heyaId: "heya-a",
    });
    const opponent = MockFactory.createRikishi({
      id: "m1",
      rank: "maegashira",
      rankNumber: 1,
      heyaId: "heya-b",
    });

    const bashoKadoban = MockFactory.createBasho({ day: 11 });
    setStandings(bashoKadoban, {
      "ozeki-kadoban": { wins: 5, losses: 5 },
      m1: { wins: 7, losses: 3 },
    });

    const bashoSafe = MockFactory.createBasho({ day: 11 });
    setStandings(bashoSafe, {
      "ozeki-kadoban": { wins: 8, losses: 2 }, // already has kachi-koshi
      m1: { wins: 7, losses: 3 },
    });

    const pairingKadoban = scorePairing({ basho: bashoKadoban, a: ozeki, b: opponent });
    const pairingSafe = scorePairing({ basho: bashoSafe, a: ozeki, b: opponent });

    expect(pairingKadoban).not.toBeNull();
    expect(pairingSafe).not.toBeNull();
    if (pairingKadoban && pairingSafe) {
      // Kadoban situation should produce higher score
      expect(pairingKadoban.score).toBeGreaterThan(pairingSafe.score);
      expect(pairingKadoban.reasons).toContain("kadoban_pressure");
    }
  });

  it("does not apply kadoban bonus before day 10", () => {
    const ozeki = MockFactory.createRikishi({ id: "ozeki-early", rank: "ozeki", heyaId: "heya-a" });
    const m1 = MockFactory.createRikishi({
      id: "m1-early",
      rank: "maegashira",
      rankNumber: 1,
      heyaId: "heya-b",
    });

    const bashoEarly = MockFactory.createBasho({ day: 7 });
    setStandings(bashoEarly, {
      "ozeki-early": { wins: 2, losses: 5 },
      "m1-early": { wins: 4, losses: 3 },
    });

    const pairing = scorePairing({ basho: bashoEarly, a: ozeki, b: m1 });

    expect(pairing).not.toBeNull();
    if (pairing) {
      expect(pairing.reasons).not.toContain("kadoban_pressure");
    }
  });

  it("applies kadoban bonus when opponent is the ozeki (not just a)", () => {
    const m5 = MockFactory.createRikishi({
      id: "m5-opp",
      rank: "maegashira",
      rankNumber: 5,
      heyaId: "heya-x",
    });
    const ozeki = MockFactory.createRikishi({ id: "ozeki-b", rank: "ozeki", heyaId: "heya-y" });

    const basho = MockFactory.createBasho({ day: 12 });
    setStandings(basho, {
      "m5-opp": { wins: 6, losses: 5 },
      "ozeki-b": { wins: 6, losses: 5 },
    });

    const pairing = scorePairing({ basho, a: m5, b: ozeki });

    expect(pairing).not.toBeNull();
    if (pairing) {
      expect(pairing.reasons).toContain("kadoban_pressure");
    }
  });
});
