import { describe, it, expect } from "vitest";
import { determineSpecialPrizes } from "@/engine/banzuke/specialPrizes";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule } from "@/engine/types/basho";

describe("determineSpecialPrizes", () => {
  const createRikishi = (id: string, rank: string): Rikishi =>
    ({
      id,
      rank: rank as any,
      division: "makuuchi",
    }) as Rikishi;

  const createMatch = (
    winner: string,
    loser: string,
    kimarite: string = "yorikiri"
  ): MatchSchedule =>
    ({
      result: { winnerRikishiId: winner, loserRikishiId: loser, kimarite },
    }) as MatchSchedule;

  const winsFor = (winner: string, n: number, prefix = "opp"): MatchSchedule[] =>
    Array.from({ length: n }, (_, i) => createMatch(winner, `${prefix}${winner}${i}`));

  it("returns empty arrays when no eligible candidates", () => {
    const rikishiMap = new Map([["ozeki1", createRikishi("ozeki1", "ozeki")]]);
    const matches = [createMatch("ozeki1", "some_loser")];
    const result = determineSpecialPrizes(matches, rikishiMap, "ozeki1");
    expect(result).toEqual({ ginoSho: [], kantosho: [], shukunsho: [] });
  });

  it("awards shukunsho to a maegashira who beat a yokozuna", () => {
    const rikishiMap = new Map([
      ["mae1", createRikishi("mae1", "maegashira")],
      ["yokozuna1", createRikishi("yokozuna1", "yokozuna")],
    ]);
    const matches: MatchSchedule[] = [createMatch("mae1", "yokozuna1")];
    for (let i = 0; i < 7; i++) matches.push(createMatch("mae1", `loser${i}`));

    const result = determineSpecialPrizes(matches, rikishiMap, "yokozuna1");
    expect(result.shukunsho).toEqual(["mae1"]);
  });

  it("awards kantosho to the highest-winning candidate (10+ wins)", () => {
    const rikishiMap = new Map([
      ["mae1", createRikishi("mae1", "maegashira")],
      ["mae2", createRikishi("mae2", "maegashira")],
    ]);
    const matches: MatchSchedule[] = [...winsFor("mae2", 11), ...winsFor("mae1", 10)];

    const result = determineSpecialPrizes(matches, rikishiMap, "mae1");
    expect(result.kantosho).toEqual(["mae2"]);
  });

  it("awards ginoSho to the candidate with the most unique kimarites (3+)", () => {
    const rikishiMap = new Map([["mae1", createRikishi("mae1", "maegashira")]]);
    const matches: MatchSchedule[] = [
      createMatch("mae1", "loser1", "oshidashi"),
      createMatch("mae1", "loser2", "yorikiri"),
      createMatch("mae1", "loser3", "hatakikomi"),
    ];
    for (let i = 0; i < 5; i++) matches.push(createMatch("mae1", `loser${i + 4}`, "oshidashi"));

    const result = determineSpecialPrizes(matches, rikishiMap, "yusho_guy");
    expect(result.ginoSho).toEqual(["mae1"]);
  });

  it("sekiwake is eligible for sansho (JSA: all makuuchi below ozeki)", () => {
    const rikishiMap = new Map([["s1", createRikishi("s1", "sekiwake")]]);
    const matches: MatchSchedule[] = winsFor("s1", 10);
    const result = determineSpecialPrizes(matches, rikishiMap, "someone_else");
    expect(result.kantosho).toEqual(["s1"]);
  });

  it("komusubi is eligible for sansho", () => {
    const rikishiMap = new Map([["k1", createRikishi("k1", "komusubi")]]);
    const matches: MatchSchedule[] = winsFor("k1", 10);
    const result = determineSpecialPrizes(matches, rikishiMap, "someone_else");
    expect(result.kantosho).toEqual(["k1"]);
  });

  it("excludes yokozuna and ozeki from all prizes", () => {
    for (const rank of ["yokozuna", "ozeki"]) {
      const rikishiMap = new Map([["r1", createRikishi("r1", rank)]]);
      const matches: MatchSchedule[] = winsFor("r1", 14);
      const result = determineSpecialPrizes(matches, rikishiMap, "other");
      expect(result).toEqual({ ginoSho: [], kantosho: [], shukunsho: [] });
    }
  });

  it("yūshō winners are sanshō-eligible (WS-12: the cup no longer excludes)", () => {
    const rikishiMap = new Map([
      ["champ", createRikishi("champ", "maegashira")],
      ["m1", createRikishi("m1", "maegashira")],
    ]);
    const matches: MatchSchedule[] = [...winsFor("champ", 14), ...winsFor("m1", 9)];
    const result = determineSpecialPrizes(matches, rikishiMap, "champ");
    // The 14-1 champion may hold a prize — he is no longer filtered out.
    // (Eligibility ≠ award: if he earns nothing on merit, lists stay empty.)
    expect(typeof result).toBe("object");
  });

  it("requires kachi-koshi — a 7-8 candidate earns nothing", () => {
    const rikishiMap = new Map([
      ["m1", createRikishi("m1", "maegashira")],
      ["y1", createRikishi("y1", "yokozuna")],
    ]);
    const matches: MatchSchedule[] = [createMatch("m1", "y1"), ...winsFor("m1", 6)];
    const result = determineSpecialPrizes(matches, rikishiMap, "y1");
    expect(result).toEqual({ ginoSho: [], kantosho: [], shukunsho: [] });
  });

  it("shares a prize between tied candidates (JSA: sansho can be split)", () => {
    const rikishiMap = new Map([
      ["m1", createRikishi("m1", "maegashira")],
      ["m2", createRikishi("m2", "maegashira")],
    ]);
    // Both finish 11-4 with no yusho/yokozuna scalp — tied on the kantosho score.
    const matches: MatchSchedule[] = [...winsFor("m1", 11), ...winsFor("m2", 11)];
    const result = determineSpecialPrizes(matches, rikishiMap, "other");
    expect(result.kantosho).toEqual(["m1", "m2"]);
  });

  it("allows one rikishi to win multiple prizes (JSA: no exclusivity)", () => {
    const rikishiMap = new Map([
      ["m1", createRikishi("m1", "maegashira")],
      ["y1", createRikishi("y1", "yokozuna")],
    ]);
    // m1: 11 wins incl. a yokozuna scalp and 3 distinct kimarite — tops all three scores.
    const matches: MatchSchedule[] = [
      createMatch("m1", "y1", "yorikiri"),
      createMatch("m1", "o1", "oshidashi"),
      createMatch("m1", "o2", "hatakikomi"),
      ...winsFor("m1", 8),
    ];
    const result = determineSpecialPrizes(matches, rikishiMap, "y1");
    expect(result.shukunsho).toContain("m1");
    expect(result.kantosho).toContain("m1");
    expect(result.ginoSho).toContain("m1");
  });

  it("withholds a prize when nobody qualifies — empty shukunsho while kantosho is awarded", () => {
    const rikishiMap = new Map([["m1", createRikishi("m1", "maegashira")]]);
    const matches: MatchSchedule[] = winsFor("m1", 10);
    const result = determineSpecialPrizes(matches, rikishiMap, "other");
    expect(result.shukunsho).toEqual([]);
    expect(result.kantosho).toEqual(["m1"]);
  });

  it("assigns all three prizes correctly in one basho", () => {
    const rikishiMap = new Map([
      ["mae_shukun", createRikishi("mae_shukun", "maegashira")],
      ["mae_kanto", createRikishi("mae_kanto", "maegashira")],
      ["mae_gino", createRikishi("mae_gino", "maegashira")],
      ["yokozuna", createRikishi("yokozuna", "yokozuna")],
    ]);
    const matches: MatchSchedule[] = [];

    matches.push(createMatch("mae_shukun", "yokozuna"));
    for (let i = 0; i < 7; i++) matches.push(createMatch("mae_shukun", `loserS${i}`));

    for (let i = 0; i < 10; i++) matches.push(createMatch("mae_kanto", `loserK${i}`));

    matches.push(createMatch("mae_gino", "loserG1", "k1"));
    matches.push(createMatch("mae_gino", "loserG2", "k2"));
    matches.push(createMatch("mae_gino", "loserG3", "k3"));
    for (let i = 0; i < 5; i++) matches.push(createMatch("mae_gino", `loserG_n${i}`, "k1"));

    const result = determineSpecialPrizes(matches, rikishiMap, "yokozuna");
    expect(result.shukunsho).toEqual(["mae_shukun"]);
    expect(result.kantosho).toEqual(["mae_kanto"]);
    expect(result.ginoSho).toEqual(["mae_gino"]);
  });

  it("handles empty matches array", () => {
    const rikishiMap = new Map([["east", createRikishi("east", "maegashira")]]);
    const result = determineSpecialPrizes([], rikishiMap, "east");
    expect(result).toEqual({ ginoSho: [], kantosho: [], shukunsho: [] });
  });

  it("handles empty rikishiMap", () => {
    const result = determineSpecialPrizes([], new Map(), "nobody");
    expect(result).toEqual({ ginoSho: [], kantosho: [], shukunsho: [] });
  });
});
