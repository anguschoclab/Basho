import { describe, it, expect } from "vitest";
import { toRikishiDescriptor } from "@/engine/descriptorBands";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { SeededRNG } from "@/engine/rng";
import type { Rikishi } from "@/engine/types/rikishi";

describe("toRikishiDescriptor", () => {
  function makeRikishi(overrides: Partial<Rikishi> = {}): Rikishi {
    return MockFactory.createRikishi("r1", {
      height: 180,
      weight: 140,
      ...overrides,
    });
  }

  it("returns RikishiDescriptor with all required bands populated", () => {
    const r = makeRikishi();
    const rng = new SeededRNG("test-desc");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    expect(desc.powerBand).toBeDefined();
    expect(desc.speedBand).toBeDefined();
    expect(desc.balanceBand).toBeDefined();
    expect(desc.techniqueBand).toBeDefined();
    expect(desc.conditionBand).toBeDefined();
    expect(desc.fatigueBand).toBeDefined();
    expect(desc.momentumBand).toBeDefined();
  });

  it("heightBand is populated when r.height is set", () => {
    const r = makeRikishi({ height: 185 });
    const rng = new SeededRNG("test-desc");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    expect(desc.heightBand).toBeDefined();
  });

  it("powerBand correctly maps stats.power value (not exceptional for 50)", () => {
    const r = makeRikishi();
    const rng = new SeededRNG("test-desc");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    expect(desc.powerBand).not.toBe("exceptional");
  });

  it("injuryModifiers is empty array when rikishi is not injured", () => {
    const r = makeRikishi({ injured: false });
    const rng = new SeededRNG("test-desc");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    expect(desc.injuryModifiers).toEqual([]);
  });

  it("injuryModifiers contains sidelined when severity is serious", () => {
    const r = makeRikishi({
      injured: true,
      injuryStatus: {
        type: "fracture" as any,
        severity: "serious",
        location: "ankle",
        weeksRemaining: 4,
      },
    });
    const rng = new SeededRNG("test-desc");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    expect(desc.injuryModifiers).toContain("sidelined");
  });

  it("injuryModifiers contains hampered when severity is moderate", () => {
    const r = makeRikishi({
      injured: true,
      injuryStatus: {
        type: "strain" as any,
        severity: "moderate",
        location: "back",
        weeksRemaining: 2,
      },
    });
    const rng = new SeededRNG("test-desc");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    expect(desc.injuryModifiers).toContain("hampered");
  });

  it("injuryModifiers contains taped_up when severity is minor", () => {
    const r = makeRikishi({
      injured: true,
      injuryStatus: {
        type: "bruise" as any,
        severity: "minor",
        location: "knee",
        weeksRemaining: 1,
      },
    });
    const rng = new SeededRNG("test-desc");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    expect(desc.injuryModifiers).toContain("taped_up");
  });

  it("powerBand maps to exceptional for high power stat (95)", () => {
    const r = makeRikishi({
      stats: {
        power: 95,
        technique: 50,
        speed: 50,
        weight: 140,
        stamina: 50,
        mental: 50,
        adaptability: 50,
        balance: 50,
        aggression: 50,
        experience: 10,
      },
    });
    const rng = new SeededRNG("test-desc");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    expect(desc.powerBand).toBe("exceptional");
  });

  it("preserves previous band via hysteresis when value is near boundary", () => {
    const r = makeRikishi({ stats: { power: 50, technique: 50, speed: 50, weight: 140, stamina: 50, mental: 50, adaptability: 50, balance: 50, aggression: 50, experience: 10 } });
    const rng = new SeededRNG("test-desc");
    const firstDesc = toRikishiDescriptor(rng, r, undefined);
    // Second call with slightly different value but same prev band should preserve band
    const r2 = makeRikishi({ stats: { power: 52, technique: 50, speed: 50, weight: 140, stamina: 50, mental: 50, adaptability: 50, balance: 50, aggression: 50, experience: 10 } });
    const secondDesc = toRikishiDescriptor(rng, r2, firstDesc);
    // With hysteresis, small changes should not cause band thrashing
    expect(secondDesc.powerBand).toBe(firstDesc.powerBand);
  });
});
