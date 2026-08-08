import { BaseWidget } from "./BaseWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coins, TrendingUp, Calendar } from "lucide-react";
import { formatYen } from "@/utils/engineUtils";
import { RikishiName } from "@/components/ClickableName";
import { useKenshoData } from "@/hooks/useKenshoData";

export function KenshoManagementWidget() {
  const {
    heyaId,
    heya,
    playerRikishi,
    totalKenshoEarnings,
    projectedKensho,
    recentBoutsWithKensho,
  } = useKenshoData();

  if (!heyaId || !heya) {
    return null;
  }

  return (
    <BaseWidget title="Kensho Management" icon={Coins} className="paper">
      <p className="text-sm text-muted-foreground mb-4">
        Track kensho (prize banner) earnings and projections for your rikishi.
      </p>
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
            <EmptyState icon={Coins} title="No kensho awards in recent bouts" compact />
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
                      <div className="font-semibold text-gold">{formatYen(kenshoEarnings)}</div>
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
    </BaseWidget>
  );
}
