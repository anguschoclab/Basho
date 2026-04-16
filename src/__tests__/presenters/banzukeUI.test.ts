/**
 * banzukeUI.test.ts
 *
 * Tests for banzuke UI functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import { buildPrevRankScores, buildBanzukeRows } from "../../presenters/banzukeUI";

describe("banzukeUI", () => {
  describe("buildPrevRankScores", () => {
    it("should return empty map when no history", () => {
      const history: any[] = [];
      const result = buildPrevRankScores(history);
      expect(result.size).toBe(0);
    });

    it("should build rank scores from history", () => {
      const history: any[] = [{ nextBanzuke: { divisions: {} } }];
      const result = buildPrevRankScores(history);
      expect(result).toBeDefined();
    });
  });

  describe("buildBanzukeRows", () => {
    it("should return empty array when no entries", () => {
      const entries: any[] = [];
      const result = buildBanzukeRows(entries, "makuuchi", "");
      expect(result).toHaveLength(0);
    });

    it("should build banzuke rows", () => {
      const entry = { rikishiId: "rikishi-1", rank: "maegashira", rankNumber: 1 } as any;
      const result = buildBanzukeRows([entry], "makuuchi", "");
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
