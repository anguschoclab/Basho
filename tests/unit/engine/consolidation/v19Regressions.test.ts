/**
 * v19 DEBT burn-down pins — every test in this file encodes the CORRECT
 * contract for a registered bug-registry item and must fail (RED) against the
 * pre-fix implementation, then pass once the Phase C fix lands.
 *
 * Item ids reference docs/audit/bug-registry-v17.md / _v18-findings-consolidated.md.
 */
import { describe, it, expect, vi } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { computeTargetBasho } from "@/engine/simulation/AutoSimService";
import { scheduleDivisionDay } from "@/engine/calendar/schedule";
import { scoreDrama } from "@/engine/matchmaking/DramaMatchmaker";
import { getBashoInfo } from "@/engine/calendar/calendar";
import { recordGyojiBout } from "@/engine/officials/GyojiService";
import { tickRikishiRecovery } from "@/engine/health/RecoveryService";
import { applyMentorshipBonuses } from "@/engine/training/MentorshipService";
import { getEffectiveCeiling } from "@/engine/training/TrainingMath";
import { tickWeekCandidatePool } from "@/engine/generation/CandidatePoolService";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";

// ── S7-23a: SimDuration "days" means world-days, not basho-days ───────────
// A basho spans ~60 world-days (6 basho/year). `ceil(N/15)` simulates ~N×4
// world-days. Consistent with the sibling arms: 9 weeks ≈ 63d, 2 months ≈ 60d.
describe("S7-23a — computeTargetBasho days→world-days contract", () => {
  it("converts days at ~60 world-days per basho cycle", () => {
    expect(computeTargetBasho({ type: "days", count: 60 })).toBe(1);
    expect(computeTargetBasho({ type: "days", count: 61 })).toBe(2);
    expect(computeTargetBasho({ type: "days", count: 120 })).toBe(2);
    expect(computeTargetBasho({ type: "days", count: 0 })).toBe(0);
    // Sub-cycle requests still run one basho (can't simulate partial bashos)
    expect(computeTargetBasho({ type: "days", count: 15 })).toBe(1);
  });
});

// ── S7-23b: scheduleJuryoWithCrossover must honor the caller's day ────────
// scheduleDivisionDay({day:4, division:"juryo"}) delegates to
// scheduleJuryoWithCrossover, which derives `day = basho.day ?? 1` and ignores
// the caller's day entirely — juryo bouts mint `d{basho.day}` boutIds and land
// on the wrong MatchSchedule.day while every other division uses the arg.
describe("S7-23b — juryo crossover honors caller's day", () => {
  it("schedules juryo bouts on the requested day, not basho.day", () => {
    const world = MockFactory.createWorld();
    const e = MockFactory.createRikishi("j-e1", { division: "juryo", rankNumber: 1, side: "east" });
    const w = MockFactory.createRikishi("j-w1", { division: "juryo", rankNumber: 2, side: "west" });
    world.rikishi.set(e.id, e);
    world.rikishi.set(w.id, w);
    const basho = MockFactory.createBasho({ day: 2 });

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "juryo",
      day: 4,
      seed: "v19-s7-23b",
    });
    expect(scheduled.length).toBeGreaterThan(0);
    for (const m of scheduled) {
      expect(m.day).toBe(4);
      expect(m.boutId).toContain("-d4-");
    }
  });
});

// ── S7-44: canonical live fields replace dead ad-hoc casts ───────────────
// `r.winStreak`/`justReturnedFromInjury`/`rivalries` are not Rikishi fields —
// the canonical live fields are currentWinStreak (written by
// boutResultApplier) and recentlyReturnedFromInjury (set by RecoveryService),
// and the canonical rivalry store is world.rivalriesState.
describe("S7-44 — DramaMatchmaker reads canonical live fields", () => {
  // Standings with wins so the winless_warrior check (day>=4, 0 wins) can't
  // fire first and mask the assertion.
  const mkStandings = (ids: string[]) => {
    const m = new Map<string, { wins: number; losses: number }>();
    for (const id of ids) m.set(id, { wins: 3, losses: 2 });
    return m;
  };
  const neutral = (id: string, over: object) =>
    MockFactory.createRikishi(id, { injured: false, ...over });

  it("fires streak_breaker for a 5+ currentWinStreak", () => {
    const a = neutral("r-a", { currentWinStreak: 6 });
    const b = neutral("r-b", {});
    const drama = scoreDrama(a, b, 5, mkStandings(["r-a", "r-b"]), undefined);
    expect(drama?.label).toBe("streak_breaker");
  });

  it("fires comeback_story for recentlyReturnedFromInjury", () => {
    const a = neutral("r-a", { recentlyReturnedFromInjury: true });
    const b = neutral("r-b", {});
    const drama = scoreDrama(a, b, 5, mkStandings(["r-a", "r-b"]), undefined);
    expect(drama?.label).toBe("comeback_story");
  });
});

