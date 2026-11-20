/**
 * W H — pre_bout beats for school and practice-partner bonds.
 * schoolmates: shared schoolOrigin across different heyas.
 * practice_partners: id present in the other's practicePartners.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import type { BashoName } from "@/engine/types/basho";

function narrate(eastOverrides = {}, westOverrides = {}, seed = "seed-fam") {
  const east = mockRikishi("r-e", { heyaId: "heya-1", ...eastOverrides });
  const west = mockRikishi("r-w", { heyaId: "heya-2", ...westOverrides });
  const world = makeBoutWorld(east, west);
  const result = makeBoutResult();
  generateBoutNarrative(result, east, west, "hatsu" as BashoName, 5, seed, world);
  return result.pbpLines ?? [];
}

const tagged = (lines: { tags?: string[] }[], tag: string) =>
  lines.filter((l) => l.tags?.includes(tag as never));

beforeEach(() => BardEngine.resetCache());

describe("pre_bout.schoolmates", () => {
  it("fires when both share schoolOrigin across different heyas", () => {
    const lines = narrate({ schoolOrigin: "Saitama Sakae" }, { schoolOrigin: "Saitama Sakae" });
    expect(tagged(lines, "schoolmates").length).toBeGreaterThan(0);
  });

  it("is silent for different schools", () => {
    const lines = narrate({ schoolOrigin: "Saitama Sakae" }, { schoolOrigin: "Tottori Johoku" });
    expect(tagged(lines, "schoolmates")).toEqual([]);
  });

  it("is silent when schoolOrigin is unset", () => {
    const lines = narrate();
    expect(tagged(lines, "schoolmates")).toEqual([]);
  });
});

describe("pre_bout.practice_partners", () => {
  it("fires when one lists the other as practice partner", () => {
    const lines = narrate({ practicePartners: ["r-w"] });
    expect(tagged(lines, "practice_partners").length).toBeGreaterThan(0);
  });

  it("is silent without the link", () => {
    const lines = narrate({ practicePartners: ["r-x"] });
    expect(tagged(lines, "practice_partners")).toEqual([]);
  });
});
