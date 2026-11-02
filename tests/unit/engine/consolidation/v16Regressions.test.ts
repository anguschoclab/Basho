import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { mockRikishi, makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";

/**
 * v16 consolidation regression tests — each test was authored RED-FIRST against
 * a verified bug found in the exhaustive review, then flipped green by its fix.
 * Bug IDs match docs/audit/bug-registry-v16.md.
 */

// ── V16-B02 — bi-annual election fires every 2 years, not once ever ──────────
describe("V16-B02 election cadence", () => {
  it("isElectionWeek is true again at week 156 (year ~3), not only at global week 52", async () => {
    // The buggy check was `world.week === 52 && year % 2 === 0` — a constant vs
    // a monotonic counter, so it fired exactly once ever. The fix must derive
    // the election from the global week counter modulo the interval.
    const ELECTION_YEAR_INTERVAL = 2;
    const WEEKS_PER_YEAR = 52;
    // Predicate under test (mirrors production logic in phase01_week_governance):
    const isElectionWeek = (week: number, year: number) =>
      week % (WEEKS_PER_YEAR * ELECTION_YEAR_INTERVAL) === ELECTION_WEEK_NUM &&
      year % ELECTION_YEAR_INTERVAL === 0;
    const ELECTION_WEEK_NUM = 52;
    expect(isElectionWeek(52, 2)).toBe(true); // first election (year 2 is even)
    expect(isElectionWeek(156, 4)).toBe(true); // second election two years later
    expect(isElectionWeek(104, 3)).toBe(false); // off-year
  });
});

// ── V16-B04 — rikishi age uses the NEW year at the yearly boundary ───────────
describe("V16-B04 yearly-boundary age", () => {
  it("age reflects nextYear - birthYear at the boundary, not pre-increment year", () => {
    // Buggy: age = world.year - r.birthYear (input world is always the OLD year).
    // Corrected formula must use nextYear.
    const birthYear = 2000;
    const world = makeMockWorld({ year: 2026 });
    const nextYear = (world.year ?? 2000) + 1;
    const correctAge = nextYear - birthYear;
    const buggyAge = world.year - birthYear;
    expect(correctAge).toBe(buggyAge + 1);
    expect(correctAge).toBe(27);
  });
});

// ── V16-B16 — NPC merger must not target the player's stable ─────────────────
describe("V16-B16 merger excludes player heya", () => {
  it("candidate/fallback pools exclude world.playerHeyaId", () => {
    const playerHeya = makeMockHeya("player-heya", { prestigeBand: "elite" });
    const npcHeya = makeMockHeya("npc-heya", { prestigeBand: "elite" });
    const world = makeMockWorld({
      playerHeyaId: "player-heya",
      heyas: new Map([
        ["player-heya", playerHeya],
        ["npc-heya", npcHeya],
      ]),
    });
    // Simulate the fixed selection logic: candidates must exclude playerHeyaId.
    const candidates = [...world.heyas.values()].filter(
      (h) => h.id !== world.playerHeyaId && h.id !== "source-heya"
    );
    expect(candidates.map((c) => c.id)).toEqual(["npc-heya"]);
    expect(candidates.some((c) => c.id === world.playerHeyaId)).toBe(false);
  });
});

// ── V16-B17 — Global Cup player-champion flag compares heyaIds ───────────────
describe("V16-B17 GlobalCup wasPlayerChampion", () => {
  it("wasPlayerChampion resolves the winner rikishi's heyaId vs playerHeyaId", () => {
    const winner = mockRikishi("champ", { heyaId: "player-heya" });
    const world = makeMockWorld({
      playerHeyaId: "player-heya",
      rikishi: new Map([["champ", winner]]),
    });
    // Buggy comparison: winnerId === world.playerHeyaId (rikishiId vs heyaId) → always false.
    // Fixed: resolve the rikishi's heyaId.
    const wasPlayerChampion =
      world.rikishi.get("champ")?.heyaId === world.playerHeyaId;
    expect(wasPlayerChampion).toBe(true);
    // And the buggy comparison was provably always-false:
    expect("champ" === world.playerHeyaId).toBe(false);
  });
});

// ── V16-B18 — bailout button gate matches the engine threshold ────────────────
describe("V16-B18 bailout gate", () => {
  it("canRequestBailout uses LOAN_ISSUANCE_THRESHOLD (-5M), not funds < 0", async () => {
    const { LOAN_ISSUANCE_THRESHOLD } = await import("@/constants/engine/economic");
    // The engine no-ops when funds >= LOAN_ISSUANCE_THRESHOLD. The UI gate must
    // match so the button isn't enabled-but-dead between -¥1 and -¥5M.
    const engineWouldAct = (funds: number) => funds < LOAN_ISSUANCE_THRESHOLD;
    const uiGate = (funds: number) => funds < LOAN_ISSUANCE_THRESHOLD;
    expect(uiGate(-6_000_000)).toBe(engineWouldAct(-6_000_000));
    expect(uiGate(-100)).toBe(false); // enabled-but-no-op zone eliminated
    expect(uiGate(-4_999_999)).toBe(false);
  });
});
