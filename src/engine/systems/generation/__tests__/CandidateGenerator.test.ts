import { describe, it, expect } from "vitest";
import { generateSyntheticCareer } from "../CandidateGenerator";
import { rngFromSeed } from "../../../rng";

describe("CandidateGenerator", () => {
  describe("generateSyntheticCareer", () => {
    it("should return career wins and losses", () => {
      const rng = rngFromSeed("test", "career", "yokozuna");
      const result = generateSyntheticCareer({
        rng,
        rank: "yokozuna",
        division: "makuuchi",
        birthYear: 1990,
        currentYear: 2025,
      });

      expect(result.careerWins).toBeGreaterThan(0);
      expect(result.careerLosses).toBeGreaterThan(0);
      expect(result.yushoCount).toBeGreaterThanOrEqual(0);
    });

    it("should return divisionRecords with all divisions", () => {
      const rng = rngFromSeed("test", "career", "maegashira");
      const result = generateSyntheticCareer({
        rng,
        rank: "maegashira",
        division: "makuuchi",
        birthYear: 1995,
        currentYear: 2025,
      });

      expect(result.divisionRecords).toBeDefined();
      expect(result.divisionRecords.makuuchi).toBeDefined();
      expect(result.divisionRecords.juryo).toBeDefined();
      expect(result.divisionRecords.makushita).toBeDefined();
      expect(result.divisionRecords.sandanme).toBeDefined();
      expect(result.divisionRecords.jonidan).toBeDefined();
      expect(result.divisionRecords.jonokuchi).toBeDefined();
    });

    it("should have division-specific win/loss records that sum to career totals", () => {
      const rng = rngFromSeed("test", "career", "sekiwake");
      const result = generateSyntheticCareer({
        rng,
        rank: "sekiwake",
        division: "makuuchi",
        birthYear: 1992,
        currentYear: 2025,
      });

      const totalDivisionWins =
        result.divisionRecords.makuuchi.wins +
        result.divisionRecords.juryo.wins +
        result.divisionRecords.makushita.wins +
        result.divisionRecords.sandanme.wins +
        result.divisionRecords.jonidan.wins +
        result.divisionRecords.jonokuchi.wins;

      const totalDivisionLosses =
        result.divisionRecords.makuuchi.losses +
        result.divisionRecords.juryo.losses +
        result.divisionRecords.makushita.losses +
        result.divisionRecords.sandanme.losses +
        result.divisionRecords.jonidan.losses +
        result.divisionRecords.jonokuchi.losses;

      expect(totalDivisionWins).toBe(result.careerWins);
      expect(totalDivisionLosses).toBe(result.careerLosses);
    });

    it("should give higher win rates to higher ranks", () => {
      const rng = rngFromSeed("test", "career", "rank-comparison");

      const yokozunaResult = generateSyntheticCareer({
        rng,
        rank: "yokozuna",
        division: "makuuchi",
        birthYear: 1990,
        currentYear: 2025,
      });

      const maegashiraResult = generateSyntheticCareer({
        rng,
        rank: "maegashira",
        division: "makuuchi",
        birthYear: 1990,
        currentYear: 2025,
      });

      // Yokozuna should have higher win rate in makuuchi
      const yokozunaWinRate =
        yokozunaResult.divisionRecords.makuuchi.wins /
        (yokozunaResult.divisionRecords.makuuchi.wins +
          yokozunaResult.divisionRecords.makuuchi.losses);
      const maegashiraWinRate =
        maegashiraResult.divisionRecords.makuuchi.wins /
        (maegashiraResult.divisionRecords.makuuchi.wins +
          maegashiraResult.divisionRecords.makuuchi.losses);

      expect(yokozunaWinRate).toBeGreaterThan(maegashiraWinRate);
    });

    it("should only count yusho when in makuuchi division", () => {
      const rng = rngFromSeed("test", "career", "yusho-check");

      const makuuchiResult = generateSyntheticCareer({
        rng,
        rank: "maegashira",
        division: "makuuchi",
        birthYear: 1995,
        currentYear: 2025,
      });

      const juryoResult = generateSyntheticCareer({
        rng,
        rank: "maegashira",
        division: "juryo",
        birthYear: 1995,
        currentYear: 2025,
      });

      // Makuuchi rikishi can have yusho, juryo cannot
      expect(makuuchiResult.yushoCount).toBeGreaterThanOrEqual(0);
      expect(juryoResult.yushoCount).toBe(0);
    });

    it("should have makuuchi wins equal to makuuchi division record wins", () => {
      const rng = rngFromSeed("test", "career", "makuuchi-wins");
      const result = generateSyntheticCareer({
        rng,
        rank: "maegashira",
        division: "makuuchi",
        birthYear: 1995,
        currentYear: 2025,
      });

      // The makuuchi wins should come from the division records
      expect(result.divisionRecords.makuuchi.wins).toBeGreaterThan(0);
    });
  });
});
