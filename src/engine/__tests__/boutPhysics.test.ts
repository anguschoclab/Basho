import { describe, it, expect } from "vitest";
import { resolveBoutPhysics, type BoutContext } from "../bout/boutPhysics";
import type { Rikishi } from "../types/rikishi";
import type { BashoState } from "../types/basho";

// Quick mock helper
function mockRikishi(overrides: Partial<Rikishi>): Rikishi {
  return {
    id: "rikishi_1",
    shikona: "Test Mountain",
    heyaId: "heya_1",
    birthYear: 2000,
    weight: 150,
    height: 185,
    style: "oshi",
    archetype: "oshi_specialist",
    bloodType: "A",
    origin: "Tokyo",
    stats: {
      power: 60,
      technique: 60,
      speed: 60,
      balance: 60,
      mental: 60,
      stamina: 60,
      aggression: 60,
      strength: 60,
      endurance: 60,
      resilience: 60,
      experience: 60,
      charisma: 60
    },
    ...overrides
  } as unknown as Rikishi;
}

describe("boutPhysics deterministic engine", () => {
  it("processes a match without generating narrative or PBP lines", () => {
    // East represents a strong forward pusher
    const east = mockRikishi({ 
        id: "east_1", 
        weight: 160, 
        style: "oshi",
        archetype: "oshi_specialist",
        stats: { power: 90, speed: 60, technique: 40, balance: 50, strength: 80 } as any 
    });
    // West represents a lighter technician
    const west = mockRikishi({ 
        id: "west_1", 
        weight: 130, 
        style: "yotsu",
        archetype: "yotsu_specialist",
        stats: { power: 40, speed: 70, technique: 90, balance: 70, strength: 50 } as any 
    });
    
    const basho: BashoState = {
        id: "sim", 
        year: 2026, 
        bashoName: "hatsu", 
        bashoNumber: 1, 
        day: 1, 
        matches: [], 
        standings: new Map(), 
        isActive: true 
    };
    
    const bout: BoutContext = {
        id: "bout_1", 
        day: 1, 
        rikishiEastId: east.id, 
        rikishiWestId: west.id
    };

    const result = resolveBoutPhysics(bout, east, west, basho);
    
    // Check that it's a raw physics output
    expect(result.boutId).toBe("bout_1");
    expect(result.winner).toBeDefined();
    expect(["east", "west"]).toContain(result.winner);
    expect(result.log.length).toBeGreaterThan(0);
    
    // Ensure NO narrative or pbp generated inside resolveBoutPhysics
    expect(result.pbpLines).toBeUndefined();
    expect(result.narrative).toBeUndefined();
    
    // Ensure all log entries are structural facts
    for (const log of result.log) {
       expect(log.phase).toBeDefined();
       expect(log.data).toBeDefined(); 
       // We explicitly do NOT expect 'description' strings generated down at the physics layer
       expect(log.description).toBeUndefined();
    }
  });
});
