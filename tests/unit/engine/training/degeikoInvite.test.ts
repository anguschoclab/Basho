import { describe, it, expect } from "vitest";
import { requestDegeiko } from "@/engine/training/DegeikoService";
import {
  detectDueDecisions,
  resolveLoopDecision,
  evaluatePendingDecisions,
} from "@/engine/npc/decision/LoopDecisionEngine";
import { evaluateNpcDegeiko } from "@/engine/training/DegeikoService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

/**
 * W L follow-on — player-vs-NPC asymmetry in degeiko.
 * NPC stables request degeiko via weekly AI; when the PLAYER's stable is
 * the target, acceptance is a player decision (pendingDecisions), never a
 * dice roll. NPC targets keep the seeded-acceptance path.
 */

function buildWorld(seed: string, playerHeyaId = "heya_player"): WorldState {
  const world = MockFactory.createWorld({ seed, playerHeyaId, week: 10 });
  const player = MockFactory.createHeya(playerHeyaId, { name: "Player Beya", prestige: 60 });
  const npcA = MockFactory.createHeya("heya_npc_a", { name: "Alpha Beya", prestige: 80 });
  const npcB = MockFactory.createHeya("heya_npc_b", { name: "Beta Beya", prestige: 40 });
  world.heyas.set(player.id, player);
  world.heyas.set(npcA.id, npcA);
  world.heyas.set(npcB.id, npcB);
  const young = (id: string, heyaId: string): Rikishi =>
    MockFactory.createRikishi(id, {
      heyaId,
      shikona: `Young ${id}`,
      stats: { experience: 15 } as Rikishi["stats"],
    });
  world.rikishi.set("r_guest1", young("r_guest1", "heya_npc_a"));
  world.rikishi.set("r_guest2", young("r_guest2", "heya_npc_a"));
  world.rikishi.set("r_p1", young("r_p1", playerHeyaId));
  return world;
}

describe("requestDegeiko — player as host", () => {
  it("targets the player's stable → pending invite, NOT rng acceptance", () => {
    const world = buildWorld("invite-seed");
    const impact = requestDegeiko(world, "heya_npc_a", "heya_player", ["r_guest1", "r_guest2"]);
    const next = resolveImpacts(world, [impact]);

    // No session scheduled on the NPC's trainingState yet.
    expect(next.trainingState?.get("heya_npc_a")?.pendingDegeiko).toBeUndefined();
    // An invite is queued for the player.
    const invites = next.pendingDegeikoInvites ?? [];
    expect(invites).toHaveLength(1);
    expect(invites[0].fromHeyaId).toBe("heya_npc_a");
    expect(invites[0].rikishiIds).toEqual(["r_guest1", "r_guest2"]);
  });

  it("detectDueDecisions surfaces a degeiko_invite for the player", () => {
    const world = buildWorld("invite-detect");
    const next = resolveImpacts(world, [
      requestDegeiko(world, "heya_npc_a", "heya_player", ["r_guest1"]),
    ]);
    const decisions = detectDueDecisions(next);
    const invite = decisions.find((d) => d.type === "degeiko_invite");
    expect(invite).toBeDefined();
    expect(invite!.options.map((o) => o.id)).toEqual(["accept", "decline"]);
  });

  it("accept → session scheduled on the GUEST stable's trainingState", () => {
    const world = buildWorld("invite-accept");
    let next = resolveImpacts(world, [
      requestDegeiko(world, "heya_npc_a", "heya_player", ["r_guest1", "r_guest2"]),
    ]);
    next = resolveImpacts(next, [evaluatePendingDecisions(next)]);
    const invite = (next.pendingDecisions ?? []).find((d) => d.type === "degeiko_invite")!;
    next = resolveImpacts(next, [resolveLoopDecision(next, invite.id, "accept")]);

    expect(next.trainingState?.get("heya_npc_a")?.pendingDegeiko?.targetHeyaId).toBe("heya_player");
    expect(next.pendingDegeikoInvites ?? []).toHaveLength(0);
  });

  it("decline → no session + declined event + invite cleared", () => {
    const world = buildWorld("invite-decline");
    let next = resolveImpacts(world, [
      requestDegeiko(world, "heya_npc_a", "heya_player", ["r_guest1"]),
    ]);
    next = resolveImpacts(next, [evaluatePendingDecisions(next)]);
    const invite = (next.pendingDecisions ?? []).find((d) => d.type === "degeiko_invite")!;
    next = resolveImpacts(next, [resolveLoopDecision(next, invite.id, "decline")]);

    expect(next.trainingState?.get("heya_npc_a")?.pendingDegeiko).toBeUndefined();
    expect(next.pendingDegeikoInvites ?? []).toHaveLength(0);
    const declined = (next.events?.log ?? []).filter((e) => e.type === "DEGEIKO_DECLINED");
    expect(declined.length).toBeGreaterThan(0);
  });
});

