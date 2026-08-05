import { describe, it, expect } from "vitest";
import {
  calculateKachiNokori,
  hasKachiKoshi,
  isMakeKoshiConfirmed,
  calculateKachiNokoriForStandings,
  getYushoRaceLeaders,
} from "@/engine/bout/kachiNokori";

describe("Kachi-nokori — calculateKachiNokori", () => {
  it("returns 0 when wins < 8 (no kachi-koshi yet)", () => {
    expect(calculateKachiNokori(7, 5)).toBe(0);
    expect(calculateKachiNokori(0, 0)).toBe(0);
    expect(calculateKachiNokori(5, 9)).toBe(0);
  });

  it("returns 0 at exactly 8 wins (kachi-koshi, no surplus)", () => {
    expect(calculateKachiNokori(8, 7)).toBe(0);
  });

  it("returns surplus wins above 8", () => {
    expect(calculateKachiNokori(10, 5)).toBe(2);
    expect(calculateKachiNokori(13, 2)).toBe(5);
    expect(calculateKachiNokori(15, 0)).toBe(7);
  });

  it("accounts for absences in total bouts", () => {
    expect(calculateKachiNokori(8, 6, 1)).toBe(0);
    expect(calculateKachiNokori(9, 5, 1)).toBe(1);
  });
});

describe("Kachi-nokori — hasKachiKoshi", () => {
  it("returns true when wins >= 8", () => {
    expect(hasKachiKoshi(8)).toBe(true);
    expect(hasKachiKoshi(10)).toBe(true);
    expect(hasKachiKoshi(15)).toBe(true);
  });

  it("returns false when wins < 8", () => {
    expect(hasKachiKoshi(0)).toBe(false);
    expect(hasKachiKoshi(7)).toBe(false);
  });
});

describe("Kachi-nokori — isMakeKoshiConfirmed", () => {
  it("returns true when 8+ losses (cannot reach 8 wins in 15 days)", () => {
    expect(isMakeKoshiConfirmed(8)).toBe(true);
    expect(isMakeKoshiConfirmed(10)).toBe(true);
  });

  it("returns false when < 8 losses (still possible)", () => {
    expect(isMakeKoshiConfirmed(0)).toBe(false);
    expect(isMakeKoshiConfirmed(7)).toBe(false);
  });

  it("accounts for absences", () => {
    expect(isMakeKoshiConfirmed(7, 1)).toBe(true);
    expect(isMakeKoshiConfirmed(6, 2)).toBe(true);
    expect(isMakeKoshiConfirmed(6, 1)).toBe(false);
  });
});

describe("Kachi-nokori — calculateKachiNokoriForStandings", () => {
  it("calculates kachi-nokori for all rikishi in standings", () => {
    const standings = new Map([
      ["r1", { wins: 10, losses: 5 }],
      ["r2", { wins: 7, losses: 8 }],
      ["r3", { wins: 13, losses: 2 }],
      ["r4", { wins: 8, losses: 7 }],
    ]);

    const result = calculateKachiNokoriForStandings(standings);
    expect(result.get("r1")).toBe(2);
    expect(result.get("r2")).toBe(0);
    expect(result.get("r3")).toBe(5);
    expect(result.get("r4")).toBe(0);
  });

  it("returns empty map for empty standings", () => {
    const result = calculateKachiNokoriForStandings(new Map());
    expect(result.size).toBe(0);
  });
});

describe("Kachi-nokori — getYushoRaceLeaders", () => {
  it("returns leaders sorted by kachi-nokori descending", () => {
    const standings = new Map([
      ["r1", { wins: 10, losses: 5 }],
      ["r2", { wins: 13, losses: 2 }],
      ["r3", { wins: 14, losses: 1 }],
      ["r4", { wins: 7, losses: 8 }],
      ["r5", { wins: 12, losses: 3 }],
    ]);

    const leaders = getYushoRaceLeaders(standings, 3);
    expect(leaders[0].id).toBe("r3");
    expect(leaders[0].kachiNokori).toBe(6);
    expect(leaders[1].id).toBe("r2");
    expect(leaders[1].kachiNokori).toBe(5);
    expect(leaders[2].id).toBe("r5");
    expect(leaders[2].kachiNokori).toBe(4);
  });

  it("breaks ties by fewest losses", () => {
    const standings = new Map([
      ["r1", { wins: 10, losses: 5 }],
      ["r2", { wins: 10, losses: 4 }],
    ]);

    const leaders = getYushoRaceLeaders(standings, 2);
    expect(leaders[0].id).toBe("r2"); // fewer losses
  });

  it("respects the limit parameter", () => {
    const standings = new Map([
      ["r1", { wins: 10, losses: 5 }],
      ["r2", { wins: 13, losses: 2 }],
      ["r3", { wins: 14, losses: 1 }],
    ]);

    const leaders = getYushoRaceLeaders(standings, 1);
    expect(leaders.length).toBe(1);
    expect(leaders[0].id).toBe("r3");
  });

  it("includes rikishi with 0 kachi-nokori when no one has 8+ wins", () => {
    const standings = new Map([
      ["r1", { wins: 5, losses: 5 }],
      ["r2", { wins: 6, losses: 4 }],
    ]);

    const leaders = getYushoRaceLeaders(standings, 5);
    expect(leaders.length).toBe(2);
    expect(leaders.every((l) => l.kachiNokori === 0)).toBe(true);
  });
});
