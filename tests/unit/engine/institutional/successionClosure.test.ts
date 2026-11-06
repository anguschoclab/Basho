/**
 * Closure-on-failed-succession (Miyagino precedent).
 *
 * When a master is forced out with no eligible heir, the JSA lets an
 * already-dying stable fold — roster disperses via merger, the stable
 * archives into closedHeyas, the master's elder stock returns to the JSA
 * pool. Viable stables still get the trustee caretaker fallback.
 */

import { describe, it, expect } from "vitest";
import { DynastyService } from "@/engine/legacy/DynastyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import {
  enforceHardCapRosterOverflow,
  HARD_CAP_ROSTER_SIZE,
} from "@/engine/recruitment/overflow";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Heya } from "@/engine/types/heya";
import { SUCCESSION_CLOSURE_SANCTION_WEEKS } from "@/constants/engine/succession";
import { HEYA_FLOOR } from "@/constants/engine/economic";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

function agingOyakata(id: string, heyaId: string): Oyakata {
  return {
    id,
    heyaId,
    archetype: "traditionalist",
    traits: { ...TRAITS },
    age: 66,
    yearsInCharge: 12,
    shikona: "OldMaster",
    name: "OldMaster",
    tenure: {
      startedYear: 2,
      bashoServed: 30,
      championships: 0,
      sekitoriProduced: 0,
      insolvencyEvents: 0,
      majorScandals: 0,
      forcedMergers: 0,
    },
  } as unknown as Oyakata;
}

/** Jonidan roster filler — counts toward roster size but never an eligible heir. */
function rosterFiller(world: WorldState, heyaId: string, count: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `${heyaId}-r${i}`;
    const r = MockFactory.createRikishi(id, { heyaId, division: "jonidan" });
    world.rikishi.set(id, r);
    world.activeRikishiIds.add(id);
    ids.push(id);
  }
  return ids;
}

function buildWorld(opts: {
  dyingId: string;
  fillerCount?: number;
  rosterSize?: number;
  welfareState?: NonNullable<Heya["welfareState"]>;
  prestigeBand?: string;
  branchedFromHeyaId?: string;
  isPlayer?: boolean;
  withStock?: boolean;
}): { world: WorldState; oya: Oyakata } {
  const world = MockFactory.createWorld({ week: 10, year: 10 });
  const { dyingId } = opts;

  const oya = agingOyakata(`o-${dyingId}`, dyingId);
  world.oyakata.set(oya.id, oya);

  const rosterIds = rosterFiller(world, dyingId, opts.rosterSize ?? 0);
  const heya = MockFactory.createHeya(dyingId, {
    oyakataId: oya.id,
    rikishiIds: rosterIds,
    welfareState: opts.welfareState,
    prestigeBand: opts.prestigeBand as Heya["prestigeBand"],
    branchedFromHeyaId: opts.branchedFromHeyaId,
  });
  world.heyas.set(dyingId, heya);
  if (opts.isPlayer) world.playerHeyaId = dyingId;

  // Filler heyas — viable merger candidates (respected prestige, empty rosters).
  const fillers = opts.fillerCount ?? HEYA_FLOOR + 1;
  for (let i = 0; i < fillers; i++) {
    const fid = `filler-${i}`;
    if (fid === dyingId) continue;
    world.heyas.set(fid, MockFactory.createHeya(fid, { oyakataId: `f-oy-${i}` }));
  }

  if (opts.withStock) {
    world.myosekiMarket = {
      stocks: {
        "ms-held": {
          id: "ms-held",
          name: "HeldElderName",
          prestigeTier: "modest",
          ownerId: oya.id,
          holderId: oya.id,
          status: "held",
        },
      },
      history: [],
    } as NonNullable<WorldState["myosekiMarket"]>;
  }

  return { world, oya };
}

const SANCTIONED = (weeks: number) => ({
  welfareRisk: 85,
  activeDiet: "maintenance" as const,
  complianceState: "sanctioned" as const,
  weeksInState: weeks,
  lastReviewedWeek: 0,
});

