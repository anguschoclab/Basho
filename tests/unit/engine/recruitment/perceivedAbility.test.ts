import { describe, it, expect } from "vitest";
import {
  perceivedCA,
  perceivedPA,
  paStarBand,
  OWN_ROSTER_CA_SPREAD,
  PA_NOISE_MULT,
} from "@/engine/recruitment/perceivedAbility";
import { currentAbility, potentialAbility } from "@/engine/development/caPa";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import type { RikishiStats } from "@/engine/types/rikishi";

const stats = (v: number): RikishiStats =>
  ({
    power: v,
    technique: v,
    speed: v,
    weight: 150,
    stamina: v,
    mental: v,
    adaptability: v,
    balance: v,
    aggression: v,
    experience: v,
  }) as RikishiStats;

const rikishi = (id: string, heyaId: string, stat = 60, pa = 90) =>
  mockRikishi(id, {
    heyaId,
    stats: stats(stat),
    potential: {
      stats: stats(pa),
      heightCm: 185,
      weightKg: 150,
      developmentSpeed: 1,
      peakAgeOffset: 0,
      ceilingFraction: 1,
      profile: "standard",
    },
  });

function worldWith(heyas: string[], rikishiList: ReturnType<typeof rikishi>[]) {
  const heyaMap = new Map(heyas.map((id) => [id, makeMockHeya(id, { rikishiIds: [] })]));
  return makeMockWorld({ heyas: heyaMap, rikishi: new Map(rikishiList.map((r) => [r.id, r])) });
}

describe("perceivedCA / perceivedPA", () => {
  it("is deterministic per (heya, rikishi)", () => {
    const r = rikishi("r1", "h1");
    const world = worldWith(["h1", "h2"], [r]);
    expect(perceivedCA(world, "h2", r)).toBe(perceivedCA(world, "h2", r));
    expect(perceivedPA(world, "h2", r)).toBe(perceivedPA(world, "h2", r));
  });

  it("different stables perceive the same rikishi differently", () => {
    const r = rikishi("r1", "h1");
    const ids = ["h1", "h2", "h3", "h4", "h5", "h6"];
    const world = worldWith(ids, [r]);
    const cas = new Set(ids.map((h) => perceivedCA(world, h, r)));
    const pas = new Set(ids.map((h) => perceivedPA(world, h, r)));
    expect(cas.size).toBeGreaterThan(1);
    expect(pas.size).toBeGreaterThan(1);
  });

  it("stays inside [0, 200] at the edges", () => {
    const low = rikishi("rLow", "h1", 0, 0);
    const high = rikishi("rHigh", "h1", 100, 100);
    const world = worldWith(["h1", "h2"], [low, high]);
    for (const r of [low, high]) {
      for (const h of ["h1", "h2"]) {
        expect(perceivedCA(world, h, r)).toBeGreaterThanOrEqual(0);
        expect(perceivedCA(world, h, r)).toBeLessThanOrEqual(200);
        expect(perceivedPA(world, h, r)).toBeGreaterThanOrEqual(0);
        expect(perceivedPA(world, h, r)).toBeLessThanOrEqual(200);
      }
    }
  });

  it("PA is strictly noisier than CA — potential is harder to judge than performance", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `h${i}`);
    const rs = Array.from({ length: 20 }, (_, i) => rikishi(`r${i}`, "h0"));
    const world = worldWith(ids, rs);
    let caDev = 0;
    let paDev = 0;
    for (const h of ids) {
      for (const r of rs) {
        caDev += Math.abs(perceivedCA(world, h, r) - currentAbility(r));
        paDev += Math.abs(perceivedPA(world, h, r) - potentialAbility(r));
      }
    }
    expect(paDev).toBeGreaterThan(caDev);
    expect(PA_NOISE_MULT).toBeGreaterThan(1);
  });

  it("a stable perceives its OWN roster tightly — daily training beats scouting reports", () => {
    const r = rikishi("r1", "h1");
    const world = worldWith(["h1", "h2", "h3"], [r]);
    const own = perceivedCA(world, "h1", r);
    expect(Math.abs(own - currentAbility(r))).toBeLessThanOrEqual(OWN_ROSTER_CA_SPREAD + 1);
    const ownPa = perceivedPA(world, "h1", r);
    expect(Math.abs(ownPa - potentialAbility(r))).toBeLessThanOrEqual(
      OWN_ROSTER_CA_SPREAD * PA_NOISE_MULT + 1
    );
  });
});

describe("paStarBand", () => {
  it("brackets the perceived PA star rating: lo <= hi, deterministic", () => {
    const r = rikishi("r1", "h1");
    const world = worldWith(["h1", "h2"], [r]);
    const band = paStarBand(world, "h2", r);
    expect(band.lo).toBeLessThanOrEqual(band.hi);
    expect(band.lo).toBeGreaterThanOrEqual(0);
    expect(band.hi).toBeLessThanOrEqual(5);
    expect(band).toEqual(paStarBand(world, "h2", r));
  });

  it("own roster yields a tighter band than an unscouted rival", () => {
    const r = rikishi("r1", "h1");
    const world = worldWith(["h1", "h2"], [r]);
    const own = paStarBand(world, "h1", r);
    const rival = paStarBand(world, "h2", r);
    expect(own.hi - own.lo).toBeLessThanOrEqual(rival.hi - rival.lo);
  });
});
