/**
 * RikishiNaturalization.tsx
 *
 * Naturalization timeline section for foreign rikishi.
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import type { UIRikishi } from "@/presenters/uiModels";

interface RikishiNaturalizationProps {
  rikishi: UIRikishi;
}

export function RikishiNaturalization({ rikishi }: RikishiNaturalizationProps) {
  if (rikishi.nationality === "Japan") {
    return null;
  }

  return (
    <div className="mb-10 p-6 bg-gold/5 border-2 border-gold/10 rounded-lg relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <UserPlus className="h-24 w-24 text-gold" />
      </div>
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h3 className="text-lg font-display font-black flex items-center gap-2 uppercase tracking-tight">
            Naturalization Timeline
          </h3>
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-gold/70">
            Institutional Residency Tracker
          </p>
        </div>
        <Badge
          className={cn(
            "font-black tracking-widest text-[10px] h-6",
            rikishi.careerWins >= 400 ? "bg-success" : "bg-gold"
          )}
        >
          {rikishi.careerWins >= 400 ? "ELIGIBLE" : "IN REVIEW"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {[
          {
            label: "Tenure",
            val: Math.min(100, Math.floor((rikishi.careerHistory.length / 60) * 100)),
            target: "60 Basho",
            tooltip: "Tenure progress: 60 basho required for naturalization eligibility",
          },
          {
            label: "Wins",
            val: Math.min(100, Math.floor((rikishi.careerWins / 400) * 100)),
            target: "400 Wins",
            tooltip: "Victory progress: 400 career wins required",
          },
          {
            label: "Stature",
            val: rikishi.rank === "yokozuna" || rikishi.rank === "ozeki" ? 100 : 30,
            target: "Sanyaku",
            tooltip: "Rank requirement: Must reach Komusubi or higher",
          },
        ].map((p, i) => (
          <TooltipWrap key={i} content={p.tooltip} side="top">
            <div className="space-y-2 cursor-help">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span>{p.label}</span>
                <span>{p.val}%</span>
              </div>
              <Progress value={p.val} className="h-1.5 bg-gold/30" />
              <p className="text-[9px] font-bold text-gold/60 uppercase tracking-widest italic">
                {p.target} Target
              </p>
            </div>
          </TooltipWrap>
        ))}
      </div>
    </div>
  );
}
