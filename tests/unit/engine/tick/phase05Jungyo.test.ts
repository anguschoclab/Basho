/**
 * Spec (RED) — WS-14 YDC pressure: per-rikishi jungyō attendance tracking.
 *
 * Real JSA convention: an injured yokozuna who skips consecutive jungyō
 * tours draws Yokozuna Deliberation Council pressure — the same
 * `councilWarnings` channel as make-koshi pressure. Healthy sekitori tour
 * (attendance tracked); an injured yokozuna sits out and the absence
 * accumulates until the YDC issues a formal warning.
 */
import { describe, it, expect } from "vitest";
import { phase05_monthly_boundary } from "@/engine/tick/phases/phase05_monthly_boundary";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

const JUNGYO_MONTH = 8; // summer tour — the long gauntlet

function jungyoWorld(rikishiOverrides: Record<string, any> = {}): WorldState {
  const world = MockFactory.createWorld();
  world.transientContext = {
    boundaries: { monthBoundary: true, yearBoundary: false },
  } as WorldState["transientContext"];
  world.calendar = { ...world.calendar, month: JUNGYO_MONTH } as WorldState["calendar"];
  world.rikishi.clear();
  world.activeRikishiIds = new Set();
  return world;
}

function addYokozuna(world: WorldState, id: string, injured: boolean, extra: any = {}) {
  const r = MockFactory.createRikishi(id, {
    division: "makuuchi",
    rank: "yokozuna",
    heyaId: "heya-1",
    ...(injured
      ? { currentInjury: { id: "inj-y1", severity: "moderate", area: "knee", type: "sprain", weeksOut: 4, weekOccurred: 0 } }
      : {}),
    ...extra,
  });
  world.rikishi.set(id, r);
  world.activeRikishiIds.add(id);
  return r;
}

describe("phase05 jungyō — yokozuna tour attendance", () => {
  it("an injured yokozuna sits out the tour and accrues a consecutive absence", () => {
    const world = jungyoWorld();
    const heya = MockFactory.createHeya("heya-1", { rikishiIds: ["y1"] });
    world.heyas.set("heya-1", heya);
    addYokozuna(world, "y1", true);

    const impact = phase05_monthly_boundary(world);
    const next = resolveImpacts(world, [impact]);
    const y = next.rikishi.get("y1")!;
    expect(y.consecutiveJungyoAbsences).toBe(1);
  });

  it("a healthy yokozuna attends — absence counter resets and attendance accrues", () => {
    const world = jungyoWorld();
    world.heyas.set("heya-1", MockFactory.createHeya("heya-1", { rikishiIds: ["y1"] }));
    addYokozuna(world, "y1", false, { consecutiveJungyoAbsences: 2 });

    const next = resolveImpacts(world, [phase05_monthly_boundary(world)]);
    const y = next.rikishi.get("y1")!;
    expect(y.consecutiveJungyoAbsences ?? 0).toBe(0);
    expect(y.jungyoToursAttended).toBe(1);
  });

  it("the YDC issues a formal warning at the consecutive-absence threshold", () => {
    const world = jungyoWorld();
    world.heyas.set("heya-1", MockFactory.createHeya("heya-1", { rikishiIds: ["y1"] }));
    addYokozuna(world, "y1", true, { consecutiveJungyoAbsences: 1, councilWarnings: 0 });

    const impact = phase05_monthly_boundary(world);
    const next = resolveImpacts(world, [impact]);
    const y = next.rikishi.get("y1")!;
    expect(y.consecutiveJungyoAbsences).toBe(2);
    expect(y.councilWarnings).toBe(1);
    const warnings = (impact.events ?? []).filter(
      (e: any) => e.data?.incident === "ydc_jungyo_absence"
    );
    expect(warnings.length).toBe(1);
  });

  it("an injured juryo rikishi still tours — the YDC only tracks yokozuna", () => {
    const world = jungyoWorld();
    world.heyas.set("heya-1", MockFactory.createHeya("heya-1", { rikishiIds: ["j1"] }));
    const j = MockFactory.createRikishi("j1", {
      division: "juryo",
      rank: "juryo",
      heyaId: "heya-1",
      currentInjury: { id: "inj-j1", severity: "minor", area: "ankle", type: "sprain", weeksOut: 2, weekOccurred: 0 },
    });
    world.rikishi.set("j1", j);
    world.activeRikishiIds.add("j1");

    const next = resolveImpacts(world, [phase05_monthly_boundary(world)]);
    const jr = next.rikishi.get("j1")!;
    expect(jr.consecutiveJungyoAbsences ?? 0).toBe(0);
    expect(jr.jungyoToursAttended).toBe(1);
  });
});
