import { describe, it, expect } from "vitest";
import { projectNPCAgentActivity } from "@/presenters/npcAgentProjections";
import type { WorldState } from "@/engine/types/world";

function makeWorld(events: any[] = [], heyas: any[] = []): WorldState {
  return {
    seed: "test",
    year: 2024,
    week: 10,
    heyas: new Map(heyas.map((h) => [h.id, h])),
    rikishi: new Map(),
    events: { version: "1.0.0", log: events, dedupe: {} },
  } as any;
}

describe("projectNPCAgentActivity", () => {
  it("returns empty when no NPC events", () => {
    const result = projectNPCAgentActivity(makeWorld());
    expect(result.decisions).toEqual([]);
    expect(result.hasRecentActivity).toBe(false);
  });

  it("extracts NPC_MANAGER_DECISION events", () => {
    const events = [
      {
        type: "NPC_MANAGER_DECISION",
        week: 5,
        data: {
          heyaId: "h1",
          heyaName: "Test Heya",
          category: "recruitment",
          decision: "Scout Mongolian prospect",
          reasoning: "High potential talent available",
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "Test Heya" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].heyaName).toBe("Test Heya");
    expect(result.decisions[0].category).toBe("recruitment");
    expect(result.decisions[0].decision).toBe("Scout Mongolian prospect");
  });

  it("filters out non-NPC events", () => {
    const events = [
      { type: "OTHER_EVENT", data: { heyaId: "h1" } },
      { type: "NPC_MANAGER_DECISION", week: 5, data: { heyaId: "h1", category: "training" } },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
  });

  it("limits to MAX_DECISIONS (20)", () => {
    const events = Array.from({ length: 30 }, (_, i) => ({
      type: "NPC_MANAGER_DECISION",
      week: i,
      data: { heyaId: "h1", category: "test", decision: `decision-${i}` },
    }));
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions.length).toBeLessThanOrEqual(20);
  });

  it("computes decisionsByHeya counts", () => {
    const events = [
      { type: "NPC_MANAGER_DECISION", week: 1, data: { heyaId: "h1", category: "a" } },
      { type: "NPC_MANAGER_DECISION", week: 2, data: { heyaId: "h1", category: "b" } },
      { type: "NPC_MANAGER_DECISION", week: 3, data: { heyaId: "h2", category: "c" } },
    ];
    const result = projectNPCAgentActivity(
      makeWorld(events, [
        { id: "h1", name: "H1" },
        { id: "h2", name: "H2" },
      ])
    );
    expect(result.decisionsByHeya["h1"]).toBe(2);
    expect(result.decisionsByHeya["h2"]).toBe(1);
  });

  it("uses heya name from world.heyas when available", () => {
    const events = [
      { type: "NPC_MANAGER_DECISION", week: 1, data: { heyaId: "h1" } },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "Real Name" }]));
    expect(result.decisions[0].heyaName).toBe("Real Name");
  });

  it("falls back to Unknown when heya not found", () => {
    const events = [
      { type: "NPC_MANAGER_DECISION", week: 1, data: { heyaId: "missing" } },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, []));
    expect(result.decisions[0].heyaName).toBe("Unknown");
  });
});
