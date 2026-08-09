import { describe, it, expect } from "vitest";
import { PostBashoPressService } from "@/engine/systems/narrative/PostBashoPressService";
import { makeMockWorld, mockRikishi } from "../utils";

describe("PostBashoPressService — Champion Press Conference", () => {
  it("generates press lines for a yusho champion", () => {
    const champion = mockRikishi("champ1", {
      shikona: "Champion A",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [],
    });

    const world = makeMockWorld({
      rikishi: new Map([["champ1", champion]]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ1",
      junYushoIds: [],
      bashoName: "hatsu",
      year: 2025,
    });

    expect(lines.length).toBeGreaterThan(0);
    const hasChampionLine = lines.some((l) => l.text.includes("Champion A"));
    expect(hasChampionLine).toBe(true);
  });

  it("generates walking_wounded lines when champion is injured", () => {
    const champion = mockRikishi("champ2", {
      shikona: "Hurt Champ",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 13,
      currentBashoLosses: 2,
      injured: true,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["champ2", champion]]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ2",
      junYushoIds: [],
      bashoName: "nagoya",
      year: 2025,
    });

    const hasWalkingWounded = lines.some(
      (l) => l.text.includes("Hurt Champ") && l.id.includes("-ww")
    );
    expect(hasWalkingWounded).toBe(true);

    const hasClinic = lines.some((l) => l.text.includes("Hurt Champ") && l.id.includes("-clinic"));
    expect(hasClinic).toBe(true);
  });

  it("generates growth lines for young champions (few makuuchi appearances)", () => {
    const champion = mockRikishi("champ3", {
      shikona: "Young Champ",
      rank: "maegashira",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
      careerHistory: [{ division: "makuuchi" } as any],
    });

    const world = makeMockWorld({
      rikishi: new Map([["champ3", champion]]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ3",
      junYushoIds: [],
      bashoName: "aki",
      year: 2025,
    });

    const hasGrowth = lines.some((l) => l.text.includes("Young Champ") && l.id.includes("-growth"));
    expect(hasGrowth).toBe(true);
  });

  it("does NOT generate growth lines for veteran champions (10+ makuuchi appearances)", () => {
    const careerHistory = Array.from({ length: 12 }, () => ({ division: "makuuchi" }) as any);
    const champion = mockRikishi("champ4", {
      shikona: "Vet Champ",
      rank: "yokozuna",
      division: "makuuchi",
      currentBashoWins: 15,
      currentBashoLosses: 0,
      heyaId: "heya-1",
      careerHistory,
    });

    const world = makeMockWorld({
      rikishi: new Map([["champ4", champion]]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ4",
      junYushoIds: [],
      bashoName: "hatsu",
      year: 2025,
    });

    const hasGrowth = lines.some((l) => l.id.includes("-growth"));
    expect(hasGrowth).toBe(false);
  });

  it("always generates title_parade line for champion", () => {
    const champion = mockRikishi("champ5", {
      shikona: "Parade Champ",
      rank: "yokozuna",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["champ5", champion]]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ5",
      junYushoIds: [],
      bashoName: "hatsu",
      year: 2025,
    });

    const hasParade = lines.some((l) => l.id.includes("-parade"));
    expect(hasParade).toBe(true);
  });
});

describe("PostBashoPressService — Prize Winners", () => {
  it("generates fought_match_not_situation line for prize winners", () => {
    const champion = mockRikishi("champ10", {
      shikona: "Champ",
      rank: "yokozuna",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });
    const prizeWinner = mockRikishi("prize1", {
      shikona: "Prize Fighter",
      rank: "maegashira",
      division: "makuuchi",
      currentBashoWins: 11,
      currentBashoLosses: 4,
      heyaId: "heya-2",
      birthYear: 1990,
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["champ10", champion],
        ["prize1", prizeWinner],
      ]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ10",
      junYushoIds: [],
      shukunsho: "prize1",
      bashoName: "hatsu",
      year: 2025,
    });

    const hasFoughtLine = lines.some(
      (l) => l.text.includes("Prize Fighter") && l.id.includes("-fought")
    );
    expect(hasFoughtLine).toBe(true);
  });

  it("generates veteran_emotional line for older prize winners", () => {
    const champion = mockRikishi("champ11", {
      shikona: "Champ",
      rank: "yokozuna",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });
    const veteran = mockRikishi("prize2", {
      shikona: "Old Veteran",
      rank: "maegashira",
      division: "makuuchi",
      currentBashoWins: 10,
      currentBashoLosses: 5,
      heyaId: "heya-2",
      birthYear: 1985,
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["champ11", champion],
        ["prize2", veteran],
      ]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ11",
      junYushoIds: [],
      kantosho: "prize2",
      bashoName: "hatsu",
      year: 2025,
    });

    const hasVeteranLine = lines.some(
      (l) => l.text.includes("Old Veteran") && l.id.includes("-veteran")
    );
    expect(hasVeteranLine).toBe(true);
  });

  it("does NOT generate prize winner lines when prize winner is the champion", () => {
    const champion = mockRikishi("champ12", {
      shikona: "Champ Winner",
      rank: "yokozuna",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["champ12", champion]]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ12",
      junYushoIds: [],
      shukunsho: "champ12",
      ginoSho: "champ12",
      kantosho: "champ12",
      bashoName: "hatsu",
      year: 2025,
    });

    // Should not have separate prize winner lines (only champion lines)
    const hasPrizeLines = lines.some((l) => l.id.includes("press-prize-"));
    expect(hasPrizeLines).toBe(false);
  });
});

