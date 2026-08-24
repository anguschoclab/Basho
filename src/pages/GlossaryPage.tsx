import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { GlossaryService, type GlossaryTerm } from "@/presenters/engineAccess";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

const CATEGORY_LABELS: Record<GlossaryTerm["category"], string> = {
  rank: "Ranks",
  technique: "Technique",
  structure: "Structure",
  culture: "Culture",
  tournament: "Tournament",
  attire: "Attire",
  ceremony: "Ceremony",
  officials: "Officials",
};

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GlossaryTerm["category"] | "all">("all");

  const filteredTerms = useMemo(() => {
    let terms = GlossaryService.search(query);
    if (activeCategory !== "all") {
      terms = terms.filter((t) => t.category === activeCategory);
    }
    return terms;
  }, [query, activeCategory]);

  const categories: (GlossaryTerm["category"] | "all")[] = [
    "all",
    "rank",
    "technique",
    "structure",
    "culture",
    "tournament",
    "attire",
    "ceremony",
    "officials",
  ];

  return (
    <AppLayout pageTitle="Glossary">

        <title>Glossary — Sumo Manager Pro</title>


      <div className="space-y-6">
        <PageHeader
          eyebrow="── REFERENCE ──"
          title="Glossary"
          lede="Sumo terminology reference — ranks, techniques, structures, and culture."
        />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms..."
            className="pl-9"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
              )}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Terms grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTerms.map((term) => (
            <Card key={term.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-display font-bold">{term.term}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{term.termJa}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {CATEGORY_LABELS[term.category]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{term.definition}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTerms.length === 0 && (
          <EmptyState
            icon={Search}
            title={`No terms found for "${query}"`}
          />
        )}
      </div>
    </AppLayout>
  );
}
