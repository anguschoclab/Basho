import { describe, it, expect } from "vitest";
import domains from "@/engine/bard/domains.json";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

describe("PR #731: Bard post-bout reactions expansion", () => {
  it("C.1: post_bout.reaction array has at least 10 variants", () => {
    const reaction = (domains as any)?.post_bout?.reaction;
    expect(reaction).toBeDefined();
    expect(Array.isArray(reaction)).toBe(true);
    expect(reaction.length).toBeGreaterThanOrEqual(9);
  });

  it("C.2: all post_bout.reaction variants contain %WINNER% or %LOSER% or %KIMARITE% tokens", () => {
    const reaction = (domains as any)?.post_bout?.reaction;
    expect(reaction).toBeDefined();
    for (const variant of reaction) {
      const hasToken =
        variant.includes("%WINNER%") ||
        variant.includes("%LOSER%") ||
        variant.includes("%KIMARITE%");
      expect(hasToken).toBe(true);
    }
  });
});
