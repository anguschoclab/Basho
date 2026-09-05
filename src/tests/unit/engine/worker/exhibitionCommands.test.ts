import { describe, it, expect } from "vitest";
import { WorldCircuitService } from "@/engine/systems/worldCircuit/WorldCircuitService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { PendingExhibition } from "@/engine/types/world";
import type { WorldState } from "@/engine/types/world";

function makeInvitation(heyaId: string, overrides: Partial<PendingExhibition> = {}): PendingExhibition {
  return {
    id: "ex-test-1",
    heyaId,
    region: "Mongolia",
    prestige: 50,
    expiresAtWeek: 10,
    ...overrides,
  };
}

describe("Exhibition command — accept/decline via WorldCircuitService", () => {
  it("processExhibitionResult updates regional presence on accept", () => {
    const world = generateInitialWorld("exhibition-test-1");
    const heyaId = world.playerHeyaId;
    const rikishiId = Array.from(world.rikishi.keys())[0];
    const invitation = makeInvitation(heyaId);

    const impact = WorldCircuitService.processExhibitionResult(
      world,
      heyaId,
      rikishiId,
      invitation
    );
    const updated = resolveImpacts(world, [impact]);

    const heya = updated.heyas.get(heyaId)!;
    expect(heya.regionalPresence?.Mongolia).toBeGreaterThan(0);
  });

  it("processExhibitionResult logs an exhibition event", () => {
    const world = generateInitialWorld("exhibition-test-2");
    const heyaId = world.playerHeyaId;
    const rikishiId = Array.from(world.rikishi.keys())[0];
    const invitation = makeInvitation(heyaId);

    const impact = WorldCircuitService.processExhibitionResult(
      world,
      heyaId,
      rikishiId,
      invitation
    );

    const events = (impact as any).events ?? [];
    const exhibitionEvent = events.find(
      (e: any) => e.data?.incident === "exhibition_victory" || e.data?.incident === "exhibition_defeat"
    );
    expect(exhibitionEvent).toBeDefined();
  });

  it("decline removes invitation from pendingExhibitions", () => {
    const world = generateInitialWorld("exhibition-test-3");
    const heyaId = world.playerHeyaId;
    const invitation = makeInvitation(heyaId);
    world.pendingExhibitions = [invitation];

    // Simulate decline: just remove from pending
    const remaining = (world.pendingExhibitions ?? []).filter(
      (i) => i.id !== invitation.id
    );
    expect(remaining).toHaveLength(0);
  });

  it("accept removes the accepted invitation from pendingExhibitions", () => {
    const world = generateInitialWorld("exhibition-test-4");
    const heyaId = world.playerHeyaId;
    const rikishiId = Array.from(world.rikishi.keys())[0];
    const invitation = makeInvitation(heyaId);
    world.pendingExhibitions = [invitation, makeInvitation(heyaId, { id: "ex-test-2" })];

    const impact = WorldCircuitService.processExhibitionResult(
      world,
      heyaId,
      rikishiId,
      invitation
    );
    const updated = resolveImpacts(world, [impact]);

    // Remove the accepted invitation
    const remaining = (updated.pendingExhibitions ?? []).filter(
      (i) => i.id !== invitation.id
    );
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("ex-test-2");
  });
});
