/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import {
  calculateDivisionStandings,
  resolveDivisionPlayoffs,
} from "@/engine/lifecycle/PlayoffResolver";
import { concludeBashoCompetition } from "@/engine/lifecycle/CompetitionService";
import { PostBashoPressService } from "@/engine/systems/narrative/PostBashoPressService";
import { makeMockWorld, mockRikishi } from "../utils";
import type { BashoState } from "@/engine/types/basho";

describe("calculateDivisionStandings", () => {
  it("filters standings by division", () => {
    const r1 = mockRikishi("r1", { division: "juryo", rank: "juryo" });
    const r2 = mockRikishi("r2", { division: "juryo", rank: "juryo" });
    const r3 = mockRikishi("r3", { division: "makushita", rank: "makushita" });

    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
        ["r3", r3],
      ]),
    });

    const basho = {
      standings: new Map([
        ["r1", { wins: 13, losses: 2, absences: 0 }],
        ["r2", { wins: 13, losses: 2, absences: 0 }],
        ["r3", { wins: 14, losses: 1, absences: 0 }],
      ]),
    } as any as BashoState;

    const result = calculateDivisionStandings(basho, world, "juryo");
    expect(result.topCandidates).toContain("r1");
    expect(result.topCandidates).toContain("r2");
    expect(result.topCandidates).not.toContain("r3");
    expect(result.bestWins).toBe(13);
  });

  it("returns empty candidates when no rikishi in division", () => {
    const world = makeMockWorld();
    const basho = {
      standings: new Map([
        ["r1", { wins: 13, losses: 2, absences: 0 }],
      ]),
    } as any as BashoState;

    const result = calculateDivisionStandings(basho, world, "sandanme");
    expect(result.topCandidates.length).toBe(0);
  });
});

describe("resolveDivisionPlayoffs", () => {
  it("generates intro, multi_man, and victory narrative lines", () => {
    const r1 = mockRikishi("dr1", {
      division: "makushita",
      rank: "makushita",
      shikona: "Maku Champ 1",
      currentBashoWins: 14,
      currentBashoLosses: 1,
    });
    const r2 = mockRikishi("dr2", {
      division: "makushita",
      rank: "makushita",
      shikona: "Maku Champ 2",
      currentBashoWins: 14,
      currentBashoLosses: 1,
    });
    const r3 = mockRikishi("dr3", {
      division: "makushita",
      rank: "makushita",
      shikona: "Maku Champ 3",
      currentBashoWins: 14,
      currentBashoLosses: 1,
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["dr1", r1],
        ["dr2", r2],
        ["dr3", r3],
      ]),
      year: 2025,
      sponsorPool: { sponsors: new Map() } as any,
    });

    const basho = {
      bashoName: "hatsu",
      standings: new Map([
        ["dr1", { wins: 14, losses: 1, absences: 0 }],
        ["dr2", { wins: 14, losses: 1, absences: 0 }],
        ["dr3", { wins: 14, losses: 1, absences: 0 }],
      ]),
      matches: [],
    } as any as BashoState;

    const result = resolveDivisionPlayoffs(world, basho, ["dr1", "dr2", "dr3"], "makushita");

    // Should have intro, multi_man (3+ candidates), and victory lines
    expect(result.narrativeLines.length).toBeGreaterThanOrEqual(2);

    const hasIntro = result.narrativeLines.some((l) => l.id.includes("intro"));
    expect(hasIntro).toBe(true);

    const hasMultiMan = result.narrativeLines.some((l) => l.id.includes("multi"));
    expect(hasMultiMan).toBe(true);

    const hasVictory = result.narrativeLines.some((l) => l.id.includes("victory"));
    expect(hasVictory).toBe(true);

    // All lines should have playoff and lower_division tags
    for (const line of result.narrativeLines) {
      expect(line.tags).toContain("playoff");
      expect(line.tags).toContain("lower_division");
    }
  });

  it("does NOT generate multi_man line for 2-man playoff", () => {
    const r1 = mockRikishi("dr4", {
      division: "juryo",
      rank: "juryo",
      shikona: "Juryo Champ 1",
      currentBashoWins: 13,
      currentBashoLosses: 2,
    });
    const r2 = mockRikishi("dr5", {
      division: "juryo",
      rank: "juryo",
      shikona: "Juryo Champ 2",
      currentBashoWins: 13,
      currentBashoLosses: 2,
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["dr4", r1],
        ["dr5", r2],
      ]),
      year: 2025,
      sponsorPool: { sponsors: new Map() } as any,
    });

    const basho = {
      bashoName: "nagoya",
      standings: new Map([
        ["dr4", { wins: 13, losses: 2, absences: 0 }],
        ["dr5", { wins: 13, losses: 2, absences: 0 }],
      ]),
      matches: [],
    } as any as BashoState;

    const result = resolveDivisionPlayoffs(world, basho, ["dr4", "dr5"], "juryo");

    const hasMultiMan = result.narrativeLines.some((l) => l.id.includes("multi"));
    expect(hasMultiMan).toBe(false);
  });

  it("returns a valid winner", () => {
    const r1 = mockRikishi("dr6", {
      division: "sandanme",
      rank: "sandanme",
      shikona: "Sand Champ 1",
      currentBashoWins: 14,
      currentBashoLosses: 1,
    });
    const r2 = mockRikishi("dr7", {
      division: "sandanme",
      rank: "sandanme",
      shikona: "Sand Champ 2",
      currentBashoWins: 14,
      currentBashoLosses: 1,
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["dr6", r1],
        ["dr7", r2],
      ]),
      year: 2025,
      sponsorPool: { sponsors: new Map() } as any,
    });

    const basho = {
      bashoName: "aki",
      standings: new Map([
        ["dr6", { wins: 14, losses: 1, absences: 0 }],
        ["dr7", { wins: 14, losses: 1, absences: 0 }],
      ]),
      matches: [],
    } as any as BashoState;

    const result = resolveDivisionPlayoffs(world, basho, ["dr6", "dr7"], "sandanme");
    expect(["dr6", "dr7"]).toContain(result.winner);
  });
});

