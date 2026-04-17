/**
 * RikishiProfileTab.tsx
 *
 * Profile tab content for rikishi profile page.
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Award as AwardIcon, Info, Shield, Target, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { NarrativeService } from "@/engine/systems/narrative/NarrativeService";
import { rngFromSeed } from "@/engine/rng";
import type { UIRikishi } from "@/presenters/uiModels";
import type { Rikishi } from "@/engine/types";
import { RankBadge } from "./RankBadge";

interface RikishiProfileTabProps {
  rikishi: UIRikishi;
  rawRikishi: Rikishi;
  worldSeed: string;
}

export function RikishiProfileTab({ rikishi, rawRikishi, worldSeed }: RikishiProfileTabProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
          <Activity className="h-5 w-5 text-primary" /> Physical Attributes
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Forcefulness",
              key: "strength",
              val: rikishi.perceivedStats.strength,
              raw: rawRikishi.stats?.strength ?? 50,
              color: "bg-gold",
              icon: <Zap className="h-3.5 w-3.5" />,
            },
            {
              label: "Agility",
              key: "speed",
              val: rikishi.perceivedStats.speed,
              raw: rawRikishi.stats?.speed ?? 50,
              color: "bg-west",
              icon: <TrendingUp className="h-3.5 w-3.5" />,
            },
            {
              label: "Resilience",
              key: "stamina",
              val: rikishi.perceivedStats.stamina,
              raw: rawRikishi.stats?.stamina ?? 50,
              color: "bg-success",
              icon: <Shield className="h-3.5 w-3.5" />,
            },
            {
              label: "Precision",
              key: "technique",
              val: rikishi.perceivedStats.technique,
              raw: rawRikishi.stats?.technique ?? 50,
              color: "bg-purple-500",
              icon: <Target className="h-3.5 w-3.5" />,
            },
          ].map((stat, i) => (
            <TooltipWrap
              key={i}
              content={NarrativeService.describeAttribute(
                rngFromSeed(worldSeed, "ui", "rikishi-dossier"),
                stat.key,
                stat.raw
              )}
              side="top"
            >
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-3 hover:border-primary/20 transition-colors cursor-help">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                  {stat.icon} {stat.label}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-display font-black">{stat.val}</div>
                  <Progress value={stat.raw} className={cn("h-1 flex-1 opacity-40", stat.color)} />
                </div>
              </div>
            </TooltipWrap>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <RankBadge
          rank={rikishi.rank}
          rankNumber={rikishi.rankNumber}
          side={rikishi.side}
          variant="pill"
          showJapanese
        />
        <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
          <AwardIcon className="h-5 w-5 text-primary" /> Notes
        </h3>
        <div className="bg-muted/20 border-2 border-dashed rounded-lg p-6 space-y-4 opacity-70">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm italic font-display leading-relaxed">
              "{rikishi.shikona} is known for a traditional style that emphasizes lower-body
              strength and direct thrusting. While his Tachiai is among the most disciplined in the
              stable, critics argue his defensive belt-work remains a point of vulnerability."
            </p>
          </div>
          <div className="h-px bg-border/40" />
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">
              Steady Gainer
            </Badge>
            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">
              Crowd Favorite
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
