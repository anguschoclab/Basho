/**
 * RegionalHubSections.tsx
 *
 * World Circuit hub sections — the global presence score widget and the
 * regional influence tile grid with build-academy actions.
 */

import { Globe, MapPin, ArrowRight } from "lucide-react";
import { WidgetCard } from "@/components/ui/WidgetCard";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const REGIONS = ["Mongolia", "Georgia", "Europe", "Americas", "East_Asia"];

/** Global presence score — mean of the five regional presence values. */
export function GlobalPresenceScore({
  regionalPresence,
}: {
  regionalPresence: Record<string, number>;
}) {
  let sum = 0;
  for (const v of Object.values(regionalPresence) as number[]) sum += v;

  return (
    <div className="flex justify-end">
      <WidgetCard className="p-3 bg-card/50 border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-mono">
          Global Presence
        </p>
        <p className="text-2xl font-black text-primary font-mono">{(sum / 5).toFixed(1)}%</p>
      </WidgetCard>
    </div>
  );
}

/** Regional influence grid — presence score per region + academy action. */
export function RegionalInfluenceGrid({
  regionalPresence,
  onBuildAcademy,
}: {
  regionalPresence: Record<string, number>;
  onBuildAcademy: (region: string) => void;
}) {
  return (
    <WidgetCard className="border-border bg-card/40">
      <WidgetHeader title="Regional Influence" icon={Globe} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {REGIONS.map((region) => {
          const score = regionalPresence[region] ?? 0;
          const status = score >= 80 ? "Academy" : score >= 40 ? "Visible" : "Hidden";

          return (
            <div
              key={region}
              className="p-4 rounded-lg bg-secondary/40 border border-border/50 group hover:border-border transition-colors"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold text-foreground font-display">{region}</span>
                </div>
                <Badge
                  variant={
                    status === "Academy"
                      ? "default"
                      : status === "Visible"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-[10px] uppercase font-mono"
                >
                  {status}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground font-mono">
                  <span>Presence Score</span>
                  <span>{score}%</span>
                </div>
                <Progress value={score} className="h-1.5" />
              </div>
              {status === "Academy" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-4 text-[10px] uppercase font-bold text-primary hover:text-primary/80 hover:bg-primary/5 font-mono"
                  onClick={() => onBuildAcademy(region)}
                >
                  Build Academy <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
