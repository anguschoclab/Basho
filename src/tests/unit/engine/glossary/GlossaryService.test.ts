// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GlossaryService } from "@/engine/glossary/GlossaryService";

const ALL_CATEGORIES = [
  "rank",
  "technique",
  "structure",
  "culture",
  "tournament",
  "attire",
  "ceremony",
  "officials",
] as const;

describe("GlossaryService", () => {
  describe("all()", () => {
    it("returns an array with at least 90 terms", () => {
      const terms = GlossaryService.all();
      expect(terms.length).toBeGreaterThanOrEqual(90);
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

    it("every category in the union has at least one term", () => {
      const terms = GlossaryService.all();
      for (const cat of ALL_CATEGORIES) {
        expect(terms.some((t) => t.category === cat)).toBe(true);
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

    it("returns the gyoji term with termJa and definition", () => {
      const term = GlossaryService.byId("gyoji");
      expect(term).toBeDefined();
      expect(term!.termJa).toBeTruthy();
      expect(term!.definition).toBeTruthy();
    });

    it("returns the mawashi term with category attire", () => {
      const term = GlossaryService.byId("mawashi");
      expect(term).toBeDefined();
      expect(term!.category).toBe("attire");
    });

    it("returns the danpatsu-shiki term with category ceremony", () => {
      const term = GlossaryService.byId("danpatsu-shiki");
      expect(term).toBeDefined();
      expect(term!.category).toBe("ceremony");
    });

    it("returns the mono-ii term with category officials", () => {
      const term = GlossaryService.byId("mono-ii");
      expect(term).toBeDefined();
      expect(term!.category).toBe("officials");
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

    it("returns attire terms all with category attire", () => {
      const terms = GlossaryService.byCategory("attire");
      expect(terms.length).toBeGreaterThan(0);
      for (const t of terms) {
        expect(t.category).toBe("attire");
      }
    });

    it("returns ceremony terms all with category ceremony", () => {
      const terms = GlossaryService.byCategory("ceremony");
      expect(terms.length).toBeGreaterThan(0);
      for (const t of terms) {
        expect(t.category).toBe("ceremony");
      }
    });

    it("returns officials terms all with category officials", () => {
      const terms = GlossaryService.byCategory("officials");
      expect(terms.length).toBeGreaterThan(0);
      for (const t of terms) {
        expect(t.category).toBe("officials");
      }
    });

    it("returns results for every category in the union", () => {
      for (const cat of ALL_CATEGORIES) {
        const terms = GlossaryService.byCategory(cat);
        expect(terms.length).toBeGreaterThan(0);
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

    it("matches new term 'mawashi'", () => {
      const results = GlossaryService.search("mawashi");
      expect(results.some((t) => t.id === "mawashi")).toBe(true);
    });
  });
});
