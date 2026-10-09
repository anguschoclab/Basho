/**
 * GlossaryService.ts
 *
 * Provides sumo terminology definitions for the glossary page and in-game tooltips.
 */

import { GLOSSARY_TERMS } from "./terms";

export interface GlossaryTerm {
  id: string;
  term: string;
  termJa: string;
  category:
    | "rank"
    | "technique"
    | "structure"
    | "culture"
    | "tournament"
    | "attire"
    | "ceremony"
    | "officials";
  definition: string;
}

export const GlossaryService = {
  all(): GlossaryTerm[] {
    return GLOSSARY_TERMS;
  },

  byId(id: string): GlossaryTerm | undefined {
    return GLOSSARY_TERMS.find((t) => t.id === id);
  },

  byCategory(category: GlossaryTerm["category"]): GlossaryTerm[] {
    return GLOSSARY_TERMS.filter((t) => t.category === category);
  },

  search(query: string): GlossaryTerm[] {
    if (!query) return GLOSSARY_TERMS;
    const q = query.toLowerCase();
    return GLOSSARY_TERMS.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.termJa.includes(query) ||
        t.definition.toLowerCase().includes(q)
    );
  },
};
