import { describe, it, expect } from "vitest";
import {
  buildOpponentModel,
  observeBoutResult,
  getOpponentDominantFamily,
  suggestCounterTactic,
} from "../../../../engine/npcAI/OpponentModel";
import type { Rikishi } from "../../../../engine/types/rikishi";

describe("OpponentModel", () => {
  it("buildOpponentModel constructs model from history", () => {
    const rikishi: Rikishi = {
      id: "r1",
      style: "yotsu",
      history: [{ kimarite: "oshidashi" }, { kimarite: "yorikiri" }, { kimarite: "yorikiri" }],
    } as unknown as Rikishi;

    const model = buildOpponentModel(rikishi, 10);
    expect(model.rikishiId).toBe("r1");
    expect(model.sampleSize).toBe(3);
    expect(model.familyCounts.belt).toBe(2);
    expect(model.familyCounts.push).toBe(1);
    expect(model.mostUsedTactic).toBe("yorikiri");
    expect(model.lastUpdated).toBe(10);
  });

  it("buildOpponentModel falls back to style if no history", () => {
    const rikishi: Rikishi = {
      id: "r2",
      style: "oshi",
      history: [],
    } as unknown as Rikishi;

    const model = buildOpponentModel(rikishi, 5);
    expect(model.sampleSize).toBe(3);
    expect(model.familyCounts.push).toBe(3);
    expect(model.lastUpdated).toBe(5);
  });

  it("observeBoutResult updates existing model", () => {
    const initialModel = {
      rikishiId: "r1",
      sampleSize: 1,
      familyCounts: { push: 1, belt: 0, trick: 0, speed: 0 },
      lastUpdated: 1,
    };
    const updated = observeBoutResult(initialModel as any, "r1", "yorikiri", 2);

    expect(updated.sampleSize).toBe(2);
    expect(updated.familyCounts.push).toBe(1);
    expect(updated.familyCounts.belt).toBe(1);
    expect(updated.lastUpdated).toBe(2);
  });

  it("getOpponentDominantFamily returns expected dominant family", () => {
    const pushModel = { familyCounts: { push: 5, belt: 3, trick: 0, speed: 0 } } as any;
    expect(getOpponentDominantFamily(pushModel)).toBe("push");
  });

  it("suggestCounterTactic returns expected counters", () => {
    const pushModel = { familyCounts: { push: 5, belt: 0, trick: 0, speed: 0 } } as any;
    expect(suggestCounterTactic(pushModel)).toBe("belt");

    const beltModel = { familyCounts: { push: 0, belt: 5, trick: 0, speed: 0 } } as any;
    expect(suggestCounterTactic(beltModel)).toBe("trick");

    const trickModel = { familyCounts: { push: 0, belt: 0, trick: 5, speed: 0 } } as any;
    expect(suggestCounterTactic(trickModel)).toBe("push");

    const speedModel = { familyCounts: { push: 0, belt: 0, trick: 0, speed: 5 } } as any;
    expect(suggestCounterTactic(speedModel)).toBe("push");
  });

  it("familyFromStyle returns default push if style is unrecognized", () => {
    const rikishi: Rikishi = {
      id: "r3",
      style: "unknown_style",
      history: [],
    } as unknown as Rikishi;

    const model = buildOpponentModel(rikishi, 5);
    expect(model.familyCounts.push).toBe(3);
  });

  it("suggestCounterTactic returns push for unknown family", () => {
    const unknownModel = {
      familyCounts: { unknown: 5, push: 0, belt: 0, trick: 0, speed: 0 },
    } as any;
    expect(suggestCounterTactic(unknownModel)).toBe("push");
  });

  it("familyFromKimarite returns push if kimarite is undefined", () => {
    const rikishi: Rikishi = {
      id: "r4",
      style: "oshi",
      history: [{ kimarite: undefined }],
    } as unknown as Rikishi;

    const model = buildOpponentModel(rikishi, 5);
    expect(model.familyCounts.push).toBe(1);
    expect(model.mostUsedTactic).toBe("unknown");
  });

  it("familyFromKimarite returns push if kimarite is unrecognized", () => {
    const rikishi: Rikishi = {
      id: "r5",
      style: "oshi",
      history: [{ kimarite: "unknown_kimarite" }],
    } as unknown as Rikishi;

    const model = buildOpponentModel(rikishi, 5);
    expect(model.familyCounts.push).toBe(1);
    expect(model.mostUsedTactic).toBe("unknown_kimarite");
  });
});