describe("requestDegeiko — NPC target keeps seeded acceptance", () => {
  it("NPC→NPC requests still resolve via seeded rng (no invite)", () => {
    const world = buildWorld("npc-target");
    const impact = requestDegeiko(world, "heya_npc_b", "heya_npc_a", ["r_guest1"]);
    // r_guest1 belongs to heya_npc_a not heya_npc_b — invalid; use a beta member.
    const rb = MockFactory.createRikishi("r_b1", { heyaId: "heya_npc_b", stats: { experience: 10 } as Rikishi["stats"] });
    world.rikishi.set("r_b1", rb);
    const impact2 = requestDegeiko(world, "heya_npc_b", "heya_npc_a", ["r_b1"]);
    const next = resolveImpacts(world, [impact, impact2]);
    // Either accepted (pendingDegeiko set) or declined — never a player invite.
    expect(next.pendingDegeikoInvites ?? []).toHaveLength(0);
  });
});

describe("evaluateNpcDegeiko — NPC initiation", () => {
  it("an NPC heya with developing rikishi requests degeiko at a stronger stable", () => {
    const world = buildWorld("npc-plan");
    // Beta (prestige 40) has two young rikishi → should target Alpha (80) or Player (60).
    const r1 = MockFactory.createRikishi("r_b1", { heyaId: "heya_npc_b", stats: { experience: 10 } as Rikishi["stats"] });
    const r2 = MockFactory.createRikishi("r_b2", { heyaId: "heya_npc_b", stats: { experience: 12 } as Rikishi["stats"] });
    world.rikishi.set("r_b1", r1);
    world.rikishi.set("r_b2", r2);
    world.trainingState = new Map([
      ["heya_npc_b", { heyaId: "heya_npc_b", activeProfile: {} as never, focusSlots: [] }],
    ]);

    const impact = evaluateNpcDegeiko(world, "heya_npc_b");
    const next = resolveImpacts(world, [impact]);

    // Either a scheduled session (NPC target, rng accepted) or a pending
    // invite (player target) or a decline — but a request was attempted.
    const invited = (next.pendingDegeikoInvites ?? []).length > 0;
    const scheduled = !!next.trainingState?.get("heya_npc_b")?.pendingDegeiko;
    const declined = (next.events?.log ?? []).some((e) => e.type === "DEGEIKO_DECLINED");
    expect(invited || scheduled || declined).toBe(true);
    if (invited) {
      expect(next.pendingDegeikoInvites![0].fromHeyaId).toBe("heya_npc_b");
    }
  });

  it("heya with no developing rikishi does not request", () => {
    const world = buildWorld("npc-skip");
    const vet = MockFactory.createRikishi("r_vet", {
      heyaId: "heya_npc_b",
      stats: { experience: 90 } as Rikishi["stats"],
    });
    world.rikishi.set("r_vet", vet);
    const impact = evaluateNpcDegeiko(world, "heya_npc_b");
    const next = resolveImpacts(world, [impact]);
    expect(next.pendingDegeikoInvites ?? []).toHaveLength(0);
    expect(next.trainingState?.get("heya_npc_b")?.pendingDegeiko).toBeUndefined();
  });
});
