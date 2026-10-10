/**
 * WS4 — Rikishi agency: player-facing decision path.
 *
 * Player-heya requests surface as non-blocking `rikishi_request` queue
 * decisions through the canonical LoopDecisionEngine path — detected in
 * `detectDueDecisions`, resolved by `resolveLoopDecision` /
 * `applyDecisionEffect`, auto-decided under autonomous sim, and denied on
 * expiry via `applyExpiredQueueDefaults`.
 */

import { describe, it, expect } from "vitest";
import {
  detectDueDecisions,
  resolveLoopDecision,
  applyExpiredQueueDefaults,
} from "@/engine/loop/LoopDecisionEngine";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RikishiRequest } from "@/engine/rikishiAgency/types";

function playerWorld(reqs: RikishiRequest[]): WorldState {
  const world = MockFactory.createWorld({ cyclePhase: "interim", week: 10 });
  const r = MockFactory.createRikishi({
    id: "r-p",
    heyaId: "h-player",
    fatigue: 85,
    shikona: "Tiredzan",
  } as Partial<Rikishi>);
  world.rikishi = new Map([[r.id, r]]);
  world.heyas.set("h-player", MockFactory.createHeya("h-player", { rikishiIds: ["r-p"] }));
  world.playerHeyaId = "h-player";
  world.pendingRikishiRequests = reqs;
  return world;
}

const REST_REQ: RikishiRequest = {
  id: "req-p-1",
  rikishiId: "r-p",
  heyaId: "h-player",
  type: "request_rest",
  createdWeek: 10,
  reason: "fatigue",
};

describe("player request decisions", () => {
  it("pending request produces a non-blocking rikishi_request decision", () => {
    const world = playerWorld([REST_REQ]);
    const due = detectDueDecisions(world);
    const d = due.find((x) => x.type === "rikishi_request");
    expect(d).toBeDefined();
    expect(d!.required).toBe(false);
    expect(d!.options.map((o) => o.id)).toEqual(expect.arrayContaining(["grant", "deny"]));
    expect(d!.description).toContain("Tiredzan");
  });

  it("grant applies a real effect and clears the request", () => {
    const world = playerWorld([REST_REQ]);
    const due = detectDueDecisions(world);
    const d = due.find((x) => x.type === "rikishi_request")!;
    world.pendingDecisions = due;
    const next = resolveImpacts(world, [resolveLoopDecision(world, d.id, "grant")]);
    expect(next.rikishi.get("r-p")!.fatigue).toBeLessThan(85);
    expect(next.rikishi.get("r-p")!.agency?.grantedCount).toBe(1);
    expect((next.pendingRikishiRequests ?? []).some((q) => q.id === "req-p-1")).toBe(false);
    expect(next.pendingDecisions ?? []).toHaveLength(0);
  });

  it("deny records the denial and raises stress", () => {
    const world = playerWorld([REST_REQ]);
    world.rikishi.get("r-p")!.behavior = {
      discipline: 50,
      mediaSavvy: 50,
      stress: 40,
    };
    const due = detectDueDecisions(world);
    const d = due.find((x) => x.type === "rikishi_request")!;
    world.pendingDecisions = due;
    const next = resolveImpacts(world, [resolveLoopDecision(world, d.id, "deny")]);
    const r = next.rikishi.get("r-p")!;
    expect(r.agency?.deniedCount).toBe(1);
    expect(r.behavior.stress).toBeGreaterThan(40);
    expect((next.pendingRikishiRequests ?? []).some((q) => q.id === "req-p-1")).toBe(false);
  });

  it("expired request defaults to deny with its consequence applied", () => {
    const world = playerWorld([REST_REQ]);
    world.rikishi.get("r-p")!.behavior = {
      discipline: 50,
      mediaSavvy: 50,
      stress: 40,
    };
    const d = detectDueDecisions(world).find((x) => x.type === "rikishi_request")!;
    // Simulate the decision sitting past its deadline.
    world.pendingDecisions = [{ ...d, deadlineWeek: 5 }];
    const next = resolveImpacts(world, [applyExpiredQueueDefaults(world)]);
    const r = next.rikishi.get("r-p")!;
    expect(r.agency?.deniedCount).toBe(1);
    expect(next.pendingDecisions ?? []).toHaveLength(0);
    expect((next.pendingRikishiRequests ?? []).some((q) => q.id === "req-p-1")).toBe(false);
  });
});
