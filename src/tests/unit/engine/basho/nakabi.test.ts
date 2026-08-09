 
import { describe, it, expect } from "vitest";
import {
  generateNakabiSummary,
  logNakabiCheckpoint,
  isNakabiDay,
  NAKABI_DAY,
} from "@/engine/systems/basho/NakabiService";
import { mockRikishi, makeMockWorld } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";

function makeRikishi(id: string, wins: number, losses: number, rankNum: number): Rikishi {
  return mockRikishi(id, {
    shikona: `Rikishi ${id}`,
    rankNumber: rankNum,
    currentBashoWins: wins,
    currentBashoLosses: losses,
  });
}

describe("isNakabiDay", () => {
  it("returns true for day 8", () => {
    expect(isNakabiDay(8)).toBe(true);
  });

  it("returns false for other days", () => {
    expect(isNakabiDay(1)).toBe(false);
    expect(isNakabiDay(7)).toBe(false);
    expect(isNakabiDay(9)).toBe(false);
    expect(isNakabiDay(15)).toBe(false);
  });

  it("NAKABI_DAY is 8", () => {
    expect(NAKABI_DAY).toBe(8);
  });
});

describe("generateNakabiSummary", () => {
  it("identifies the leader by most wins", () => {
    const r1 = makeRikishi("r-1", 8, 0, 1);
    const r2 = makeRikishi("r-2", 7, 1, 2);
    const world = makeMockWorld({});

    const summary = generateNakabiSummary(world, "hatsu", [r1, r2]);

    expect(summary.leaderId).toBe("r-1");
    expect(summary.leaderWins).toBe(8);
    expect(summary.leaderLosses).toBe(0);
  });

  it("tiebreaks leader by rank (higher rank wins)", () => {
    const r1 = makeRikishi("r-1", 7, 1, 5);
    const r2 = makeRikishi("r-2", 7, 1, 1);
    const world = makeMockWorld({});

    const summary = generateNakabiSummary(world, "hatsu", [r1, r2]);

    expect(summary.leaderId).toBe("r-2");
  });

  it("counts undefeated rikishi", () => {
    const r1 = makeRikishi("r-1", 8, 0, 1);
    const r2 = makeRikishi("r-2", 7, 0, 2);
    const r3 = makeRikishi("r-3", 5, 3, 3);
    const world = makeMockWorld({});

    const summary = generateNakabiSummary(world, "hatsu", [r1, r2, r3]);

    expect(summary.undefeatedCount).toBe(2);
  });

  it("identifies undefeated performers as notable", () => {
    const r1 = makeRikishi("r-1", 8, 0, 1);
    const world = makeMockWorld({});

    const summary = generateNakabiSummary(world, "hatsu", [r1]);

    expect(summary.notablePerformers.length).toBe(1);
    expect(summary.notablePerformers[0].note).toBe("Undefeated at nakabi");
  });

  it("identifies maegashira surprise contenders", () => {
    const r1 = makeRikishi("r-1", 6, 2, 15);
    const world = makeMockWorld({});

    const summary = generateNakabiSummary(world, "hatsu", [r1]);

    expect(summary.notablePerformers.length).toBe(1);
    expect(summary.notablePerformers[0].note).toBe("Maegashira surprise contender");
  });

  it("does not include sanyaku with 6-2 as surprise contenders", () => {
    const r1 = makeRikishi("r-1", 6, 2, 3);
    const world = makeMockWorld({});

    const summary = generateNakabiSummary(world, "hatsu", [r1]);

    expect(summary.notablePerformers.length).toBe(0);
  });

  it("excludes retired rikishi", () => {
    const r1 = makeRikishi("r-1", 8, 0, 1);
    r1.isRetired = true;
    const world = makeMockWorld({});

    const summary = generateNakabiSummary(world, "hatsu", [r1]);

    expect(summary.leaderId).toBeNull();
  });

  it("day is always NAKABI_DAY", () => {
    const world = makeMockWorld({});
    const summary = generateNakabiSummary(world, "hatsu", []);
    expect(summary.day).toBe(NAKABI_DAY);
  });
});

describe("logNakabiCheckpoint", () => {
  it("logs a BASHO_STATUS event with nakabi_checkpoint status", () => {
    const world = makeMockWorld({});
    const summary = generateNakabiSummary(world, "hatsu", []);

    const impact = logNakabiCheckpoint(world, summary);

    expect(impact.events ?? [].length).toBe(1);
    const event = impact.events ?? [][0] as any;
    expect(event.type).toBe("BASHO_STATUS");
    expect(event.data.status).toBe("nakabi_checkpoint");
    expect(event.data.bashoName).toBe("hatsu");
    expect(event.data.day).toBe(NAKABI_DAY);
  });

  it("includes leader info in event data", () => {
    const r1 = makeRikishi("r-1", 8, 0, 1);
    const world = makeMockWorld({});
    const summary = generateNakabiSummary(world, "hatsu", [r1]);

    const impact = logNakabiCheckpoint(world, summary);
    const event = impact.events ?? [][0] as any;

    expect(event.data.leaderId).toBe("r-1");
    expect(event.data.leaderWins).toBe(8);
  });
});
