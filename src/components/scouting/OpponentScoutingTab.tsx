// OpponentScoutingTab.tsx — Comprehensive opponent lookup & scouting investment

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  projectOpponentScoutingUIDigest,
  setScoutingInvestment,
  RANK_NAMES,
  RANK_HIERARCHY,
} from "@/presenters/uiDigest";
import { AttrChip } from "./AttrChip";
import { SortMenu, type SortOption } from "@/components/ui/SortMenu";
import { compareBy, type SortDirection } from "@/lib/sortUtils";

const SORT_OPTIONS: SortOption[] = [
  { key: "rank", label: "Rank" },
  { key: "shikona", label: "Shikona" },
  { key: "scoutLevel", label: "Scout Level" },
];

export function OpponentScoutingTab({ playerHeyaId }: { playerHeyaId: string | null }) {
  const navigate = useNavigate();
  const { state, updateWorld } = useGame();
  const world = state.world;
  const { toast } = useToast();
  const [filterDivision, setFilterDivision] = useState<string>("makuuchi");
  const [sortKey, setSortKey] = useState<string>("rank");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const digest = useMemo(() => {
    if (!world) return { opponents: [] };
    const d = projectOpponentScoutingUIDigest(world, playerHeyaId, filterDivision);
    if (sortKey === "rank") {
      d.opponents = [...d.opponents].sort((a, b) => {
        const ta = (RANK_HIERARCHY as Record<string, { tier: number }>)[a.rank]?.tier ?? 99;
        const tb = (RANK_HIERARCHY as Record<string, { tier: number }>)[b.rank]?.tier ?? 99;
        const result = ta - tb || (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
        return sortOrder === "desc" ? -result : result;
      });
    } else {
      const accessor: Record<string, (r: (typeof d.opponents)[number]) => string | number | undefined> = {
        shikona: (r) => r.shikona,
        scoutLevel: (r) => r.scoutLevel,
      };
      const fn = accessor[sortKey];
      if (fn) {
        d.opponents = [...d.opponents].sort((a, b) => compareBy(a, b, fn, sortOrder));
      }
    }
    return d;
  }, [world, playerHeyaId, filterDivision, sortKey, sortOrder]);

  const handleInvestScouting = (
    rikishiId: string,
    level: "none" | "light" | "standard" | "deep"
  ) => {
    if (!world) return;
    setScoutingInvestment(world, rikishiId, level);
    updateWorld({ ...world });
    toast({
      title: "Scouting updated",
      description: `Investment set to ${level}.`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Division filter + Sort */}
      <div className="flex gap-2 flex-wrap items-center">
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
        <div className="ml-auto">
          <SortMenu
            options={SORT_OPTIONS}
            storageKey="basho_sort_opponent_scouting"
            defaultSortKey="rank"
            defaultSortOrder="asc"
            onSortChange={(key, order) => {
              setSortKey(key);
              setSortOrder(order);
            }}
          />
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3 pr-2">
          {digest.opponents.map((r) => {
            const rankNames = RANK_NAMES[r.rank] || { ja: r.rank, en: r.rank };

            return (
              <Card
                key={r.id}
                className="paper cursor-pointer hover:border-primary/50 transition-all"
                onClick={() =>
                  navigate({
                    to: "/rikishi/$rikishiId",
                    params: { rikishiId: r.id },
                  })
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold text-lg truncate">{r.shikona}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {rankNames.ja}
                          {r.rankNumber ? ` ${r.rankNumber}` : ""}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {r.heyaName} • {r.height}cm{" "}
                        <span className="opacity-60">({r.heightDescriptor})</span> / {r.weight}kg{" "}
                        <span className="opacity-60">({r.weightDescriptor})</span>
                      </div>

                      {/* Scouted attributes — narrative only */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3 text-xs">
                        <AttrChip label="Power" attr={r.scoutedAttrs.power} />
                        <AttrChip label="Speed" attr={r.scoutedAttrs.speed} />
                        <AttrChip label="Balance" attr={r.scoutedAttrs.balance} />
                        <AttrChip label="Technique" attr={r.scoutedAttrs.technique} />
                        <AttrChip label="Aggression" attr={r.scoutedAttrs.aggression} />
                        <AttrChip label="Experience" attr={r.scoutedAttrs.experience} />
                      </div>
                    </div>

                    {/* Scouting level + invest controls */}
                    <div className="flex flex-col items-end gap-2 shrink-0 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <Search className={`h-4 w-4 ${r.scoutInfo.color}`} />
                        <span className={`text-sm font-medium ${r.scoutInfo.color}`}>
                          {r.scoutInfo.label}
                        </span>
                      </div>
                      <Progress value={r.scoutedProgress} className="h-1.5 w-24" />

                      {/* Investment buttons */}
                      <div className="flex gap-1 mt-1">
                        {(["none", "light", "standard", "deep"] as const).map((inv) => (
                          <Button
                            key={inv}
                            variant={r.scoutingInvestment === inv ? "default" : "ghost"}
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

          {digest.opponents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No opponents found in this division.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
