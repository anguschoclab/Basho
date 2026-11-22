import { describe, it, expect } from "vitest";
import { determineSpecialPrizes } from "@/engine/banzuke/specialPrizes";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule } from "@/engine/types/basho";

/**
 * Spec (RED) — JSA sanshō realism.
 *
 * Real JSA rules (2026 dataset):
 *  - The yūshō winner IS eligible for special prizes — the Emperor's Cup
 *    does not disqualify a sub-Ōzeki rikishi from the three sanshō.
 *    (Current code excludes `r.id === yushoId` at specialPrizes.ts:81.)
 *  - Awards are conditional on the senshuraku result when announced:
 *    a conditional award is forfeited if the winner loses on Day 15.
 *  - The committee is shimpan + press + ijiin — composition metadata
 *    should be visible on deliberation records.
 */
const rikishi = (id: string, rank: string): Rikishi =>
  ({ id, rank: rank as Rikishi["rank"], division: "makuuchi" }) as Rikishi;

const bout = (winner: string, loser: string, kimarite = "yorikiri"): MatchSchedule =>
  ({ result: { winnerRikishiId: winner, loserRikishiId: loser, kimarite } }) as MatchSchedule;

const winsFor = (winner: string, n: number, prefix = "opp"): MatchSchedule[] =>
  Array.from({ length: n }, (_, i) => bout(winner, `${prefix}${winner}${i}`));

describe("sanshō spec — yūshō winner eligibility", () => {
  it("a maegashira yūshō winner remains eligible for special prizes", () => {
    const map = new Map([["champ", rikishi("champ", "maegashira")]]);
    const matches: MatchSchedule[] = [
      ...winsFor("champ", 14),
      bout("champ", "finalOpp", "uwatenage"),
    ];
    // "champ" is the yūshō winner — he should still score a sanshō
    // (his 15-0 record and widest kimarite repertoire merit gino-shō
    // at minimum; at least one prize must land).
    const result = determineSpecialPrizes(matches, map, "champ");
    const total = result.ginoSho.length + result.kantosho.length + result.shukunsho.length;
    expect(total).toBeGreaterThan(0);
  });

  it("a 14-1 yūshō winner who beat a yokozuna can take shukun-shō", () => {
    const map = new Map([
      ["champ", rikishi("champ", "maegashira")],
      ["y1", rikishi("y1", "yokozuna")],
      ["runner", rikishi("runner", "maegashira")],
    ]);
    const matches: MatchSchedule[] = [
      bout("champ", "y1"), // beat the yokozuna
      ...winsFor("champ", 13, "x"),
      ...winsFor("runner", 10, "r"),
    ];
    const result = determineSpecialPrizes(matches, map, "champ");
    expect(result.shukunsho).toContain("champ");
  });
});

describe("sanshō spec — committee composition metadata", () => {
  it("deliberation records expose shimpan+press+ijiin composition", () => {
    const map = new Map([["m1", rikishi("m1", "maegashira")]]);
    const matches: MatchSchedule[] = winsFor("m1", 11);
    const result = determineSpecialPrizes(matches, map, "champ");
    for (const d of result.deliberations ?? []) {
      // Each committee decision should record its panel composition —
      // the real sanshō committee is shimpan + press + ijiin, not a
      // faceless score.
      expect(d.composition).toBeDefined();
    }
  });
});