// ── S7-48: getBashoInfo startDay must vary by year ───────────────────────
// "2nd Sunday of the month" differs year to year (Jan 2024 → 14th, Jan 2025 →
// 12th). The `_year` param is currently ignored and always uses DEFAULT_YEAR.
describe("S7-48 — getBashoInfo year-aware startDay", () => {
  it("computes the 2nd Sunday for the given year", () => {
    expect(getBashoInfo("hatsu", 2024).startDay).toBe(14);
    expect(getBashoInfo("hatsu", 2025).startDay).toBe(12);
  });
});

// ── S7-27: gyoji career history aggregates per basho ──────────────────────
// recordGyojiBout appends one entry per BOUT — career history grows ~150
// entries/basho/gyoji and the implied per-basho aggregation never happens.
describe("S7-27 — recordGyojiBout aggregates per basho", () => {
  it("folds same-basho bouts into one careerHistory entry", () => {
    const gyoji = { id: "g1", name: "Kimura", boutsOfficiated: 0, callsReversed: 0, careerHistory: [] };
    let g: Parameters<typeof recordGyojiBout>[0] = gyoji as never;
    for (let i = 0; i < 10; i++) {
      g = recordGyojiBout(g, "hatsu", 2024, i === 0);
    }
    const history = (g as { careerHistory: unknown[] }).careerHistory;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ bashoName: "hatsu", year: 2024, boutsOfficiated: 10, reversals: 1 });
    expect((g as { boutsOfficiated: number }).boutsOfficiated).toBe(10);
    expect((g as { callsReversed: number }).callsReversed).toBe(1);
  });
});

// ── S7-39: tickRikishiRecovery must not mutate its input ─────────────────
// The function mutates rikishi fields in place; callers clone defensively and
// the contract is fragile (one missed clone corrupts the live world object).
describe("S7-39 — tickRikishiRecovery is pure", () => {
  it("returns recovery outcome without mutating the input rikishi", () => {
    const r = MockFactory.createRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 1,
      isKyujo: true,
      injuryStatus: { type: "sprain", severity: "moderate", weeksRemaining: 1 },
    });
    const before = JSON.parse(JSON.stringify(r));
    const out = tickRikishiRecovery(r as never, 1.0) as unknown;
    expect(r).toEqual(before);
    const updated = (out as { rikishi?: typeof r }).rikishi ?? r;
    expect(updated.injured).toBe(false);
    expect(updated.injuryWeeksRemaining).toBe(0);
    expect(updated.recentlyReturnedFromInjury).toBe(true);
  });
});

// ── S7-37: bleed clamps respect the per-rikishi effective ceiling ────────
// MentorshipService clamps at the global MAX_STAT_CEILING instead of
// getEffectiveCeiling (PA + maturity) — low-PA apprentices get bled past
// their own ceiling.
describe("S7-37 — mentorship bleed clamps at effective ceiling", () => {
  it("does not push technique past the rikishi's personal ceiling", () => {
    const world = MockFactory.createWorld({ year: 2024 });
    const mentor = MockFactory.createRikishi("men1", {
      heyaId: "h1",
      rank: "juryo", // sekitori mentor
      stats: { technique: 99 } as never,
    });
    const apprentice = MockFactory.createRikishi("app1", {
      heyaId: "h1",
      mentorId: "men1",
      rank: "jonokuchi", // non-sekitori apprentice
      birthYear: 2000,
      // PA ceiling ≈ 70 (plus small maturity offset) — far below global 99
      potential: { stats: { technique: 70 }, ceilingFraction: 1.0 } as never,
      stats: { technique: 85, adaptability: 50 } as never,
    });
    // Second apprentice just under its ceiling — bleed should stop AT it.
    const app2 = MockFactory.createRikishi("app2", {
      heyaId: "h1",
      mentorId: "men1",
      rank: "jonokuchi",
      birthYear: 2000,
      potential: { stats: { technique: 70 }, ceilingFraction: 1.0 } as never,
      stats: { technique: 61, adaptability: 50 } as never,
    });
    world.rikishi.set(mentor.id, mentor);
    world.rikishi.set(apprentice.id, apprentice);
    world.rikishi.set(app2.id, app2);
    const impact = applyMentorshipBonuses(world);
    const updates = impact.entities?.rikishiUpdates;
    const ceiling = getEffectiveCeiling(app2, "technique", world);

    // Already over ceiling → bleed must not grow it further.
    expect(updates?.get("app1")?.stats?.technique).toBe(85);
    // Below ceiling → bleed clamps to the effective ceiling, not 99.
    const app2Tech = updates?.get("app2")?.stats?.technique;
    expect(app2Tech).toBeDefined();
    expect(app2Tech!).toBeLessThanOrEqual(ceiling);
    expect(app2Tech!).toBeGreaterThan(61);
  });
});