describe("PostBashoPressService — Yokozuna Bid & Ozeki Stake", () => {
  it("generates ydc_bid continuation line for strong Ozeki (12+ wins)", () => {
    const champion = mockRikishi("champ20", {
      shikona: "Champ",
      rank: "yokozuna",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });
    const ozeki = mockRikishi("oz1", {
      shikona: "Ozeki Hopeful",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 13,
      currentBashoLosses: 2,
      heyaId: "heya-2",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["champ20", champion],
        ["oz1", ozeki],
      ]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ20",
      junYushoIds: [],
      bashoName: "hatsu",
      year: 2025,
    });

    const hasBidLine = lines.some(
      (l) => l.text.includes("Ozeki Hopeful") && l.id.includes("ydc-bid")
    );
    expect(hasBidLine).toBe(true);

    // 13+ wins should also generate score_threshold line
    const hasScoreLine = lines.some(
      (l) => l.text.includes("Ozeki Hopeful") && l.id.includes("-score")
    );
    expect(hasScoreLine).toBe(true);
  });

  it("generates ozeki_stake line for strong sekiwake (11+ wins)", () => {
    const champion = mockRikishi("champ21", {
      shikona: "Champ",
      rank: "yokozuna",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });
    const sekiwake = mockRikishi("sk1", {
      shikona: "Sekiwake Rising",
      rank: "sekiwake",
      division: "makuuchi",
      currentBashoWins: 11,
      currentBashoLosses: 4,
      heyaId: "heya-2",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["champ21", champion],
        ["sk1", sekiwake],
      ]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ21",
      junYushoIds: [],
      bashoName: "hatsu",
      year: 2025,
    });

    const hasStakeLine = lines.some(
      (l) => l.text.includes("Sekiwake Rising") && l.id.includes("ozeki-stake")
    );
    expect(hasStakeLine).toBe(true);
  });

  it("does NOT generate ydc_bid for Ozeki with less than 12 wins", () => {
    const champion = mockRikishi("champ22", {
      shikona: "Champ",
      rank: "yokozuna",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });
    const ozeki = mockRikishi("oz2", {
      shikona: "Weak Ozeki",
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 10,
      currentBashoLosses: 5,
      heyaId: "heya-2",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["champ22", champion],
        ["oz2", ozeki],
      ]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ22",
      junYushoIds: [],
      bashoName: "hatsu",
      year: 2025,
    });

    const hasBidLine = lines.some((l) => l.id.includes("ydc-bid"));
    expect(hasBidLine).toBe(false);
  });
});

describe("PostBashoPressService — PBP Line Format", () => {
  it("all generated lines have valid PbpLine structure", () => {
    const champion = mockRikishi("champ30", {
      shikona: "Format Test",
      rank: "yokozuna",
      division: "makuuchi",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      heyaId: "heya-1",
    });

    const world = makeMockWorld({
      rikishi: new Map([["champ30", champion]]),
      year: 2025,
    });

    const lines = PostBashoPressService.generatePressConference(world, {
      yushoId: "champ30",
      junYushoIds: [],
      bashoName: "hatsu",
      year: 2025,
    });

    for (const line of lines) {
      expect(typeof line.text).toBe("string");
      expect(line.text.length).toBeGreaterThan(0);
      expect(typeof line.id).toBe("string");
      expect(line.phase).toBe("post_bout");
      expect(line.tags).toContain("post_basho_press");
    }
  });
});
