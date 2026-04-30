import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { WorldCircuitService } from "../systems/global/WorldCircuitService";
import { phase06_yearly_boundary } from "../tick/phases/phase06_yearly_boundary";
import { tickWeekNPC } from "../npcAI";
import { resolveImpacts } from "../core/ImpactResolver";
import { EntityCollection } from "../core/EntityCollection";

describe("World Circuit System Integration", () => {
  it("SHOULD generate invitations at the yearly boundary for all stables", () => {
    let world = generateInitialWorld("test-seed-1");
    world.transientContext = { boundaries: { monthBoundary: true, yearBoundary: true } };

    const impact = phase06_yearly_boundary(world);
    world = resolveImpacts(world, [impact]);

    expect(world.pendingExhibitions?.length).toBeGreaterThan(0);

    // Verify player and some NPC stables got invitations
    const invitations = world.pendingExhibitions || [];
    const playerInvitations = invitations.filter((i) => i.heyaId === world.playerHeyaId);
    expect(playerInvitations.length).toBeGreaterThan(0);
  });

  it("SHOULD allow NPCs to accept exhibitions and gain presence", () => {
    let world = generateInitialWorld("test-seed-2");
    const npcHeyaId = Array.from(world.heyas.keys()).find((id) => id !== world.playerHeyaId)!;

    // Mock an invitation for the NPC
    const invitation = {
      id: "npc-ex-1",
      heyaId: npcHeyaId,
      region: "Mongolia" as const,
      prestige: 80,
      expiresAtWeek: world.week + 4,
    };
    world.pendingExhibitions = [invitation];

    // Run NPC AI tick
    const npcImpact = tickWeekNPC(world);
    world = resolveImpacts(world, [npcImpact]);

    // Verify presence growth
    const heya = world.heyas.get(npcHeyaId)!;
    expect(heya.regionalPresence?.Mongolia).toBeGreaterThan(0);

    // Invitation should be removed from pending
    expect(world.pendingExhibitions?.find((i) => i.id === "npc-ex-1")).toBeUndefined();
  });

  it("SHOULD unlock Foreign Academy when presence hits threshold", () => {
    let world = generateInitialWorld("test-seed-3");
    const heyaId = world.playerHeyaId!;

    // Force high presence
    world.heyas.get(heyaId)!.regionalPresence = { Mongolia: 85 };

    const visibility = WorldCircuitService.getRegionVisibility(
      world.heyas.get(heyaId)!,
      "Mongolia"
    );
    expect(visibility).toBe("academy");

    const hasAcademy = WorldCircuitService.hasForeignAcademy(world, heyaId, "Mongolia");
    expect(hasAcademy).toBe(true);
  });
});
