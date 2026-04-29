import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGame } from "@/contexts/GameContext";
import { Coins, TrendingUp, Calendar } from "lucide-react";
import { formatYen } from "@/utils/engineUtils";
import { RikishiName } from "@/components/ClickableName";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutResult } from "@/engine/types/basho";

export function KenshoManagementWidget() {
  const { state } = useGame();
  const world = state.world;
  const heyaId = world?.playerHeyaId;
  const heya = heyaId ? world?.heyas.get(heyaId) : undefined;

  // Single pass through rikishiIds to gather rikishi and metrics
  const { playerRikishi, totalKenshoEarnings, projectedKensho } = useMemo(() => {
    const rikishiArray: Rikishi[] = [];
    let earningsSum = 0;
    let projectedSum = 0;

    if (heya && heya.rikishiIds) {
      for (const id of heya.rikishiIds) {
        const rikishi = world?.rikishi.get(id);
        if (rikishi) {
          rikishiArray.push(rikishi);

          // Earnings
          const economics = rikishi.economics;
          if (economics) {
            earningsSum += (economics.careerKenshoWon || 0) * 70000;
          }

          // Projections
          const rank = rikishi.rank;
          if (rank) {
            let baseProjection = 0;
            if (rank === "yokozuna" || rank === "ozeki") baseProjection = 15;
            else if (rank === "sekiwake" || rank === "komusubi") baseProjection = 10;
            else if (rank.includes("maegashira")) baseProjection = 5;
            projectedSum += baseProjection * 70000;
          }
        }
      }
    }
    return {
      playerRikishi: rikishiArray,
      totalKenshoEarnings: earningsSum,
      projectedKensho: projectedSum,
    };
  }, [heya?.rikishiIds, world?.rikishi]);

  // Memoize recent bouts with kensho computation
  const recentBoutsWithKensho = useMemo(() => {
    const arr: Array<{
      rikishiId: string;
      rikishiName: string;
      boutId: string;
      kenshoEnvelopes: number;
      awardFact?: string;
    }> = [];

    if (world?.currentBasho?.matches && heya?.rikishiIds) {
      for (const match of world.currentBasho.matches) {
        const result = match.result as BoutResult | undefined;
        if (!result) continue;

        const eastRikishi = world.rikishi.get(match.eastRikishiId);
        const westRikishi = world.rikishi.get(match.westRikishiId);

        if (eastRikishi && heya.rikishiIds.includes(eastRikishi.id) && result.kenshoEnvelopes > 0) {
          arr.push({
            rikishiId: eastRikishi.id,
            rikishiName: eastRikishi.shikona || eastRikishi.id,
            boutId: match.boutId,
            kenshoEnvelopes: result.kenshoEnvelopes,
            awardFact: result.awardFact || undefined,
          });
        }

        if (westRikishi && heya.rikishiIds.includes(westRikishi.id) && result.kenshoEnvelopes > 0) {
          arr.push({
            rikishiId: westRikishi.id,
            rikishiName: westRikishi.shikona || westRikishi.id,
            boutId: match.boutId,
            kenshoEnvelopes: result.kenshoEnvelopes,
            awardFact: result.awardFact || undefined,
          });
        }
      }
    }
    return arr;
  }, [world?.currentBasho?.matches, world?.rikishi, heya?.rikishiIds]);

  if (!heyaId || !heya) {
    return null;
  }

  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Kensho Management
        </CardTitle>
        <CardDescription>
          Track kensho (prize banner) earnings and projections for your rikishi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-gold" />
                <span className="text-sm font-medium">Total Earnings</span>
              </div>
              <div className="text-2xl font-bold">{formatYen(totalKenshoEarnings)}</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Projected (Basho)</span>
              </div>
              <div className="text-2xl font-bold">{formatYen(projectedKensho)}</div>
            </div>
          </div>

          {/* Recent Kensho Earnings */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Recent Kensho Awards
            </h4>
            {recentBoutsWithKensho.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No kensho awards in recent bouts
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {recentBoutsWithKensho.map((bout) => (
                    <div
                      key={bout.boutId}
                      className="flex items-center justify-between p-2 rounded border bg-card"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          <RikishiName id={bout.rikishiId} name={bout.rikishiName} />
                        </div>
                        <div className="text-xs text-muted-foreground">{bout.boutId}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gold">
                          {bout.kenshoEnvelopes} envelopes
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatYen(bout.kenshoEnvelopes * 70000)}
                        </div>
                      </div>
                      {bout.awardFact && (
                        <Badge variant="secondary" className="ml-2">
                          {bout.awardFact}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Rikishi Breakdown */}
          <div>
            <h4 className="text-sm font-medium mb-3">Rikishi Breakdown</h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {playerRikishi.map((rikishi) => {
                  const economics = rikishi.economics;
                  const kenshoEarnings = (economics?.careerKenshoWon || 0) * 70000;
                  const rank = rikishi.rank || "unknown";

                  return (
                    <div
                      key={rikishi.id}
                      className="flex items-center justify-between p-2 rounded border bg-card"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          <RikishiName id={rikishi.id} name={rikishi.shikona || rikishi.id} />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {rank}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gold">
                          {formatYen(kenshoEarnings)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {kenshoEarnings > 0
                            ? `${Math.round(kenshoEarnings / 70000)} envelopes`
                            : "None"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
