import { describe, it, expect } from "vitest";
import { generateWorld } from "../worldgen";
import { rollArchetype, buildCombatProfile } from "../archetype";
import { SeededRNG } from "../rng";
import { Rikishi } from "../types/rikishi";

describe("v1.3.1 Archetype Inversion & Anomaly Verification", () => {
  it("should generate heavy Tricksters (Anomalies)", () => {
    const world = generateWorld("anomaly-test-seed");
    const rikishi = Array.from(world.rikishi.values());
    
    // Find tricksters with weight > 155kg
    const heavyTricksters = rikishi.filter(r => r.archetype === 'trickster' && r.weight > 155);
    
    console.log(`Found ${heavyTricksters.length} heavy tricksters out of ${rikishi.length} rikishi.`);
    
    // In a world with ~700-800 rikishi, we expect at least some heavy tricksters
    // with the new Gaussian + modifier approach.
    expect(heavyTricksters.length).toBeGreaterThan(0);
    
    const sample = heavyTricksters[0];
    expect(sample.combatProfile.familyPreferences.trick).toBeGreaterThan(40);
    expect(sample.weight).toBeGreaterThan(155);
  });

  it("should generate speedsters with lower weight but high speed", () => {
    const world = generateWorld("speedster-test-seed");
    const speedsters = Array.from(world.rikishi.values()).filter(r => r.archetype === 'speedster');
    
    expect(speedsters.length).toBeGreaterThan(0);
    const sample = speedsters[0];
    expect(sample.stats.speed).toBeGreaterThanOrEqual(45); // Lower bound for low-rank speedsters
    // Speedsters have a 0.85 weight modifier
    expect(sample.weight).toBeLessThan(180); 
  });

  it("should generate Giants with high mass and low speed", () => {
    const world = generateWorld("giant-test-seed");
    const giants = Array.from(world.rikishi.values()).filter(r => r.archetype === 'giant');
    
    expect(giants.length).toBeGreaterThan(0);
    const sample = giants[0];
    expect(sample.weight).toBeGreaterThan(160);
    expect(sample.stats.speed).toBeLessThan(60);
  });

  it("should ensure CombatProfile is correctly linked to Archetype", () => {
    const rng = new SeededRNG("profile-test");
    const archetype = 'trickster';
    const profile = buildCombatProfile(archetype);
    
    expect(profile.archetype).toBe('trickster');
    expect(profile.familyPreferences.trick).toBe(55);
    expect(profile.statModifiers.technique).toBe(1.2);
  });
});
