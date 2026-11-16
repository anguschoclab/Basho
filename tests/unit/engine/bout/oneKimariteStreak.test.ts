/**
 * W G — pre_bout.one_kimarite_streak.
 *
 * basho.boutMetrics[id].kimariteUsed tallies the winner's deciding
 * kimarite per win this basho. When a rikishi has ≥3 wins ALL by the
 * same technique, the pre-bout beat names it ("every win by yorikiri").
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BashoName } from "@/engine/types/basho";

function metrics(winsByKimarite: Record<string, number>) {
  return {
    kimariteUsed: winsByKimarite,
    upsetCount: 0,
    boutDurations: [],
    edgeCrisisSurvived: 0,
    comebackWins: 0,
    opponentTiers: [],
  };
}

function narrate(kimariteUsed: Record<string, number> | undefined, seed = "seed-ok") {
  const east = mockRikishi("r-e", { shikona: "Machine" });
  const west = mockRikishi("r-w", { shikona: "Foe" });
  const basho = MockFactory.createBasho({
    id: "basho-1",
    day: 8,
    boutMetrics: kimariteUsed ? { [east.id]: metrics(kimariteUsed) } : {},
  });
  const world = makeBoutWorld(east, west, { currentBasho: basho });
  const result = makeBoutResult();
  generateBoutNarrative(result, east, west, "hatsu" as BashoName, 8, seed, world);
  return result;
}

const lines = (r: { pbpLines?: { text: string; tags?: string[] }[] }) =>
  (r.pbpLines ?? []).filter((l) => l.tags?.includes("one_kimarite" as never));

beforeEach(() => BardEngine.resetCache());

describe("pre_bout.one_kimarite_streak", () => {
  it("fires when all wins share one kimarite (≥3)", () => {
    const result = narrate({ yorikiri: 4 });
    expect(lines(result).length).toBeGreaterThan(0);
    expect(lines(result).some((l) => l.text.toLowerCase().includes("yorikiri"))).toBe(true);
  });

  it("is silent with mixed kimarite", () => {
    const result = narrate({ yorikiri: 3, oshidashi: 1 });
    expect(lines(result)).toEqual([]);
  });

  it("is silent below the win threshold even with one kimarite", () => {
    const result = narrate({ yorikiri: 2 });
    expect(lines(result)).toEqual([]);
  });

  it("is silent with no metrics", () => {
    const result = narrate(undefined);
    expect(lines(result)).toEqual([]);
  });
});