// ── S7-35: negotiation resolves per-suitor deadline, not ANY ─────────────
// tickWeekCandidatePool resolves the whole negotiation the moment ANY
// suitor's deadline passes — a low-interest suitor with a short deadline
// slams the window shut while a better suitor is still deciding.
describe("S7-35 — per-suitor deadline semantics", () => {
  it("does not resolve while an unexpired suitor remains", () => {
    const world = MockFactory.createWorld({ week: 3 });
    const candidate = {
      candidateId: "c1",
      personId: "p1",
      availabilityState: "in_talks",
      poolType: "high_school",
      nationality: "Japan",
      competingSuitors: [
        { heyaId: "hA", interestBand: "low", deadlineWeek: 2 }, // expired
        { heyaId: "hB", interestBand: "all_in", deadlineWeek: 10 }, // still open
      ],
    };
    world.candidatePool = {
      candidates: { c1: candidate },
      pools: { watchlist: { candidatesVisible: ["c1"], candidatesHidden: [] } },
    } as never;
    const impact = tickWeekCandidatePool(world);
    const next = impact.worldFields?.candidatePool?.candidates?.c1;
    expect(next).toBeDefined();
    expect(next!.availabilityState).toBe("in_talks");
    expect(next!.competingSuitors.map((s: { heyaId: string }) => s.heyaId)).toEqual(["hB"]);
  });
});

// ── S5-4: AutoSim bashoSeed must disambiguate repeat names ───────────────
// `seed-basho-${year}-${name}` mints the identical seed when a same-named
// basho runs twice in a year (e.g. world without currentBashoName defaults to
// "hatsu" every iteration). Fold a serial into the label.
describe("S5-4 — AutoSim bashoSeed uniqueness", () => {
  it("never reuses a bashoSeed within a run", async () => {
    vi.resetModules();
    const seeds: string[] = [];
    vi.doMock("@/engine/simulation/TournamentSimulator", () => ({
      simulateEntireBasho: (w: unknown, _n: string, seed: string) => {
        seeds.push(seed);
        return { finalWorld: w, yushoWinner: { id: null }, standings: new Map() };
      },
    }));
    const { runAutoSim } = await import("@/engine/simulation/AutoSimService");
    const world = MockFactory.createWorld({ year: 2024, seed: "s5-4" });
    delete (world as { currentBashoName?: string }).currentBashoName;
    runAutoSim(world, {
      duration: { type: "basho", count: 2 },
      verbosity: "minimal",
      stopConditions: [],
    } as never);
    expect(seeds).toHaveLength(2);
    expect(new Set(seeds).size).toBe(2);
    vi.doUnmock("@/engine/simulation/TournamentSimulator");
  });
});

