import { describe, it, expect } from "vitest";
import { mockRikishi } from "../utils";
import {
  buildOpponentModel,
  observeBoutResult,
  suggestCounterTactic,
} from "@/engine/npcAI/OpponentModel";

describe("buildOpponentModel", () => {
  it("builds counts from recent match history kimarite", () => {
    const rikishi = mockRikishi("r1", {
      history: [
        { opponentId: "a", win: true, kimarite: "oshidashi", bashoId: "b1", day: 1, year: 2025 },
        { opponentId: "b", win: true, kimarite: "yorikiri", bashoId: "b1", day: 2, year: 2025 },
        { opponentId: "c", win: false, kimarite: "oshidashi", bashoId: "b1", day: 3, year: 2025 },
        { opponentId: "d", win: true, kimarite: "henka", bashoId: "b1", day: 4, year: 2025 },
      ],
    });

    const model = buildOpponentModel(rikishi, 10);
    expect(model.rikishiId).toBe("r1");
    expect(model.familyCounts.push).toBe(2);
    expect(model.familyCounts.belt).toBe(1);
    expect(model.familyCounts.trick).toBe(1);
    expect(model.familyCounts.speed).toBe(0);
    expect(model.sampleSize).toBe(4);
  });

  it("falls back to style when history is sparse", () => {
    const rikishi = mockRikishi("r1", {
      style: "yotsu",
      history: [],
      combatProfile: {
        familyPreferences: { push: 20, belt: 60, trick: 10, speed: 10 },
      },
    });

    const model = buildOpponentModel(rikishi, 10);
    expect(model.familyCounts.belt).toBeGreaterThan(model.familyCounts.push);
  });

  it("uses only the last 20 history entries", () => {
    const history = Array.from({ length: 25 }, (_, i) => ({
      opponentId: `o${i}`,
      win: true,
      kimarite: "oshidashi",
      bashoId: "b1",
      day: i + 1,
      year: 2025,
    }));
    const rikishi = mockRikishi("r1", { history });
    const model = buildOpponentModel(rikishi, 10);
    expect(model.sampleSize).toBe(20);
  });

  it("tracks the most-used kimarite when available", () => {
    const rikishi = mockRikishi("r1", {
      history: [
        { opponentId: "a", win: true, kimarite: "oshidashi", bashoId: "b1", day: 1, year: 2025 },
        { opponentId: "b", win: true, kimarite: "oshidashi", bashoId: "b1", day: 2, year: 2025 },
        { opponentId: "c", win: false, kimarite: "yorikiri", bashoId: "b1", day: 3, year: 2025 },
      ],
    });

    const model = buildOpponentModel(rikishi, 10);
    expect(model.mostUsedTactic).toBe("oshidashi");
  });
});

describe("observeBoutResult", () => {
  it("increments the correct family and updates timestamp", () => {
    const model = buildOpponentModel(mockRikishi("r1", { history: [] }), 5);
    const updated = observeBoutResult(model, "r1", "yorikiri", 6);
    expect(updated.familyCounts.belt).toBeGreaterThan(model.familyCounts.belt);
    expect(updated.lastUpdated).toBe(6);
    expect(updated.sampleSize).toBe(model.sampleSize + 1);
  });
});

describe("suggestCounterTactic", () => {
  it("suggests belt against a push-dominant opponent", () => {
    const model = buildOpponentModel(
      mockRikishi("r1", {
        style: "oshi",
        history: Array.from({ length: 10 }, () => ({
          opponentId: "a",
          win: true,
          kimarite: "oshidashi",
          bashoId: "b1",
          day: 1,
          year: 2025,
        })),
      }),
      10
    );
    expect(suggestCounterTactic(model)).toBe("belt");
  });

  it("suggests push against a belt-dominant opponent", () => {
    const model = buildOpponentModel(
      mockRikishi("r1", {
        style: "yotsu",
        history: Array.from({ length: 10 }, () => ({
          opponentId: "a",
          win: true,
          kimarite: "yorikiri",
          bashoId: "b1",
          day: 1,
          year: 2025,
        })),
      }),
      10
    );
    expect(suggestCounterTactic(model)).toBe("trick");
  });
});
