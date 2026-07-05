import { describe, it, expect } from "vitest";
import {
  computeHeyaPrestigeScore,
  targetKoenkaiBandFromPrestige,
  recalculateKoenkaiBand,
  adjustKoenkaiBandToPrestige,
} from "@/engine/systems/economy/SponsorshipService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockHeya, makeMockWorld, mockRikishi } from "../../utils";
import type { Koenkai, Sponsor, SponsorPool } from "@/engine/types/sponsors";
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("computeHeyaPrestigeScore", () => {
  it("yokozuna contributes 40 points", () => {
    const r = mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(40);
  });

  it("ozeki contributes 30 points", () => {
    const r = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(30);
  });

  it("sekiwake contributes 20 points", () => {
    const r = mockRikishi("r1", { rank: "sekiwake", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(20);
  });

  it("komusubi contributes 15 points", () => {
    const r = mockRikishi("r1", { rank: "komusubi", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(15);
  });

  it("maegashira contributes 8 points", () => {
    const r = mockRikishi("r1", { rank: "maegashira", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(8);
  });

  it("juryo contributes 4 points", () => {
    const r = mockRikishi("r1", { rank: "juryo", division: "juryo" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(4);
  });

  it("capped at 100", () => {
    const rikishi: any[] = [];
    const rikishiMap = new Map();
    for (let i = 0; i < 4; i++) {
      const r = mockRikishi(`r${i}`, { rank: "yokozuna", division: "makuuchi" });
      rikishi.push(r);
      rikishiMap.set(`r${i}`, r);
    }
    const heya = makeMockHeya("h1", {
      rikishiIds: rikishi.map((r) => r.id),
    });
    const world = makeMockWorld({
      rikishi: rikishiMap,
      heyas: new Map([["h1", heya]]),
    });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(100);
  });

  it("empty roster → 0", () => {
    const heya = makeMockHeya("h1", { rikishiIds: [] });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    expect(computeHeyaPrestigeScore(heya, world)).toBe(0);
  });
});

describe("targetKoenkaiBandFromPrestige", () => {
  it("prestige ≥80 → powerful", () => {
    expect(targetKoenkaiBandFromPrestige(80)).toBe("powerful");
    expect(targetKoenkaiBandFromPrestige(100)).toBe("powerful");
  });

  it("prestige ≥55 → strong", () => {
    expect(targetKoenkaiBandFromPrestige(55)).toBe("strong");
    expect(targetKoenkaiBandFromPrestige(79)).toBe("strong");
  });

  it("prestige ≥30 → moderate", () => {
    expect(targetKoenkaiBandFromPrestige(30)).toBe("moderate");
    expect(targetKoenkaiBandFromPrestige(54)).toBe("moderate");
  });

  it("prestige ≥10 → weak", () => {
    expect(targetKoenkaiBandFromPrestige(10)).toBe("weak");
    expect(targetKoenkaiBandFromPrestige(29)).toBe("weak");
  });

  it("prestige <10 → none", () => {
    expect(targetKoenkaiBandFromPrestige(0)).toBe("none");
    expect(targetKoenkaiBandFromPrestige(9)).toBe("none");
  });
});

describe("recalculateKoenkaiBand — prestige-based", () => {
  it("heya with 2 yokozuna → prestige 80 → powerful", () => {
    const r1 = mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" });
    const r2 = mockRikishi("r2", { rank: "yokozuna", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1", "r2"] });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      heyas: new Map([["h1", heya]]),
    });
    expect(recalculateKoenkaiBand(heya, world)).toBe("powerful");
  });

  it("heya with 1 ozeki → prestige 30 → moderate", () => {
    const r = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(recalculateKoenkaiBand(heya, world)).toBe("moderate");
  });

  it("heya with only makushita → prestige 0 → none", () => {
    const r = mockRikishi("r1", { rank: "makushita", division: "makushita" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
    });
    expect(recalculateKoenkaiBand(heya, world)).toBe("none");
  });
});
