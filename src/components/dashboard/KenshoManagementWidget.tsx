import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGame } from "@/contexts/GameContext";
import { Coins, TrendingUp, Calendar } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutResult } from "@/engine/types/basho";

export function KenshoManagementWidget() {
  const { state } = useGame();
  const world = state.world;

  if (!world?.playerHeyaId) {
    return null;
  }

  const heya = world.heyas.get(world.playerHeyaId);
  if (!heya) return null;

  // Get player's rikishi
  const playerRikishi = (heya.rikishiIds || [])
    .map((id) => world.rikishi.get(id))
    .filter((r): r is Rikishi => r !== undefined);

  // Calculate total kensho earnings from recent bouts
  const totalKenshoEarnings = playerRikishi.reduce((sum, rikishi) => {
    const economics = rikishi.economics;
    if (!economics) return sum;
    // careerKenshoWon is the count, multiply by ¥70,000 per envelope
    return sum + (economics.careerKenshoWon || 0) * 70000;
  }, 0);

  // Get recent bout results with kensho
  const recentBoutsWithKensho: Array<{
    rikishiId: string;
    rikishiName: string;
    boutId: string;
    kenshoEnvelopes: number;
    awardFact?: string;
  }> = [];

  // Look through recent basho results
  if (world.currentBasho?.matches) {
    for (const match of world.currentBasho.matches) {
      const result = match.result as BoutResult | undefined;
      if (!result) continue;

      // Check if either rikishi is from player's heya
      const eastRikishi = world.rikishi.get(match.eastRikishiId);
      const westRikishi = world.rikishi.get(match.westRikishiId);

      if (eastRikishi && heya.rikishiIds?.includes(eastRikishi.id) && result.kenshoEnvelopes > 0) {
        recentBoutsWithKensho.push({
          rikishiId: eastRikishi.id,
          rikishiName: eastRikishi.shikona || eastRikishi.id,
          boutId: match.boutId,
          kenshoEnvelopes: result.kenshoEnvelopes,
          awardFact: result.awardFact || undefined,
        });
      }

      if (westRikishi && heya.rikishiIds?.includes(westRikishi.id) && result.kenshoEnvelopes > 0) {
        recentBoutsWithKensho.push({
          rikishiId: westRikishi.id,
          rikishiName: westRikishi.shikona || westRikishi.id,
          boutId: match.boutId,
          kenshoEnvelopes: result.kenshoEnvelopes,
          awardFact: result.awardFact || undefined,
        });
      }
    }
  }

  // Calculate projected kensho for upcoming bouts
  // This is a simplified projection based on rank
  const projectedKensho = playerRikishi.reduce((sum, rikishi) => {
    const rank = rikishi.rank;
    if (!rank) return sum;

    // Higher ranks get more kensho opportunities
    let baseProjection = 0;
    if (rank === "yokozuna" || rank === "ozeki") baseProjection = 15;
    else if (rank === "sekiwake" || rank === "komusubi") baseProjection = 10;
    else if (rank.includes("maegashira")) baseProjection = 5;

    return sum + baseProjection * 70000; // ¥70,000 per envelope
  }, 0);

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
              <div className="text-2xl font-bold">¥{totalKenshoEarnings.toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Projected (Basho)</span>
              </div>
              <div className="text-2xl font-bold">¥{projectedKensho.toLocaleString()}</div>
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
                          ¥{(bout.kenshoEnvelopes * 70000).toLocaleString()}
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
                          ¥{kenshoEarnings.toLocaleString()}
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
