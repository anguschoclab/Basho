import { useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RikishiName } from "@/components/ClickableName";
import { buildWeeklyDigest, type DigestSection, type DigestItem } from "@/engine/uiDigest";
import {
  AlertTriangle, TrendingUp, Activity, Coins, FileText, Sparkles,
  Users, Building2, Newspaper,
} from "lucide-react";

const KIND_ICON: Record<string, React.ElementType> = {
  training: TrendingUp, injury: AlertTriangle, recovery: Activity,
  salary: Coins, koenkai: Users, expense: Building2,
  economy: Sparkles, scouting: FileText, generic: Newspaper,
};

const KIND_COLOR: Record<string, string> = {
  training: "text-primary", injury: "text-destructive",
  recovery: "text-success", economy: "text-primary/70",
  scouting: "text-primary/60", generic: "text-muted-foreground",
};

/** digest widget. */
export function DigestWidget() {
  const { state } = useGame();
  const digest = useMemo(() => buildWeeklyDigest(state.world), [state.world]);

  if (!digest) return null;

  const totalItems = digest.sections.reduce((s, sec) => s + sec.items.length, 0);

  return (
    <div className="widget-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Digest</span>
        </div>
        {totalItems > 0 && (
          <Badge variant="secondary" className="text-[10px]">{totalItems} events</Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground italic">{digest.headline}</p>

      {digest.sections.length === 0 ? (
        <div className="text-center py-4">
          <Newspaper className="h-5 w-5 text-muted-foreground/20 mx-auto mb-1.5" />
          <p className="text-xs text-muted-foreground">A quiet week. No notable events.</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[260px]">
          <div className="space-y-3">
            {digest.sections.slice(0, 5).map(section => (
              <div key={section.id}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {section.title}
                </div>
                <div className="space-y-1">
                  {section.items.slice(0, 4).map(item => {
                    const Icon = KIND_ICON[item.kind] ?? Newspaper;
                    const color = KIND_COLOR[item.kind] ?? "text-muted-foreground";
                    return (
                      <div key={item.id} className="flex items-start gap-2 text-xs py-0.5">
                        <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${color}`} />
                        <div className="min-w-0">
                          <span className="font-medium">{item.title}</span>
                          {item.detail && (
                            <span className="text-muted-foreground ml-1">— {item.detail}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {section.items.length > 4 && (
                    <p className="text-[10px] text-muted-foreground pl-5">
                      +{section.items.length - 4} more
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
