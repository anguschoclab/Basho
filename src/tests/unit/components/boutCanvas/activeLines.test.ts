import { describe, it, expect } from "vitest";
import { computeActiveLineIndices } from "@/components/game/boutReplay/boutCanvas/activeLines";
import type { PbpLine } from "@/engine/bout/boutNarrative";

function makeLine(phase: PbpLine["phase"], text = "test"): PbpLine {
  return { text, id: `id-${text}`, phase };
}

describe("computeActiveLineIndices", () => {
  it("phaseIndex 0 (ritual) matches opening, entrance, ritual lines", () => {
    const lines = [
      makeLine("opening"),
      makeLine("entrance"),
      makeLine("ritual"),
      makeLine("tachiai"),
    ];
    const result = computeActiveLineIndices(0, lines);
    expect(result).toEqual(new Set([0, 1, 2]));
  });

  it("phaseIndex 1 (tachiai) matches only tachiai lines", () => {
    const lines = [makeLine("tachiai"), makeLine("engagement"), makeLine("tachiai")];
    const result = computeActiveLineIndices(1, lines);
    expect(result).toEqual(new Set([0, 2]));
  });

  it("phaseIndex 2 (clinch) matches clinch + engagement lines", () => {
    const lines = [makeLine("clinch"), makeLine("engagement"), makeLine("momentum")];
    const result = computeActiveLineIndices(2, lines);
    expect(result).toEqual(new Set([0, 1]));
  });

  it("phaseIndex 3 (momentum) matches momentum + tactical + edge_crisis lines", () => {
    const lines = [
      makeLine("momentum"),
      makeLine("tactical"),
      makeLine("edge_crisis"),
      makeLine("finish"),
    ];
    const result = computeActiveLineIndices(3, lines);
    expect(result).toEqual(new Set([0, 1, 2]));
  });

  it("phaseIndex 5 (ceremony) matches ceremony + award + closing lines", () => {
    const lines = [
      makeLine("ceremony"),
      makeLine("award"),
      makeLine("closing"),
      makeLine("finish"),
    ];
    const result = computeActiveLineIndices(5, lines);
    expect(result).toEqual(new Set([0, 1, 2]));
  });

  it("phaseIndex 6 (complete) returns empty set", () => {
    const lines = [makeLine("ceremony"), makeLine("finish")];
    const result = computeActiveLineIndices(6, lines);
    expect(result.size).toBe(0);
  });

  it("lines with no phase (undefined) are not in set", () => {
    const lines: PbpLine[] = [{ text: "no phase", id: "a" }, makeLine("ritual")];
    const result = computeActiveLineIndices(0, lines);
    expect(result).toEqual(new Set([1]));
  });

  it("empty pbpLines returns empty set", () => {
    const result = computeActiveLineIndices(0, []);
    expect(result.size).toBe(0);
  });

  it("negative phaseIndex returns empty set", () => {
    const lines = [makeLine("ritual")];
    const result = computeActiveLineIndices(-1, lines);
    expect(result.size).toBe(0);
  });

  it("phaseIndex too high returns empty set (clamps to complete)", () => {
    const lines = [makeLine("ritual")];
    const result = computeActiveLineIndices(99, lines);
    expect(result.size).toBe(0);
  });

  it("duplicate phase matches: two ritual lines → both in set", () => {
    const lines = [makeLine("ritual", "a"), makeLine("ritual", "b")];
    const result = computeActiveLineIndices(0, lines);
    expect(result).toEqual(new Set([0, 1]));
  });
});
