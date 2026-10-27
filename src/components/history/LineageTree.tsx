import React, { useMemo } from "react";
import { useGame } from "@/state/game/useGame";
import { getLineageTree } from "@/presenters/engineAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, ChevronDown } from "lucide-react";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { resolveAvatar } from "@/presenters/projections/avatarProjections";
import { getRikishiAnywhere } from "@/presenters/worldAccess";
import type { AvatarRenderData } from "@/engine/types/avatar";
import type { WorldState } from "@/presenters/uiDigest";

type LineageNode = ReturnType<typeof getLineageTree>[number];

/** Resolve display avatars for every lineage node. */
function resolveLineageAvatars(
  world: WorldState | null | undefined,
  lineage: LineageNode[]
): Map<string, AvatarRenderData> {
  const map = new Map<string, AvatarRenderData>();
  if (!world) return map;
  for (const node of lineage) {
    const r = getRikishiAnywhere(world, node.id);
    if (!r) continue;
    map.set(
      node.id,
      resolveAvatar({
        id: r.id,
        stored: r.avatarConfig,
        nationality: "nationality" in r ? r.nationality : undefined,
        role: "rikishi",
        age: world.year - (r.birthYear ?? world.year - 25),
        rank: "rank" in r ? r.rank : r.peakRank,
      })
    );
  }
  return map;
}

interface LineageTreeProps {
  rikishiId: string;
}

/**
 * LineageTree Component
 * Visualizes the mentorship spirit lineage of a rikishi (Ancestors).
 */
export const LineageTree = ({ rikishiId }: LineageTreeProps) => {
  const { state } = useGame();
  const world = state.world;

  const lineage = useMemo(() => {
    if (!world) return [];
    return getLineageTree(world, rikishiId);
  }, [world, rikishiId]);

  const avatarById = useMemo(() => resolveLineageAvatars(world, lineage), [world, lineage]);

  if (lineage.length === 0) {
    return (
      <Card className="bg-card/40 border-border">
        <CardContent className="p-8 text-center text-muted-foreground italic">
          No recorded lineage for this Rikishi. The spirit begins here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="bg-card/50 border-b border-border">
        <CardTitle className="text-sm font-display uppercase tracking-widest flex items-center gap-2 text-gold">
          <Crown className="h-4 w-4" />
          Spirit Lineage
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 relative">
        <div className="space-y-4">
          {lineage.map((node, index) => (
            <React.Fragment key={node.id}>
              <div className="flex items-center gap-4 group">
                <div className="relative flex flex-col items-center">
                  <SumoAvatar
                    avatar={avatarById.get(node.id)}
                    size="md"
                    fallback={node.shikona}
                    className="border-2 border-border group-hover:border-gold transition-colors"
                  />
                  {index < lineage.length - 1 && <div className="w-0.5 h-8 bg-border" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-display font-bold text-muted-foreground group-hover:text-gold transition-colors">
                      {node.shikona}
                    </p>
                    <Badge variant="outline" className="bg-card/50 text-[10px] uppercase font-mono">
                      {node.rank}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                    {index === 0 ? "Direct Mentor" : `${index + 1}th Generation Ancestor`}
                  </p>
                </div>
              </div>

              {index < lineage.length - 1 && (
                <div className="pl-5">
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </React.Fragment>
          ))}

          <div className="pt-4 border-t border-border/50 mt-4">
            <div className="flex items-center gap-4 opacity-50 italic">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Current Rikishi</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
