import { describe, it, expect } from "vitest";
import { WorldCircuitService } from "@/engine/worldCircuit/WorldCircuitService";
import { spawnGlobalWorker } from "@/engine/npc/npcAIWorkers";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { PendingExhibition } from "@/engine/types/world";

/**
 * V18-S7-18 — `expiresAtWeek` is written on every generated invitation but
 * nothing enforces it: stale invitations stay permanently acceptable and
 * `pendingExhibitions` grows unboundedly. Expired entries must be rejected at
 * processing time, un-proposable by the NPC global worker, and pruned when a
 * fresh yearly batch is generated.
 */
describe("V18-S7-18 exhibition invitation expiry", () => {
  const invitation = (overrides: Partial<PendingExhibition> = {}): PendingExhibition => ({
    id: "EX-1",
    heyaId: "heya1",
    region: "Mongolia",
    prestige: 50,
    requiresRank: "maegashira",
    expiresAtWeek: 9,
    ...overrides,
  });

  const makeWorld = (week: number, pendingExhibitions: PendingExhibition[] = []) => {
    const heya = MockFactory.createHeya("heya1");
    const rikishi = MockFactory.createRikishi("r1", { heyaId: "heya1", rank: "sekiwake" });
    return MockFactory.createWorld({
      week,
      heyas: new Map([["heya1", heya]]),
      rikishi: new Map([["r1", rikishi]]),
      pendingExhibitions,
    });
  };

  it("refuses to process an expired invitation — no presence gain, no events", () => {
    const world = makeWorld(10, [invitation()]); // expiresAtWeek 9, week 10 → expired
    const impact = WorldCircuitService.processExhibitionResult(
      world,
      "heya1",
      "r1",
      invitation()
    );
    const updated = resolveImpacts(world, [impact]);

    expect(updated.heyas.get("heya1")?.regionalPresence?.["Mongolia"] ?? 0).toBe(0);
    expect(updated.history.length).toBe(0);
  });

  it("processes a live invitation normally (control)", () => {
    const world = makeWorld(5, [invitation()]); // expiresAtWeek 9, week 5 → live
    const impact = WorldCircuitService.processExhibitionResult(
      world,
      "heya1",
      "r1",
      invitation()
    );
    const updated = resolveImpacts(world, [impact]);

    expect(updated.heyas.get("heya1")?.regionalPresence?.["Mongolia"] ?? 0).toBeGreaterThan(0);
  });

  it("invitation expiring this week is still processable at the boundary", () => {
    const world = makeWorld(9, [invitation()]); // expiresAtWeek 9, week 9 → last valid week
    const impact = WorldCircuitService.processExhibitionResult(
      world,
      "heya1",
      "r1",
      invitation()
    );
    const updated = resolveImpacts(world, [impact]);

    expect(updated.heyas.get("heya1")?.regionalPresence?.["Mongolia"] ?? 0).toBeGreaterThan(0);
  });

  it("prunes expired invitations when the yearly batch regenerates", () => {
    const world = makeWorld(10, [invitation({ id: "EX-stale", expiresAtWeek: 3 })]);
    const impact = WorldCircuitService.generateYearlyInvitations(world, "heya1");
    const updated = resolveImpacts(world, [impact]);

    const pending = updated.pendingExhibitions ?? [];
    expect(pending.some((i) => i.id === "EX-stale")).toBe(false);
    expect(pending.length).toBeGreaterThan(0); // fresh invitations still land
    expect(pending.every((i) => i.expiresAtWeek > (updated.week ?? 0))).toBe(true);
  });

  it("NPC global worker never proposes an expired invitation", () => {
    const world = makeWorld(10);
    const perception = {
      styleBias: "neutral",
      rikishiPerceptions: [{ rikishiId: "r1" }],
    } as never;

    const stale = spawnGlobalWorker({
      heyaId: "heya1",
      ambition: 80,
      riskAppetite: 80,
      perception,
      pendingExhibitions: [invitation({ expiresAtWeek: 3 })],
      world,
    });
    expect(stale.acceptedExhibitionId).toBeUndefined();

    // Control: a live invitation with the same worker still gets accepted.
    const live = spawnGlobalWorker({
      heyaId: "heya1",
      ambition: 80,
      riskAppetite: 80,
      perception,
      pendingExhibitions: [invitation({ expiresAtWeek: 20 })],
      world,
    });
    expect(live.acceptedExhibitionId).toBe("EX-1");
  });
});
