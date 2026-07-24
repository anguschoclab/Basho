import { describe, it, expect } from "vitest";
import {
  perceivedTalentSeed,
  scoutingNoiseSpread,
} from "@/engine/systems/recruitment/perceivedTalent";
import { makeMockWorld, makeMockHeya } from "../utils";
import {
  PERCEPTION_NOISE_BASE,
  PERCEPTION_NOISE_FLOOR,
} from "@/constants/engine/scoutingPerception";
import type { TalentCandidate } from "@/engine/types/talent";

const candidate = (id: string, talentSeed: number) =>
  ({ candidateId: id, talentSeed }) as unknown as TalentCandidate;

function worldWith(heyaIds: string[]) {
  const heyas = new Map(heyaIds.map((id) => [id, makeMockHeya(id, { rikishiIds: [] })]));
  return makeMockWorld({ heyas, rikishi: new Map() });
}

describe("perceivedTalentSeed", () => {
  it("is deterministic: same stable + candidate always yields the same estimate", () => {
    const world = worldWith(["h1"]);
    const c = candidate("c1", 80);
    expect(perceivedTalentSeed(world, "h1", c)).toBe(perceivedTalentSeed(world, "h1", c));
  });

  it("different stables get different estimates of the same candidate", () => {
    const world = worldWith(["h1", "h2", "h3", "h4", "h5", "h6"]);
    const c = candidate("c1", 80);
    const estimates = ["h1", "h2", "h3", "h4", "h5", "h6"].map((h) =>
      perceivedTalentSeed(world, h, c)
    );
    expect(new Set(estimates).size).toBeGreaterThan(1);
  });

  it("estimates stay within the noise spread of true talent and inside [0, 100]", () => {
    const world = worldWith(["h1"]);
    for (let t = 10; t <= 95; t += 5) {
      const est = perceivedTalentSeed(world, "h1", candidate(`c${t}`, t));
      expect(Math.abs(est - t)).toBeLessThanOrEqual(PERCEPTION_NOISE_BASE);
      expect(est).toBeGreaterThanOrEqual(0);
      expect(est).toBeLessThanOrEqual(100);
    }
  });

  it("scouting quality tightens the spread but never reaches zero", () => {
    expect(scoutingNoiseSpread(0, false)).toBe(PERCEPTION_NOISE_BASE);
    expect(scoutingNoiseSpread(3, true)).toBeLessThan(scoutingNoiseSpread(0, false));
    expect(scoutingNoiseSpread(99, true)).toBeGreaterThanOrEqual(PERCEPTION_NOISE_FLOOR);
  });

  it("scouting office reduces spread beyond scouts alone", () => {
    expect(scoutingNoiseSpread(2, true)).toBeLessThan(scoutingNoiseSpread(2, false));
  });

  it("extreme talent values (0, 100) produce estimates within [0, 100]", () => {
    const world = worldWith(["h1"]);
    const est0 = perceivedTalentSeed(world, "h1", candidate("c0", 0));
    const est100 = perceivedTalentSeed(world, "h1", candidate("c100", 100));
    expect(est0).toBeGreaterThanOrEqual(0);
    expect(est0).toBeLessThanOrEqual(100);
    expect(est100).toBeGreaterThanOrEqual(0);
    expect(est100).toBeLessThanOrEqual(100);
  });

  it("scoutingNoiseSpread floor is enforced even with many scouts + office", () => {
    expect(scoutingNoiseSpread(50, true)).toBeGreaterThanOrEqual(PERCEPTION_NOISE_FLOOR);
  });
});
