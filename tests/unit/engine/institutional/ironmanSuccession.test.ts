/**
 * T1.2 (optional) — ironman career mode.
 *
 * careerMode "ironman" is career-with-permadeath: every succession trigger
 * that would normally continue the dynasty under a successor instead ends
 * the run — the world freezes on `world.gameOver` and the tick pipeline
 * halts. NPC heyas are unaffected.
 */

import { describe, it, expect } from "vitest";
import { DynastyService } from "@/engine/legacy/DynastyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

function worldWithHeya(opts: {
  heyaId: string;
  isPlayer?: boolean;
  age?: number;
  tenure?: Partial<NonNullable<Oyakata["tenure"]>>;
  underperformanceBasho?: number;
}): { world: WorldState; oya: Oyakata } {
  const world = MockFactory.createWorld({ week: 10, year: 5 });
  const oya = {
    id: `o-${opts.heyaId}`,
    heyaId: opts.heyaId,
    archetype: "traditionalist",
    traits: { ...TRAITS },
    age: opts.age ?? 45,
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

function runCheck(world: WorldState): WorldState {
  return resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);
}

describe("careerMode: ironman", () => {
  it("ends the career on board-mandated forced succession (no successor seated)", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-player",
      isPlayer: true,
      tenure: { insolvencyEvents: 5 },
    });
    world.settings.careerMode = "ironman";

    const next = runCheck(world);

    expect(next.gameOver).toBeDefined();
    expect(next.gameOver?.oyakataName).toBe("Oya");
    expect(next.gameOver?.reason).toContain("insolvency");
    // The dynasty did NOT continue — same oyakata, no successor created.
    expect(next.heyas.get("h-player")?.oyakataId).toBe(oya.id);
    expect(next.oyakata.get(oya.id)).toBeDefined();
  });

  it("ends the career at the age-65 cliff", () => {
    const { world } = worldWithHeya({ heyaId: "h-player", isPlayer: true, age: 66 });
    world.settings.careerMode = "ironman";

    const next = runCheck(world);

    expect(next.gameOver).toBeDefined();
    expect(next.gameOver?.reason).toContain("65");
  });

  it("does not affect NPC succession — the league continues under ironman", () => {
    const { world, oya } = worldWithHeya({
      heyaId: "h-npc",
      tenure: { insolvencyEvents: 5 },
    });
    world.playerHeyaId = "h-other";
    world.settings.careerMode = "ironman";

    const next = runCheck(world);

    expect(next.gameOver).toBeUndefined();
    expect(next.heyas.get("h-npc")?.oyakataId).not.toBe(oya.id);
  });

  it("logs a headline lifecycle event announcing the end of the career", () => {
    const { world } = worldWithHeya({
      heyaId: "h-player",
      isPlayer: true,
      tenure: { insolvencyEvents: 5 },
    });
    world.settings.careerMode = "ironman";

    const impact = DynastyService.tickSuccessionCheck(world);
    const ended = (impact.events ?? []).some(
      (e) => e.type === "LIFECYCLE_EVENT" && e.heyaId === "h-player"
    );
    expect(ended).toBe(true);
  });

  it("advanceOneDay halts once gameOver is set — the day is not consumed", () => {
    const world = MockFactory.createWorld({ week: 10, year: 5 });
    world.gameOver = { reason: "test", oyakataName: "Oya", year: 5 };

    const next = advanceOneDay(world);

    expect(next).toBe(world);
  });

  it("gameOver + ironman mode survive a serialization round-trip", () => {
    const world = MockFactory.createWorld({ week: 10, year: 5 });
    world.settings.careerMode = "ironman";
    world.gameOver = { reason: "forced out", oyakataName: "Oya", year: 5 };

    const restored = SerializationService.deserializeWorld(
      SerializationService.serializeWorld(world)
    );

    expect(restored.settings.careerMode).toBe("ironman");
    expect(restored.gameOver).toEqual({ reason: "forced out", oyakataName: "Oya", year: 5 });
  });
});
