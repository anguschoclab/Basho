 
import { describe, it, expect } from "vitest";
import { PostBashoPressService } from "@/engine/systems/narrative/PostBashoPressService";
import { makeMockWorld, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

describe("PostBashoPressService — New Champion Sections", () => {
  it("generates weight_journey lines when champion has progressKg >= 15", () => {
    const champion = mockRikishi("wj-champ", {
      shikona: "Bulk Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
      weightJourney: { targetKg: 160, progressKg: 18, stalled: false, phases: ["bulking"] },
    } as any);

    const world = makeMockWorld({ rikishi: new Map([["wj-champ", champion]]) as any, year: 2025 } as any) as WorldState;
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "wj-champ", junYushoIds: [], bashoName: "hatsu", year: 2025,
    });

    const hasWeightJourney = lines.some((l) => l.text.includes("Bulk Champ") && l.id.includes("-weight-journey"));
    expect(hasWeightJourney).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });

  it("does NOT generate weight_journey lines when progressKg < 15", () => {
    const champion = mockRikishi("wj-champ2", {
      shikona: "Slim Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
      weightJourney: { targetKg: 160, progressKg: 5, stalled: false, phases: ["bulking"] },
    } as any);

    const world = makeMockWorld({ rikishi: new Map([["wj-champ2", champion]]) as any, year: 2025 } as any) as WorldState;
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "wj-champ2", junYushoIds: [], bashoName: "hatsu", year: 2025,
    });

    const hasWeightJourney = lines.some((l) => l.id.includes("-weight-journey"));
    expect(hasWeightJourney).toBe(false);
  });

  it("generates master_intervention lines when interventionUsedThisBasho is true", () => {
    const champion = mockRikishi("int-champ", {
      shikona: "Saved Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 13,
      currentBashoLosses: 2,
      heyaId: "heya-1",
      careerHistory: [],
      interventionUsedThisBasho: true,
    } as any);

    const world = makeMockWorld({ rikishi: new Map([["int-champ", champion]]) as any, year: 2025 } as any) as WorldState;
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "int-champ", junYushoIds: [], bashoName: "nagoya", year: 2025,
    });

    const hasIntervention = lines.some((l) => l.text.includes("Saved Champ") && l.id.includes("-intervention"));
    expect(hasIntervention).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });

  it("generates early_struggle lines for champion with 5+ basho and <=1 yusho", () => {
    const careerHistory = Array.from({ length: 6 }, () => ({ division: "makuuchi", isYusho: false } as any));
    const champion = mockRikishi("strug-champ", {
      shikona: "Long Road",
      rank: "maegashira",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory,
    });

    const world = makeMockWorld({ rikishi: new Map([["strug-champ", champion]]) as any, year: 2025 } as any) as WorldState;
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "strug-champ", junYushoIds: [], bashoName: "aki", year: 2025,
    });

    const hasStruggle = lines.some((l) => l.text.includes("Long Road") && l.id.includes("-struggle"));
    expect(hasStruggle).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });

  it("generates career_highlight_reflection lines when careerHighlights is non-empty", () => {
    const champion = mockRikishi("hl-champ", {
      shikona: "Memory Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
      careerHighlights: [{
        type: "seven_seven_win",
        basho: "hatsu",
        opponent: "rival-1",
        description: "Won 7-7 bout on senshuraku",
      }],
    } as any);

    const world = makeMockWorld({ rikishi: new Map([["hl-champ", champion]]) as any, year: 2025 } as any) as WorldState;
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "hl-champ", junYushoIds: [], bashoName: "hatsu", year: 2025,
    });

    const hasHighlight = lines.some((l) => l.text.includes("Memory Champ") && l.id.includes("-highlight"));
    expect(hasHighlight).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });
});

describe("PostBashoPressService — New Prize Winner Sections", () => {
  it("generates fighting_name_vindication when shikonaConferredEarly is true", () => {
    const champion = mockRikishi("fn-champ", {
      shikona: "Named Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
    });
    const prizeWinner = mockRikishi("fn-winner", {
      shikona: "Early Name",
      rank: "maegashira",
      division: "makuuchi",
      currentBashoWins: 11,
      currentBashoLosses: 4,
      heyaId: "heya-2",
      shikonaConferredEarly: true,
    } as any);

    const world = makeMockWorld({
      rikishi: new Map([["fn-champ", champion], ["fn-winner", prizeWinner]]) as any,
      year: 2025,
    } as any) as WorldState;
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "fn-champ",
      junYushoIds: [],
      ginoSho: "fn-winner",
      bashoName: "hatsu",
      year: 2025,
    });

    const hasFightingName = lines.some((l) => l.text.includes("Early Name") && l.id.includes("-fighting-name"));
    expect(hasFightingName).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });

  it("generates cohort_pride when recruitmentCohortId is set", () => {
    const champion = mockRikishi("co-champ", {
      shikona: "Cohort Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
    });
    const prizeWinner = mockRikishi("co-winner", {
      shikona: "Cohort Lad",
      rank: "maegashira",
      division: "makuuchi",
      currentBashoWins: 10,
      currentBashoLosses: 5,
      heyaId: "heya-2",
      recruitmentCohortId: "2018-heya-2",
    } as any);

    const world = makeMockWorld({
      rikishi: new Map([["co-champ", champion], ["co-winner", prizeWinner]]) as any,
      year: 2025,
    } as any) as WorldState;
    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "co-champ",
      junYushoIds: [],
      kantosho: "co-winner",
      bashoName: "nagoya",
      year: 2025,
    });

    const hasCohort = lines.some((l) => l.text.includes("Cohort Lad") && l.id.includes("-cohort"));
    expect(hasCohort).toBe(true);
    expect(lines.every((l) => !l.text.includes("[MISSING:"))).toBe(true);
  });
});
