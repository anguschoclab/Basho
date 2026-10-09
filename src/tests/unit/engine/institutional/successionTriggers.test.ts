/**
 * WS5 — Succession triggers beyond the age cliff (canon §16.1).
 *
 * tickSuccessionCheck currently only fires at age 65. The canon adds:
 *   - repeated insolvency events (board no-confidence)
 *   - accumulated major scandals
 *   - chronic underperformance (consecutiveUnderperformanceBasho)
 * Non-age triggers apply to NPC heyas only — the player's own manager is
 * never force-replaced by an AI judgement call.
 */

import { describe, it, expect } from "vitest";
import { DynastyService } from "@/engine/systems/legacy/DynastyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

function worldWithHeya(opts: {
  heyaId: string;
  isPlayer?: boolean;
  tenure?: Partial<NonNullable<Oyakata["tenure"]>>;
  underperformanceBasho?: number;
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
  it("forces NPC succession after repeated insolvency events", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-npc",
      tenure: { insolvencyEvents: 3 },
    });
    expect(succeeded(world, "h-npc", oya.id)).toBe(true);
  });

  it("forces NPC succession after accumulated major scandals", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-npc",
      tenure: { majorScandals: 2 },
    });
    expect(succeeded(world, "h-npc", oya.id)).toBe(true);
  });

  it("forces NPC succession on chronic underperformance", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-npc",
      underperformanceBasho: 8,
    });
    expect(succeeded(world, "h-npc", oya.id)).toBe(true);
  });

  it("does NOT force-succeed the player's oyakata on non-age triggers", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-player",
      isPlayer: true,
      tenure: { insolvencyEvents: 5, majorScandals: 4 },
      underperformanceBasho: 12,
    });
    expect(succeeded(world, "h-player", oya.id)).toBe(false);
  });

  it("healthy NPC tenure triggers nothing", () => {
    const { world, oya } = worldWithHeya({ heyaId: "h-npc" });
    expect(succeeded(world, "h-npc", oya.id)).toBe(false);
  });
});
