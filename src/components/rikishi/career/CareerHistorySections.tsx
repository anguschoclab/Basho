/**
 * CareerHistorySections.tsx
 *
 * Tail sections of the rikishi career tab: narrative highlights,
 * promotion history, and the association milestone timeline.
 */

import { Badge } from "@/components/ui/badge";
import {
  Star,
  Trophy,
  Medal,
  TrendingUp,
  Sparkles,
  Swords,
  ArrowUpCircle,
  ArrowDownCircle,
  Zap,
  Crown,
} from "lucide-react";
import type { Milestone } from "@/engine/types/history";
import type {
  NarrativeHighlight,
  PromotionHistoryEntry,
} from "@/presenters/engineAccess";

const HIGHLIGHT_ICONS: Partial<Record<NarrativeHighlight["type"], typeof Star>> = {
  yusho: Trophy,
  kinboshi: Star,
  upset: Zap,
  promotion: ArrowUpCircle,
  retirement: ArrowDownCircle,
  milestone: Medal,
  debut: Sparkles,
  comeback: Sparkles,
  dominant: Swords,
  dynasty: Crown,
  career_high: Star,
  streak: TrendingUp,
  rivalry: Swords,
};

function HighlightIcon({ type }: { type: NarrativeHighlight["type"] }) {
  const Icon = HIGHLIGHT_ICONS[type] ?? Star;
  return <Icon className="h-4 w-4 text-primary" />;
}

export function NarrativeHighlights({
  narrativeHighlights,
}: {
  narrativeHighlights?: NarrativeHighlight[];
}) {
  if (!narrativeHighlights || narrativeHighlights.length === 0) return null;
  return (
    <div className="space-y-6 pt-10 border-t-2 border-dashed">
      <h3 className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
        <Sparkles className="h-6 w-6 text-primary" />
        Narrative Highlights
      </h3>
      <div className="relative pl-10 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-1 before:bg-muted before:rounded-full">
        {narrativeHighlights.map((h, i: number) => (
          <div
            key={i}
            className="relative animate-in slide-in-from-left-2 duration-500 fill-mode-both"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="absolute -left-[35px] top-1.5 h-4 w-4 rounded-full bg-primary border-4 border-background shadow-lg ring-4 ring-primary/10" />
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-3">
                <HighlightIcon type={h.type} />
                <Badge
                  variant="outline"
                  className="text-[10px] font-black uppercase tracking-widest border-2"
                >
                  {h.year} {h.bashoName}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-display italic opacity-80">
                {h.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PromotionHistory({
  promotionHistory,
}: {
  promotionHistory?: PromotionHistoryEntry[];
}) {
  if (!promotionHistory || promotionHistory.length === 0) return null;
  return (
    <div className="space-y-6 pt-10 border-t-2 border-dashed">
      <h3 className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
        <ArrowUpCircle className="h-6 w-6 text-primary" />
        Promotion History
      </h3>
      <div className="space-y-2">
        {promotionHistory.map((p, i: number) => (
          <div
            key={i}
            className="flex items-center gap-4 border border-border/40 rounded-lg p-3"
          >
            <div className="flex items-center gap-2">
              {p.kind === "promotion" ? (
                <ArrowUpCircle className="h-4 w-4 text-success" />
              ) : (
                <ArrowDownCircle className="h-4 w-4 text-gold" />
              )}
              <Badge
                variant="outline"
                className="text-[10px] font-black uppercase tracking-widest border-2"
              >
                {p.year} {p.bashoName}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm font-display">
              <span className="font-black opacity-60">{p.fromRank}</span>
              <span className="opacity-40">→</span>
              <span className="font-black text-primary">{p.toRank}</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {p.isJump && (
                <Badge className="text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary">
                  Jump
                </Badge>
              )}
              {p.isSanyaku && (
                <Badge className="text-[10px] font-black uppercase tracking-widest bg-gold/20 text-gold">
                  Sanyaku
                </Badge>
              )}
              {p.isSekitori && (
                <Badge className="text-[10px] font-black uppercase tracking-widest bg-success/20 text-success">
                  Sekitori
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="space-y-6 pt-10 border-t-2 border-dashed">
      <h3 className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
        <Star className="h-6 w-6 text-gold" />
        Association Milestones
      </h3>
      <div className="relative pl-10 space-y-12 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-1 before:bg-muted before:rounded-full">
        {milestones.length === 0 ? (
          <div className="py-10 text-center bg-muted/20 border-2 border-dashed rounded-lg opacity-50">
            <p className="text-sm font-display italic">
              This rikishi has not yet participated in Association milestones.
            </p>
          </div>
        ) : (
          milestones
            .slice()
            .reverse()
            .map((m, i: number) => (
              <div
                key={i}
                className="relative animate-in slide-in-from-left-2 duration-500 fill-mode-both"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="absolute -left-[35px] top-1.5 h-4 w-4 rounded-full bg-primary border-4 border-background shadow-lg ring-4 ring-primary/10" />
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-4">
                    <h4 className="font-display font-black text-xl uppercase tracking-tighter">
                      {m.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-black uppercase tracking-widest border-2"
                    >
                      {m.date.year}.{m.date.month}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-display italic opacity-80">
                    {m.description}
                  </p>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
