/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { toRikishiDescriptor } from "@/engine/descriptorBands";
import { SeededRNG } from "@/engine/rng";

describe("MockFactory.createRikishi stats correctness", () => {
  it("stats.power is defined and is a number", () => {
    const r = MockFactory.createRikishi("r1");
    expect(r.stats.power).toBeDefined();
    expect(typeof r.stats.power).toBe("number");
  });

  it("stats.aggression is defined and is a number", () => {
    const r = MockFactory.createRikishi("r1");
    expect(r.stats.aggression).toBeDefined();
    expect(typeof r.stats.aggression).toBe("number");
  });

  it("stats.experience is defined and is a number", () => {
    const r = MockFactory.createRikishi("r1");
    expect(r.stats.experience).toBeDefined();
    expect(typeof r.stats.experience).toBe("number");
  });

  it("stats.strength is undefined (should not exist on RikishiStats)", () => {
    const r = MockFactory.createRikishi("r1");
    expect((r.stats as any).strength).toBeUndefined();
  });

  it("does not have stale top-level power field", () => {
    const r = MockFactory.createRikishi("r1") as any;
    expect(r.power).toBeUndefined();
  });

  it("does not have stale top-level speed field", () => {
    const r = MockFactory.createRikishi("r1") as any;
    expect(r.speed).toBeUndefined();
  });

  it("does not have stale top-level technique field", () => {
    const r = MockFactory.createRikishi("r1") as any;
    expect(r.technique).toBeUndefined();
  });

  it("does not have stale top-level balance field", () => {
    const r = MockFactory.createRikishi("r1") as any;
    expect(r.balance).toBeUndefined();
  });

  it("does not have stale top-level stamina field", () => {
    const r = MockFactory.createRikishi("r1") as any;
    expect(r.stamina).toBeUndefined();
  });

  it("toRikishiDescriptor powerBand is not exceptional for stats.power=50", () => {
    const r = MockFactory.createRikishi("r1");
    const rng = new SeededRNG("test-descriptor");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    // stats.power=50 should map to "capable" or "strong", not "exceptional"
    // "exceptional" only happens when value >= STAT_BAND_OUTSTANDING_MAX (typically 90+)
    expect(desc.powerBand).not.toBe("exceptional");
  });

  it("toRikishiDescriptor powerBand maps correctly for high power stat", () => {
    const r = MockFactory.createRikishi("r1", { stats: { power: 95, technique: 50, speed: 50, weight: 140, stamina: 50, mental: 50, adaptability: 50, balance: 50, aggression: 50, experience: 10 } });
    const rng = new SeededRNG("test-descriptor");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    expect(desc.powerBand).toBe("exceptional");
  });
});
