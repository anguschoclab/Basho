import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Search } from "lucide-react";
import {
  RANK_NAMES,
  describeScoutingLevel,
  getScoutedAttributes,
  type ScoutingInvestment,
} from "@/engine/scouting";
import {
  getOrCreateScouted,
  getScoutingLevel,
  setScoutingInvestment,
  warmScoutingForRikishiList,
} from "@/engine/scoutingStore";
import { useToast } from "@/hooks/use-toast";
import { projectRikishi, type UIRikishi } from "@/presenters/uiModels";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import { AttrChip } from "./AttrChip";

export function OpponentScoutingTab({
  world,
  playerHeyaId,
}: {
  world: any;
  playerHeyaId: string | null;
}) {
  const navigate = useNavigate();
  const { updateWorld } = useGame();
  const { toast } = useToast();
  const [filterDivision, setFilterDivision] = useState<string>("makuuchi");

  const opponents = useMemo(() => {
    if (!world) return [];
    const list: UIRikishi[] = [];
    for (const r of world.rikishi.values()) {
      if (r.isRetired) continue;
      if (r.heyaId === playerHeyaId) continue;
      if (filterDivision && r.division !== filterDivision) continue;
      list.push(projectRikishi(r, world));
    }
    // Sort by rank tier
    list.sort((a, b) => {
      const ta = RANK_HIERARCHY[a.rank]?.tier ?? 99;
      const tb = RANK_HIERARCHY[b.rank]?.tier ?? 99;
      if (ta !== tb) return ta - tb;
      return (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
    });
    const sliced = list.slice(0, 40);
    // Pre-warm scouting entries for all opponents shown
    warmScoutingForRikishiList(
      world,
      sliced.map((r) => r.id),
    );
    return sliced;
  }, [world, playerHeyaId, filterDivision]);

  const handleInvestScouting = (
    rikishiId: string,
    level: ScoutingInvestment,
  ) => {
    if (!world) return;
    setScoutingInvestment(world, rikishiId, level);
    updateWorld({ ...world });
    toast({
      title: "Scouting updated",
      description: `Investment set to ${level}.`,
    });
  };

  const seed = world?.seed || "default";

  return (
    <div className="space-y-4">
      {/* Division filter */}
      <div className="flex gap-2 flex-wrap">
        {["makuuchi", "juryo", "makushita"].map((div) => (
          <Button
            key={div}
            variant={filterDivision === div ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterDivision(div)}
            className="capitalize"
          >
            {div}
          </Button>
        ))}
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3 pr-2">
          {opponents.map((r) => {
            const originalRikishi = world.rikishi.get(r.id);
            if (!originalRikishi) return null;

            const scouted = getOrCreateScouted(world, r.id, 1);
            const scoutLevel = getScoutingLevel(world, r.id, 1);
            const attrs = getScoutedAttributes(scouted, originalRikishi, seed);
            const scoutInfo = describeScoutingLevel(scoutLevel);
            const rankNames = RANK_NAMES[r.rank] || { ja: r.rank, en: r.rank };
            const heya = world.heyas.get(r.heyaId);

            return (
              <Card
                key={r.id}
                className="paper cursor-pointer hover:border-primary/50 transition-all"
                onClick={() =>
                  navigate({
                    to: "/rikishi/$rikishiId",
                    params: { rikishiId: r.id } as any,
                  })
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold text-lg truncate">
                          {r.shikona}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {rankNames.ja}
                          {r.rankNumber ? ` ${r.rankNumber}` : ""}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {heya?.name ?? "Unknown stable"} • {r.height}cm /{" "}
                        {r.weight}kg
                      </div>

                      {/* Scouted attributes — narrative only */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3 text-xs">
                        <AttrChip label="Power" attr={attrs.power} />
                        <AttrChip label="Speed" attr={attrs.speed} />
                        <AttrChip label="Balance" attr={attrs.balance} />
                        <AttrChip label="Technique" attr={attrs.technique} />
                        <AttrChip label="Aggression" attr={attrs.aggression} />
                        <AttrChip label="Experience" attr={attrs.experience} />
                      </div>
                    </div>

                    {/* Scouting level + invest controls */}
                    <div className="flex flex-col items-end gap-2 shrink-0 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <Search className={`h-4 w-4 ${scoutInfo.color}`} />
                        <span
                          className={`text-sm font-medium ${scoutInfo.color}`}
                        >
                          {scoutInfo.label}
                        </span>
                      </div>
                      <Progress
                        value={scouted.scoutingLevel}
                        className="h-1.5 w-24"
                      />

                      {/* Investment buttons */}
                      <div className="flex gap-1 mt-1">
                        {(
                          [
                            "none",
                            "light",
                            "standard",
                            "deep",
                          ] as ScoutingInvestment[]
                        ).map((inv) => (
                          <Button
                            key={inv}
                            variant={
                              scouted.scoutingInvestment === inv
                                ? "default"
                                : "ghost"
                            }
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInvestScouting(r.id, inv);
                            }}
                          >
                            {inv === "none" ? "—" : inv.charAt(0).toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {opponents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No opponents found in this division.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
