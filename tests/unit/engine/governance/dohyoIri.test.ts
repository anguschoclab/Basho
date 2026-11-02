import { describe, it, expect } from "vitest";
import { assignDohyoIriStyle } from "@/engine/governance/ceremonies/dohyoIri";
import type { Rikishi } from "@/engine/types/rikishi";

function makeRikishi(id: string, rank: string = "ozeki"): Rikishi {
  return {
    id,
    shikona: `Rikishi ${id}`,
    rank,
    division: "makuuchi",
    heyaId: "test-heya",
    stats: {
      aggression: 50,
      mental: 50,
      power: 50,
      speed: 50,
      technique: 50,
      balance: 50,
      stamina: 50,
    },
  } as unknown as Rikishi;
}

describe("Dohyo-iri ceremony style assignment", () => {
  it("newly promoted yokozuna gets dohyoIriStyle assigned", () => {
    const rikishi = makeRikishi("r1", "ozeki");
    const result = assignDohyoIriStyle(rikishi, "yokozuna", "test-seed-123");
    expect(result.dohyoIriStyle).toBeDefined();
    expect(result.dohyoIriStyle).toBeOneOf(["unryu", "shiranui"]);
  });

  it("style is deterministic for the same rikishi and seed", () => {
    const rikishi = makeRikishi("r1", "ozeki");
    const a = assignDohyoIriStyle(rikishi, "yokozuna", "deterministic-seed");
    const b = assignDohyoIriStyle(makeRikishi("r1", "ozeki"), "yokozuna", "deterministic-seed");
    expect(a.dohyoIriStyle).toBe(b.dohyoIriStyle);
  });

  it("different yokozuna can receive different styles under one seed", () => {
    // V16-B13: seed previously lacked the rikishi id, forcing every yokozuna
    // in a world to share a style. Styles should vary across rikishi ids.
    const styles = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const result = assignDohyoIriStyle(makeRikishi(`r${i}`, "ozeki"), "yokozuna", "one-world-seed");
      styles.add(result.dohyoIriStyle!);
    }
    expect(styles.size).toBe(2);
  });

  it("different seeds can produce different styles", () => {
    const styles = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const rikishi = makeRikishi(`r${i}`, "ozeki");
      const result = assignDohyoIriStyle(rikishi, "yokozuna", `seed-${i}`);
      styles.add(result.dohyoIriStyle!);
    }
    // With 20 different seeds, we should see both styles
    expect(styles.size).toBe(2);
  });

  it("non-yokozuna promotion does not assign style", () => {
    const rikishi = makeRikishi("r1", "maegashira");
    const result = assignDohyoIriStyle(rikishi, "ozeki", "test-seed");
    expect(result.dohyoIriStyle).toBeUndefined();
  });

  it("already assigned style is not overwritten", () => {
    const rikishi = makeRikishi("r1", "yokozuna");
    rikishi.dohyoIriStyle = "unryu";
    const result = assignDohyoIriStyle(rikishi, "yokozuna", "different-seed");
    expect(result.dohyoIriStyle).toBe("unryu");
  });
});
