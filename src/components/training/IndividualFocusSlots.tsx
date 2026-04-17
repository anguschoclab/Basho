/**
 * IndividualFocusSlots.tsx
 *
 * Individual development plans for each rikishi.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, Users } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { FATIGUE_LABELS, toFatigueBand, getCareerPhase } from "@/presenters/uiDigest";
import { FOCUS_MODE_OPTIONS } from "./trainingConstants";
import type { IndividualFocusType } from "@/engine/types/training";
import type { Rikishi } from "@/engine/types";

interface IndividualFocusSlotsProps {
  rikishiList: Rikishi[];
  trainingState: {
    focusSlots?: Array<{ rikishiId: string; focusType: IndividualFocusType }>;
  };
  onIndividualFocusChange: (rikishiId: string, focusType: IndividualFocusType | null) => void;
}

export function IndividualFocusSlots({
  rikishiList,
  trainingState,
  onIndividualFocusChange,
}: IndividualFocusSlotsProps) {
  const focusMap = new Map((trainingState.focusSlots || []).map((f) => [f.rikishiId, f]));

  return (
    <section className="space-y-6 pt-10 border-t-2 border-dashed">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-secondary/10 rounded-lg">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-display font-black uppercase tracking-tight">
            Individual Focus Slots
          </h2>
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">
            High-performance personalized development coaching
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {rikishiList.map((rikishi, idx) => {
          const focus = focusMap.get(rikishi.id);
          const fb = toFatigueBand(rikishi.fatigue ?? 0);
          const isExhausted = fb === "exhausted" || fb === "spent";

          return (
            <div
              key={rikishi.id}
              className="dossier-paper p-6 rounded-lg flex flex-col md:flex-row md:items-center gap-8 group hover:border-primary/50 transition-all animate-in slide-in-from-left-4 fill-mode-both"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex-1 min-w-0 flex items-center gap-6">
                <div
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center font-display font-black text-lg shadow-inner",
                    rikishi.injured
                      ? "bg-red-500/10 text-red-500"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {rikishi.shikona.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-display font-black text-xl uppercase tracking-tighter truncate group-hover:text-primary transition-colors">
                      <RikishiName id={rikishi.id} name={rikishi.shikona} />
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-black uppercase tracking-widest border-2"
                    >
                      {rikishi.rank}
                    </Badge>
                    {rikishi.injured && (
                      <Badge className="bg-red-500 text-white text-[8px] h-5 font-black uppercase">
                        INJURED
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[9px] uppercase font-black text-muted-foreground tracking-widest">
                    <span className="flex items-center gap-2">
                      <Activity
                        className={cn(
                          "h-3 w-3",
                          isExhausted ? "text-red-500 animate-pulse" : "text-success"
                        )}
                      />
                      {FATIGUE_LABELS[fb]}
                    </span>
                    <span className="h-1 w-1 bg-border/40 rounded-full" />
                    <span>{getCareerPhase(rikishi.experience)} Phase</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 bg-muted/30 p-2 rounded-lg border border-dashed">
                {FOCUS_MODE_OPTIONS.map((opt) => {
                  const isActive = focus?.focusType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        onIndividualFocusChange(rikishi.id, isActive ? null : opt.value)
                      }
                      className={cn(
                        "flex flex-col items-center justify-center h-14 w-20 rounded-lg transition-all gap-1",
                        isActive
                          ? "bg-primary text-white shadow-lg scale-105"
                          : "text-muted-foreground hover:bg-white/50"
                      )}
                      title={opt.description}
                    >
                      {opt.icon}
                      <span className="text-[8px] font-black uppercase tracking-tighter">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {rikishiList.length === 0 && (
          <div className="py-24 text-center dossier-paper rounded-lg border-dashed opacity-50 space-y-4">
            <Users className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
            <p className="font-display italic text-sm">
              Review your roster directory to assign professional coaching targets.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
