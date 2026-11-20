import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import type { BoutResult, BashoName } from "@/engine/types/basho";

const BASHO = "hatsu" as BashoName;

function getMonoiiLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "mono_ii");
}

function makeConfirmedResult(): BoutResult {
  // Apparent winner (east/Alpha) was DQ'd: west/Beta wins by hansoku.
  return makeBoutResult({
    winner: "west",
    winnerRikishiId: "r-west",
    loserRikishiId: "r-east",
    kimarite: "hansoku",
    kimariteName: "Hansoku",
    upset: true,
    monoii: true,
    monoiiOutcome: "reversed",
    foulReview: {
      foul: "topknot_grab",
      suspectRikishiId: "r-east",
      victimRikishiId: "r-west",
      suspectSide: "east",
      confirmed: true,
      apparentKimarite: "yorikiri",
    },
  });
}

function makeClearedResult(): BoutResult {
  // Suspected foul on the winner (east/Alpha) was cleared — call stands.
  return makeBoutResult({
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "oshidashi",
    kimariteName: "Oshidashi",
    monoii: true,
    monoiiOutcome: "upheld",
    foulReview: {
      foul: "topknot_grab",
      suspectRikishiId: "r-east",
      victimRikishiId: "r-west",
      suspectSide: "east",
      confirmed: false,
      apparentKimarite: "oshidashi",
    },
  });
}

function makePair() {
  const east = mockRikishi("r-east", {
    shikona: "Alpha",
    currentBashoWins: 5,
    currentBashoLosses: 2,
  });
  const west = mockRikishi("r-west", {
    shikona: "Beta",
    currentBashoWins: 4,
    currentBashoLosses: 3,
  });
  return { east, west };
}

describe("generateBoutNarrative — foul review arc", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("confirmed topknot foul narrates suspicion → review → replay → verdict", () => {
    const { east, west } = makePair();
    const world = makeBoutWorld(east, west);
    const result = makeConfirmedResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-foul-1", world);

    const lines = getMonoiiLines(result);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const text = lines.map((l) => l.text.toLowerCase()).join(" ");
    // Suspicion mentions the suspect by name and the suspected act.
    expect(text).toContain("alpha");
    expect(text).toMatch(/topknot|hair|mage/);
    // Review + replay steps exist.
    expect(text).toMatch(/judge|shimpan|mono-ii|confer/);
    expect(text).toMatch(/replay|video|review/);
    // Verdict names the disqualification.
    expect(text).toMatch(/hansoku|disqualif|foul/);
  });

  it("confirmed foul lines carry the foul tag", () => {
    const { east, west } = makePair();
    const world = makeBoutWorld(east, west);
    const result = makeConfirmedResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-foul-tags", world);
    const foulTagged = getMonoiiLines(result).filter((l) => l.tags?.includes("foul"));
    expect(foulTagged.length).toBeGreaterThanOrEqual(3);
  });

  it("cleared review narrates that the call stands without disqualifying anyone", () => {
    const { east, west } = makePair();
    const world = makeBoutWorld(east, west);
    const result = makeClearedResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-foul-clear", world);
    const lines = getMonoiiLines(result);
    const text = lines.map((l) => l.text.toLowerCase()).join(" ");
    expect(text).toMatch(/no foul|stands|cleared|not a foul/);
    expect(text).not.toMatch(/hansoku|disqualif/);
  });

  it("suspect/victim come from foulReview, not winner/loser — cleared case names the winning suspect", () => {
    const { east, west } = makePair();
    const world = makeBoutWorld(east, west);
    const result = makeClearedResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-foul-suspect", world);
    // In the cleared case the suspect (east/Alpha) is the WINNER — the arc must
    // name Alpha as the accused, not Beta the loser.
    const text = getMonoiiLines(result)
      .map((l) => l.text)
      .join(" ");
    expect(text).toContain("Alpha");
    expect(text).toContain("Beta");
  });

  it("mirrored suspect side (west fouls, east wins) narrates the west suspect", () => {
    const { east, west } = makePair();
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult({
      winner: "east",
      winnerRikishiId: "r-east",
      loserRikishiId: "r-west",
      kimarite: "hansoku",
      kimariteName: "Hansoku",
      upset: true,
      monoii: true,
      monoiiOutcome: "reversed",
      foulReview: {
        foul: "topknot_grab",
        suspectRikishiId: "r-west",
        victimRikishiId: "r-east",
        suspectSide: "west",
        confirmed: true,
        apparentKimarite: "yorikiri",
      },
    });
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-foul-mirror", world);
    const text = getMonoiiLines(result)
      .map((l) => l.text)
      .join(" ");
    expect(text).toContain("Beta");
    expect(text).toContain("Alpha");
  });

  it("no [MISSING:] tokens in foul review lines", () => {
    const { east, west } = makePair();
    const world = makeBoutWorld(east, west);
    const result = makeConfirmedResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-foul-missing", world);
    for (const line of getMonoiiLines(result)) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });

  it("deterministic — same seed produces identical foul arc", () => {
    const { east, west } = makePair();
    const world = makeBoutWorld(east, west);
    const r1 = makeConfirmedResult();
    const r2 = makeConfirmedResult();
    generateBoutNarrative(r1, east, west, BASHO, 8, "seed-foul-det", world);
    generateBoutNarrative(r2, east, west, BASHO, 8, "seed-foul-det", world);
    expect(getMonoiiLines(r1).map((l) => l.text)).toEqual(getMonoiiLines(r2).map((l) => l.text));
  });

  it("generic mono-ii (no foulReview) still narrates the close-finish arc", () => {
    const { east, west } = makePair();
    const world = makeBoutWorld(east, west);
    const result = makeBoutResult({ monoii: true, monoiiOutcome: "upheld" });
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-plain-monoii", world);
    const lines = getMonoiiLines(result);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const text = lines.map((l) => l.text.toLowerCase()).join(" ");
    expect(text).not.toMatch(/topknot|hansoku/);
  });
});
