import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "../utils";
import { makeMinimalBoutResult, makeBoutWorld } from "@/tests/helpers/boutTestHelpers";
import type { BashoName } from "@/engine/types/basho";

describe("boutNarrative generates entity link markup", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("pbpLines contain [[rikishi:...]] markup for east/west names", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", injured: false });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", injured: false });
    const world = makeBoutWorld(east, west);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "test-seed", world);

    expect(result.pbpLines).toBeDefined();
    expect(result.pbpLines!.length).toBeGreaterThan(0);

    const hasEntityLink = result.pbpLines!.some((line) =>
      /\[\[rikishi:r-(east|west):/.test(line.text)
    );
    expect(hasEntityLink).toBe(true);
  });

  it("finish line contains [[rikishi:...]] markup for winner and loser", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", injured: false });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", injured: false });
    const world = makeBoutWorld(east, west);
    const result = makeMinimalBoutResult({ winner: "east" });

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "test-seed-finish", world);

    const finishLine = result.pbpLines?.find((l) => l.phase === "finish");
    expect(finishLine).toBeDefined();
    expect(finishLine!.text).toMatch(/\[\[rikishi:/);
  });
});
