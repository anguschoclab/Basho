/**
 * GlossaryService.ts
 *
 * Provides sumo terminology definitions for the glossary page and in-game tooltips.
 */

export interface GlossaryTerm {
  id: string;
  term: string;
  termJa: string;
  category: "rank" | "technique" | "structure" | "culture" | "tournament";
  definition: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  // Ranks
  {
    id: "yokozuna",
    term: "Yokozuna",
    termJa: "横綱",
    category: "rank",
    definition:
      "The highest rank in sumo. A yokozuna is a grand champion who cannot be demoted and is expected to retire if performance falters.",
  },
  {
    id: "ozeki",
    term: "Ozeki",
    termJa: "大関",
    category: "rank",
    definition:
      "The second-highest rank. An ozeki must win at least 8 bouts per tournament or face demotion (kadoban).",
  },
  {
    id: "sanyaku",
    term: "San'yaku",
    termJa: "三役",
    category: "rank",
    definition:
      "The three champion ranks below ozeki: sekiwake, komusubi, and (historically) the ozeki themselves.",
  },
  {
    id: "maegashira",
    term: "Maegashira",
    termJa: "幕下",
    category: "rank",
    definition:
      "The majority of makuuchi rikishi, ranked below the san'yaku. Numbered 1–17 from top to bottom.",
  },
  {
    id: "makuuchi",
    term: "Makuuchi",
    termJa: "幕内",
    category: "rank",
    definition:
      "The top division of professional sumo, featuring 42 rikishi including yokozuna, ozeki, and maegashira.",
  },
  {
    id: "juryo",
    term: "Juryo",
    termJa: "十両",
    category: "rank",
    definition: "The second division. Rikishi in juryo are salaried professionals (sekitori).",
  },
  {
    id: "sekitori",
    term: "Sekitori",
    termJa: "関取",
    category: "rank",
    definition:
      "A salaried rikishi in the top two divisions (makuuchi or juryo). The gateway to professional status.",
  },
  {
    id: "banzuke",
    term: "Banzuke",
    termJa: "番付",
    category: "rank",
    definition:
      "The official ranking list of all professional rikishi, published before each tournament.",
  },

  // Tournament
  {
    id: "basho",
    term: "Basho",
    termJa: "場所",
    category: "tournament",
    definition: "A grand tournament. Six official basho are held each year, lasting 15 days each.",
  },
  {
    id: "yusho",
    term: "Yusho",
    termJa: "優勝",
    category: "tournament",
    definition:
      "The tournament championship awarded to the rikishi with the best win-loss record at a basho.",
  },
  {
    id: "zensho",
    term: "Zensho",
    termJa: "全勝",
    category: "tournament",
    definition:
      "A perfect 15-0 tournament record. A zensho-yusho is a championship won with no losses.",
  },
  {
    id: "kadoban",
    term: "Kadoban",
    termJa: "角番",
    category: "tournament",
    definition:
      "An ozeki who has lost more than 7 bouts in the previous tournament and must win at least 8 in the current one to avoid demotion.",
  },
  {
    id: "kyujo",
    term: "Kyujo",
    termJa: "休場",
    category: "tournament",
    definition:
      "Absence from a tournament due to injury or illness. A kyujo results in an automatic loss for each day missed.",
  },

  // Technique
  {
    id: "tachiai",
    term: "Tachiai",
    termJa: "立合い",
    category: "technique",
    definition:
      "The initial charge at the start of a bout. A strong tachiai is critical for gaining early advantage.",
  },
  {
    id: "kimarite",
    term: "Kimarite",
    termJa: "決まり手",
    category: "technique",
    definition:
      "The winning technique used to decide a bout. The Japan Sumo Association recognizes 82 official kimarite.",
  },
  {
    id: "dohyo",
    term: "Dohyo",
    termJa: "土俵",
    category: "technique",
    definition:
      "The clay ring where bouts are fought. A rikishi loses if forced out of the dohyo or if any part of their body other than the soles of their feet touches the ground.",
  },

  // Structure
  {
    id: "heya",
    term: "Heya",
    termJa: "部屋",
    category: "structure",
    definition:
      "A sumo stable. Rikishi live and train together under the guidance of an oyakata (stablemaster).",
  },
  {
    id: "ichimon",
    term: "Ichimon",
    termJa: "一門",
    category: "structure",
    definition:
      "A faction of stables. Five ichimon exist, providing political alliances, mutual support, and training cooperation.",
  },
  {
    id: "oyakata",
    term: "Oyakata",
    termJa: "親方",
    category: "structure",
    definition:
      "A stablemaster. Former rikishi who have acquired elder stock (myoseki) and run a heya.",
  },
  {
    id: "shikona",
    term: "Shikona",
    termJa: "四股名",
    category: "structure",
    definition:
      "A rikishi's ring name, distinct from their legal name. Shikona often reflect the heya's naming traditions.",
  },

  // Culture
  {
    id: "koenkai",
    term: "Koenkai",
    termJa: "後援会",
    category: "culture",
    definition:
      "A support group or fan club that provides financial backing to a heya. Koenkai are essential for stable finances.",
  },
];

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
