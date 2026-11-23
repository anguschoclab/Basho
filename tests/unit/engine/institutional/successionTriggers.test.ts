/**
 * WS5 — Succession triggers beyond the age cliff (canon §16.1).
 *
 * tickSuccessionCheck currently only fires at age 65. The canon adds:
 *   - repeated insolvency events (board no-confidence)
 *   - accumulated major scandals
 *   - chronic underperformance (consecutiveUnderperformanceBasho)
 * Non-age triggers apply to every heya, including the player's — the
 * board can force the player's manager to step down; the dynasty continues
 * under the successor.
 */

import { describe, it, expect } from "vitest";
import { DynastyService } from "@/engine/legacy/DynastyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

function worldWithHeya(opts: {
  heyaId: string;
  isPlayer?: boolean;
  tenure?: Partial<NonNullable<Oyakata["tenure"]>>;
  underperformanceBasho?: number;
  funds?: number;
}): { world: WorldState; oya: Oyakata } {
  const world = MockFactory.createWorld({ week: 10, year: 5 });
  const oya = {
    id: `o-${opts.heyaId}`,
    heyaId: opts.heyaId,
    archetype: "traditionalist",
    traits: { ...TRAITS },
    age: 45,
    yearsInCharge: 6,
    shikona: "Oya",
    name: "Oya",
    tenure: {
      startedYear: 2,
      bashoServed: 12,
      championships: 0,
      sekitoriProduced: 0,
      insolvencyEvents: 0,
      majorScandals: 0,
      forcedMergers: 0,
      ...opts.tenure,
    },
  } as unknown as Oyakata;
  world.oyakata.set(oya.id, oya);
  const heya = MockFactory.createHeya(opts.heyaId, { oyakataId: oya.id });
  heya.consecutiveUnderperformanceBasho = opts.underperformanceBasho ?? 0;
  if (opts.funds !== undefined) heya.funds = opts.funds;
  world.heyas.set(opts.heyaId, heya);
  if (opts.isPlayer) world.playerHeyaId = opts.heyaId;
  return { world, oya };
}

function succeeded(world: WorldState, heyaId: string, oldOyaId: string): boolean {
  const impact = DynastyService.tickSuccessionCheck(world);
  const next = resolveImpacts(world, [impact]);
  const oyaId = next.heyas.get(heyaId)!.oyakataId;
  return oyaId !== oldOyaId || [...next.oyakata.keys()].some((id) => id !== oldOyaId);
}

describe("non-age succession triggers", () => {
  it("forces NPC succession after repeated insolvency events while still insolvent", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-npc",
      tenure: { insolvencyEvents: 3 },
      funds: -6_000_000, // below LOAN_ISSUANCE_THRESHOLD — still drowning
    });
    expect(succeeded(world, "h-npc", oya.id)).toBe(true);
  });

  it("does NOT force succession on historical bailouts once the stable recovered", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-npc",
      tenure: { insolvencyEvents: 3 },
      funds: 8_000_000, // back above water — historical events stay historical
    });
    expect(succeeded(world, "h-npc", oya.id)).toBe(false);
  });

  it("forces NPC succession after accumulated major scandals", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-npc",
      tenure: { majorScandals: 2 },
    });
    expect(succeeded(world, "h-npc", oya.id)).toBe(true);
  });

  it("forces NPC succession only on truly chronic underperformance (~4 yrs)", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-npc",
      underperformanceBasho: 24,
    });
    expect(succeeded(world, "h-npc", oya.id)).toBe(true);
  });

  it("does NOT force succession on a moderate underperformance streak", () => {
    // 12 basho (~2 yrs) of sekitori failure is pressure, not "chronic" — the
    // old 8-basho leash fired inside 16 months and chained trustee-churn.
    const { world, oya } = worldWithHeya({
      heyaId: "h-npc",
      underperformanceBasho: 12,
    });
    expect(succeeded(world, "h-npc", oya.id)).toBe(false);
  });

  it("DOES force-succeed the player's oyakata on non-age triggers (player-stakes fix)", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-player",
      isPlayer: true,
      tenure: { insolvencyEvents: 5, majorScandals: 4 },
      underperformanceBasho: 12,
    });
    expect(succeeded(world, "h-player", oya.id)).toBe(true);
  });

  it("healthy NPC tenure triggers nothing", () => {
    const { world, oya } = worldWithHeya({ heyaId: "h-npc" });
    expect(succeeded(world, "h-npc", oya.id)).toBe(false);
  });
});

describe("careerMode: sandbox vs career", () => {
  it("sandbox mode exempts the player heya from non-age forced succession", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-player",
      isPlayer: true,
      tenure: { insolvencyEvents: 5, majorScandals: 4 },
      underperformanceBasho: 12,
    });
    world.settings.careerMode = "sandbox";
    expect(succeeded(world, "h-player", oya.id)).toBe(false);
  });

  it("sandbox mode exempts the player oyakata from the age-65 cliff", () => {
    const { world, oya } = worldWithHeya({ heyaId: "h-player", isPlayer: true });
    oya.age = 66;
    world.settings.careerMode = "sandbox";
    expect(succeeded(world, "h-player", oya.id)).toBe(false);
  });

  it("sandbox mode does not exempt NPC heyas", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-npc",
      tenure: { insolvencyEvents: 5 },
      funds: -6_000_000,
    });
    world.playerHeyaId = "h-other";
    world.settings.careerMode = "sandbox";
    expect(succeeded(world, "h-npc", oya.id)).toBe(true);
  });

  it("absent careerMode preserves current behavior (player can be forced out)", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-player",
      isPlayer: true,
      tenure: { insolvencyEvents: 5 },
      funds: -6_000_000,
    });
    expect(succeeded(world, "h-player", oya.id)).toBe(true);
  });
});