// ── Char: double-fusenpai guard (landed V18 — refactor canary) ────────────
describe("char — double-fusenpai records absences, no winner", () => {
  it("both absent sides take an absence and no standings win/loss", () => {
    const e = MockFactory.createRikishi("e1", {});
    const w = MockFactory.createRikishi("w1", {});
    const world = MockFactory.createWorld();
    world.rikishi.set(e.id, e);
    world.rikishi.set(w.id, w);
    const basho = MockFactory.createBasho({ standings: new Map() });
    world.currentBasho = basho;
    const match = { day: 1, eastRikishiId: "e1", westRikishiId: "w1" } as never;
    const result = {
      boutId: "b1",
      day: 1,
      winner: "east",
      winnerRikishiId: "",
      loserRikishiId: "",
      kimarite: "fusensho",
      log: [],
    } as never;
    const impact = applyBoutResult(world, match, result);
    const st = impact.metadata?.updatedStandings as Map<string, { absences: number }>;
    expect(st.get("e1")?.absences).toBe(1);
    expect(st.get("w1")?.absences).toBe(1);
  });
});

// ── S6-5 DISPOSITION: DEBT-RENEWED (unreachable in the live pipeline) ─────
// `issueBailoutLoanIfNeeded` sets principal = deficit + FACTION_BAILOUT — a
// resolved second issuance can never re-fire the funds < -5M threshold in the
// same week. An unresolved double-issue produces identical `LN-*` ids but the
// last-wins activeLoans merge clobbers rather than duplicates. No honest RED
// pin exists for the resolved path; hardening label tracked in registry.

