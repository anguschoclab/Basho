/**
 * T1.3 — announcer commentary projection: broadcast-style lines derived
 * ONLY from real bout facts (kimarite, upset, kinboshi, win streaks).
 */
import { describe, it, expect } from "vitest";
import { generateAnnouncerLines } from "@/presenters/projections/commentaryProjections";
import type { BoutResult } from "@/engine/types/basho";

const base = {
  boutId: "b1",
  winnerRikishiId: "r1",
  loserRikishiId: "r2",
  kimarite: "yorikiri",
  kimariteName: "Yorikiri",
  upset: false,
  isKinboshi: false,
} as unknown as BoutResult;

describe("generateAnnouncerLines (T1.3)", () => {
  it("calls a kinboshi as a headline moment", () => {
    const lines = generateAnnouncerLines({ ...base, isKinboshi: true });
    expect(lines.some((l) => /kinboshi|gold star|topples/i.test(l))).toBe(true);
  });

  it("flags upsets", () => {
    const lines = generateAnnouncerLines({ ...base, upset: true });
    expect(lines.some((l) => /upset/i.test(l))).toBe(true);
  });

  it("names the winning technique in the decisive call", () => {
    const lines = generateAnnouncerLines(base);
    expect(lines.some((l) => l.includes("Yorikiri"))).toBe(true);
  });

  it("returns at least one line for every result", () => {
    expect(generateAnnouncerLines(base).length).toBeGreaterThanOrEqual(1);
  });
});
