/**
 * WS4 — Rikishi agency: NPC oyakata resolution.
 *
 * Pending requests to NPC heyas are resolved inside the weekly NPC phase by
 * archetype — a nurturer grants rest, a tyrant drives through. Resolution is
 * deterministic and produces real effects (fatigue relief, disposition
 * bookkeeping), never a cosmetic log.
 */

import { describe, it, expect } from "vitest";
import { resolveNPCRequest } from "@/engine/rikishiAgency/requests";
import { phase01_week_npc_ai } from "@/engine/tick/phases";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RikishiRequest } from "@/engine/rikishiAgency/types";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

function npcWorld(opts: {
  archetype: Oyakata["archetype"];
  traits?: Partial<typeof TRAITS>;
  requests?: RikishiRequest[];
  rikishi?: Partial<Rikishi>;
}): WorldState {
  const world = MockFactory.createWorld({ cyclePhase: "interim", week: 10 });
  const r = MockFactory.createRikishi({
    id: "r1",
    heyaId: "h-npc",
    fatigue: 85,
    ...opts.rikishi,
  } as Partial<Rikishi>);
  world.rikishi = new Map([[r.id, r]]);
  const oya: Oyakata = {
    id: "o-npc",
    heyaId: "h-npc",
    archetype: opts.archetype,
    traits: { ...TRAITS, ...opts.traits },
    yearsInCharge: 5,
    shikona: "Oya",
    name: "Oya",
  } as unknown as Oyakata;
  world.oyakata.set("o-npc", oya);
  world.heyas.set(
    "h-npc",
    MockFactory.createHeya("h-npc", { oyakataId: "o-npc", rikishiIds: ["r1"] })
  );
  world.playerHeyaId = "h-player";
  world.heyas.set("h-player", MockFactory.createHeya("h-player", {}));
  world.pendingRikishiRequests = opts.requests ?? [];
  return world;
}

const REST_REQ: RikishiRequest = {
  id: "req-rest-1",
  rikishiId: "r1",
  heyaId: "h-npc",
  type: "request_rest",
  createdWeek: 10,
  reason: "fatigue",
};

describe("resolveNPCRequest", () => {
  it("compassionate manager grants rest; hard driver denies", () => {
    const world = npcWorld({ archetype: "nurturer" });
    const oya = world.oyakata.get("o-npc")!;
    const heya = world.heyas.get("h-npc")!;
    expect(resolveNPCRequest(world, heya, oya, REST_REQ)).toBe("grant");

    const hard = npcWorld({ archetype: "tyrant", traits: { compassion: 5 } });
    expect(
      resolveNPCRequest(hard, hard.heyas.get("h-npc")!, hard.oyakata.get("o-npc")!, REST_REQ)
    ).toBe("deny");
  });

  it("is deterministic per archetype", () => {
    const w = npcWorld({ archetype: "strategist" });
    const a = resolveNPCRequest(w, w.heyas.get("h-npc")!, w.oyakata.get("o-npc")!, REST_REQ);
    const b = resolveNPCRequest(w, w.heyas.get("h-npc")!, w.oyakata.get("o-npc")!, REST_REQ);
    expect(a).toBe(b);
  });
});

describe("phase01_week_npc_ai — request resolution", () => {
  it("granted rest request lowers fatigue and clears the queue", () => {
    const world = npcWorld({ archetype: "nurturer", requests: [REST_REQ] });
    const next = resolveImpacts(world, [phase01_week_npc_ai(world)]);
    const r = next.rikishi.get("r1")!;
    expect(r.fatigue).toBeLessThan(85);
    expect((next.pendingRikishiRequests ?? []).some((q) => q.id === "req-rest-1")).toBe(false);
    expect(r.agency?.grantedCount ?? 0).toBeGreaterThan(0);
  });

  it("denied request increments deniedCount and raises stress", () => {
    const world = npcWorld({
      archetype: "tyrant",
      traits: { compassion: 5 },
      requests: [REST_REQ],
      rikishi: { behavior: { discipline: 50, mediaSavvy: 50, stress: 40 } },
    });
    const next = resolveImpacts(world, [phase01_week_npc_ai(world)]);
    const r = next.rikishi.get("r1")!;
    expect(r.agency?.deniedCount).toBe(1);
    expect(r.behavior.stress).toBeGreaterThan(40);
    expect((next.pendingRikishiRequests ?? []).some((q) => q.id === "req-rest-1")).toBe(false);
  });
});
