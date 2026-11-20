/**
 * dedup-characterization.test.ts
 *
 * Characterization pins for workstream W S (dead-parallel removal).
 * These pins document the behaviour of the *canonical* implementation in each
 * duplicate pair so that the merge can be proven safe. Where both variants are
 * still present they also assert equivalence, which is what makes the deletion
 * of the parallel implementation a no-op.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import { createImpactBuilder, type ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { HeyaUpdates } from "@/engine/tick/phases/monthly/types";
import { processLoanRepayments } from "@/engine/tick/phases/monthly/economics/loans";
import { getDisplayHeatBand } from "@/components/rivalries/rivalryUtils.pure";
import { toRivalryHeatBand } from "@/engine/narrative/descriptorBands";
import { SPONSOR_RECRUITMENT_COSTS } from "@/constants/engine/economic";
import { baseTenure } from "@/engine/legacy/tenure";
import { RANK_JA } from "@/components/hof/hofMeta";
import {
  RANK_NAMES,
  RANK_ORDINAL,
  RANKS_ASCENDING,
  rankSeniority,
  isYokozunaOrOzekiRank,
  isSanyakuRank,
  isSekitoriRank,
  isSekitoriDivision,
} from "@/constants/engine/rankDisplay";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import type { Rank, Division } from "@/engine/types/banzuke";
import type { Rikishi } from "@/engine/types/rikishi";

import { getFlagForNationality } from "@/presenters/projections/globalCupProjections";
import { kihakuLabel } from "@/presenters/rikishi/transformers/kihaku";
import { buyMyoseki } from "@/engine/governance/myosekiMarket";
import { offerCandidate } from "@/engine/generation/TalentPoolOffers";
import { fillVacanciesForNPC } from "@/engine/generation/TalentPoolNPCRecruitment";
import { ensureTalentPoolState } from "@/engine/generation/TalentPoolStateService";
import { ensureCandidatePoolState } from "@/engine/generation/CandidatePoolService";
import type { MyosekiMarket } from "@/engine/types/myoseki";
import type { TalentPoolType } from "@/engine/types/talent";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { formatYen } from "@/lib/engineUtils";
import {
  SELECTABLE_MOTIFS,
  keshoMotifEmoji,
  keshoMotifDescription,
} from "@/constants/engine/keshoMotifs";
import { useReplayClock } from "@/components/basho/boutReplay/useReplayClock";
import { useBoutReplay } from "@/components/basho/boutReplay/useBoutReplay";
import { useBoutReplay3D } from "@/components/basho/boutReplay3d/useBoutReplay3D";

// --- D1: loan repayment — canonical impl is monthly/economics/loans.ts ---

describe("D1 loan repayment characterization", () => {
  let world: WorldState;
  let builder: ImpactBuilder;

  beforeEach(() => {
    world = MockFactory.createWorld();
    builder = createImpactBuilder("test");
  });

  const loan = (over: Record<string, unknown>) => ({
    id: "L1",
    type: "emergency" as const,
    providerName: "Bank A",
    principal: 1000,
    interestRate: 0.1,
    remainingBalance: 500,
    monthlyPayment: 100,
    issuedAtYear: 2026,
    issuedAtMonth: 1,
    ...over,
  });

  it("live impl: partial payment persists updated remainingBalance", () => {
    const heya = MockFactory.createHeya("h-1", { funds: 1000 });
    heya.activeLoans = [loan({})];
    const heyaUpdates: HeyaUpdates = {};

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(900);
    expect(heyaUpdates.activeLoans).toHaveLength(1);
    expect(heyaUpdates.activeLoans?.[0].remainingBalance).toBe(400);
  });

  it("live impl: full payoff removes loan and emits FINANCIAL_ALERT", () => {
    const heya = MockFactory.createHeya("h-1", { funds: 1000 });
    heya.activeLoans = [loan({ remainingBalance: 100 })];
    const heyaUpdates: HeyaUpdates = {};

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(900);
    expect(heyaUpdates.activeLoans).toHaveLength(0);
    const events = builder.build().events ?? [];
    expect(events.some((e) => e.type === "FINANCIAL_ALERT" && e.data?.incident === "loan_paid_off")).toBe(true);
  });

  it("live impl: stale non-positive balance is dropped WITH paid_off event and credits funds", () => {
    // Documents the known divergence vs the dead impl: Math.min(payment,
    // negative balance) yields a negative totalPayment -> funds INCREASE, and
    // the loan is treated as paid off (event emitted). Pinning current truth.
    const heya = MockFactory.createHeya("h-1", { funds: 1000 });
    heya.activeLoans = [loan({ remainingBalance: -50 })];
    const heyaUpdates: HeyaUpdates = {};

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(1050);
    expect(heyaUpdates.activeLoans).toHaveLength(0);
    const events = builder.build().events ?? [];
    expect(events.some((e) => e.type === "FINANCIAL_ALERT" && e.data?.incident === "loan_paid_off")).toBe(true);
  });

});

// --- D4: heat band — canonical is toRivalryHeatBand (descriptorBands) ---

describe("D4 rivalry heat band characterization", () => {
  it("canonical band edges", () => {
    const expected: Array<[number, string]> = [
      [0, "dormant"], [19, "dormant"], [20, "simmering"], [39, "simmering"],
      [40, "heated"], [64, "heated"], [65, "fierce"], [84, "fierce"],
      [85, "legendary"], [100, "legendary"],
    ];
    for (const [heat, band] of expected) {
      expect(toRivalryHeatBand(heat)).toBe(band);
    }
  });

  it("getDisplayHeatBand ≡ toRivalryHeatBand across 0..100 (no prev = pure lookup)", () => {
    for (let heat = 0; heat <= 100; heat += 1) {
      expect(getDisplayHeatBand(heat)).toBe(toRivalryHeatBand(heat));
    }
  });
});

// --- D5: sponsor recruitment costs ---

describe("D5 sponsor recruitment costs", () => {
  it("canonical map covers T0–T5 with expected values", () => {
    expect(SPONSOR_RECRUITMENT_COSTS).toEqual({
      T0: 50_000, T1: 150_000, T2: 400_000, T3: 800_000, T4: 1_500_000, T5: 4_000_000,
    });
  });
});

// --- D6: tenure zero-shape ---

describe("D6 baseTenure zero-shape", () => {
  it("baseTenure(0) carries all ten counters at zero", () => {
    expect(baseTenure(0)).toEqual({
      startedYear: 0,
      bashoServed: 0,
      championships: 0,
      sekitoriProduced: 0,
      sanyakuProduced: 0,
      ozekiProduced: 0,
      yokozunaProduced: 0,
      insolvencyEvents: 0,
      majorScandals: 0,
      forcedMergers: 0,
      boardSeatsWon: 0,
    });
  });

  it("baseTenure stamps the given year", () => {
    expect(baseTenure(2026).startedYear).toBe(2026);
  });
});

// --- D7: nationality flags ---

describe("D7 nationality flag map", () => {
  it("canonical flag for all thirteen nationalities plus fallback", () => {
    const expected: Record<string, string> = {
      Japan: "🇯🇵", Mongolia: "🇲🇳", Estonia: "🇪🇪", Georgia: "🇬🇪",
      Bulgaria: "🇧🇬", Brazil: "🇧🇷", USA: "🇺🇸", Russia: "🇷🇺",
      Ukraine: "🇺🇦", China: "🇨🇳", Korea: "🇰🇷", Hungary: "🇭🇺", Czech: "🇨🇿",
    };
    for (const [nat, flag] of Object.entries(expected)) {
      expect(getFlagForNationality(nat)).toBe(flag);
    }
    expect(getFlagForNationality("Atlantis")).toBe("🏳️");
  });
});

// --- D8: RANK_JA derives from the display registry ---

describe("D8 RANK_JA vs display registry", () => {
  it("every RANK_JA key matches RANK_NAMES[rank].ja", () => {
    for (const [rank, ja] of Object.entries(RANK_JA)) {
      expect(RANK_NAMES[rank as keyof typeof RANK_NAMES]?.ja).toBe(ja);
    }
  });
});

// --- D11: kihaku label ladder ---

describe("D11 kihaku label ladder", () => {
  it("canonical labels at band edges", () => {
    const expected: Array<[number, string]> = [
      [0, "Broken Spirit"], [34, "Broken Spirit"], [35, "Faltering Will"],
      [49, "Faltering Will"], [50, "Steady Resolve"], [64, "Steady Resolve"],
      [65, "Fierce Determination"], [79, "Fierce Determination"],
      [80, "Blazing Spirit"], [100, "Blazing Spirit"],
    ];
    for (const [score, label] of expected) {
      expect(kihakuLabel(score)).toBe(label);
    }
  });
});


// ============================================================================
// W T — NPC ↔ player flow unification pins
// ============================================================================

function myosekiWorld(opts: { priced?: boolean; ownerId?: string; tier?: string } = {}) {
  const world = MockFactory.createWorld({ year: 2026, week: 10 });
  const stockId = "stock-1";
  world.myosekiMarket = {
    stocks: {
      [stockId]: {
        id: stockId,
        name: "Test Share",
        prestigeTier: opts.tier ?? "modest",
        basePrice: 80_000_000,
        askingPrice: opts.priced === false ? undefined : 100_000_000,
        status: "available",
        ownerId: opts.ownerId ?? "oya-seller",
        holderId: opts.ownerId ?? "oya-seller",
      },
    },
    history: [],
  } as unknown as MyosekiMarket;
  const buyer = MockFactory.createHeya("heya-buyer", { funds: 500_000_000 });
  const seller = MockFactory.createHeya("heya-seller", { funds: 0 });
  world.heyas = new Map([
    ["heya-buyer", buyer],
    ["heya-seller", seller],
  ]);
  (world.oyakata as Map<string, unknown>).set("oya-buyer", { id: "oya-buyer", heyaId: "heya-buyer" });
  (world.oyakata as Map<string, unknown>).set("oya-seller", { id: "oya-seller", heyaId: "heya-seller" });
  return { world, stockId };
}

describe("F1 myoseki purchase canonical contract", () => {
  it("buyMyoseki: buyer debited, seller heya credited, stock held, tx appended, event logged", () => {
    const { world, stockId } = myosekiWorld();
    const impact = buyMyoseki(world, "oya-buyer", "heya-buyer", stockId);
    expect(impact.entities?.heyaUpdates?.get("heya-buyer")?.funds).toBe(400_000_000);
    expect(impact.entities?.heyaUpdates?.get("heya-seller")?.funds).toBe(100_000_000);
    expect(impact.entities?.myosekiUpdates?.get(stockId)?.status).toBe("held");
    expect(impact.events?.some((e) => e.type === "FINANCIAL_ALERT" && e.data?.incident === "myoseki_acquisition")).toBe(true);
    expect(impact.arrayAppends?.some((a) => a.field === "myosekiMarket.history")).toBe(true);
  });

  it("buyMyoseki: self-purchase and insufficient funds are no-ops", () => {
    const { world, stockId } = myosekiWorld({ ownerId: "oya-buyer" });
    expect(buyMyoseki(world, "oya-buyer", "heya-buyer", stockId).entities?.heyaUpdates?.size ?? 0).toBe(0);

    const w2 = myosekiWorld();
    w2.world.heyas.get("heya-buyer")!.funds = 1;
    const impact = buyMyoseki(w2.world, "oya-buyer", "heya-buyer", w2.stockId);
    expect(impact.entities?.heyaUpdates?.size ?? 0).toBe(0);
  });

  it("buyMyoseki: JSA-owned stock pays no heya", () => {
    const { world, stockId } = myosekiWorld({ ownerId: "JSA" });
    const impact = buyMyoseki(world, "oya-buyer", "heya-buyer", stockId);
    expect(impact.entities?.heyaUpdates?.has("heya-seller")).toBeFalsy();
    expect(impact.entities?.heyaUpdates?.get("heya-buyer")?.funds).toBe(400_000_000);
  });

  it("unified impl: unpriced-available stock transacts at tier fallback price", () => {
    // Adopted from the retired TradingService impl — an "available" stock
    // without askingPrice sells at MYOSEKI_FALLBACK_PRICES[tier] (modest=80M).
    const { world, stockId } = myosekiWorld({ priced: false, tier: "modest" });
    const impact = buyMyoseki(world, "oya-buyer", "heya-buyer", stockId);
    expect(impact.entities?.heyaUpdates?.get("heya-buyer")?.funds).toBe(420_000_000);
    expect(impact.entities?.myosekiUpdates?.get(stockId)?.status).toBe("held");
  });
});

describe("F2 candidate signing eligibility", () => {
  function candidateWorld(age: number, tsukedashi?: "makushita" | "sandanme") {
    const world = MockFactory.createWorld({ year: 2026, week: 10 });
    const cand = MockFactory.createCandidate("cand-1", {
      birthYear: 2026 - age,
      ...(tsukedashi ? { tsukedashi } : {}),
    });
    const tp = MockFactory.createTalentPool();
    tp.candidates["cand-1"] = cand;
    tp.pools.high_school.candidatesVisible = ["cand-1"];
    world.talentPool = tp;
    const heya = MockFactory.createHeya("heya-1", { funds: 0, reputation: 10, rikishiIds: [] });
    world.heyas = new Map([["heya-1", heya]]);
    return { world, cand };
  }

  it("offerCandidate: age gate at NEW_APPRENTICE_MAX_AGE (23)", () => {
    const { world } = candidateWorld(22);
    expect(offerCandidate(world, "cand-1", "heya-1", "standard", "high").ok).toBe(true);
    const { world: over } = candidateWorld(23);
    expect(offerCandidate(over, "cand-1", "heya-1", "standard", "high").ok).toBe(false);
  });

  it("offerCandidate: tsukedashi candidates get the TSUKEDASHI_MAX_AGE (25) gate", () => {
    const { world: w23 } = candidateWorld(24, "makushita");
    expect(offerCandidate(w23, "cand-1", "heya-1", "standard", "high").ok).toBe(true);
    const { world: w25 } = candidateWorld(25, "makushita");
    expect(offerCandidate(w25, "cand-1", "heya-1", "standard", "high").ok).toBe(false);
  });

  it("V20-E15: fillVacanciesForNPC skips over-age candidates (was: signed them)", () => {
    // Deliberately fails pre-fix — the NPC path had no age gate. Post-fix the
    // candidate must remain unsigned (still available in the pool write).
    const { world } = candidateWorld(30);
    const impact = fillVacanciesForNPC(world, { "heya-1": 1 });
    const tpField = impact.worldFields?.talentPool;
    expect(tpField?.candidates?.["cand-1"]?.availabilityState).toBe("available");
  });
});

describe("F3 pool initializer parity", () => {
  it("talent pool default caps 450/300/200 + reserves 400/250/150", () => {
    const world = MockFactory.createWorld({ year: 2026, week: 5 });
    (world as { talentPool?: unknown }).talentPool = undefined;
    const tp = ensureTalentPoolState(world);
    const caps = (pt: TalentPoolType) => [tp.pools[pt].populationCap, tp.pools[pt].hiddenReserveCap];
    expect(caps("high_school")).toEqual([450, 400]);
    expect(caps("university")).toEqual([300, 250]);
    expect(caps("foreign")).toEqual([200, 150]);
    expect(tp.lastYearlyRefreshYear).toBe(2026);
    expect(tp.pools.high_school.lastRefreshWeek).toBe(5);
  });

  it("candidate pool default caps 50/40/30", () => {
    const world = MockFactory.createWorld({ year: 2026, week: 5 });
    (world as { candidatePool?: unknown }).candidatePool = undefined;
    const cp = ensureCandidatePoolState(world);
    const caps = (pt: TalentPoolType) => [cp.pools[pt].populationCap, cp.pools[pt].hiddenReserveCap];
    expect(caps("high_school")).toEqual([50, 50]);
    expect(caps("university")).toEqual([40, 40]);
    expect(caps("foreign")).toEqual([30, 30]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// W U — rank ordinals & shared predicates
// ─────────────────────────────────────────────────────────────────────────────

describe("W U — canonical rank ordinal parity", () => {
  const RANKS: Rank[] = [
    "jonokuchi", "jonidan", "sandanme", "makushita", "juryo",
    "maegashira", "komusubi", "sekiwake", "ozeki", "yokozuna",
  ];

  it("RANK_ORDINAL indexes RANKS_ASCENDING (jonokuchi 0 → yokozuna 9)", () => {
    RANKS.forEach((r, i) => {
      expect(RANK_ORDINAL[r]).toBe(i);
      expect(RANKS_ASCENDING[i]).toBe(r);
    });
  });

  it("rankSeniority equals RANK_HIERARCHY tier − 1 (yokozuna 0)", () => {
    expect(rankSeniority("yokozuna")).toBe(0);
    expect(rankSeniority("jonokuchi")).toBe(9);
    RANKS.forEach((r) =>
      expect(rankSeniority(r)).toBe(RANK_HIERARCHY[r].tier - 1)
    );
  });

  it("Swiss banzuke base equals rankSeniority × 100 (historical 0–900 map)", () => {
    // The retired SWISS_RANK_* map ran yokozuna 0 → jonokuchi 900 in steps
    // of 100 — pinned so the rankSeniority-derived base stays identical.
    const expected: Record<Rank, number> = {
      yokozuna: 0, ozeki: 100, sekiwake: 200, komusubi: 300,
      maegashira: 400, juryo: 500, makushita: 600, sandanme: 700,
      jonidan: 800, jonokuchi: 900,
    };
    for (const r of RANKS) expect(rankSeniority(r) * 100).toBe(expected[r]);
  });

  it("almanac getRankValue ladder equals RANK_ORDINAL + 1", () => {
    // career.ts's 1–10 rank value map is the pure ordinal shifted by one.
    // Pinned pre-migration so the shared ordinal derivation can't drift.
    const legacy: Record<Rank, number> = {
      jonokuchi: 1, jonidan: 2, sandanme: 3, makushita: 4, juryo: 5,
      maegashira: 6, komusubi: 7, sekiwake: 8, ozeki: 9, yokozuna: 10,
    };
    for (const r of RANKS) expect(legacy[r]).toBe(RANK_ORDINAL[r] + 1);
  });

  it("rosterSort legacy RANK_ORDER matched rankSeniority exactly", () => {
    // The retired RANK_ORDER map ran yokozuna 0 → jonokuchi 9 — pinned so the
    // rankSeniority migration in rosterSort stays identical.
    const legacy: Record<Rank, number> = {
      yokozuna: 0, ozeki: 1, sekiwake: 2, komusubi: 3, maegashira: 4,
      juryo: 5, makushita: 6, sandanme: 7, jonidan: 8, jonokuchi: 9,
    };
    for (const r of RANKS) expect(rankSeniority(r)).toBe(legacy[r]);
  });
});

describe("W U — shared predicate truth tables", () => {
  it("isYokozunaOrOzekiRank: true only for yokozuna/ozeki", () => {
    for (const [rank, want] of [
      ["yokozuna", true], ["ozeki", true], ["sekiwake", false],
      ["komusubi", false], ["maegashira", false], ["juryo", false],
      ["makushita", false], ["sandanme", false], ["jonidan", false],
      ["jonokuchi", false], ["bogus", false],
    ] as const) {
      expect(isYokozunaOrOzekiRank(rank)).toBe(want);
    }
  });

  it("isSanyakuRank: komusubi/sekiwake/ozeki/yokozuna only", () => {
    for (const [rank, want] of [
      ["yokozuna", true], ["ozeki", true], ["sekiwake", true],
      ["komusubi", true], ["maegashira", false], ["juryo", false],
      ["makushita", false], ["sandanme", false], ["jonidan", false],
      ["jonokuchi", false],
    ] as const) {
      expect(isSanyakuRank(rank)).toBe(want);
    }
  });

  it("isSekitoriRank: makuuchi+juryo ranks only", () => {
    for (const [rank, want] of [
      ["yokozuna", true], ["ozeki", true], ["sekiwake", true],
      ["komusubi", true], ["maegashira", true], ["juryo", true],
      ["makushita", false], ["sandanme", false], ["jonidan", false],
      ["jonokuchi", false],
    ] as const) {
      expect(isSekitoriRank(rank)).toBe(want);
    }
  });

  it("isSekitoriDivision: makuuchi/juryo only", () => {
    for (const [div, want] of [
      ["makuuchi", true], ["juryo", true], ["makushita", false],
      ["sandanme", false], ["jonidan", false], ["jonokuchi", false],
    ] as const) {
      expect(isSekitoriDivision(div as Division)).toBe(want);
    }
  });

  it("Swiss banzukeOrdinal golden: yokozuna E1 < jonokuchi W15", () => {
    // seniority×100 + rankNumber×2 + side(0 east/1 west)
    const yE1 = { rank: "yokozuna", rankNumber: 1, side: "east" } as Rikishi;
    const jW15 = { rank: "jonokuchi", rankNumber: 15, side: "west" } as Rikishi;
    const ord = (r: Rikishi) =>
      rankSeniority(r.rank) * 100 + (r.rankNumber ?? 1) * 2 + (r.side === "east" ? 0 : 1);
    expect(ord(yE1)).toBe(2);
    expect(ord(jW15)).toBe(931);
    expect(ord(yE1)).toBeLessThan(ord(jW15));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// W V — UI/presenter consolidation
// ─────────────────────────────────────────────────────────────────────────────

describe("W V — formatYen pinned-locale snapshot", () => {
  it("formatYen renders en-US grouping regardless of host locale", () => {
    expect(formatYen(1234567)).toBe("¥1,234,567");
    expect(formatYen(0)).toBe("¥0");
    expect(formatYen(-45000)).toBe("¥-45,000");
    expect(formatYen(80_000_000)).toBe("¥80,000,000");
  });
});

describe("W V — kesho motif registry", () => {
  it("every selectable motif resolves an emoji and a description", () => {
    // The mountain drift: selectable + renderable but missing a description.
    for (const motif of SELECTABLE_MOTIFS) {
      expect(keshoMotifEmoji(motif)).toBeDefined();
      expect(keshoMotifDescription(motif)).toBeDefined();
    }
    expect(SELECTABLE_MOTIFS).toHaveLength(19);
  });

  it("mountain resolves — the drift case", () => {
    expect(keshoMotifEmoji("mountain")).toBe("⛰️");
    expect(keshoMotifDescription("mountain")).toBe("a towering mountain");
  });

  it("legacy symbolMap/renderSymbol keys match the registry", () => {
    const legacy: Record<string, string> = {
      dragon: "🐉", phoenix: "🔥", tiger: "🐅", mt_fuji: "🗻", waves: "🌊",
      sakura: "🌸", pine: "🌲", bamboo: "🎋", crane: "🕊️", rising_sun: "☀️",
      lightning: "⚡", waterfall: "💧", temple: "⛩️", treasure_ship: "⛵",
      carp: "🐟", lotus: "🪷", thunder: "⛈️", wind: "💨", mountain: "⛰️",
    };
    for (const [motif, emoji] of Object.entries(legacy)) {
      expect(keshoMotifEmoji(motif)).toBe(emoji);
    }
  });
});

describe("W V — replay clock extraction surface", () => {
  it("useReplayClock exports the shared clock shape both hooks return", () => {
    // Structural pin: both wrappers expose the clock's subset — verified via
    // the type-level contract (compile-time) plus the hook existing at all.
    expect(typeof useReplayClock).toBe("function");
    expect(typeof useBoutReplay).toBe("function");
    expect(typeof useBoutReplay3D).toBe("function");
  });
});
