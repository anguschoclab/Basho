import { describe, it, expect } from "vitest";
import { OYAKATA_BACKSTORIES } from "../wizardConstants";

describe("OYAKATA_BACKSTORIES", () => {
  it("has exactly 7 entries", () => {
    expect(OYAKATA_BACKSTORIES).toHaveLength(7);
  });

  it("all entries have required fields", () => {
    OYAKATA_BACKSTORIES.forEach((b) => {
      expect(b.id).toBeTruthy();
      expect(b.label).toBeTruthy();
      expect(b.flavor).toBeTruthy();
      expect(b.highestRank).toBeTruthy();
      expect(typeof b.bonuses.funds).toBe("number");
      expect(b.icon).toBeDefined();
    });
  });

  it("no two entries share the same id", () => {
    const ids = OYAKATA_BACKSTORIES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all funds bonuses are positive numbers", () => {
    OYAKATA_BACKSTORIES.forEach((b) => {
      expect(b.bonuses.funds).toBeGreaterThan(0);
    });
  });

  it("difficulty values are valid", () => {
    const valid = ["Easy", "Normal", "Hard", "Very Hard"];
    OYAKATA_BACKSTORIES.forEach((b) => {
      expect(valid).toContain(b.difficulty);
    });
  });

  it("contains all expected ids", () => {
    const ids = OYAKATA_BACKSTORIES.map((b) => b.id);
    expect(ids).toContain("yokozuna_champion");
    expect(ids).toContain("ozeki_legend");
    expect(ids).toContain("sanyaku_veteran");
    expect(ids).toContain("maegashira_lifer");
    expect(ids).toContain("injury_comeback");
    expect(ids).toContain("international_scout");
    expect(ids).toContain("council_elder");
  });

  it("all entries have a labelJa field", () => {
    OYAKATA_BACKSTORIES.forEach((b) => {
      expect(b.labelJa).toBeTruthy();
    });
  });

  it("funds are in ascending order of backstory difficulty", () => {
    // Easy (yokozuna_champion: 3M) < Normal (ozeki_legend: 5M) < Hard (maegashira_lifer: 15M)
    const byId = Object.fromEntries(OYAKATA_BACKSTORIES.map((b) => [b.id, b.bonuses.funds]));
    expect(byId["yokozuna_champion"]).toBeLessThan(byId["ozeki_legend"]);
    expect(byId["ozeki_legend"]).toBeLessThan(byId["sanyaku_veteran"]);
    expect(byId["sanyaku_veteran"]).toBeLessThan(byId["maegashira_lifer"]);
  });
});
