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
    const events = [{ type: "NPC_MANAGER_DECISION", week: 1, data: { heyaId: "h1" } }];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "Real Name" }]));
    expect(result.decisions[0].heyaName).toBe("Real Name");
  });

  it("falls back to Unknown when heya not found", () => {
    const events = [{ type: "NPC_MANAGER_DECISION", week: 1, data: { heyaId: "missing" } }];
    const result = projectNPCAgentActivity(makeWorld(events, []));
    expect(result.decisions[0].heyaName).toBe("Unknown");
  });
});

describe("WS6 — extended AI surfacing", () => {
  it("surfaces CRISIS_RESPONSE events as crisis-category rows", () => {
    const events = [
      {
        type: "CRISIS_RESPONSE",
        week: 7,
        category: "narrative",
        data: { heyaId: "h1", crisisId: "c1", choiceId: "comply" },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("crisis");
    expect(result.decisions[0].decision).toContain("comply");
  });

  it("surfaces ai_plan_change events with planId", () => {
    const events = [
      {
        type: "STRATEGY_SHIFT",
        week: 9,
        category: "ai_plan_change",
        data: { heyaId: "h1", planId: "yokozuna_push", previousPlanId: "status_quo" },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("plan_shift");
    expect(result.decisions[0].planId).toBe("yokozuna_push");
  });

  it("surfaces RIVAL_POSTURE events as rivalry rows", () => {
    const events = [
      {
        type: "RIVAL_POSTURE",
        week: 4,
        category: "ai_rival_posture",
        data: { heyaId: "h1", posture: "aggressive", rivalHeyaId: "h2" },
      },
    ];
    const result = projectNPCAgentActivity(
      makeWorld(events, [
        { id: "h1", name: "H1" },
        { id: "h2", name: "H2" },
      ])
    );
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("rivalry");
    expect(result.decisions[0].decision).toContain("aggressive");
  });

  it("surfaces MEDIA_RESPONSE events as media rows", () => {
    const events = [
      {
        type: "MEDIA_RESPONSE",
        week: 3,
        category: "media",
        data: { heyaId: "h1", response: "deflect" },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("media");
  });
});

describe("WS7 — WS1–WS6 behavior surfacing", () => {
  it("surfaces meta-adaptation commits as meta rows", () => {
    const events = [
      {
        type: "NPC_MANAGER_DECISION",
        week: 6,
        data: {
          heyaId: "h1",
          domain: "meta_adaptation",
          category: "meta",
          decision: "Counter-meta posture vs belt",
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("meta");
    expect(result.decisions[0].decision).toContain("Counter-meta");
  });

  it("surfaces forced-succession rulings as succession rows", () => {
    const events = [
      {
        type: "GOVERNANCE_RULING",
        week: 8,
        data: {
          heyaId: "h1",
          incident: "forced_succession",
          reason: "Oya is forced to step down: chronic underperformance.",
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("succession");
  });

  it("surfaces succession-readiness warnings as succession rows", () => {
    const events = [
      {
        type: "GOVERNANCE_RULING",
        week: 8,
        data: {
          heyaId: "h1",
          incident: "succession_readiness_update",
          status: "warning",
          reason: "Oya is 62 years old. Mandatory retirement at 65 (JSA).",
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("succession");
  });

  it("surfaces oyakata promotions as succession rows", () => {
    const events = [
      {
        type: "LIFECYCLE_EVENT",
        week: 2,
        data: {
          heyaId: "h1",
          status: "oyakata_promotion",
          reason: "Oya has reached the JSA retirement age of 65.",
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("succession");
  });

  it("surfaces faction posture elections as faction rows", () => {
    const events = [
      {
        type: "GOVERNANCE_RULING",
        week: 4,
        category: "faction",
        data: {
          heyaId: "h1",
          incident: "faction_posture",
          faction: "Dewanoumi",
          posture: "coordinated_pressure",
          targetHeyaId: "h2",
          reason: "The Dewanoumi ichimon shifts to a coordinated_pressure posture.",
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("faction");
    expect(result.decisions[0].decision).toContain("Dewanoumi");
  });

  it("surfaces faction appeals as rescue rows", () => {
    const events = [
      {
        type: "GOVERNANCE_RULING",
        week: 5,
        data: {
          heyaId: "h1",
          incident: "faction_appeal",
          reason: "Stable appeals to its ichimon for emergency support.",
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("rescue");
  });

  it("surfaces foreign signings distinctly from native recruitment", () => {
    const events = [
      {
        type: "NPC_MANAGER_DECISION",
        week: 3,
        data: {
          heyaId: "h1",
          strategy: "recruitment_bidding",
          candidateName: "Batbayar",
          isForeign: true,
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("foreign_signing");
    expect(result.decisions[0].decision).toContain("Batbayar");
  });

  it("surfaces dual-citizen signings as foreign rows noting the exemption", () => {
    const events = [
      {
        type: "NPC_MANAGER_DECISION",
        week: 3,
        data: {
          heyaId: "h1",
          strategy: "recruitment_bidding",
          candidateName: "Temuulen",
          isForeign: true,
          dualCitizen: true,
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("foreign_signing");
    expect(result.decisions[0].decision.toLowerCase()).toContain("dual");
  });

  it("keeps native recruitment bids in the recruitment category", () => {
    const events = [
      {
        type: "NPC_MANAGER_DECISION",
        week: 3,
        data: {
          heyaId: "h1",
          strategy: "recruitment_bidding",
          candidateName: "Yamada",
          isForeign: false,
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions[0].category).toBe("recruitment");
  });

  it("surfaces vendetta-driven escalations distinctly from ordinary postures", () => {
    const events = [
      {
        type: "RIVAL_POSTURE",
        week: 4,
        data: { heyaId: "h1", posture: "aggressive", rivalHeyaId: "h2", vendetta: true },
      },
    ];
    const result = projectNPCAgentActivity(
      makeWorld(events, [
        { id: "h1", name: "H1" },
        { id: "h2", name: "H2" },
      ])
    );
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("vendetta");
  });

  it("surfaces rikishi request outcomes as agency rows", () => {
    const events = [
      {
        type: "LIFECYCLE_EVENT",
        week: 6,
        data: {
          heyaId: "h1",
          rikishiId: "r1",
          status: "request_denied",
          requestType: "seek_transfer",
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("rikishi_agency");
    expect(result.decisions[0].decision).toContain("seek_transfer");
  });

  it("surfaces stable unrest from ignored requests as agency rows", () => {
    const events = [
      {
        type: "WELFARE_COMPLIANCE",
        week: 7,
        data: {
          heyaId: "h1",
          rikishiId: "r1",
          status: "stable_unrest",
          reason: "ignored_requests",
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("rikishi_agency");
  });

  it("surfaces NPC emergency financing as rescue rows", () => {
    const events = [
      {
        type: "FINANCIAL_ALERT",
        week: 9,
        data: {
          heyaId: "h1",
          incident: "loan_issued",
          status: "emergency",
          money: 4000000,
        },
      },
      {
        type: "FINANCIAL_ALERT",
        week: 9,
        data: {
          heyaId: "h1",
          incident: "emergency_sponsor_drive",
          money: 500000,
        },
      },
    ];
    const world = makeWorld(events, [{ id: "h1", name: "H1" }]);
    world.playerHeyaId = "player-heya";
    const result = projectNPCAgentActivity(world);
    expect(result.decisions).toHaveLength(2);
    expect(result.decisions.every((d) => d.category === "rescue")).toBe(true);
  });

  it("surfaces WORLD_META_EVOLUTION headlines as league-level meta rows", () => {
    const events = [
      {
        type: "WORLD_META_EVOLUTION",
        week: 12,
        importance: "headline",
        data: {
          status: "technical",
          incident: "The 'Technical Renaissance'. Complex throws are back in fashion.",
        },
      },
    ];
    const result = projectNPCAgentActivity(makeWorld(events, [{ id: "h1", name: "H1" }]));
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].category).toBe("meta");
    expect(result.decisions[0].decision).toContain("Technical Renaissance");
    // League-level event — honest attribution, not a fake stable name.
    expect(result.decisions[0].heyaName).toBe("Kyokai");
  });

  it("does not surface the player stable's own alerts in the rival feed", () => {
    const events = [
      {
        type: "FINANCIAL_ALERT",
        week: 9,
        data: { heyaId: "player-heya", incident: "loan_issued", money: 1000000 },
      },
      {
        type: "FINANCIAL_ALERT",
        week: 9,
        data: { heyaId: "h1", incident: "loan_issued", money: 500000 },
      },
    ];
    const world = makeWorld(events, [
      { id: "player-heya", name: "Player Stable" },
      { id: "h1", name: "H1" },
    ]);
    world.playerHeyaId = "player-heya";
    const result = projectNPCAgentActivity(world);
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].heyaId).toBe("h1");
  });
});
