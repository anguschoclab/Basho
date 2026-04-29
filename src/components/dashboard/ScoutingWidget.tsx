import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Globe, GraduationCap, School, Sparkles } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import type { PotentialBand } from "@/engine/descriptorBands";
import * as talentpool from "@/engine/systems/generation/TalentPoolService";
import type { TalentCandidate, TalentPoolType } from "@/engine/types/talent";
import { POTENTIAL_LABELS, toPotentialBand } from "@/presenters/uiDigest";

const POTENTIAL_COLORS: Record<PotentialBand, string> = {
  generational: "text-gold",
  star: "text-primary",
  solid: "text-primary/70",
  average: "text-muted-foreground",
  limited: "text-muted-foreground/60",
  unknown: "text-muted-foreground/40",
};

const POOL_ICONS: Record<TalentPoolType, typeof Globe> = {
  high_school: School,
  university: GraduationCap,
  foreign: Globe,
};

const ProspectRow = React.memo(
  ({
    name,
    archetype,
    talentSeed,
    pool,
    visibilityBand,
    intel,
  }: {
    candidateId: string;
    name: string;
    archetype: string;
    talentSeed?: number;
    pool: TalentPoolType;
    visibilityBand: string;
    intel: number;
  }) => {
    const canShowName = visibilityBand === "public" || intel >= 65;
    const potential = toPotentialBand(talentSeed);
    const potentialInfo = POTENTIAL_LABELS[potential];
    const Icon = POOL_ICONS[pool];

    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md text-xs hover:bg-muted/50 transition-colors">
        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="flex-1 font-medium truncate">
          {canShowName ? name : "Unknown Prospect"}
        </span>
        <span className="text-[10px] text-muted-foreground capitalize truncate max-w-16">
          {archetype.replace(/_/g, " ")}
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
  }
);

/** scouting widget. */
const ProspectList = React.memo(
  ({
    topProspects,
    prospectsLength,
    world,
    onViewAll,
  }: {
    topProspects: (TalentCandidate & { pool: TalentPoolType })[];
    prospectsLength: number;
    world: any;
    onViewAll: () => void;
  }) => {
    return (
      <>
        {topProspects.length === 0 ? (
          <div className="text-center py-4">
            <Search className="h-5 w-5 text-muted-foreground/20 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">No prospects scouted yet</p>
          </div>
        ) : (
          (() => {
            const limit = topProspects.length;
            const nodes = new Array(limit);
            for (let i = 0; i < limit; i++) {
              const c = topProspects[i];
              const intel = talentpool.getCandidateScoutingLevel(world, c.candidateId);
              nodes[i] = (
                <ProspectRow
                  key={c.candidateId}
                  candidateId={c.candidateId}
                  name={c.name}
                  archetype={c.archetype}
                  talentSeed={c.talentSeed}
                  pool={c.pool}
                  visibilityBand={c.visibilityBand}
                  intel={intel}
                />
              );
            }
            return nodes;
          })()
        )}
        {prospectsLength > 6 && (
          <Button
            variant="ghost"
            onClick={onViewAll}
            className="w-full h-auto py-1 text-[11px] text-primary hover:text-primary/80 hover:bg-transparent rounded-sm"
          >
            +{prospectsLength - 6} more prospects →
          </Button>
        )}
      </>
    );
  }
);

export function ScoutingWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const headerAction = useMemo(
    () => ({
      label: "Full Board",
      onClick: () => navigate({ to: "/talent" }),
    }),
    [navigate]
  );

  const handleViewAll = React.useCallback(() => {
    navigate({ to: "/talent" });
  }, [navigate]);
  const world = state.world;

  // ⚡ Bolt Performance Optimization: Combine prospects parsing, pool counting, and top prospects derivation
  // into a single useMemo hook to avoid multiple array iterations on every render.
  const { prospects, poolCounts, topProspects } = useMemo(() => {
    const defaultRes = {
      prospects: [],
      poolCounts: { high_school: 0, university: 0, foreign: 0 },
      topProspects: [],
    };
    if (!world) return defaultRes;

    const all: (TalentCandidate & { pool: TalentPoolType })[] = [];
    const counts: Record<TalentPoolType, number> = {
      high_school: 0,
      university: 0,
      foreign: 0,
    };

    for (const pool of ["high_school", "university", "foreign"] as TalentPoolType[]) {
      for (const c of talentpool.listVisibleCandidates(world, pool)) {
        all.push({ ...c, pool });
        counts[pool]++;
      }
    }

    all.sort((a, b) => (b.talentSeed ?? 0) - (a.talentSeed ?? 0));

    return {
      prospects: all,
      poolCounts: counts,
      topProspects: all.slice(0, 6),
    };
  }, [world, world?.talentPool]);

  if (!world) return null;

  return (
    <BaseWidget title="Scouting" icon={Search} headerAction={headerAction}>
      {/* Pool summary with icons */}
      <div className="flex gap-2 text-xs">
        {(["high_school", "university", "foreign"] as TalentPoolType[]).map((pool) => {
          const Icon = POOL_ICONS[pool];
          return (
            <div key={pool} className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{poolCounts[pool]}</span>
            </div>
          );
        })}
        <span className="text-muted-foreground ml-auto self-center text-[10px]">
          {prospects.length} visible
        </span>
      </div>

      {/* Top prospects */}
      <div className="space-y-0.5">
        <ProspectList
          topProspects={topProspects}
          prospectsLength={prospects.length}
          world={world}
          onViewAll={handleViewAll}
        />
      </div>
    </BaseWidget>
  );
}
