import { describe, it, expect } from "vitest";
import { determineSpecialPrizes } from "../banzuke/specialPrizes";
import type { Rikishi } from "../types/rikishi";
import type { MatchSchedule } from "../types/basho";

describe("determineSpecialPrizes", () => {
  const createRikishi = (id: string, rank: string): Rikishi => ({
    id,
    rank: rank as any,
    division: "makuuchi",
  } as Rikishi);

  const createMatch = (winner: string, loser: string, kimarite: string = "yorikiri"): MatchSchedule => ({
    result: { winnerRikishiId: winner, loserRikishiId: loser, kimarite },
  } as MatchSchedule);

  it("returns empty result if no maegashira candidates", () => {
    const rikishiMap = new Map([
      ["ozeki1", createRikishi("ozeki1", "ozeki")],
    ]);
    const matches = [createMatch("ozeki1", "some_loser")];
    const result = determineSpecialPrizes(matches, rikishiMap, "ozeki1");
    expect(result).toEqual({});
  });

  it("awards shukunsho to a maegashira who beat a yokozuna", () => {
    const rikishiMap = new Map([
      ["mae1", createRikishi("mae1", "maegashira")],
      ["yokozuna1", createRikishi("yokozuna1", "yokozuna")],
    ]);
    const matches: MatchSchedule[] = [
      createMatch("mae1", "yokozuna1"),
    ];
    for (let i = 0; i < 7; i++) matches.push(createMatch("mae1", `loser${i}`));

    const result = determineSpecialPrizes(matches, rikishiMap, "yokozuna1");
    expect(result.shukunsho).toBe("mae1");
  });

  it("awards kantosho to highest winning maegashira without shukunsho", () => {
    const rikishiMap = new Map([
      ["mae1", createRikishi("mae1", "maegashira")],
      ["mae2", createRikishi("mae2", "maegashira")],
    ]);
    const matches: MatchSchedule[] = [];
    for (let i = 0; i < 11; i++) matches.push(createMatch("mae2", `loserA${i}`));
    for (let i = 0; i < 10; i++) matches.push(createMatch("mae1", `loserB${i}`));

    const result = determineSpecialPrizes(matches, rikishiMap, "mae1");
    expect(result.kantosho).toBe("mae2");
  });

  it("awards ginoSho to maegashira with at least 3 unique kimarites without other prizes", () => {
    const rikishiMap = new Map([
      ["mae1", createRikishi("mae1", "maegashira")],
    ]);
    const matches: MatchSchedule[] = [
      createMatch("mae1", "loser1", "oshidashi"),
      createMatch("mae1", "loser2", "yorikiri"),
      createMatch("mae1", "loser3", "hatakikomi"),
    ];
    for (let i = 0; i < 5; i++) matches.push(createMatch("mae1", `loser${i + 4}`, "oshidashi"));

    const result = determineSpecialPrizes(matches, rikishiMap, "yusho_guy");
    expect(result.ginoSho).toBe("mae1");
  });

  it("assigns all prizes simultaneously correctly", () => {
    const rikishiMap = new Map([
      ["mae_shukun", createRikishi("mae_shukun", "maegashira")],
      ["mae_kanto", createRikishi("mae_kanto", "maegashira")],
      ["mae_gino", createRikishi("mae_gino", "maegashira")],
      ["yokozuna", createRikishi("yokozuna", "yokozuna")],
    ]);
    const matches: MatchSchedule[] = [];

    // Shukun
    matches.push(createMatch("mae_shukun", "yokozuna"));
    for (let i = 0; i < 7; i++) matches.push(createMatch("mae_shukun", `loserS${i}`));

    // Kanto
    for(let i = 0; i < 10; i++) matches.push(createMatch("mae_kanto", `loserK${i}`));

    // Gino
    matches.push(createMatch("mae_gino", "loserG1", "k1"));
    matches.push(createMatch("mae_gino", "loserG2", "k2"));
    matches.push(createMatch("mae_gino", "loserG3", "k3"));
    for(let i = 0; i < 5; i++) matches.push(createMatch("mae_gino", `loserG_n${i}`, "k1"));

    const result = determineSpecialPrizes(matches, rikishiMap, "yokozuna");
    expect(result.shukunsho).toBe("mae_shukun");
    expect(result.kantosho).toBe("mae_kanto");
    expect(result.ginoSho).toBe("mae_gino");
  });
});
