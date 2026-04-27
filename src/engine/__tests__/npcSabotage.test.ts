import { describe, it, expect, beforeEach } from "vitest";
import { WorldState } from "../types/world";
import { Heya } from "../types/heya";
import { Oyakata } from "../types/oyakata";
import { DefaultGovernanceStrategy } from "../npcGovernanceStrategy";
import { createImpactBuilder } from "../core/ImpactBuilder";

describe("NPC Sabotage Logic", () => {
  let mockWorld: WorldState;
  let mockHeya: Heya;
  let mockOyakata: Oyakata;
  let rivalHeya: Heya;

  beforeEach(() => {
    mockWorld = {
      heyas: new Map(),
      oyakata: new Map(),
      rikishi: new Map(),
      playerHeyaId: "player_1",
      dayIndexGlobal: 0,
    } as any;

    mockHeya = {
      id: "heya_1",
      name: "Saboteur Stable",
      politicalCapital: 50,
      scandalScore: 0,
    } as any;

    mockOyakata = {
      id: "oyakata_1",
      name: "Evil Master",
      archetype: "tyrant",
      traits: { ambition: 90, risk: 50, tradition: 50 },
      temperament: "Vindictive",
    } as any;

    rivalHeya = {
      id: "heya_rival",
      name: "Victim Stable",
      politicalCapital: 10,
      scandalScore: 20, // Targetable scandal
    } as any;

    mockWorld.heyas.set(mockHeya.id, mockHeya);
    mockWorld.heyas.set(rivalHeya.id, rivalHeya);
  });

  it("should trigger sabotage if oyakata is vindictive and rival has high scandal", () => {
    const impact = DefaultGovernanceStrategy.evaluateGovernanceDecisions(mockWorld, mockHeya, mockOyakata);
    
    // Check if a NARRATIVE_CRISIS_TRIGGERED event exists for the rival
    const sabotageEvent = (impact.events || []).find(e => 
      e.type === "NARRATIVE_CRISIS_TRIGGERED" && e.data.heyaId === rivalHeya.id
    );

    expect(sabotageEvent).toBeDefined();
    expect(sabotageEvent?.data.title).toContain("Leaked");
  });

  it("should NOT trigger sabotage if political capital is too low", () => {
    mockHeya.politicalCapital = 10;
    const impact = DefaultGovernanceStrategy.evaluateGovernanceDecisions(mockWorld, mockHeya, mockOyakata);
    
    const sabotageEvent = (impact.events || []).find(e => e.type === "NARRATIVE_CRISIS_TRIGGERED");
    expect(sabotageEvent).toBeUndefined();
  });
});
