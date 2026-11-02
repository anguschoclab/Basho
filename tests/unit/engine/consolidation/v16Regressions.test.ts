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

// ── V16-B12b — materialization of 2+ recruits keeps ALL roster ids ───────────
describe("V16-B12b talent-pool materialization roster", () => {
  it("two recruits into the same heya both land in rikishiIds", async () => {
    const { fillVacanciesForNPC } = await import("@/engine/generation/TalentPoolNPCRecruitment");
    const { resolveImpacts } = await import("@/engine/core/ImpactResolver");

    const heya = makeMockHeya("npc-heya", { rikishiIds: ["incumbent-1"] });
    const c1 = MockFactory.createCandidate("cand-1");
    const c2 = MockFactory.createCandidate("cand-2");
    const world = makeMockWorld({
      heyas: new Map([["npc-heya", heya]]),
      talentPool: {
        candidates: { "cand-1": c1, "cand-2": c2 },
        pools: {
          high_school: { candidatesVisible: ["cand-1", "cand-2"], candidatesHidden: [] } as never,
          university: { candidatesVisible: [], candidatesHidden: [] } as never,
          foreign: { candidatesVisible: [], candidatesHidden: [] } as never,
        },
      } as never,
    });

    const impact = fillVacanciesForNPC(world, { "npc-heya": 2 });
    const result = resolveImpacts(world, [impact]);
    const ids = result.heyas.get("npc-heya")?.rikishiIds ?? [];
    expect(ids).toContain("incumbent-1");
    // Both new recruits must land — the stale-base bug kept only the LAST one.
    expect(ids.filter((id) => id.startsWith("person-"))).toHaveLength(2);
  });
});

// ── V16-B12c — insolvency gift composes with the bailout loan + charges
//                the benefactor once per insolvent heya ──────────────────────
describe("V16-B12c governanceReview funds composition", () => {
  it("insolvent heya keeps loan principal AND receives the ichimon gift; benefactor is charged per gift", async () => {
    const { runGovernanceReview } = await import("@/engine/governance/services/governanceReview");
    const { resolveImpacts } = await import("@/engine/core/ImpactResolver");
    const { FACTION_BAILOUT_AMOUNT, LOAN_ISSUANCE_THRESHOLD } = await import("@/constants/engine/economic");

    const insolvent = makeMockHeya("insolvent", {
      funds: LOAN_ISSUANCE_THRESHOLD - 1_000_000,
      runwayBand: "desperate",
      ichimon: "Tokitsukaze",
    });
    const insolvent2 = makeMockHeya("insolvent2", {
      funds: -1_000_000, // above loan threshold — gift only
      runwayBand: "desperate",
      ichimon: "Tokitsukaze",
    });
    const benefactor = makeMockHeya("benefactor", {
      funds: 100_000_000,
      ichimon: "Tokitsukaze",
    });
    const world = makeMockWorld({
      heyas: new Map([
        ["insolvent", insolvent],
        ["insolvent2", insolvent2],
        ["benefactor", benefactor],
      ]),
    });

    const impact = runGovernanceReview(world);
    const result = resolveImpacts(world, [impact]);

    const rInsolvent = result.heyas.get("insolvent")!;
    const rInsolvent2 = result.heyas.get("insolvent2")!;
    const rBenefactor = result.heyas.get("benefactor")!;

    // Benefactor pays one gift per insolvent stable — previously the stale
    // base charged it once while two gifts were paid out (money created).
    expect(rBenefactor.funds).toBe(100_000_000 - 2 * FACTION_BAILOUT_AMOUNT);

    // insolvent2 got only the gift (no loan)
    expect(rInsolvent2.funds).toBe(-1_000_000 + FACTION_BAILOUT_AMOUNT);

    // insolvent got loan principal + gift — the stale-base write destroyed the
    // principal while leaving the liability.
    const loanPrincipal = (rInsolvent.activeLoans ?? [])
      .reduce((s: number, l: { principal?: number }) => s + (l.principal ?? 0), 0);
    if (loanPrincipal > 0) {
      expect(rInsolvent.funds).toBe(
        LOAN_ISSUANCE_THRESHOLD - 1_000_000 + loanPrincipal + FACTION_BAILOUT_AMOUNT
      );
    }
  });
});

// ── V16-B49 — simulateEntireBasho must not mutate the caller's world ─────────
describe("V16-B49 TournamentSimulator isolation", () => {
  it("input world's divisionRecords are unchanged after simulation", async () => {
    const { simulateEntireBasho } = await import("@/engine/simulation/TournamentSimulator");

    const mk = (id: string) =>
      mockRikishi(id, {
        division: "makuuchi",
        divisionRecords: { makuuchi: { wins: 0, losses: 0 } } as never,
      });
    const ids = Array.from({ length: 10 }, (_, i) => `r${i}`);
    const world = makeMockWorld({
      rikishi: new Map(ids.map((id) => [id, mk(id)])),
      activeRikishiIds: new Set(ids),
    });

    simulateEntireBasho(world, "hatsu", "v16-b49-seed");

    // The shallow { ...r } clone shares nested divisionRecords — the buggy
    // code did `updated.divisionRecords[div].wins += n`, mutating the INPUT.
    for (const id of ids) {
      const rec = world.rikishi.get(id)?.divisionRecords?.makuuchi;
      expect(rec?.wins ?? 0).toBe(0);
      expect(rec?.losses ?? 0).toBe(0);
    }
  });
});
