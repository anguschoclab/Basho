import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { WorldCircuitService } from "@/engine/systems/worldCircuit/WorldCircuitService";
import { phase06_yearly_boundary } from "@/engine/tick/phases/phase06_yearly_boundary";
import { tickWeekNPC } from "@/engine/npcAI";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

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
    const world = generateInitialWorld("test-seed-3");
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

  it("SHOULD calculate rikishi power with zero stats, not default to 50", () => {
    const world = generateInitialWorld("test-seed-zero-stats");
    const heyaId = world.playerHeyaId!;
    const rikishiId = Array.from(world.rikishi.keys())[0];

    // Force zero stats
    const r = world.rikishi.get(rikishiId)!;
    r.stats.technique = 0;
    r.stats.speed = 0;
    r.stats.mental = 0;

    // Force initial presence to 0
    world.heyas.get(heyaId)!.regionalPresence = { Mongolia: 0 };

    const invitation = {
      id: "ex-zero-stats",
      heyaId,
      region: "Mongolia" as const,
      prestige: 80,
      expiresAtWeek: world.week + 4,
    };
    world.pendingExhibitions = [invitation];

    // With zero stats, rikishiPower = (0+0+0)/3 = 0
    // regionalChampion = 50 + 80/2 = 90
    // win probability = 0 / (0 + 90) = 0 → should always lose
    // Loss gives +5 presence, win gives +15
    const impact = WorldCircuitService.processExhibitionResult(world, heyaId, rikishiId, invitation);
    const newWorld = resolveImpacts(world, [impact]);

    const heya = newWorld.heyas.get(heyaId)!;
    const presence = heya.regionalPresence?.Mongolia ?? 0;
    // rikishiPower = 0, always loses → presence = 0 + 5 = 5
    expect(presence).toBe(5);
  });

  it("SHOULD allow high-stats rikishi to win exhibitions", () => {
    // Run 20 trials — with ~47% win rate, at least one win is virtually guaranteed
    let wins = 0;
    for (let i = 0; i < 20; i++) {
      const w = generateInitialWorld(`test-seed-high-stats-${i}`);
      const hid = w.playerHeyaId!;
      const rid = Array.from(w.rikishi.keys())[0];
      w.heyas.get(hid)!.regionalPresence = { Mongolia: 0 };
      const r2 = w.rikishi.get(rid)!;
      r2.stats.technique = 80;
      r2.stats.speed = 80;
      r2.stats.mental = 80;

      const invitation = {
        id: `ex-high-${i}`,
        heyaId: hid,
        region: "Mongolia" as const,
        prestige: 80,
        expiresAtWeek: w.week + 4,
      };
      w.pendingExhibitions = [invitation];

      const impact = WorldCircuitService.processExhibitionResult(w, hid, rid, invitation);
      const newWorld = resolveImpacts(w, [impact]);
      const presence = newWorld.heyas.get(hid)!.regionalPresence?.Mongolia ?? 0;
      if (presence >= 15) wins++;
    }
    // With ~47% win rate over 20 trials, P(0 wins) < 0.0001
    expect(wins).toBeGreaterThan(0);
  });

  it("SHOULD cap regional presence at 100", () => {
    const world = generateInitialWorld("test-seed-cap");
    const heyaId = world.playerHeyaId!;
    const rikishiId = Array.from(world.rikishi.keys())[0];

    // Force high stats for guaranteed win
    const r = world.rikishi.get(rikishiId)!;
    r.stats.technique = 100;
    r.stats.speed = 100;
    r.stats.mental = 100;

    // Start at 95 — a win gives +15, but cap is 100
    world.heyas.get(heyaId)!.regionalPresence = { Mongolia: 95 };

    const invitation = {
      id: "ex-cap",
      heyaId,
      region: "Mongolia" as const,
      prestige: 10, // low prestige → weak opponent → high win chance
      expiresAtWeek: world.week + 4,
    };
    world.pendingExhibitions = [invitation];

    const impact = WorldCircuitService.processExhibitionResult(world, heyaId, rikishiId, invitation);
    const newWorld = resolveImpacts(world, [impact]);
    const presence = newWorld.heyas.get(heyaId)!.regionalPresence?.Mongolia ?? 0;

    // Win: 95 + 15 = 110, but capped at 100
    // Loss: 95 + 5 = 100
    // Either way, presence should be exactly 100
    expect(presence).toBe(100);
  });
});
