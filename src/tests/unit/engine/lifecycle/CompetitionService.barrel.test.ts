import { describe, it, expect } from "vitest";
import {
  resolvePlayoffs,
  calculateStandings,
  distributePrizes,
  payBashoTeate,
  payKinboshiStipends,
  recordBashoHistory,
  checkYokozunaPromotions,
  concludeBashoCompetition,
} from "@/engine/lifecycle/CompetitionService";

describe("CompetitionService barrel exports", () => {
  it("should re-export sub-module symbols", () => {
    expect(typeof resolvePlayoffs).toBe("function");
    expect(typeof calculateStandings).toBe("function");
    expect(typeof distributePrizes).toBe("function");
    expect(typeof payBashoTeate).toBe("function");
    expect(typeof payKinboshiStipends).toBe("function");
    expect(typeof recordBashoHistory).toBe("function");
    expect(typeof checkYokozunaPromotions).toBe("function");
  });

  it("should export concludeBashoCompetition", () => {
    expect(typeof concludeBashoCompetition).toBe("function");
  });
});