describe("Lower Division Playoff Integration in concludeBashoCompetition", () => {
  it("fires division_playoffs event when lower division has tied candidates", () => {
    const makuuchi = mockRikishi("m1", {
      division: "makuuchi",
      rank: "yokozuna",
      shikona: "Top Champ",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });
    const j1 = mockRikishi("j1", {
      division: "juryo",
      rank: "juryo",
      shikona: "Juryo Tied A",
      currentBashoWins: 13,
      currentBashoLosses: 2,
      heyaId: "heya-2",
    });
    const j2 = mockRikishi("j2", {
      division: "juryo",
      rank: "juryo",
      shikona: "Juryo Tied B",
      currentBashoWins: 13,
      currentBashoLosses: 2,
      heyaId: "heya-3",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["m1", makuuchi],
        ["j1", j1],
        ["j2", j2],
      ]),
      year: 2025,
      cyclePhase: "basho_wrap",
      sponsorPool: { sponsors: new Map() } as any,
      currentBasho: {
        id: "test-basho",
        year: 2025,
        bashoNumber: 1,
        bashoName: "hatsu",
        day: 15,
        matches: [],
        standings: new Map([
          ["m1", { wins: 14, losses: 1, absences: 0 }],
          ["j1", { wins: 13, losses: 2, absences: 0 }],
          ["j2", { wins: 13, losses: 2, absences: 0 }],
        ]),
        isActive: false,
      } as BashoState,
      history: [
        { yusho: "m1", junYusho: [], ginoSho: undefined, shukunsho: undefined, kantosho: undefined } as any,
      ],
      heyas: new Map([
        ["heya-1", { id: "heya-1", name: "Stable 1", oyakataId: "oy-1" } as any],
        ["heya-2", { id: "heya-2", name: "Stable 2", oyakataId: "oy-2" } as any],
        ["heya-3", { id: "heya-3", name: "Stable 3", oyakataId: "oy-3" } as any],
      ]),
      oyakata: new Map([
        ["oy-1", { id: "oy-1", age: 50, name: "O1" } as any],
        ["oy-2", { id: "oy-2", age: 50, name: "O2" } as any],
        ["oy-3", { id: "oy-3", age: 50, name: "O3" } as any],
      ]),
    } as any);

    const impact = concludeBashoCompetition(world);

    const divisionPlayoffEvent = impact.events?.find(
      (e) => (e.data as any).status === "division_playoffs"
    );
    expect(divisionPlayoffEvent).toBeDefined();
    const narrative = (divisionPlayoffEvent!.data as any).narrative as any[];
    expect(narrative).toBeDefined();
    expect(narrative.length).toBeGreaterThan(0);
  });

  it("fires schedule_delay when 2+ divisions have playoffs", () => {
    const makuuchi = mockRikishi("m2", {
      division: "makuuchi",
      rank: "yokozuna",
      shikona: "Top Champ",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });
    // Two juryo tied
    const j1 = mockRikishi("j3", {
      division: "juryo",
      rank: "juryo",
      shikona: "J1",
      currentBashoWins: 13,
      currentBashoLosses: 2,
      heyaId: "heya-2",
    });
    const j2 = mockRikishi("j4", {
      division: "juryo",
      rank: "juryo",
      shikona: "J2",
      currentBashoWins: 13,
      currentBashoLosses: 2,
      heyaId: "heya-3",
    });
    // Two makushita tied
    const mk1 = mockRikishi("mk1", {
      division: "makushita",
      rank: "makushita",
      shikona: "MK1",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-4",
    });
    const mk2 = mockRikishi("mk2", {
      division: "makushita",
      rank: "makushita",
      shikona: "MK2",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-5",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["m2", makuuchi],
        ["j3", j1],
        ["j4", j2],
        ["mk1", mk1],
        ["mk2", mk2],
      ]),
      year: 2025,
      cyclePhase: "basho_wrap",
      sponsorPool: { sponsors: new Map() } as any,
      currentBasho: {
        id: "test-basho2",
        year: 2025,
        bashoNumber: 1,
        bashoName: "hatsu",
        day: 15,
        matches: [],
        standings: new Map([
          ["m2", { wins: 14, losses: 1, absences: 0 }],
          ["j3", { wins: 13, losses: 2, absences: 0 }],
          ["j4", { wins: 13, losses: 2, absences: 0 }],
          ["mk1", { wins: 14, losses: 1, absences: 0 }],
          ["mk2", { wins: 14, losses: 1, absences: 0 }],
        ]),
        isActive: false,
      } as BashoState,
      history: [
        { yusho: "m2", junYusho: [], ginoSho: undefined, shukunsho: undefined, kantosho: undefined } as any,
      ],
      heyas: new Map([
        ["heya-1", { id: "heya-1", name: "S1", oyakataId: "oy-1" } as any],
        ["heya-2", { id: "heya-2", name: "S2", oyakataId: "oy-2" } as any],
        ["heya-3", { id: "heya-3", name: "S3", oyakataId: "oy-3" } as any],
        ["heya-4", { id: "heya-4", name: "S4", oyakataId: "oy-4" } as any],
        ["heya-5", { id: "heya-5", name: "S5", oyakataId: "oy-5" } as any],
      ]),
      oyakata: new Map([
        ["oy-1", { id: "oy-1", age: 50, name: "O1" } as any],
        ["oy-2", { id: "oy-2", age: 50, name: "O2" } as any],
        ["oy-3", { id: "oy-3", age: 50, name: "O3" } as any],
        ["oy-4", { id: "oy-4", age: 50, name: "O4" } as any],
        ["oy-5", { id: "oy-5", age: 50, name: "O5" } as any],
      ]),
    } as any);

    const impact = concludeBashoCompetition(world);

    const divPlayoffEvent = impact.events?.find(
      (e) => (e.data as any).status === "division_playoffs"
    );
    expect(divPlayoffEvent).toBeDefined();
    const narrative = (divPlayoffEvent!.data as any).narrative as any[];
    const hasScheduleDelay = narrative.some((l) => l.id.includes("schedule-delay"));
    expect(hasScheduleDelay).toBe(true);
  });

  it("does NOT fire division_playoffs when no lower division ties", () => {
    const makuuchi = mockRikishi("m3", {
      division: "makuuchi",
      rank: "yokozuna",
      shikona: "Sole Champ",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });
    const j1 = mockRikishi("j5", {
      division: "juryo",
      rank: "juryo",
      shikona: "Sole Juryo",
      currentBashoWins: 13,
      currentBashoLosses: 2,
      heyaId: "heya-2",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["m3", makuuchi],
        ["j5", j1],
      ]),
      year: 2025,
      cyclePhase: "basho_wrap",
      sponsorPool: { sponsors: new Map() } as any,
      currentBasho: {
        id: "test-basho3",
        year: 2025,
        bashoNumber: 1,
        bashoName: "hatsu",
        day: 15,
        matches: [],
        standings: new Map([
          ["m3", { wins: 14, losses: 1, absences: 0 }],
          ["j5", { wins: 13, losses: 2, absences: 0 }],
        ]),
        isActive: false,
      } as BashoState,
      history: [
        { yusho: "m3", junYusho: [], ginoSho: undefined, shukunsho: undefined, kantosho: undefined } as any,
      ],
      heyas: new Map([
        ["heya-1", { id: "heya-1", name: "S1", oyakataId: "oy-1" } as any],
        ["heya-2", { id: "heya-2", name: "S2", oyakataId: "oy-2" } as any],
      ]),
      oyakata: new Map([
        ["oy-1", { id: "oy-1", age: 50, name: "O1" } as any],
        ["oy-2", { id: "oy-2", age: 50, name: "O2" } as any],
      ]),
    } as any);

    const impact = concludeBashoCompetition(world);

    const divPlayoffEvent = impact.events?.find(
      (e) => (e.data as any).status === "division_playoffs"
    );
    expect(divPlayoffEvent).toBeUndefined();
  });
});

describe("Lower Division Champion Press Conference", () => {
  it("generates first_honor line for lower division champion", () => {
    const champion = mockRikishi("ld1", {
      division: "makushita",
      rank: "makushita",
      shikona: "Maku Hero",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["ld1", champion]]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "ld1",
      junYushoIds: [],
      bashoName: "hatsu",
      year: 2025,
    });

    const hasFirstHonor = lines.some((l: any) => l.id.includes("first-honor"));
    expect(hasFirstHonor).toBe(true);
  });

  it("does NOT generate lower division champion lines for makuuchi champion", () => {
    const champion = mockRikishi("ld2", {
      division: "makuuchi",
      rank: "yokozuna",
      shikona: "Makuuchi Champ",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["ld2", champion]]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "ld2",
      junYushoIds: [],
      bashoName: "hatsu",
      year: 2025,
    });

    const hasLowerDivLines = lines.some((l: any) => l.id.includes("ld-champion"));
    expect(hasLowerDivLines).toBe(false);
  });
});
