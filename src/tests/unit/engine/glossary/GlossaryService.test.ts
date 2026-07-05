/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { GlossaryService } from "@/engine/glossary/GlossaryService";

describe("GlossaryService", () => {
  describe("all()", () => {
    it("returns an array with at least 13 terms", () => {
      const terms = GlossaryService.all();
      expect(terms.length).toBeGreaterThanOrEqual(13);
    });

    it("every term has id, term, termJa, category, and definition", () => {
      const terms = GlossaryService.all();
      for (const t of terms) {
        expect(t.id).toBeTruthy();
        expect(t.term).toBeTruthy();
        expect(t.termJa).toBeTruthy();
        expect(t.category).toBeTruthy();
        expect(t.definition).toBeTruthy();
      }
    });
  });

  describe("byId()", () => {
    it("returns the tachiai term with termJa and definition", () => {
      const term = GlossaryService.byId("tachiai");
      expect(term).toBeDefined();
      expect(term!.termJa).toBeTruthy();
      expect(term!.definition).toBeTruthy();
    });

    it("returns undefined for nonexistent id", () => {
      expect(GlossaryService.byId("nonexistent")).toBeUndefined();
    });
  });

  describe("byCategory()", () => {
    it("returns only terms matching the given category", () => {
      const terms = GlossaryService.byCategory("technique");
      expect(terms.length).toBeGreaterThan(0);
      for (const t of terms) {
        expect(t.category).toBe("technique");
      }
    });
  });

  describe("search()", () => {
    it("matches term name for 'basho'", () => {
      const results = GlossaryService.search("basho");
      expect(results.some((t) => t.id === "basho")).toBe(true);
    });

    it("returns all terms for empty query", () => {
      const results = GlossaryService.search("");
      expect(results.length).toBe(GlossaryService.all().length);
    });

    it("matches Japanese name for '立合'", () => {
      const results = GlossaryService.search("立合");
      expect(results.some((t) => t.id === "tachiai")).toBe(true);
    });

    it("is case-insensitive", () => {
      const results = GlossaryService.search("TACHIAI");
      expect(results.some((t) => t.id === "tachiai")).toBe(true);
    });
  });
});
