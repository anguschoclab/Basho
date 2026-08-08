import { describe, it, expect } from "vitest";
import { boundHistoryArrays } from "@/engine/tick/phases/boundHistoryArrays";
import type { BashoResult, AwardLogEntry } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeBashoResult(id: string, year: number): BashoResult {
  return {
    id,
    year,
    bashoNumber: 1,
    bashoName: "hatsu",
    yusho: "r1",
    junYusho: [],
    winnerId: "r1",
    finalDay: 15,
    standings: new Map(),
  } as any;
}

function makeAwardLogEntry(id: string): AwardLogEntry {
  return {
    bashoId: id,
    year: 2026,
    bashoName: "hatsu",
    awards: [],
  } as any;
}

describe("History array bounding (B2.5)", () => {
  it("bounds world.history to HISTORY_MAX_ENTRIES", () => {
    const history: BashoResult[] = [];
    for (let i = 0; i < 600; i++) {
      history.push(makeBashoResult(`b${i}`, 2020 + Math.floor(i / 6)));
    }
    const world = MockFactory.createWorld({ history });
    const bounded = boundHistoryArrays(world);

    expect(bounded.history.length).toBeLessThanOrEqual(500);
    // Most recent entries should be retained
    expect(bounded.history[bounded.history.length - 1].id).toBe("b599");
  });

  it("bounds world.awardLog to HISTORY_MAX_ENTRIES", () => {
    const awardLog: AwardLogEntry[] = [];
    for (let i = 0; i < 600; i++) {
      awardLog.push(makeAwardLogEntry(`a${i}`));
    }
    const world = MockFactory.createWorld({ awardLog } as any);
    const bounded = boundHistoryArrays(world);

    expect((bounded.awardLog ?? []).length).toBeLessThanOrEqual(500);
  });

  it("does not truncate arrays under the cap", () => {
    const history: BashoResult[] = [];
    for (let i = 0; i < 100; i++) {
      history.push(makeBashoResult(`b${i}`, 2020 + Math.floor(i / 6)));
    }
    const world = MockFactory.createWorld({ history });
    const bounded = boundHistoryArrays(world);

    expect(bounded.history.length).toBe(100);
  });

  it("preserves most recent entries when truncating", () => {
    const history: BashoResult[] = [];
    for (let i = 0; i < 550; i++) {
      history.push(makeBashoResult(`b${i}`, 2020 + Math.floor(i / 6)));
    }
    const world = MockFactory.createWorld({ history });
    const bounded = boundHistoryArrays(world);

    // Should keep the last 500 entries
    expect(bounded.history.length).toBe(500);
    expect(bounded.history[0].id).toBe("b50");
    expect(bounded.history[499].id).toBe("b549");
  });

  it("returns world unchanged when arrays are small", () => {
    const world = MockFactory.createWorld({
      history: [makeBashoResult("b1", 2026)],
    });
    const bounded = boundHistoryArrays(world);

    expect(bounded.history.length).toBe(1);
  });
});
