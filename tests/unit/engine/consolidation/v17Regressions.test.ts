/**
 * v17Regressions.test.ts
 * ======================
 * Consolidation v17 — pins for defects found by the deep-dive audit.
 * Each test exercises PRODUCTION code paths (no local reimplementations).
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { mockRikishi, makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { WorldState } from "@/engine/types/world";

// ── V17-F01 — isPlayerOwned must derive from world.playerHeyaId ─────────────
// Heya.isPlayerOwned is declared but never populated in production; every
// consumer defaulted to false. Ownership must come from playerHeyaId.
describe("V17-F01 player-ownership derivation", () => {
  it("projectRosterEntry marks the player's stable rikishi as player-owned", async () => {
    const { projectRosterEntry } = await import("@/presenters/rikishi");
    const heya = makeMockHeya("h-player"); // NOTE: no isPlayerOwned field set
    const world = makeMockWorld({
      playerHeyaId: "h-player",
      heyas: new Map([["h-player", heya]]),
    });
    const r = mockRikishi("r1", { heyaId: "h-player" });
    expect(projectRosterEntry(r, world).isPlayerOwned).toBe(true);
  });

  it("projectRosterEntry does not mark NPC-stable rikishi as player-owned", async () => {
    const { projectRosterEntry } = await import("@/presenters/rikishi");
    const world = makeMockWorld({
      playerHeyaId: "h-player",
      heyas: new Map([
        ["h-player", makeMockHeya("h-player")],
        ["h-npc", makeMockHeya("h-npc")],
      ]),
    });
    const r = mockRikishi("r2", { heyaId: "h-npc" });
    expect(projectRosterEntry(r, world).isPlayerOwned).toBe(false);
  });

  it("projectRikishi DTO carries isPlayerOwned from playerHeyaId", async () => {
    const { projectRikishi } = await import("@/presenters/uiModels");
    const world = makeMockWorld({
      playerHeyaId: "h-player",
      heyas: new Map([["h-player", makeMockHeya("h-player")]]),
    });
    const r = mockRikishi("r3", { heyaId: "h-player" });
    const dto = projectRikishi(r, world);
    expect((dto as { isPlayerOwned?: boolean }).isPlayerOwned).toBe(true);
  });
});

// ── V17-F02 — merger fallback must never target the player's stable ─────────
describe("V17-F02 merger target selection", () => {
  it("primary path prefers an eligible NPC over the player", async () => {
    const { findMergerTarget } = await import("@/engine/economy/mergers");
    const player = makeMockHeya("h-player", { prestigeBand: "struggling" as never });
    const npc = makeMockHeya("h-npc", { prestigeBand: "elite" as never });
    const src = makeMockHeya("h-src");
    const world = makeMockWorld({
      playerHeyaId: "h-player",
      seed: "merger-test",
      year: 2024,
      week: 10,
      heyas: new Map([
        ["h-src", src],
        ["h-player", player],
        ["h-npc", npc],
      ]),
    });
    expect(findMergerTarget(world, "h-src")).toBe("h-npc");
  });

  it("fallback pool excludes the player — returns null rather than player target", async () => {
    const { findMergerTarget } = await import("@/engine/economy/mergers");
    const player = makeMockHeya("h-player", { prestigeBand: "struggling" as never });
    const npc = makeMockHeya("h-npc", { prestigeBand: "struggling" as never });
    const src = makeMockHeya("h-src");
    // Fill the NPC roster to the merger cap so the fallback pool (roster < cap)
    // contains ONLY the player — the buggy code would return the player.
    const npcRikishi = Array.from({ length: 30 }, (_, i) =>
      mockRikishi(`npc-r${i}`, { heyaId: "h-npc" })
    );
    npc.rikishiIds = npcRikishi.map((r) => r.id);
    const world = makeMockWorld({
      playerHeyaId: "h-player",
      seed: "merger-test",
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

// ── V17-F03 — PHASE_LABELS must match the canonical cyclePhase values ───────
describe("V17-F03 calendar phase labels", () => {
  it("labels the canonical banzuke_reveal phase and drops the phantom basho_recap", async () => {
    const { PHASE_LABELS } = await import("@/constants/ui/calendar");
    expect(PHASE_LABELS.banzuke_reveal).toBeTruthy();
    expect(PHASE_LABELS.basho_recap).toBeUndefined();
  });
});

// ── V17-F04 — bi-annual election fires in even years at week 52 ─────────────
describe("V17-F04 election cadence", () => {
  it("phase01_week_governance logs election participation at week 52 of an even year", async () => {
    const { phase01_week_governance } =
      await import("@/engine/tick/phases/phase01_week_governance");
    const world = MockFactory.createWorld({ week: 52, year: 2024 });
    const heya = MockFactory.createHeya("h-elect", { ichimon: "Dewanoumi" });
    world.heyas.set("h-elect", heya);
    world.playerHeyaId = "player-x";
    const impact = phase01_week_governance(world);
    const blob = JSON.stringify(impact);
    expect(blob).toContain("board elections");
  });

  it("does not log elections in an odd year", async () => {
    const { phase01_week_governance } =
      await import("@/engine/tick/phases/phase01_week_governance");
    const world = MockFactory.createWorld({ week: 52, year: 2025 });
    const heya = MockFactory.createHeya("h-elect", { ichimon: "Dewanoumi" });
    world.heyas.set("h-elect", heya);
    world.playerHeyaId = "player-x";
    const impact = phase01_week_governance(world);
    expect(JSON.stringify(impact)).not.toContain("board elections");
  });
});

// ── V17-F05 — yearly-boundary age uses the incoming year ────────────────────
describe("V17-F05 yearly-boundary age", () => {
  it("phase06_yearly_boundary writes age = (year+1) - birthYear", async () => {
    const { phase06_yearly_boundary } =
      await import("@/engine/tick/phases/phase06_yearly_boundary");
    const r = mockRikishi("r-age", { birthYear: 2000, careerWins: 0 });
    const world = makeMockWorld({
      year: 2026,
      seed: "age-test",
      rikishi: new Map([["r-age", r]]),
      activeRikishiIds: new Set(["r-age"]),
      transientContext: { boundaries: { yearBoundary: true } } as never,
      hallOfFame: { inductees: [], inducted: {} } as never,
      history: [],
    });
    const impact = phase06_yearly_boundary(world);
    const updates = (impact as { entities?: { rikishiUpdates?: Map<string, { age?: number }> } })
      .entities?.rikishiUpdates;
    const ageUpdate =
      updates?.get("r-age") ??
      (impact as { rikishiUpdates?: Map<string, { age?: number }> }).rikishiUpdates?.get("r-age");
    expect(ageUpdate?.age).toBe(27); // 2027 - 2000
  });
});

// ── V17-F06 — Global Cup wasPlayerChampion flag ─────────────────────────────
describe("V17-F06 Global Cup player champion flag", () => {
  it("finalizeTournament marks wasPlayerChampion when the winner is player-owned", async () => {
    const { GlobalCupService } = await import("@/engine/economy/GlobalCupService");
    const world = makeMockWorld({
      playerHeyaId: "h-player",
      seed: "cup-test",
      year: 2024,
      week: 1,
      heyas: new Map([["h-player", makeMockHeya("h-player")]]),
      rikishi: new Map([
        ["winner-1", mockRikishi("winner-1", { heyaId: "h-player", shikona: "Winner" })],
      ]),
      chronicle: { globalCups: [] } as never,
    });
    const builder = createImpactBuilder("test");
    // finalizeTournament is exposed on the service namespace.
    (GlobalCupService as unknown as { finalizeTournament: (w: WorldState, b: unknown, id: string, name: string, ids: string[]) => void }).finalizeTournament(
      world,
      builder,
      "winner-1",
      "Winner",
      ["winner-1"]
    );
    const impact = builder.build();
    const blob = JSON.stringify(impact);
    expect(blob).toContain('"wasPlayerChampion":true');
  });
});

// ── V17-F07 — myoseki lease fees debit lessee AND credit owner ───────────────
describe("V17-F07 myoseki lease fees", () => {
  function leaseWorld() {
    const world = makeMockWorld({
      seed: "myo-lease",
      year: 2024,
      week: 10,
      playerHeyaId: "h-lessee",
      heyas: new Map([
        ["h-owner", makeMockHeya("h-owner", { funds: 10_000, oyakataId: "oya-owner" })],
        ["h-lessee", makeMockHeya("h-lessee", { funds: 10_000, oyakataId: "oya-lessee" })],
      ]),
      oyakata: new Map([
        ["oya-owner", { id: "oya-owner", heyaId: "h-owner" } as never],
        ["oya-lessee", { id: "oya-lessee", heyaId: "h-lessee" } as never],
      ]),
      myosekiMarket: {
        stocks: {
          s1: {
            id: "s1",
            name: "Test Myoseki",
            prestigeTier: "modest",
            ownerId: "oya-owner",
            holderId: "oya-lessee",
            status: "leased",
            leaseFee: 5200, // weekly = 100
            askingPrice: undefined,
          } as never,
        },
        history: [],
      } as never,
    });
    return world;
  }

  it("debits the lessee's heya by leaseFee/52", async () => {
    const { tickMyosekiMarket } = await import("@/engine/governance/myosekiMarket");
    const world = leaseWorld();
    const impact = tickMyosekiMarket(world);
    const resolved = resolveImpacts(world, [impact]);
    const lessee = resolved.heyas.get("h-lessee");
    expect(lessee?.funds).toBe(10_000 - 100);
  });

  it("credits the owner's heya the same weekly fee", async () => {
    const { tickMyosekiMarket } = await import("@/engine/governance/myosekiMarket");
    const world = leaseWorld();
    const impact = tickMyosekiMarket(world);
    const resolved = resolveImpacts(world, [impact]);
    const owner = resolved.heyas.get("h-owner");
    expect(owner?.funds).toBe(10_000 + 100);
  });
});

// ── V17-F08 — purchaseMyoseki resolves seller proceeds via oyakata namespace ─
describe("V17-F08 purchaseMyoseki proceeds", () => {
  function purchaseWorld() {
    const world = makeMockWorld({
      seed: "myo-purchase",
      year: 2024,
      week: 10,
      playerHeyaId: "h-player",
      heyas: new Map([
        ["h-seller", makeMockHeya("h-seller", { funds: 5_000, oyakataId: "oya-seller" })],
        ["h-buyer", makeMockHeya("h-buyer", { funds: 5_000, oyakataId: "oya-buyer" })],
      ]),
      oyakata: new Map([
        ["oya-seller", { id: "oya-seller", heyaId: "h-seller" } as never],
        ["oya-buyer", { id: "oya-buyer", heyaId: "h-buyer" } as never],
      ]),
    });
    const market = {
      stocks: {
        s1: {
          id: "s1",
          name: "Listed Myoseki",
          prestigeTier: "modest",
          ownerId: "oya-seller",
          holderId: "oya-seller",
          status: "available",
          askingPrice: 1000,
        } as never,
      },
      history: [],
    };
    return { world, market };
  }

  it("debits the buyer heya and credits the seller heya resolved via oyakata", async () => {
    const { purchaseMyoseki } = await import("@/engine/governance/services/MyosekiTradingService");
    const { world, market } = purchaseWorld();
    const impact = purchaseMyoseki(world, market as never, "s1", "oya-buyer", 5_000);
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.heyas.get("h-buyer")?.funds).toBe(5_000 - 1000);
    expect(resolved.heyas.get("h-seller")?.funds).toBe(5_000 + 1000);
    const stock = resolved.myosekiMarket?.stocks?.s1 as { ownerId?: string } | undefined;
    expect(stock?.ownerId).toBe("oya-buyer");
  });
});

// ── V17-F09 — buyMyoseki pays the listing owner and blocks self-purchase ─────
describe("V17-F09 buyMyoseki seller proceeds", () => {
  function buyWorld() {
    const world = makeMockWorld({
      seed: "myo-buy",
      year: 2024,
      week: 10,
      playerHeyaId: "h-player",
      heyas: new Map([
        ["h-seller", makeMockHeya("h-seller", { funds: 5_000, oyakataId: "oya-seller" })],
        ["h-buyer", makeMockHeya("h-buyer", { funds: 5_000, oyakataId: "oya-buyer" })],
      ]),
      oyakata: new Map([
        ["oya-seller", { id: "oya-seller", heyaId: "h-seller" } as never],
        ["oya-buyer", { id: "oya-buyer", heyaId: "h-buyer" } as never],
      ]),
      myosekiMarket: {
        stocks: {
          s1: {
            id: "s1",
            name: "Listed Myoseki",
            prestigeTier: "modest",
            ownerId: "oya-seller",
            holderId: "oya-seller",
            status: "available",
            askingPrice: 1000,
          } as never,
        },
        history: [],
      } as never,
    });
    return world;
  }

  it("credits the listing owner's heya when a third party buys listed stock", async () => {
    const { buyMyoseki } = await import("@/engine/governance/myosekiMarket");
    const world = buyWorld();
    const impact = buyMyoseki(world, "oya-buyer", "h-buyer", "s1");
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.heyas.get("h-buyer")?.funds).toBe(5_000 - 1000);
    expect(resolved.heyas.get("h-seller")?.funds).toBe(5_000 + 1000);
  });

  it("is a no-op when the buyer is the stock owner", async () => {
    const { buyMyoseki } = await import("@/engine/governance/myosekiMarket");
    const world = buyWorld();
    const before = world.heyas.get("h-seller")?.funds;
    const impact = buyMyoseki(world, "oya-seller", "h-seller", "s1");
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.heyas.get("h-seller")?.funds).toBe(before);
    const stock = resolved.myosekiMarket?.stocks?.s1 as { status?: string } | undefined;
    expect(stock?.status).toBe("available");
  });
});

// ── V17-F10 — retiree conversion must only claim JSA-owned stock ────────────
describe("V17-F10 retiree oyakata conversion stock eligibility", () => {
  it("does not confiscate a player/NPC-listed stock; mints JSA stock instead", async () => {
    const { processRetireeOyakataConversion } =
      await import("@/engine/lifecycle/retireeOyakataConversion");
    const retiree = mockRikishi("ret-1", {
      heyaId: "h-old",
      rank: "ozeki",
      birthYear: 1990,
      careerWins: 250,
      shikona: "Retiree",
    });
    const world = makeMockWorld({
      seed: "conv-test",
      year: 2024,
      week: 10,
      playerHeyaId: "h-player",
      heyas: new Map([
        ["h-old", makeMockHeya("h-old", { oyakataId: "oya-old" })],
        ["h-player", makeMockHeya("h-player")],
      ]),
      oyakata: new Map([["oya-old", { id: "oya-old", heyaId: "h-old" } as never]]),
      myosekiMarket: {
        stocks: {
          listed: {
            id: "listed",
            name: "NPC Listed Stock",
            prestigeTier: "modest",
            ownerId: "oya-seller",
            holderId: "oya-seller",
            status: "available",
            askingPrice: 5000,
          } as never,
        },
        history: [],
      } as never,
    });
    const builder = createImpactBuilder("test");
    processRetireeOyakataConversion(world, retiree, builder);
    const impact = builder.build();
    const resolved = resolveImpacts(world, [impact]);
    const listed = resolved.myosekiMarket?.stocks?.listed as
      { ownerId?: string; status?: string } | undefined;
    // The listed stock must remain untouched.
    expect(listed?.ownerId).toBe("oya-seller");
    expect(listed?.status).toBe("available");
    // A JSA stock must have been issued to the new oyakata instead.
    const stocks = Object.values(resolved.myosekiMarket?.stocks ?? {}) as Array<{
      ownerId?: string;
      status?: string;
    }>;
    expect(
      stocks.some((s) => s.status === "held" && s.ownerId !== "oya-seller" && s.ownerId !== "JSA")
    ).toBe(true);
  });
});

// ── V17-F11 — non-age succession must not die on summary successors ──────────
describe("V17-F11 succession successor viability", () => {
  it("falls back to trustee generation when the only eligible successor is a summary", async () => {
    const { DynastyService } = await import("@/engine/legacy/DynastyService");
    const heya = makeMockHeya("h-succ", {
      oyakataId: "oya-old",
      consecutiveUnderperformanceBasho: 8,
    });
    const oyakata = {
      id: "oya-old",
      heyaId: "h-succ",
      name: "Old Oya",
      yearsInCharge: 10,
      tenure: { insolvencyEvents: 0, majorScandals: 0 },
      retirementYear: undefined,
    } as never;
    // Summary-only successor: historicalRikishi entry marked isSummary.
    const summary = {
      id: "hist-star",
      isSummary: true,
      peakRank: "yokozuna",
      shikona: "Hist Star",
      heyaId: "h-succ",
    } as never;
    const world = makeMockWorld({
      seed: "succ-test",
      year: 2024,
      week: 1,
      playerHeyaId: "h-player",
      heyas: new Map([
        ["h-succ", heya],
        ["h-player", makeMockHeya("h-player")],
      ]),
      oyakata: new Map([["oya-old", oyakata]]),
      historicalRikishi: new Map([["hist-star", summary]]),
      rikishi: new Map(),
      activeRikishiIds: new Set(),
    });
    const impact = DynastyService.tickSuccessionCheck(world);
    const resolved = resolveImpacts(world, [impact]);
    // A succession must have occurred — either a real successor or the
    // generated trustee — never a silent no-op on the summary entry.
    const newOyakata = [...(resolved.oyakata?.values() ?? [])].find(
      (o) => (o as { id?: string }).id !== "oya-old"
    );
    expect(newOyakata).toBeDefined();
  });

  it("reseats a removed oyakata's myoseki stock on the trustee — no dangling ownerId/holderId", async () => {
    const { DynastyService } = await import("@/engine/legacy/DynastyService");
    const heya = makeMockHeya("h-succ", {
      oyakataId: "oya-old",
      consecutiveUnderperformanceBasho: 8,
    });
    const oyakata = {
      id: "oya-old",
      heyaId: "h-succ",
      name: "Old Oya",
      yearsInCharge: 10,
      tenure: { insolvencyEvents: 0, majorScandals: 0 },
      retirementYear: undefined,
    } as never;
    const world = makeMockWorld({
      seed: "succ-stock",
      year: 2024,
      week: 1,
      playerHeyaId: "h-player",
      heyas: new Map([
        ["h-succ", heya],
        ["h-player", makeMockHeya("h-player")],
      ]),
      oyakata: new Map([
        ["oya-old", oyakata],
        ["oya-other", { id: "oya-other", heyaId: "h-player" } as never],
      ]),
      historicalRikishi: new Map(),
      rikishi: new Map(),
      activeRikishiIds: new Set(),
      myosekiMarket: {
        stocks: {
          s1: {
            id: "s1",
            name: "Chair Stock",
            ownerId: "oya-old",
            holderId: "oya-old",
            status: "held",
          } as never,
          s2: {
            id: "s2",
            name: "Leased Stock",
            ownerId: "oya-old",
            holderId: "oya-other",
            status: "leased",
          } as never,
        },
        history: [],
      } as never,
    });
    const impact = DynastyService.tickSuccessionCheck(world);
    const resolved = resolveImpacts(world, [impact]);
    // Old oyakata is gone; every stock ref must reseat on a live person id.
    expect(resolved.oyakata?.has("oya-old")).toBe(false);
    const liveIds = new Set([
      ...(resolved.oyakata?.keys() ?? []),
      ...(resolved.rikishi?.keys() ?? []),
      ...(resolved.heyas?.keys() ?? []),
      "JSA",
    ]);
    for (const stock of Object.values(resolved.myosekiMarket?.stocks ?? {})) {
      const s = stock as { ownerId?: string; holderId?: string };
      if (s.ownerId) expect(liveIds.has(s.ownerId)).toBe(true);
      if (s.holderId) expect(liveIds.has(s.holderId)).toBe(true);
    }
  });
});

// ── V17-F12 — career-win milestones fire on threshold CROSSING ──────────────
describe("V17-F12 career win milestones", () => {
  it("records the 100-win milestone when careerWins crosses the threshold", async () => {
    const { runHistoryUpdates } = await import("@/engine/history/history");
    const r = mockRikishi("r-milestone", {
      careerWins: 105,
      milestones: [],
      currentBashoWins: 10,
      currentBashoLosses: 5,
    });
    const world = makeMockWorld({
      seed: "milestone-test",
      year: 2024,
      week: 1,
      rikishi: new Map([["r-milestone", r]]),
      activeRikishiIds: new Set(["r-milestone"]),
      history: [],
    });
    const impact = runHistoryUpdates(world);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r-milestone");
    const titles = (updated?.milestones ?? []).map((m) => m.title);
    expect(titles.some((t) => t.includes("100"))).toBe(true);
  });

  it("does not duplicate a milestone already recorded", async () => {
    const { runHistoryUpdates } = await import("@/engine/history/history");
    const r = mockRikishi("r-milestone2", {
      careerWins: 105,
      milestones: [
        {
          id: "ml-1",
          type: "stats_record",
          title: "100 Career Wins",
          description: "x",
          date: { year: 2020, month: 1 },
        } as never,
      ],
      currentBashoWins: 10,
      currentBashoLosses: 5,
    });
    const world = makeMockWorld({
      seed: "milestone-test2",
      year: 2024,
      week: 1,
      rikishi: new Map([["r-milestone2", r]]),
      activeRikishiIds: new Set(["r-milestone2"]),
      history: [],
    });
    const impact = runHistoryUpdates(world);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r-milestone2");
    const count100 = (updated?.milestones ?? []).filter((m) =>
      m.title?.includes("100 Career Wins")
    ).length;
    expect(count100).toBe(1);
  });
});

// ── V17-F13 — checkShikonaChange detects juryo → makuuchi debut ─────────────
describe("V17-F13 shikona change promotion detection", () => {
  it("returns a new shikona for a juryo → maegashira promotion", async () => {
    const { checkShikonaChange } = await import("@/engine/history/history");
    const heya = makeMockHeya("h-shi", { oyakataId: "oya-shi" });
    const oyakata = {
      id: "oya-shi",
      heyaId: "h-shi",
      name: "Oya",
      archetype: "traditionalist",
      formerShikona: "Kaminari",
    } as never;
    // maegashira is the standard makuuchi debut rank — the old code only
    // checked currentRank.includes("makuuchi") which never matches a rank name.
    const r = mockRikishi("r-shi", {
      heyaId: "h-shi",
      rank: "maegashira",
      division: "makuuchi",
    });
    const world = makeMockWorld({
      seed: "shikona-test",
      year: 2024,
      week: 1,
      playerHeyaId: "h-player",
      heyas: new Map([
        ["h-shi", heya],
        ["h-player", makeMockHeya("h-player")],
      ]),
      oyakata: new Map([["oya-shi", oyakata]]),
      rikishi: new Map([["r-shi", r]]),
    });
    const result = checkShikonaChange(world, r, "juryo");
    // Traditionalist archetype gives a 50% roll — rngForWorld is fully seeded,
    // so this seed deterministically lands under the threshold. Pre-fix the
    // promotion was never detected ("makuuchi" is a division, not a rank) and
    // the function always returned null.
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });
});
