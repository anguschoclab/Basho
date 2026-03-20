// InjuryRecoveryPanel.tsx — Rehabilitation management for injured rikishi
import { useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RikishiName } from "@/components/ClickableName";
import { Heart, Activity, AlertTriangle, Clock, Shield, Thermometer } from "lucide-react";
import type { WorldState } from "@/engine/types/world";
import { getHeyaFacilitiesSummary, getInjuredRosterSummary } from "@/engine/uiDigest";
import { STAT_BAND_LABELS } from "@/engine/descriptorBands";

/**
 * Get severity color.
 *  * @param severity - The Severity.
 *  * @returns The result.
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case "serious": return "text-destructive";
    case "moderate": return "text-amber-500";
    case "minor": return "text-yellow-500";
    default: return "text-muted-foreground";
  }
}

/**
 * Get severity badge.
 *  * @param severity - The Severity.
 */
function getSeverityBadge(severity: string) {
  switch (severity) {
    case "serious": return <Badge variant="destructive">Serious</Badge>;
    case "moderate": return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Moderate</Badge>;
    case "minor": return <Badge variant="secondary">Minor</Badge>;
    default: return <Badge variant="outline">Unknown</Badge>;
  }
}

/**
 * injury recovery panel.
 *  * @param { world } - The { world }.
 */
export function InjuryRecoveryPanel({ world }: { world: WorldState }) {
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : null;

  const injuredRikishi = useMemo(() => {
    if (!playerHeyaId) return [];
    return getInjuredRosterSummary(world, playerHeyaId);
  }, [world, playerHeyaId]);

  const facilitySummary = getHeyaFacilitiesSummary(playerHeya);
  const recoveryBand = facilitySummary?.recoveryBand ?? "capable";
  const recoveryLabel = STAT_BAND_LABELS[recoveryBand] ?? "Adequate";

  return (
    <div className="space-y-4">
      {/* Facility Overview */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Recovery Facilities</span>
            </div>
            <Badge variant="outline">{recoveryLabel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {recoveryBand === "exceptional" || recoveryBand === "outstanding"
              ? "Your recovery facilities accelerate healing. Injured wrestlers return faster."
              : recoveryBand === "strong" || recoveryBand === "capable" || recoveryBand === "developing"
                ? "Standard recovery support. Invest in facilities to speed up rehabilitation."
                : "Basic recovery only. Upgrading facilities would significantly reduce injury downtime."}
          </p>
        </CardContent>
      </Card>

      {/* Injured Roster */}
      {injuredRikishi.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
            <p className="font-medium">All Clear</p>
            <p className="text-sm text-muted-foreground mt-1">No injuries in your stable. Keep training smart.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {injuredRikishi.length} Injured Wrestler{injuredRikishi.length !== 1 ? "s" : ""}
            </h3>
          </div>

          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3 pr-2">
              {injuredRikishi.map((info) => (
                <Card key={info.rikishi.id} className="paper">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-semibold">
                            <RikishiName id={info.rikishi.id} name={info.rikishi.shikona} />
                          </h4>
                          {getSeverityBadge(info.severityBand)}
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {info.location.charAt(0).toUpperCase() + info.location.slice(1)} injury
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {info.weeksRemaining} week{info.weeksRemaining !== 1 ? "s" : ""} remaining
                          </span>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Recovery Progress</span>
                            <span className="font-mono">{info.recoveryProgress}%</span>
                          </div>
                          <Progress value={info.recoveryProgress} className="h-2" />
                        </div>

                        {info.facilityBonus > 0 && (
                          <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
                            <Thermometer className="h-3 w-3" />
                            Recovery facilities providing healing bonus
                          </p>
                        )}
                        {info.facilityBonus < 0 && (
                          <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Poor facilities slowing recovery
                          </p>
                        )}
                      </div>

                      <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                        info.severityBand === "serious" ? "bg-destructive/10" :
                        info.severityBand === "moderate" ? "bg-amber-500/10" : "bg-yellow-500/10"
                      }`}>
                        <AlertTriangle className={`h-5 w-5 ${getSeverityColor(info.severityBand)}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
