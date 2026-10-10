import React, { useMemo } from "react";
import { useGame } from "../../contexts/useGame";
import { getLineageTree } from "../../engine/lineage";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { GitCommit, Crown, User, ChevronDown } from "lucide-react";

interface LineageTreeProps {
  rikishiId: string;
}

/**
 * LineageTree Component
 * Visualizes the mentorship spirit lineage of a rikishi (Ancestors).
 */
export const LineageTree = ({ rikishiId }: LineageTreeProps) => {
  const { state } = useGame();

  const lineage = useMemo(() => {
    if (!state.world) return [];
    return getLineageTree(state.world, rikishiId);
  }, [state.world, rikishiId]);

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
                  <div className="w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center group-hover:border-gold transition-colors">
                    {index === 0 ? (
                      <User className="h-5 w-5 text-gold" />
                    ) : (
                      <GitCommit className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
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
