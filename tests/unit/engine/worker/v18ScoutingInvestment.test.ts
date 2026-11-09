/**
 * v18ScoutingInvestment.test.ts
 * ==============================
 * Failing-first regression pin for S7 — the SET_SCOUTING_INVESTMENT worker
 * command (src/engine/worker/commands/recruitment.ts:90-95) calls
 * `setScoutingInvestment` directly, which mutates `world.playerKnowledge`
 * IN PLACE via `ensureScoutingTable`/`table[rikishiId] = rebuilt`
 * (src/engine/recruitment/scoutingStore.ts:60-65,165-185) — bypassing
 * resolveImpacts entirely. Every sibling command resolves a NEW world through
 * `rt.world = resolveImpacts(rt.world, [impact])`; this one pokes the existing
 * object, so the input world (shared with the pre-command state) is corrupted
 * and the write never flows through the canonical impact pipeline.
 */
import { describe, it, expect, vi } from "vitest";
import { recruitmentCommands } from "@/engine/worker/commands/recruitment";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorkerRuntime } from "@/engine/worker/runtime";
import type { WorldState } from "@/engine/types/world";

function makeRt(world: WorldState): WorkerRuntime {
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

describe("SET_SCOUTING_INVESTMENT — canonical impact-resolved world write", () => {
  it("resolves a new world instead of mutating the input world in place", () => {
    const target = MockFactory.createRikishi("r-scout", { heyaId: "h-npc" });
    const world = MockFactory.createWorld({
      playerHeyaId: "h-player",
      heyas: new Map([
        ["h-player", MockFactory.createHeya("h-player")],
        ["h-npc", MockFactory.createHeya("h-npc")],
      ]),
      rikishi: new Map([["r-scout", target]]),
      playerKnowledge: { scouting: {} },
    });
    const playerKnowledgeRef = world.playerKnowledge;
    const rt = makeRt(world);
    const handlers = recruitmentCommands(rt);

    handlers.SET_SCOUTING_INVESTMENT!({
      type: "SET_SCOUTING_INVESTMENT",
      rikishiId: "r-scout",
      investment: "deep",
    });

    // PIN (RED): the command must not mutate the input world — the original
    // playerKnowledge contents must be untouched by the write.
    expect(playerKnowledgeRef?.scouting?.["r-scout"]).toBeUndefined();
    // PIN (RED): canonical commands reassign rt.world to the resolved world;
    // this handler never does — the same (mutated) object stays in place.
    expect(rt.world).not.toBe(world);
    // Control: the investment write itself did land (on whichever world the
    // handler exposes) — proves the real path ran end to end.
    expect(rt.world?.playerKnowledge?.scouting?.["r-scout"]?.scoutingInvestment).toBe("deep");
  });
});
