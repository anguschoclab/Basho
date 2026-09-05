import { describe, it, expect } from "vitest";
import { computeKachiNokori, projectCohortStats } from "@/presenters/kachiNokori";
import { mockRikishi } from "../engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Rank } from "@/engine/types/banzuke";

describe("computeKachiNokori", () => {
  it("returns 8 - wins for maegashira (threshold 8)", () => {
    const r = mockRikishi("r1", { shikona: "Test" }) as Rikishi;
    r.rank = "maegashira" as Rank;
    r.rankNumber = 1;
    r.currentBashoWins = 5;
    r.currentBashoLosses = 2;
    expect(computeKachiNokori(r)).toBe(3);
  });

  it("returns 0 when wins already meet threshold", () => {
    const r = mockRikishi("r1", { shikona: "Test" }) as Rikishi;
    r.rank = "maegashira" as Rank;
    r.currentBashoWins = 8;
    r.currentBashoLosses = 0;
    expect(computeKachiNokori(r)).toBe(0);
  });

  it("returns 0 when wins exceed threshold", () => {
    const r = mockRikishi("r1", { shikona: "Test" }) as Rikishi;
    r.rank = "maegashira" as Rank;
    r.currentBashoWins = 12;
    r.currentBashoLosses = 0;
    expect(computeKachiNokori(r)).toBe(0);
  });

  it("returns threshold for 0 wins", () => {
    const r = mockRikishi("r1", { shikona: "Test" }) as Rikishi;
    r.rank = "maegashara" as Rank;
    r.rank = "maegashira" as Rank;
    r.currentBashoWins = 0;
    r.currentBashoLosses = 0;
    expect(computeKachiNokori(r)).toBe(8);
  });

  it("returns null for retired rikishi", () => {
    const r = mockRikishi("r1", { shikona: "Test" }) as Rikishi;
    r.rank = "maegashira" as Rank;
    r.isRetired = true;
    expect(computeKachiNokori(r)).toBeNull();
  });
});

describe("projectCohortStats", () => {
  it("counts kachi-koshi achieved vs remaining for a heya roster", () => {
    const r1 = mockRikishi("r1", { shikona: "A" }) as Rikishi;
    r1.rank = "maegashira" as Rank;
    r1.currentBashoWins = 8;
    r1.currentBashoLosses = 2;

    const r2 = mockRikishi("r2", { shikona: "B" }) as Rikishi;
    r2.rank = "maegashira" as Rank;
    r2.currentBashoWins = 5;
    r2.currentBashoLosses = 5;

    const r3 = mockRikishi("r3", { shikona: "C" }) as Rikishi;
    r3.rank = "maegashira" as Rank;
    r3.currentBashoWins = 2;
    r3.currentBashoLosses = 8;

    const stats = projectCohortStats([r1, r2, r3]);
    expect(stats.total).toBe(3);
    expect(stats.kachiKoshi).toBe(1);
    expect(stats.makeKoshi).toBe(1);
    expect(stats.inContention).toBe(1);
  });

  it("handles empty roster", () => {
    const stats = projectCohortStats([]);
    expect(stats.total).toBe(0);
    expect(stats.kachiKoshi).toBe(0);
    expect(stats.makeKoshi).toBe(0);
    expect(stats.inContention).toBe(0);
  });
});
