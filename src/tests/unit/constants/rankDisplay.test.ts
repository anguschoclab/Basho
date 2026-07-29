import { describe, it, expect } from "vitest";
import {
  RANK_DISPLAY_REGISTRY,
  RANK_NAMES,
  isSanyakuRank,
  isSekitoriRank,
  getRanksByDivision,
  getDivisionOfRank,
  getRankDisplayEntry,
} from "@/constants/engine/rankDisplay";
import type { Rank } from "@/engine/types/banzuke";

const ALL_RANKS: Rank[] = [
  "yokozuna",
  "ozeki",
  "sekiwake",
  "komusubi",
  "maegashira",
  "juryo",
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
];

describe("RANK_DISPLAY_REGISTRY", () => {
  it("has entries for all 10 ranks", () => {
    expect(Object.keys(RANK_DISPLAY_REGISTRY)).toHaveLength(10);
    for (const r of ALL_RANKS) {
      expect(RANK_DISPLAY_REGISTRY[r]).toBeDefined();
    }
  });

  it.each(ALL_RANKS)("%s has all required fields", (r) => {
    const entry = RANK_DISPLAY_REGISTRY[r];
    expect(entry.en).toBeTruthy();
    expect(entry.ja).toBeTruthy();
    expect(entry.abbr).toBeTruthy();
    expect(entry.tier).toBeGreaterThan(0);
    expect(entry.division).toBeTruthy();
    expect(typeof entry.isSanyaku).toBe("boolean");
    expect(typeof entry.isSekitori).toBe("boolean");
    expect(typeof entry.salary).toBe("number");
    expect(typeof entry.fightsPerBasho).toBe("number");
  });

  it("yokozuna has correct values", () => {
    const y = RANK_DISPLAY_REGISTRY.yokozuna;
    expect(y.ja).toBe("横綱");
    expect(y.en).toBe("Yokozuna");
    expect(y.abbr).toBe("Y");
    expect(y.tier).toBe(1);
    expect(y.isSanyaku).toBe(true);
    expect(y.isSekitori).toBe(true);
    expect(y.division).toBe("makuuchi");
  });

  it("maegashira is not sanyaku but is sekitori", () => {
    const m = RANK_DISPLAY_REGISTRY.maegashira;
    expect(m.isSanyaku).toBe(false);
    expect(m.isSekitori).toBe(true);
  });

  it("juryo is sekitori", () => {
    expect(RANK_DISPLAY_REGISTRY.juryo.isSekitori).toBe(true);
  });

  it("makushita is not sekitori", () => {
    expect(RANK_DISPLAY_REGISTRY.makushita.isSekitori).toBe(false);
  });

  it("jonokuchi has tier 10", () => {
    expect(RANK_DISPLAY_REGISTRY.jonokuchi.tier).toBe(10);
  });

  it("tier is 1-indexed (yokozuna=1, not 0)", () => {
    expect(RANK_DISPLAY_REGISTRY.yokozuna.tier).toBe(1);
  });
});

describe("RANK_NAMES", () => {
  it.each(ALL_RANKS)("%s has ja and en names", (r) => {
    expect(RANK_NAMES[r].ja).toBeTruthy();
    expect(RANK_NAMES[r].en).toBeTruthy();
  });

  it("yokozuna has correct ja", () => {
    expect(RANK_NAMES.yokozuna.ja).toBe("横綱");
  });
});

describe("isSanyakuRank", () => {
  it.each(["yokozuna", "ozeki", "sekiwake", "komusubi"])("returns true for %s", (rank) => {
    expect(isSanyakuRank(rank)).toBe(true);
  });

  it.each(["maegashira", "juryo", "makushita"])("returns false for %s", (rank) => {
    expect(isSanyakuRank(rank)).toBe(false);
  });

  it("returns false for unknown ranks", () => {
    expect(isSanyakuRank("unknown")).toBe(false);
  });
});

describe("isSekitoriRank", () => {
  it.each(["yokozuna", "ozeki", "sekiwake", "komusubi", "maegashira", "juryo"])("returns true for %s", (rank) => {
    expect(isSekitoriRank(rank)).toBe(true);
  });

  it.each(["makushita", "sandanme", "jonidan", "jonokuchi"])("returns false for %s", (rank) => {
    expect(isSekitoriRank(rank)).toBe(false);
  });
});

describe("getRanksByDivision", () => {
  it("returns makuuchi ranks", () => {
    const makuuchi = getRanksByDivision("makuuchi");
    expect(makuuchi).toContain("yokozuna");
    expect(makuuchi).toContain("ozeki");
    expect(makuuchi).toContain("sekiwake");
    expect(makuuchi).toContain("komusubi");
    expect(makuuchi).toContain("maegashira");
    expect(makuuchi).not.toContain("juryo");
  });

  it("returns juryo ranks", () => {
    expect(getRanksByDivision("juryo")).toEqual(["juryo"]);
  });

  it("returns makushita ranks", () => {
    expect(getRanksByDivision("makushita")).toEqual(["makushita"]);
  });
});

describe("getDivisionOfRank", () => {
  it("returns correct division for each rank", () => {
    expect(getDivisionOfRank("yokozuna")).toBe("makuuchi");
    expect(getDivisionOfRank("juryo")).toBe("juryo");
    expect(getDivisionOfRank("makushita")).toBe("makushita");
    expect(getDivisionOfRank("jonokuchi")).toBe("jonokuchi");
  });

  it("returns undefined for unknown rank", () => {
    expect(getDivisionOfRank("unknown")).toBeUndefined();
  });
});

describe("getRankDisplayEntry", () => {
  it("returns entry for valid rank", () => {
    const entry = getRankDisplayEntry("yokozuna");
    expect(entry).toBeDefined();
    expect(entry?.en).toBe("Yokozuna");
  });

  it("returns undefined for unknown rank", () => {
    expect(getRankDisplayEntry("unknown")).toBeUndefined();
  });
});
