import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, Globe, GraduationCap, School, Sparkles } from "lucide-react";
import { toPotentialBand, POTENTIAL_LABELS, type PotentialBand } from "@/engine/descriptorBands";
import * as talentpool from "@/engine/talentpool";
import type { TalentCandidate, TalentPoolType } from "@/engine/types";

const POTENTIAL_COLORS: Record<PotentialBand, string> = {
  generational: "text-amber-500",
  star: "text-purple-400",
  solid: "text-blue-400",
  average: "text-muted-foreground",
  limited: "text-muted-foreground/60",
  unknown: "text-muted-foreground/40",
};

const POOL_ICONS: Record<TalentPoolType, typeof Globe> = {
  high_school: School,
  university: GraduationCap,
  foreign: Globe,
};

export function ScoutingWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const prospects = useMemo(() => {
    if (!world) return [];
    const all: (TalentCandidate & { pool: TalentPoolType })[] = [];
    for (const pool of ["high_school", "university", "foreign"] as TalentPoolType[]) {
      for (const c of talentpool.listVisibleCandidates(world, pool)) {
        all.push({ ...c, pool });
      }
    }
    // Sort by talent seed desc (best prospects first)
    return all.sort((a, b) => (b.talentSeed ?? 0) - (a.talentSeed ?? 0));
  }, [world]);

  if (!world) return null;

  const poolCounts = {
    high_school: prospects.filter(p => p.pool === "high_school").length,
    university: prospects.filter(p => p.pool === "university").length,
    foreign: prospects.filter(p => p.pool === "foreign").length,
  };

  const topProspects = prospects.slice(0, 6);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scouting</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/talent-pool")} className="h-6 text-xs gap-1 text-muted-foreground">
          Full Board <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Pool summary */}
      <div className="flex gap-3 text-xs">
        {(["high_school", "university", "foreign"] as TalentPoolType[]).map(pool => {
          const Icon = POOL_ICONS[pool];
          return (
            <div key={pool} className="flex items-center gap-1">
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{poolCounts[pool]}</span>
            </div>
          );
        })}
        <span className="text-muted-foreground ml-auto">{prospects.length} visible</span>
      </div>

      {/* Top prospects */}
      <div className="space-y-0.5">
        {topProspects.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">No prospects scouted yet. Search for leads.</p>
        ) : (
          topProspects.map(c => {
            const intel = talentpool.getCandidateScoutingLevel(world, c.candidateId);
            const canShowName = c.visibilityBand === "public" || intel >= 65;
            const potential = toPotentialBand(c.talentSeed);
            const potentialInfo = POTENTIAL_LABELS[potential];
            const Icon = POOL_ICONS[c.pool];

            return (
              <div key={c.candidateId} className="flex items-center gap-2 py-1 px-2 rounded text-xs hover:bg-muted/50 transition-colors">
                <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="flex-1 font-medium truncate">
                  {canShowName ? c.name : "Unknown Prospect"}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize truncate max-w-16">
                  {c.archetype.replace(/_/g, " ")}
                </span>
                {(potential === "generational" || potential === "star") && (
                  <Sparkles className={`h-3 w-3 shrink-0 ${POTENTIAL_COLORS[potential]}`} />
                )}
                <Badge
                  variant={potential === "generational" || potential === "star" ? "default" : "secondary"}
                  className="text-[9px] px-1.5 py-0 h-4 shrink-0"
                >
                  {potentialInfo.label.split(" ")[0]}
                </Badge>
              </div>
            );
          })
        )}
        {prospects.length > 6 && (
          <div className="text-[11px] text-muted-foreground text-center py-1">
            +{prospects.length - 6} more prospects
          </div>
        )}
      </div>
    </div>
  );
}
