// InjuryRecoveryPanel.tsx — Rehabilitation management for injured rikishi
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RikishiName } from "@/components/ClickableName";
import { Heart, Activity, AlertTriangle, Clock, Shield, Thermometer } from "lucide-react";
import type { projectMedicalUIDigest } from "@/presenters/uiDigest";

/**
 * Returns a CSS color class based on the injury severity.
 * 
 * @param {string} severity - The severity of the injury (e.g., 'serious', 'moderate', 'minor').
 * @returns {string} The Tailwind CSS color class.
 */
export function getSeverityColor(severity: string): string {
  const SEVERITY_COLORS: Record<string, string> = {
    serious: "text-destructive",
    moderate: "text-gold",
    minor: "text-gold",
  };
  return SEVERITY_COLORS[severity] || "text-muted-foreground";
}

/**
 * Returns a UI badge component representing the injury severity.
 * 
 * @param {string} severity - The severity of the injury.
 * @returns {React.ReactNode} A Badge component with appropriate styling.
 */
export function getSeverityBadge(severity: string) {
  const SEVERITY_BADGES: Record<string, React.ReactNode> = {
    serious: <Badge variant="destructive">Serious</Badge>,
    moderate: <Badge className="bg-gold/20 text-gold border-gold/30">Moderate</Badge>,
    minor: <Badge variant="secondary">Minor</Badge>,
  };
  return SEVERITY_BADGES[severity] || <Badge variant="outline">Unknown</Badge>;
}

interface InjuryRecoveryPanelProps {
  digest: NonNullable<ReturnType<typeof projectMedicalUIDigest>>;
}

/**
 * Renders a panel showing rehabilitation progress and facility status for injured rikishi.
 * 
 * @param {InjuryRecoveryPanelProps} props - The component props.
 * @param {projectMedicalUIDigest} props.digest - The medical digest data for the stable.
 * @returns {JSX.Element} The injury recovery panel UI.
 */
export function InjuryRecoveryPanel({ digest }: InjuryRecoveryPanelProps) {
  const { facilityLevel, facilityLabel, injuredRikishi } = digest;

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
            <Badge variant="outline">{facilityLabel}</Badge>
          </div>
          <Progress value={facilityLevel} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {facilityLevel >= 70
              ? "Your recovery facilities accelerate healing. Injured wrestlers return faster."
              : facilityLevel >= 40
                ? "Standard recovery support. Invest in facilities to speed up rehabilitation."
                : "Basic recovery only. Upgrading facilities would significantly reduce injury downtime."}
          </p>
        </CardContent>
      </Card>

      {/* Injured Roster */}
      {injuredRikishi.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-8 w-8 text-success mx-auto mb-3" />
            <p className="font-medium">All Clear</p>
            <p className="text-sm text-muted-foreground mt-1">
              No injuries in your stable. Keep training smart.
            </p>
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
                <Card key={info.id} className="paper">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-semibold">
                            <RikishiName id={info.id} name={info.shikona} />
                          </h4>
                          <Badge
                            variant="outline"
                            className="border-west text-west bg-west/10 font-bold text-[9px] tracking-widest"
                          >
                            Recovering
                          </Badge>
                          {getSeverityBadge(info.severity)}
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {info.location.charAt(0).toUpperCase() + info.location.slice(1)} injury
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {info.weeksRemaining} week{info.weeksRemaining !== 1 ? "s" : ""}{" "}
                            remaining
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
                          <p className="text-xs text-success mt-2 flex items-center gap-1">
                            <Thermometer className="h-3 w-3" />
                            Recovery facilities providing healing bonus
                          </p>
                        )}
                        {info.facilityBonus < 0 && (
                          <p className="text-xs text-gold mt-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Poor facilities slowing recovery
                          </p>
                        )}
                      </div>

                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                          info.severity === "serious"
                            ? "bg-destructive/10"
                            : info.severity === "moderate"
                              ? "bg-gold/10"
                              : "bg-gold/10"
                        }`}
                      >
                        <AlertTriangle className={`h-5 w-5 ${getSeverityColor(info.severity)}`} />
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