describe("succession closure — dying stable folds instead of trustee", () => {
  it("closes a critically thin stable (roster <= 8) with no heir at 65", () => {
    const { world, oya } = buildWorld({ dyingId: "h-dying", rosterSize: 3 });
    const before = world.heyas.size;

    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);

    expect(next.heyas.has("h-dying")).toBe(false);
    expect(next.heyas.size).toBe(before - 1);
    const closed = next.closedHeyas?.get("h-dying");
    expect(closed).toBeDefined();
    expect(closed?.mergedInto).toBeDefined();
    expect(next.oyakata.has(oya.id)).toBe(false);
  });

  it("closes a persistently sanctioned stable even with a full roster", () => {
    const { world } = buildWorld({
      dyingId: "h-sanc",
      rosterSize: 20,
      welfareState: SANCTIONED(SUCCESSION_CLOSURE_SANCTION_WEEKS),
    });

    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);

    expect(next.heyas.has("h-sanc")).toBe(false);
    expect(next.closedHeyas?.get("h-sanc")).toBeDefined();
  });

  it("keeps a transiently sanctioned stable alive under a trustee", () => {
    const { world } = buildWorld({
      dyingId: "h-temp",
      rosterSize: 20,
      welfareState: SANCTIONED(SUCCESSION_CLOSURE_SANCTION_WEEKS - 1),
    });

    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);

    expect(next.heyas.has("h-temp")).toBe(true);
    expect(next.heyas.get("h-temp")?.oyakataId).toContain("oyakata_trustee_");
  });

  it("closes a prestige-collapsed stable", () => {
    const { world } = buildWorld({
      dyingId: "h-collapsed",
      rosterSize: 20,
      prestigeBand: "struggling",
    });

    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);

    expect(next.heyas.has("h-collapsed")).toBe(false);
  });

  it("keeps a healthy stable alive under a trustee when no heir exists", () => {
    const { world } = buildWorld({ dyingId: "h-healthy", rosterSize: 20 });

    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);

    expect(next.heyas.has("h-healthy")).toBe(true);
    expect(next.heyas.get("h-healthy")?.oyakataId).toContain("oyakata_trustee_");
  });

  it("never closes the player heya (dynasty frame)", () => {
    const { world } = buildWorld({ dyingId: "h-player", rosterSize: 2, isPlayer: true });

    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);

    expect(next.heyas.has("h-player")).toBe(true);
  });

  it("folds a branch back into its parent stable when the parent has room", () => {
    const { world } = buildWorld({ dyingId: "h-branch", rosterSize: 2 });
    // Parent exists among fillers — retag one as the recorded mother stable.
    const parent = MockFactory.createHeya("h-mother", { oyakataId: "m-oy" });
    world.heyas.set("h-mother", parent);
    const branch = world.heyas.get("h-branch")!;
    world.heyas.set("h-branch", { ...branch, branchedFromHeyaId: "h-mother" });

    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);

    expect(next.closedHeyas?.get("h-branch")?.mergedInto).toBe("h-mother");
  });

  it("returns the master's held elder stock to the JSA pool on closure", () => {
    const { world, oya } = buildWorld({ dyingId: "h-stock", rosterSize: 2, withStock: true });
    expect(world.myosekiMarket?.stocks["ms-held"].holderId).toBe(oya.id);

    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);

    const stock = next.myosekiMarket?.stocks["ms-held"];
    expect(stock?.status).toBe("available");
    expect(stock?.ownerId).toBe("JSA");
    expect(stock?.holderId).toBe("JSA");
  });

  it("keeps a dying stable alive at HEYA_FLOOR (runaway-collapse guard)", () => {
    const { world } = buildWorld({ dyingId: "h-floor", rosterSize: 0, fillerCount: HEYA_FLOOR - 1 });
    expect(world.heyas.size).toBe(HEYA_FLOOR);

    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);

    expect(next.heyas.has("h-floor")).toBe(true);
  });

  it("disperses a full-roster closure across open slots — overflow retires, never silently deletes", () => {
    const { world } = buildWorld({
      dyingId: "h-full",
      rosterSize: 30,
      fillerCount: HEYA_FLOOR,
      welfareState: SANCTIONED(SUCCESSION_CLOSURE_SANCTION_WEEKS),
    });
    // League-wide headroom is scarce: filler-1 has 20 open slots (the merger
    // target — only stable under the 25-roster candidacy bar), filler-0 has
    // 2, every other stable is packed at 30.
    for (let i = 0; i < HEYA_FLOOR; i++) {
      const fid = `filler-${i}`;
      const size = i === 0 ? 28 : i === 1 ? 10 : 30;
      const ids = rosterFiller(world, fid, size);
      world.heyas.set(fid, { ...world.heyas.get(fid)!, rikishiIds: ids });
    }
    const sourceIds = [...(world.heyas.get("h-full")!.rikishiIds ?? [])];
    expect(sourceIds.length).toBe(30);

    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);

    // Stable still folded.
    expect(next.heyas.has("h-full")).toBe(false);

    // Every former roster member is accounted for: transferred to a stable
    // with room, or force-retired into historicalRikishi — nobody is
    // hard-deleted, nobody lingers as a retired-flagged active.
    let transferred = 0;
    let retired = 0;
    for (const id of sourceIds) {
      const active = next.rikishi.get(id);
      const historical = next.historicalRikishi.get(id);
      expect(
        active !== undefined || historical !== undefined,
        `rikishi ${id} must survive the closure`
      ).toBe(true);
      if (active) {
        transferred++;
        expect(active.heyaId).not.toBe("h-full");
        expect(next.activeRikishiIds.has(id)).toBe(true);
      } else {
        retired++;
        expect(next.activeRikishiIds.has(id)).toBe(false);
      }
    }
    expect(transferred).toBe(22); // 20 target slots + 2 dispersal slots
    expect(retired).toBe(8);

    // The invariant the weekly enforcer guards: no stable exceeds the cap,
    // so enforceHardCapRosterOverflow releases nobody.
    for (const h of next.heyas.values()) {
      expect((h.rikishiIds ?? []).length).toBeLessThanOrEqual(HARD_CAP_ROSTER_SIZE);
    }
    const overflowImpact = enforceHardCapRosterOverflow(next);
    expect(overflowImpact.collections?.rikishiToRemove ?? []).toHaveLength(0);
  });
});
