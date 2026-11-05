import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { mockRikishi, makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";

/**
 * v16 consolidation regression tests — each test was authored RED-FIRST against
 * a verified bug found in the exhaustive review, then flipped green by its fix.
 * Bug IDs match docs/audit/bug-registry-v16.md.
 */

// ── V16-B02 — bi-annual election fires every 2 years, not once ever ──────────
describe("V16-B02 election cadence", () => {
  it("phase01_week_governance logs elections at the year-52 boundary of even years across the monotonic week counter", async () => {
    const { phase01_week_governance } =
      await import("@/engine/tick/phases/phase01_week_governance");
    const mkWorld = (week: number, year: number) => {
      const world = MockFactory.createWorld({ week, year });
      world.heyas.set("h-elect", MockFactory.createHeya("h-elect", { ichimon: "Dewanoumi" }));
      world.playerHeyaId = "player-x";
      return world;
    };
    // The buggy check compared world.week === 52 — a constant vs a monotonic
    // counter — so it fired exactly once ever. Production derives the election
    // week from the counter modulo 52 plus the even-year gate.
    expect(JSON.stringify(phase01_week_governance(mkWorld(52, 2024)))).toContain("board elections");
    // Second election two years later — global week 104 is again week-of-year 52.
    expect(JSON.stringify(phase01_week_governance(mkWorld(104, 2024)))).toContain(
      "board elections"
    );
    // Odd year — no election even at the week-52 boundary.
    expect(JSON.stringify(phase01_week_governance(mkWorld(52, 2025)))).not.toContain(
      "board elections"
    );
    // Off-boundary week in an even year — no election.
    expect(JSON.stringify(phase01_week_governance(mkWorld(100, 2024)))).not.toContain(
      "board elections"
    );
  });
});

// ── V16-B04 — rikishi age uses the NEW year at the yearly boundary ───────────
describe("V16-B04 yearly-boundary age", () => {
  it("phase06_yearly_boundary writes age = (year+1) - birthYear to the impact", async () => {
    const { phase06_yearly_boundary } =
      await import("@/engine/tick/phases/phase06_yearly_boundary");
    const r = mockRikishi("r-age", { birthYear: 2000, careerWins: 0 });
    const world = makeMockWorld({
      year: 2026,
      seed: "v16-b04",
      rikishi: new Map([["r-age", r]]),
      activeRikishiIds: new Set(["r-age"]),
      transientContext: { boundaries: { yearBoundary: true } } as never,
      hallOfFame: { inductees: [], inducted: {} } as never,
      history: [],
    });
    const impact = phase06_yearly_boundary(world);
    const updates = (impact as { entities?: { rikishiUpdates?: Map<string, { age?: number }> } })
      .entities?.rikishiUpdates;
    const age = updates?.get("r-age")?.age;
    // Buggy: age = world.year - birthYear = 26. Fixed: nextYear - birthYear = 27.
    expect(age).toBe(27);
  });
});

// ── V16-B16 — NPC merger must not target the player's stable ─────────────────
describe("V16-B16 merger excludes player heya", () => {
  it("findMergerTarget never returns the player's heya — even when it is the only fallback candidate", async () => {
    const { findMergerTarget } = await import("@/engine/economy/mergers");
    const player = makeMockHeya("h-player", { prestigeBand: "struggling" as never });
    const npc = makeMockHeya("h-npc", { prestigeBand: "struggling" as never });
    const src = makeMockHeya("h-src");
    // Fill the NPC roster to the merger cap so the fallback pool (roster < cap)
    // contains ONLY the player — the buggy code returned the player here.
    const npcRikishi = Array.from({ length: 30 }, (_, i) =>
      mockRikishi(`npc-r${i}`, { heyaId: "h-npc" })
    );
    npc.rikishiIds = npcRikishi.map((r) => r.id);
    const world = makeMockWorld({
      playerHeyaId: "h-player",
      seed: "v16-b16",
      year: 2024,
      week: 10,
      heyas: new Map([
        ["h-src", src],
        ["h-player", player],
        ["h-npc", npc],
      ]),
      rikishi: new Map(npcRikishi.map((r) => [r.id, r])),
    });
    expect(findMergerTarget(world, "h-src")).toBeNull();
  });
});

// ── V16-B17 — Global Cup player-champion flag compares heyaIds ───────────────
describe("V16-B17 GlobalCup wasPlayerChampion", () => {
  it("finalizeTournament emits wasPlayerChampion:true when the winner is player-owned", async () => {
    const { GlobalCupService } = await import("@/engine/economy/GlobalCupService");
    const { createImpactBuilder } = await import("@/engine/core/ImpactBuilder");
    const winner = mockRikishi("champ", { heyaId: "player-heya", shikona: "Champ" });
    const world = makeMockWorld({
      playerHeyaId: "player-heya",
      seed: "v16-b17",
      year: 2024,
      week: 1,
      heyas: new Map([["player-heya", makeMockHeya("player-heya")]]),
      rikishi: new Map([["champ", winner]]),
      chronicle: { globalCups: [] } as never,
    });
    const builder = createImpactBuilder("test");
    // Buggy: winnerId === world.playerHeyaId (rikishiId vs heyaId) → always false.
    // Fixed: resolve the winner rikishi's heyaId.
    (GlobalCupService as unknown as { finalizeTournament: (w: WorldState, b: unknown, id: string, name: string, ids: string[]) => void }).finalizeTournament(
      world,
      builder,
      "champ",
      "Champ",
      ["champ"]
    );
    expect(JSON.stringify(builder.build())).toContain('"wasPlayerChampion":true');
  });
});

// ── V16-B18 — bailout button gate matches the engine threshold ────────────────
// Covered by tests/unit/pages/EconomyPage.test.tsx ("V16-B18" describe) — the
// gate lives in the page component and can only be observed through its render.

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

    // Pin the IMPACT layer directly — the stale-base bug dropped all but the
    // last recruit's roster id before the resolver ever ran.
    const heyaUpdate = (
      impact as { entities?: { heyaUpdates?: Map<string, { rikishiIds?: string[] }> } }
    ).entities?.heyaUpdates?.get("npc-heya");
    const impactIds = heyaUpdate?.rikishiIds ?? [];
    expect(impactIds).toContain("incumbent-1");
    expect(impactIds.filter((id) => id.startsWith("person-"))).toHaveLength(2);

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
    const { FACTION_BAILOUT_AMOUNT, LOAN_ISSUANCE_THRESHOLD } =
      await import("@/constants/engine/economic");

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
    // principal while leaving the liability. The fixture sits below the loan
    // threshold, so the loan MUST exist — assert unconditionally.
    const loanPrincipal = (rInsolvent.activeLoans ?? []).reduce(
      (s: number, l: { principal?: number }) => s + (l.principal ?? 0),
      0
    );
    expect(loanPrincipal).toBeGreaterThan(0);
    expect(rInsolvent.funds).toBe(
      LOAN_ISSUANCE_THRESHOLD - 1_000_000 + loanPrincipal + FACTION_BAILOUT_AMOUNT
    );
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
