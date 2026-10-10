/**
 * RikishiNaturalization.tsx
 *
 * Naturalization timeline section for foreign rikishi.
 *
 * The engine rule (citizenshipUtils) is tenure-based: a foreign rikishi
 * naturalizes after NATURALIZATION_YEARS years of residency counted from
 * `joinedHeyaDate`. There is no wins or rank bar — a separate prestige
 * pathway (naturalization.ts) can grant early citizenship to elite
 * careers, but it is a rare chance roll, not a progress meter.
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import type { UIRikishi } from "@/presenters/uiModels";
import { NATURALIZATION_YEARS } from "@/presenters/engineAccess";

interface RikishiNaturalizationProps {
  rikishi: UIRikishi;
}

export function RikishiNaturalization({ rikishi }: RikishiNaturalizationProps) {
  if (rikishi.nationality === "Japan") {
    return null;
  }

  const isNaturalized = rikishi.citizenshipStatus === "naturalized";
  const yearsRemaining = rikishi.yearsToNaturalization ?? 0;
  const tenurePct = isNaturalized
    ? 100
    : Math.min(
        100,
        Math.max(
          0,
          Math.round(((NATURALIZATION_YEARS - yearsRemaining) / NATURALIZATION_YEARS) * 100)
        )
      );

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
          <p className="text-[10px] uppercase font-black tracking-[0.15em] text-gold/70">
            Residency Requirement: {NATURALIZATION_YEARS} Years
          </p>
        </div>
        <Badge
          className={cn(
            "font-black tracking-widest text-[10px] h-6",
            isNaturalized ? "bg-success" : "bg-gold"
          )}
        >
          {isNaturalized ? "Naturalized" : "In residency"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-8 relative z-10">
        <TooltipWrap
          content={`Tenure progress: ${NATURALIZATION_YEARS} years of residency required for naturalization`}
          side="top"
        >
          <div className="space-y-2 cursor-help">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span>Residency Tenure</span>
              <span>
                {isNaturalized
                  ? "Complete"
                  : `${yearsRemaining} yr${yearsRemaining === 1 ? "" : "s"} remaining`}
              </span>
            </div>
            <Progress value={tenurePct} className="h-1.5 bg-gold/30" />
            <p className="text-[10px] font-bold text-gold/60 uppercase tracking-widest italic">
              {NATURALIZATION_YEARS} Years Target
            </p>
          </div>
        </TooltipWrap>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Elite careers may be granted early citizenship at the association&apos;s discretion.
        </p>
      </div>
    </div>
  );
}
