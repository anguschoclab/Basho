/**
 * npcOwnershipGuard.test.ts
 * ==========================
 * V17-F15 — stable-management worker commands must reject NPC heyaIds.
 * StablePage renders mutation controls for any route-selected heya, so the
 * worker boundary is the enforcement point.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { heyaCommands } from "@/engine/worker/commands/heya";
import { recruitmentCommands } from "@/engine/worker/commands/recruitment";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { WorkerRuntime } from "@/engine/worker/runtime";

function makeRt(world: ReturnType<typeof makeMockWorld>): WorkerRuntime {
  return {
    world,
    worldVersion: 0,
    digestRevision: 0,
    simPaused: false,
    post: vi.fn(),
    emitDigest: vi.fn(),
    syncWorld: vi.fn(),
    syncAndDigest: vi.fn(),
  };
}

function worldWithPlayerAndNpc() {
  const world = makeMockWorld({
    seed: "guard-test",
    year: 2024,
    week: 10,
    playerHeyaId: "h-player",
    heyas: new Map([
      ["h-player", makeMockHeya("h-player", { funds: 50_000_000 })],
      ["h-npc", makeMockHeya("h-npc", { funds: 50_000_000 })],
    ]),
  });
  return world;
}

describe("worker stable-management ownership guards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("BUILD_INFRASTRUCTURE on an NPC heya is a no-op", () => {
    const world = worldWithPlayerAndNpc();
    const rt = makeRt(world);
    const handlers = heyaCommands(rt);
    const fundsBefore = rt.world!.heyas.get("h-npc")!.funds;
    handlers.BUILD_INFRASTRUCTURE!({
      type: "BUILD_INFRASTRUCTURE",
      heyaId: "h-npc",
      facilityId: "weights_room",
    } as never);
    expect(rt.world!.heyas.get("h-npc")!.funds).toBe(fundsBefore);
  });

  it("BUILD_INFRASTRUCTURE on the player's heya still applies", () => {
    const world = worldWithPlayerAndNpc();
    const rt = makeRt(world);
    const handlers = heyaCommands(rt);
    handlers.BUILD_INFRASTRUCTURE!({
      type: "BUILD_INFRASTRUCTURE",
      heyaId: "h-player",
      facilityId: "weights_room",
    } as never);
    // The command path ran — world was re-resolved (new object) or at least
    // the handler did not early-return on ownership.
    expect(rt.syncAndDigest).toHaveBeenCalled();
  });

  it("BUILD_YOUTH_ACADEMY on an NPC heya is a no-op", () => {
    const world = worldWithPlayerAndNpc();
    const rt = makeRt(world);
    const handlers = recruitmentCommands(rt);
    const worldRef = rt.world;
    handlers.BUILD_YOUTH_ACADEMY!({
      type: "BUILD_YOUTH_ACADEMY",
      heyaId: "h-npc",
    } as never);
    // Guard must prevent resolveImpacts entirely — world reference unchanged.
    expect(rt.world).toBe(worldRef);
  });

  it("INVEST_ACADEMY on an NPC heya is a no-op", () => {
    const world = worldWithPlayerAndNpc();
    const rt = makeRt(world);
    const handlers = recruitmentCommands(rt);
    const worldRef = rt.world;
    handlers.INVEST_ACADEMY!({
      type: "INVEST_ACADEMY",
      heyaId: "h-npc",
      amount: 1_000_000,
    } as never);
    expect(rt.world).toBe(worldRef);
  });
});
