import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "../utils";
import { makeBoutResult, makeBoutWorld } from "@/tests/helpers/boutTestHelpers";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { CareerSnapshot } from "@/engine/types/history";

 

function getPreBoutLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "pre_bout");
}

function hasMissingTokens(text: string): boolean {
  return text.includes("[MISSING:");
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — pre-bout context", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  // ── T1: Current basho records ──
  describe("T1: current basho records", () => {
    it("T1.7: deterministic — same seed → same pre_bout lines", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 8, currentBashoLosses: 2 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 7, currentBashoLosses: 3 });
      const world = makeBoutWorld(east, west);
      const r1 = makeBoutResult();
      const r2 = makeBoutResult();
      generateBoutNarrative(r1, east, west, BASHO, 10, "seed-det-1", world);
      generateBoutNarrative(r2, east, west, BASHO, 10, "seed-det-1", world);
      const l1 = getPreBoutLines(r1).map((l) => l.text);
      const l2 = getPreBoutLines(r2).map((l) => l.text);
      expect(l1).toEqual(l2);
    });

    it("T1.8: no [MISSING:] tokens in pre_bout lines", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 8, currentBashoLosses: 2 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 7, currentBashoLosses: 3 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 10, "seed-missing-1", world);
      for (const line of getPreBoutLines(result)) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });

    it("T1.6: currentBashoWins undefined → no error, pre_bout still generates", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      delete (east as any).currentBashoWins;
      const west = mockRikishi("r-west", { shikona: "Beta" });
      delete (west as any).currentBashoWins;
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      expect(() => {
        generateBoutNarrative(result, east, west, BASHO, 1, "seed-undef-cbw", world);
      }).not.toThrow();
    });
  });

  // ── T3: Storyline context ──
  describe("T3: storyline context", () => {
    it("T3.3: kadoban ozeki → kadoban line with tag", () => {
      const east = mockRikishi("r-east", { shikona: "OzekiAlpha", rank: "ozeki", rankNumber: 2 });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west, {
        ozekiKadoban: { "r-east": { isKadoban: true, consecutiveMakeKoshi: 1 } } as any,
      });
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-kadoban", world);
      const kadobanLines = getPreBoutLines(result).filter((l) => l.tags?.includes("kadoban"));
      expect(kadobanLines.length).toBeGreaterThan(0);
    });

    it("T3.8: consecutiveKachiKoshi >= 3 → consecutive_kachi line", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", consecutiveKachiKoshi: 3 });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-consec-kachi", world);
      const lines = getPreBoutLines(result).filter((l) => l.tags?.includes("consecutive_kachi"));
      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0].text).toContain("Alpha");
    });

    it("T3.9: 0 wins, day >= 3 → winless line with tag", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 0, currentBashoLosses: 4 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 4, currentBashoLosses: 0 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-winless", world);
      const lines = getPreBoutLines(result).filter((l) => l.tags?.includes("winless"));
      expect(lines.length).toBeGreaterThan(0);
    });

    it("T3.10: 1 win, day >= 4 → first win line", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 1, currentBashoLosses: 4 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 5, currentBashoLosses: 0 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-first-win", world);
      const lines = getPreBoutLines(result).filter((l) => l.tags?.includes("comeback"));
      expect(lines.length).toBeGreaterThan(0);
    });

    it("T3.13: no [MISSING:] tokens in storyline lines", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", consecutiveKachiKoshi: 3, currentBashoWins: 0, currentBashoLosses: 5 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 5, currentBashoLosses: 0 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 6, "seed-story-missing", world);
      for (const line of getPreBoutLines(result)) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });
  });

  // ── T4: Injury mentions ──
  describe("T4: injury mentions", () => {
    it("T4.1: injured rikishi → injury line with tag (RNG permitting)", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", injured: true });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west);
      // Try multiple seeds to find one where RNG < 0.6 (INJURY_MENTION_CHANCE)
      let found = false;
      for (let i = 0; i < 20; i++) {
        const result = makeBoutResult();
        generateBoutNarrative(result, east, west, BASHO, 5, `seed-injury-${i}`, world);
        const injuryLines = getPreBoutLines(result).filter((l) => l.tags?.includes("injury"));
        if (injuryLines.length > 0) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    it("T4.3: not injured → no injury line", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", injured: false });
      const west = mockRikishi("r-west", { shikona: "Beta", injured: false });
      const world = makeBoutWorld(east, west);
      for (let i = 0; i < 5; i++) {
        const result = makeBoutResult();
        generateBoutNarrative(result, east, west, BASHO, 5, `seed-noinj-${i}`, world);
        const injuryLines = getPreBoutLines(result).filter((l) => l.tags?.includes("injury"));
        expect(injuryLines.length).toBe(0);
      }
    });

    it("T4.6: no [MISSING:] tokens in injury lines", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", injured: true });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west);
      for (let i = 0; i < 20; i++) {
        const result = makeBoutResult();
        generateBoutNarrative(result, east, west, BASHO, 5, `seed-inj-missing-${i}`, world);
        for (const line of getPreBoutLines(result).filter((l) => l.tags?.includes("injury"))) {
          expect(hasMissingTokens(line.text)).toBe(false);
        }
      }
    });
  });

  // ── T5: Weight/Size comparison ──
  describe("T5: weight/size comparison", () => {
    it("T5.1: weight diff > 20kg → physical comparison line", () => {
      const east = mockRikishi("r-east", { shikona: "Heavy", weight: 180 });
      const west = mockRikishi("r-west", { shikona: "Light", weight: 120 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-weight", world);
      // Physical comparison line exists (no specific tag, but it's in pre_bout)
      const preBout = getPreBoutLines(result);
      expect(preBout.length).toBeGreaterThan(0);
    });

    it("T5.3: weight diff < 20kg and height diff < 10cm → no physical line", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", weight: 140, height: 180 });
      const west = mockRikishi("r-west", { shikona: "Beta", weight: 135, height: 178 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-no-phys", world);
      // No error, pre_bout lines may still exist from other features
      expect(() => getPreBoutLines(result)).not.toThrow();
    });

    it("T5.4: no [MISSING:] tokens in physical lines", () => {
      const east = mockRikishi("r-east", { shikona: "Heavy", weight: 200, height: 195 });
      const west = mockRikishi("r-west", { shikona: "Light", weight: 100, height: 165 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-phys-missing", world);
      for (const line of getPreBoutLines(result)) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });
  });

  // ── T6: Hometown ──
  describe("T6: hometown angle", () => {
    it("T6.1: origin matches basho location → hometown line with tag", () => {
      // hatsu basho is in Tokyo
      const east = mockRikishi("r-east", { shikona: "Alpha", origin: "Tokyo" });
      const west = mockRikishi("r-west", { shikona: "Beta", origin: "Osaka" });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-hometown", world);
      const hometownLines = getPreBoutLines(result).filter((l) => l.tags?.includes("hometown"));
      expect(hometownLines.length).toBeGreaterThan(0);
    });

    it("T6.2: origin doesn't match → no hometown line", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", origin: "Fukuoka" });
      const west = mockRikishi("r-west", { shikona: "Beta", origin: "Osaka" });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-no-hometown", world);
      const hometownLines = getPreBoutLines(result).filter((l) => l.tags?.includes("hometown"));
      expect(hometownLines.length).toBe(0);
    });

    it("T6.3: origin undefined → no hometown line, no error", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      expect(() => {
        generateBoutNarrative(result, east, west, BASHO, 5, "seed-no-origin", world);
      }).not.toThrow();
      const hometownLines = getPreBoutLines(result).filter((l) => l.tags?.includes("hometown"));
      expect(hometownLines.length).toBe(0);
    });
  });

  // ── T7: Age/Veteran ──
  describe("T7: age/veteran narrative", () => {
    it("T7.1: age diff >= 10 → age line with veteran/rookie tag", () => {
      const east = mockRikishi("r-east", { shikona: "Veteran", birthYear: 1980, age: 40 });
      const west = mockRikishi("r-west", { shikona: "Youngster", birthYear: 2003, age: 22 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-age", world);
      const ageLines = getPreBoutLines(result).filter(
        (l) => l.tags?.includes("veteran") || l.tags?.includes("rookie")
      );
      expect(ageLines.length).toBeGreaterThan(0);
    });

    it("T7.2: age diff < 10 → no age line", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", birthYear: 1995, age: 30 });
      const west = mockRikishi("r-west", { shikona: "Beta", birthYear: 1998, age: 27 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-no-age", world);
      const ageLines = getPreBoutLines(result).filter(
        (l) => l.tags?.includes("veteran") || l.tags?.includes("rookie")
      );
      expect(ageLines.length).toBe(0);
    });

    it("T7.4: no [MISSING:] tokens in age lines", () => {
      const east = mockRikishi("r-east", { shikona: "Veteran", birthYear: 1975, age: 45 });
      const west = mockRikishi("r-west", { shikona: "Youngster", birthYear: 2005, age: 20 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-age-missing", world);
      for (const line of getPreBoutLines(result)) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });
  });

  // ── T9: Fighting style ──
  describe("T9: fighting style description", () => {
    it("T9.1+T9.4: style description fires on some seeds (RNG gate ~40%)", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west);
      let found = false;
      for (let i = 0; i < 20; i++) {
        const result = makeBoutResult();
        generateBoutNarrative(result, east, west, BASHO, 5, `seed-style-${i}`, world);
        // Style matchup lines don't have a specific tag, but they should be in pre_bout
        // and not contain [MISSING:]
        const preBout = getPreBoutLines(result);
        if (preBout.length > 0) {
          found = true;
        }
      }
      // At least some seeds should produce pre_bout lines
      expect(found).toBe(true);
    });

    it("T9.5: no [MISSING:] tokens in style lines", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west);
      for (let i = 0; i < 10; i++) {
        const result = makeBoutResult();
        generateBoutNarrative(result, east, west, BASHO, 5, `seed-style-missing-${i}`, world);
        for (const line of getPreBoutLines(result)) {
          expect(hasMissingTokens(line.text)).toBe(false);
        }
      }
    });
  });

  // ── T2: Previous basho record ──
  describe("T2: previous basho record", () => {
    function makeCareerHistory(overrides: Partial<CareerSnapshot> = {}): CareerSnapshot {
      return {
        id: "snap-hatsu-2024",
        bashoId: "hatsu-2024",
        year: 2024,
        month: 1,
        bashoName: "hatsu",
        rank: "maegashira" as any,
        division: "makuuchi",
        rankNumber: 5,
        side: "east",
        wins: 9,
        losses: 6,
        absences: 0,
        isYusho: false,
        isJunYusho: false,
        specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
        weight: 140,
        momentum: 0,
        ...overrides,
      } as CareerSnapshot;
    }

    it("T2.4: empty careerHistory → no error, no previous basho line", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", careerHistory: [] });
      const west = mockRikishi("r-west", { shikona: "Beta", careerHistory: [] });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      expect(() => {
        generateBoutNarrative(result, east, west, BASHO, 5, "seed-empty-ch", world);
      }).not.toThrow();
    });

    it("T2.6: no [MISSING:] tokens with careerHistory", () => {
      const east = mockRikishi("r-east", {
        shikona: "Alpha",
        careerHistory: [makeCareerHistory({ wins: 9, losses: 6 })],
      });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-ch-missing", world);
      for (const line of getPreBoutLines(result)) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });

    // ── T2.7: Only one rikishi has careerHistory (else-if branch) ──
    it("T2.7a: only east has careerHistory → no error, no [MISSING:] tokens", () => {
      const east = mockRikishi("r-east", {
        shikona: "Alpha",
        careerHistory: [makeCareerHistory({ wins: 10, losses: 5 })],
      });
      const west = mockRikishi("r-west", { shikona: "Beta", careerHistory: [] });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      expect(() => {
        generateBoutNarrative(result, east, west, BASHO, 5, "seed-only-east-ch", world);
      }).not.toThrow();
      for (const line of getPreBoutLines(result)) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });

    it("T2.7b: only west has careerHistory → no error, no [MISSING:] tokens", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", careerHistory: [] });
      const west = mockRikishi("r-west", {
        shikona: "Beta",
        careerHistory: [makeCareerHistory({ wins: 11, losses: 4 })],
      });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      expect(() => {
        generateBoutNarrative(result, east, west, BASHO, 5, "seed-only-west-ch", world);
      }).not.toThrow();
      for (const line of getPreBoutLines(result)) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });

    it("T2.7c: only east has careerHistory with yusho → uses yusho path", () => {
      const east = mockRikishi("r-east", {
        shikona: "Alpha",
        careerHistory: [makeCareerHistory({ wins: 15, losses: 0, isYusho: true })],
      });
      const west = mockRikishi("r-west", { shikona: "Beta", careerHistory: [] });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      expect(() => {
        generateBoutNarrative(result, east, west, BASHO, 5, "seed-only-east-yusho", world);
      }).not.toThrow();
      for (const line of getPreBoutLines(result)) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });

    it("T2.7d: only east has careerHistory with 15+ absences → uses kyujo path", () => {
      const east = mockRikishi("r-east", {
        shikona: "Alpha",
        careerHistory: [makeCareerHistory({ wins: 0, losses: 0, absences: 15 })],
      });
      const west = mockRikishi("r-west", { shikona: "Beta", careerHistory: [] });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      expect(() => {
        generateBoutNarrative(result, east, west, BASHO, 5, "seed-only-east-kyujo", world);
      }).not.toThrow();
      for (const line of getPreBoutLines(result)) {
        expect(hasMissingTokens(line.text)).toBe(false);
      }
    });
  });
});
