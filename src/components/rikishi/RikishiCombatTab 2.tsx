/**
 * RikishiCombatTab.tsx
 *
 * Combat tab content for rikishi profile page.
 */

import { Badge } from "@/components/ui/badge";
import { Activity, Shield } from "lucide-react";
import { RikishiRadarChart } from "@/components/rikishi/RikishiRadarChart";
import type { UIRikishi } from "@/presenters/uiModels";
import type { Rikishi } from "@/engine/types";

interface RikishiCombatTabProps {
  rikishi: UIRikishi;
  rawRikishi: Rikishi;
}

export function RikishiCombatTab({ rikishi, rawRikishi }: RikishiCombatTabProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Radar Chart */}
      <div className="space-y-6">
        <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
          <Activity className="h-5 w-5 text-primary" /> Combat Radar
        </h3>
        <div className="bg-muted/20 rounded-lg p-6 border border-border/50">
          <RikishiRadarChart rikishi={rawRikishi} className="h-64" />
        </div>
      </div>

      {/* Archetype card */}
      <div className="space-y-6">
        <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
          <Shield className="h-5 w-5 text-primary" /> Combat Archetype
        </h3>
        <div className="bg-muted/30 border-2 border-border/50 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="text-[11px] font-black uppercase tracking-widest px-3 h-7 bg-primary/80">
              {rikishi.archetypeName}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] font-black uppercase tracking-widest h-7"
            >
              {rikishi.styleName}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-muted/40 rounded-lg p-3 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Preferred Grip
              </p>
              <p className="text-sm font-display font-black capitalize">
                {rikishi.preferredGrip === "none" ? "No Preference" : rikishi.preferredGrip}
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Grip Depth
              </p>
              <p className="text-sm font-display font-black capitalize">
                {rikishi.preferredGripDepth}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