// ── S5-5: same-year tone re-fire must not collide on record id ────────────
// `meta-era-${year}-${tone}` collides when a year's dominant family flips back
// to an already-recorded tone. Fold a serial/dayIndex into the record id.
describe("S5-5 — meta-era record ids unique per record", () => {
  it("a repeated tone within one year mints distinct record ids", async () => {
    const { processYearlyEraDrift } = await import("@/engine/history/EraDriftService");
    const world = MockFactory.createWorld({ year: 2024 });
    world.mediaState = { headlines: [] } as never;
    // "waridashi" is push-family → dominance pushes tone to "explosive".
    const pushStats = { waridashi: 1500, yorikiri: 300 } as never;
    const beltStats = { yorikiri: 1500, shitatenage: 500 } as never;
    const findEraId = (imp: unknown) =>
      JSON.stringify(imp).match(/meta-era-[^"]+/)?.[0];

    world.dayIndexGlobal = 300;
    world.globalKimariteStats = pushStats;
    const i1 = processYearlyEraDrift(world);
    const id1 = findEraId(i1);
    expect(id1).toBe("meta-era-2024-explosive-300");

    // Flip dominance to belt ("classic") then back to push — the second
    // "explosive" headline re-mints the identical record id today.
    world.dayIndexGlobal = 330;
    world.globalKimariteStats = beltStats;
    processYearlyEraDrift(world);
    world.dayIndexGlobal = 400;
    world.globalKimariteStats = pushStats;
    const i3 = processYearlyEraDrift(world);
    const id3 = findEraId(i3);
    expect(id3).toBeDefined();
    // Same year + same tone must NOT re-mint the identical record id.
    expect(id3).not.toBe(id1);
  });
});

// ── S7-24: academy budget must be bounded and non-negative ────────────────
// candidateQualityBonus += floor(budget/50_000) is uncapped and a negative
// budget silently decrements it (or costs nothing).
describe("S7-24 — manageAcademy budget sanity", () => {
  const mkWorld = () => {
    const w = MockFactory.createWorld();
    w.heyas.set(
      "h1",
      MockFactory.createHeya("h1", {
        foreignAcademies: [{ region: "Mongolia", candidateQualityBonus: 5 }],
      } as never)
    );
    return w;
  };

  it("rejects a negative budget (no free quality decrement)", async () => {
    const { manageAcademy } = await import("@/engine/worldCircuit/WorldCircuitService");
    const impact = manageAcademy(mkWorld(), "h1", "Mongolia", { budget: -1_000_000 } as never);
    const academies = impact.entities?.heyaUpdates?.get("h1")?.foreignAcademies;
    const bonus = academies?.find((a) => a.region === "Mongolia")?.candidateQualityBonus;
    expect(bonus === undefined || bonus >= 5).toBe(true);
  });

  it("caps candidateQualityBonus growth per investment", async () => {
    const { manageAcademy } = await import("@/engine/worldCircuit/WorldCircuitService");
    const impact = manageAcademy(mkWorld(), "h1", "Mongolia", { budget: 1_000_000_000 } as never);
    const academies = impact.entities?.heyaUpdates?.get("h1")?.foreignAcademies;
    const bonus = academies?.find((a) => a.region === "Mongolia")?.candidateQualityBonus;
    expect(bonus).toBeDefined();
    // Cap: quality bonus must never exceed a sane bound (single investment
    // can't mint a +20_000 scout machine).
    expect(bonus!).toBeLessThanOrEqual(25);
  });
});

// ── S7-28: yokozuna evaluation must use real yusho, not wins>=14 ──────────
// isYushoLast conflates a 14-win tournament with a championship, and
// `performances: []` is never populated.
describe("S7-28 — evaluateCandidate uses real championship records", () => {
  it("14 wins without the yusho is not a championship", async () => {
    const { YokozunaService } = await import("@/engine/governance/services/YokozunaService");
    const world = MockFactory.createWorld();
    const ozeki = MockFactory.createRikishi("oz1", {
      rank: "ozeki",
      currentBashoWins: 14,
      currentBashoLosses: 1,
    });
    // History records show a DIFFERENT winner (not oz1).
    (world as { history: unknown[] }).history = [
      { year: 2024, bashoName: "hatsu", winnerRikishiId: "someone-else" },
      { year: 2023, bashoName: "kyushu", winnerRikishiId: "someone-else" },
    ] as never;
    const cand = YokozunaService.evaluateCandidate(world, ozeki);
    expect(cand).not.toBeNull();
    expect(cand!.reasons).not.toContain("Recent Tournament Champion");
    expect(cand!.performances.length).toBeGreaterThan(0);
  });
});

// ── S7-31: sanction history must survive event-log pruning ───────────────
// countGomenfudaForHeya scans world.events.log — a pruned log resets the
// offense count and sanctions silently vanish in long sims.
describe("S7-31 — gomenfuda record persists beyond log pruning", () => {
  it("hasSanctionWarning survives an emptied events log", async () => {
    const { recordGomenfuda, hasSanctionWarning } = await import(
      "@/engine/governance/services/GomenfudaService"
    );
    const { resolveImpacts } = await import("@/engine/core/ImpactResolver");
    let world = MockFactory.createWorld({ year: 2024 });
    const heya = MockFactory.createHeya("h1", {});
    world.heyas.set("h1", heya);
    const r = MockFactory.createRikishi("r1", { heyaId: "h1" });
    world.rikishi.set("r1", r);
    for (let i = 0; i < 3; i++) {
      world = resolveImpacts(world, [recordGomenfuda(world, heya, r, "hatsu", "injury")]);
    }
    // Simulate the capped log dropping the gomenfuda events entirely.
    world.events = { ...(world.events ?? {}), log: [] } as never;
    expect(hasSanctionWarning(world, "h1")).toBe(true);
  });
});

// ── S7-36: injured sparring pairs pause, not delete ──────────────────────
// applyWeeklySparring permanently removes a pair when a member is injured —
// the weeksActive counter resets, making the 12-week rivalry trigger
// unreachable through any injury interruption.
describe("S7-36 — sparring pair survives injury (paused)", () => {
  it("keeps the pair and weeksActive when a member is injured", async () => {
    const { applyWeeklySparring } = await import("@/engine/training/SparringService");
    const { resolveImpacts } = await import("@/engine/core/ImpactResolver");
    const world = MockFactory.createWorld({ week: 5 });
    const a = MockFactory.createRikishi("a1", { heyaId: "h1", injured: true });
    const b = MockFactory.createRikishi("b1", { heyaId: "h1", injured: false });
    world.rikishi.set("a1", a);
    world.rikishi.set("b1", b);
    world.sparringPairs = new Map([
      ["h1", {
        heyaId: "h1",
        pairs: { "a1-b1": { key: "a1-b1", aId: "a1", bId: "b1", chemistry: 50, weeksActive: 10, establishedWeek: 1 } },
      }],
    ]) as never;
    const impact = applyWeeklySparring(world);
    const next = resolveImpacts(world, [impact]);
    const pairs = next.sparringPairs?.get("h1")?.pairs ?? {};
    expect(pairs["a1-b1"]).toBeDefined();
    expect(pairs["a1-b1"].weeksActive).toBe(10); // paused, not reset
  });
});

// ── S7-38: promoteIntake must respect the 30-rikishi roster cap ───────────
// No roster-cap check — promotion overshoots 30 until the next overflow pass.
describe("S7-38 — promoteIntake roster cap", () => {
  it("does not promote into a full roster", async () => {
    const { promoteIntake } = await import("@/engine/recruitment/YouthAcademyService");
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya("h1", {
      rikishiIds: Array.from({ length: 30 }, (_, i) => `r${i}`),
      youthAcademy: {
        prospects: [{ id: "p1", age: 16, currentAbility: 60 }],
        totalGraduated: 0,
      },
    } as never);
    world.heyas.set("h1", heya);
    const impact = promoteIntake(world, "h1", "p1");
    const upd = impact.entities?.heyaUpdates?.get("h1");
    const roster = upd?.rikishiIds ?? heya.rikishiIds ?? [];
    expect(roster.length).toBeLessThanOrEqual(30);
  });
});

// ── S7-41: myoseki share names — expand the unique-name list ──────────────
// 63 unique names → ~42 shares fall back to generic `Elder_N` placeholders.
describe("S7-41 — myoseki market uses real names", () => {
  it("fewer than a third of shares need generic Elder_N names", async () => {
    const { generateMyosekiMarket } = await import("@/engine/governance/myosekiMarket");
    const market = generateMyosekiMarket("s7-41" as never, new Map() as never);
    const names: string[] = [];
    JSON.stringify(market, (_, v) => {
      if (v && typeof v === "object" && typeof (v as { name?: unknown }).name === "string") {
        names.push((v as { name: string }).name);
      }
      return v;
    });
    const generics = names.filter((n) => /^Elder_\d+$/.test(n)).length;
    expect(names.length).toBeGreaterThan(0);
    expect(generics / names.length).toBeLessThan(1 / 3);
  });
});

// ── Migration → explicit version rejection (zero back-compat constraint) ──
// Old known versions currently auto-migrate; the v19 architecture simplifies
// to an explicit unsupported-version rejection.
describe("arch — unsupported save versions rejected, not migrated", () => {
  it("migrateSave throws on a prior KNOWN version", async () => {
    const { MigrationService } = await import("@/engine/persistence/MigrationService");
    const save = { version: "1.0.0", world: {}, meta: {} } as never;
    expect(() => MigrationService.migrateSave(save)).toThrow(/unsupported|no longer|version/i);
  });
});

// ── #1201: allocateVacancies contract invariants ─────────────────────────
// Invariant pin committed before the optimized payload lands: the optimized
// implementation must satisfy exactly this contract (verified by the offline
// equivalence sweep AND these property assertions).
describe("#1201 — allocateVacancies invariants", () => {
  const mkWorld = () => {
    const w = MockFactory.createWorld({ playerHeyaId: "player" });
    w.heyas.set("player", MockFactory.createHeya("player", { rikishiIds: [] }));
    w.heyas.set("h-a", MockFactory.createHeya("h-a", { rikishiIds: Array(28).fill("x") }));
    w.heyas.set("h-b", MockFactory.createHeya("h-b", { rikishiIds: Array(29).fill("x") }));
    w.heyas.set(
      "h-sanct",
      MockFactory.createHeya("h-sanct", {
        rikishiIds: [],
        welfareState: { complianceState: "sanctioned" },
      } as never)
    );
    w.heyas.set(
      "h-frozen",
      MockFactory.createHeya("h-frozen", {
        rikishiIds: [],
        welfareState: { sanctions: { recruitmentFreezeWeeks: 4 } },
      } as never)
    );
    return w;
  };

  it("excludes player, sanctioned, and frozen heyas; caps at headroom", async () => {
    const { allocateVacancies } = await import("@/engine/generation/RecruitmentController");
    const out = allocateVacancies(mkWorld(), 5);
    expect(out["player"]).toBeUndefined();
    expect(out["h-sanct"]).toBeUndefined();
    expect(out["h-frozen"]).toBeUndefined();
    // headroom: h-a 2, h-b 1 → total 3 allocated at most
    expect((out["h-a"] ?? 0) + (out["h-b"] ?? 0)).toBeLessThanOrEqual(3);
    expect(out["h-a"] ?? 0).toBeLessThanOrEqual(2);
    expect(out["h-b"] ?? 0).toBeLessThanOrEqual(1);
    // Deterministic: same input → identical output.
    expect(allocateVacancies(mkWorld(), 5)).toEqual(out);
  });
});
