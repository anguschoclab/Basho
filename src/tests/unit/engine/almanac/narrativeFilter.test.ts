import { describe, it, expect } from "vitest";
import {
  extractNotableNarrativeLines,
  isNotableBout,
  type PbpLine,
} from "@/engine/bout/boutNarrative";
import type { BoutResult } from "@/engine/types/basho";

function makeLine(text: string, opts: Partial<PbpLine> = {}): PbpLine {
  return { text, id: `line-${Math.random()}`, ...opts };
}

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "bout-1",
    winner: "east",
    winnerRikishiId: "r1",
    loserRikishiId: "r2",
    kimarite: "yori-kiri",
    kimariteName: "Yori-kiri",
    stance: "yotsu",
    tachiaiWinner: "east",
    duration: 10,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
    momentumScore: 0,
    inBoutInjury: { rikishiId: "", area: "arm", severity: "minor", triggerEvent: "" },
    ...overrides,
  } as BoutResult;
}

describe("extractNotableNarrativeLines", () => {
  it("returns empty array for empty input", () => {
    expect(extractNotableNarrativeLines([])).toEqual([]);
  });

  it("filters lines with 'milestone' tag", () => {
    const lines = [makeLine("Milestone reached", { tags: ["milestone"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Milestone reached"]);
  });

  it("filters lines with 'career_high' tag", () => {
    const lines = [makeLine("Career high!", { tags: ["career_high"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Career high!"]);
  });

  it("filters lines with 'kinboshi' tag", () => {
    const lines = [makeLine("Kinboshi!", { tags: ["kinboshi"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Kinboshi!"]);
  });

  it("filters lines with 'upset' tag", () => {
    const lines = [makeLine("Big upset", { tags: ["upset"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Big upset"]);
  });

  it("filters lines with 'yusho_race' tag", () => {
    const lines = [makeLine("Yusho race", { tags: ["yusho_race"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Yusho race"]);
  });

  it("filters lines with 'streak' tag", () => {
    const lines = [makeLine("Winning streak", { tags: ["streak"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Winning streak"]);
  });

  it("filters lines with 'comeback' tag", () => {
    const lines = [makeLine("Comeback win", { tags: ["comeback"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Comeback win"]);
  });

  it("filters lines with 'rivalry' tag", () => {
    const lines = [makeLine("Rivalry renewed", { tags: ["rivalry"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Rivalry renewed"]);
  });

  it("filters lines with 'grudge_match' tag", () => {
    const lines = [makeLine("Grudge match", { tags: ["grudge_match"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Grudge match"]);
  });

  it("filters lines with 'dominant' tag", () => {
    const lines = [makeLine("Dominant performance", { tags: ["dominant"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Dominant performance"]);
  });

  it("filters lines with 'dynasty' tag", () => {
    const lines = [makeLine("Dynasty continues", { tags: ["dynasty"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Dynasty continues"]);
  });

  it("filters lines with 'title_stakes' tag", () => {
    const lines = [makeLine("Title on the line", { tags: ["title_stakes"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Title on the line"]);
  });

  it("filters lines with 'consecutive_kachi' tag", () => {
    const lines = [makeLine("Consecutive kachi-koshi", { tags: ["consecutive_kachi"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Consecutive kachi-koshi"]);
  });

  it("filters lines with 'debut' tag", () => {
    const lines = [makeLine("Debut bout", { tags: ["debut"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Debut bout"]);
  });

  it("filters lines with 'first_win' tag", () => {
    const lines = [makeLine("First career win", { tags: ["first_win"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["First career win"]);
  });

  it("filters lines with 'kachi_koshi' tag", () => {
    const lines = [makeLine("Kachi-koshi secured", { tags: ["kachi_koshi"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Kachi-koshi secured"]);
  });

  it("filters lines with 'senshuraku' tag", () => {
    const lines = [makeLine("Senshuraku drama", { tags: ["senshuraku"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Senshuraku drama"]);
  });

  it("filters lines with award phase", () => {
    const lines = [makeLine("Award ceremony", { phase: "award" })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Award ceremony"]);
  });

  it("filters lines with closing phase", () => {
    const lines = [makeLine("Closing remarks", { phase: "closing" })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Closing remarks"]);
  });

  it("filters lines with ceremony phase", () => {
    const lines = [makeLine("Ceremony begins", { phase: "ceremony" })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Ceremony begins"]);
  });

  it("excludes lines without notable tags or phases", () => {
    const lines = [
      makeLine("Routine bout", { tags: ["crowd_roar"] }),
      makeLine("Normal phase", { phase: "opening" }),
    ];
    expect(extractNotableNarrativeLines(lines)).toEqual([]);
  });

  it("preserves text content from filtered lines", () => {
    const lines = [makeLine("Exact text preserved", { tags: ["milestone"] })];
    expect(extractNotableNarrativeLines(lines)[0]).toBe("Exact text preserved");
  });

  it("handles lines with multiple tags (any match includes)", () => {
    const lines = [makeLine("Multi-tag line", { tags: ["crowd_roar", "upset"] })];
    expect(extractNotableNarrativeLines(lines)).toEqual(["Multi-tag line"]);
  });

  it("handles lines with no tags (excluded unless phase matches)", () => {
    const lines = [makeLine("No tags", {})];
    expect(extractNotableNarrativeLines(lines)).toEqual([]);
  });
});

describe("isNotableBout", () => {
  it("returns true for kinboshi bout", () => {
    const result = makeBoutResult({ isKinboshi: true });
    expect(isNotableBout(result, [], 0)).toBe(true);
  });

  it("returns true for yusho race bout", () => {
    const result = makeBoutResult({ isYushoRace: true });
    expect(isNotableBout(result, [], 0)).toBe(true);
  });

  it("returns true for upset bout", () => {
    const result = makeBoutResult({ upset: true });
    expect(isNotableBout(result, [], 0)).toBe(true);
  });

  it("returns true when any line has 'milestone' tag", () => {
    const result = makeBoutResult();
    const lines = [makeLine("Milestone", { tags: ["milestone"] })];
    expect(isNotableBout(result, lines, 0)).toBe(true);
  });

  it("returns true when any line has 'career_high' tag", () => {
    const result = makeBoutResult();
    const lines = [makeLine("Career high", { tags: ["career_high"] })];
    expect(isNotableBout(result, lines, 0)).toBe(true);
  });

  it("returns true when excitementScore > 30", () => {
    const result = makeBoutResult({ excitementScore: 45 });
    expect(isNotableBout(result, [], 0)).toBe(true);
  });

  it("returns true when career win milestone reached (100, 200, 300, 500)", () => {
    expect(isNotableBout(makeBoutResult(), [], 99)).toBe(true);
    expect(isNotableBout(makeBoutResult(), [], 199)).toBe(true);
    expect(isNotableBout(makeBoutResult(), [], 299)).toBe(true);
    expect(isNotableBout(makeBoutResult(), [], 499)).toBe(true);
  });

  it("returns false for routine bout with no notable tags", () => {
    const result = makeBoutResult();
    expect(isNotableBout(result, [], 5)).toBe(false);
  });

  it("returns false for bout with excitementScore < 30 and no notable flags", () => {
    const result = makeBoutResult({ excitementScore: 20 });
    expect(isNotableBout(result, [], 5)).toBe(false);
  });

  it("returns false for empty pbpLines with no notable flags", () => {
    const result = makeBoutResult();
    expect(isNotableBout(result, [], 5)).toBe(false);
  });
});
