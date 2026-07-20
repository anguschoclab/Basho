import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Coins,
  HeartPulse,
  Globe,
  Trophy,
  Calendar,
  Inbox,
  Clock,
} from "lucide-react";
import type { ActionItem, ActionSeverity } from "@/presenters/projections/actionQueue";
import { EmptyState } from "@/components/ui/EmptyState";
import { BaseWidget } from "./BaseWidget";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { decisionToastMessage } from "@/components/game/decisionFeedback";

const ICON_MAP: Record<string, React.ReactNode> = {
  coins: <Coins className="h-4 w-4" />,
  "heart-pulse": <HeartPulse className="h-4 w-4" />,
  globe: <Globe className="h-4 w-4" />,
  trophy: <Trophy className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
};

const SEVERITY_CONFIG: Record<
  ActionSeverity,
  {
    icon: React.ReactNode;
    badge: string;
    border: string;
    bg: string;
    hoverBg: string;
    text: string;
  }
> = {
  critical: {
    icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
    badge: "border-destructive/30 text-destructive",
    border: "border-destructive/30",
    bg: "bg-destructive/8",
    hoverBg: "hover:bg-destructive/15",
    text: "text-destructive",
  },
  warning: {
    icon: <AlertCircle className="h-4 w-4 text-warning" />,
    badge: "border-warning/30 text-warning",
    border: "border-warning/30",
    bg: "bg-warning/8",
    hoverBg: "hover:bg-warning/15",
    text: "text-warning",
  },
  info: {
    icon: <Info className="h-4 w-4 text-primary" />,
    badge: "border-primary/30 text-primary",
    border: "border-primary/30",
    bg: "bg-primary/5",
    hoverBg: "hover:bg-primary/10",
    text: "text-primary",
  },
};

interface ActionQueueWidgetProps {
  items: ActionItem[];
}

export function ActionQueueWidget({ items }: ActionQueueWidgetProps) {
  const navigate = useNavigate();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const visibleItems = useMemo(() => items.map((item, i) => ({ item, index: i })), [items]);

  const handleNavigate = (item: ActionItem) => {
    if (item.kind === "navigate") {
      navigate({ to: item.link as Parameters<typeof navigate>[0]["to"] });
    }
  };

  const handleResolve = (item: ActionItem, optionId: string, optionLabel: string) => {
    if (item.kind === "resolve") {
      sendCommand({
        type: "RESOLVE_LOOP_DECISION",
        decisionId: item.decisionId,
        optionId,
      });
      toast.success(decisionToastMessage(optionLabel));
    }
  };

  const toggleExpand = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const config = useMemo(() => {
    if (visibleItems.length === 0) return null;
    const worst = visibleItems[0].item.severity;
    return SEVERITY_CONFIG[worst];
  }, [visibleItems]);

  if (visibleItems.length === 0) {
    return (
      <BaseWidget title="Action Queue" icon={Inbox} className="border border-border/40">
        <EmptyState icon={Inbox} title="No pending actions" compact />
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      title="Action Queue"
      icon={Inbox}
      className={`border ${config?.border ?? "border-border/40"}`}
      headerContent={
        <Badge variant="outline" className={config?.badge ?? ""}>
          {visibleItems.length}
        </Badge>
      }
    >
      <div className="space-y-2">
        {visibleItems.map(({ item, index }) => {
          const sev = SEVERITY_CONFIG[item.severity];
          const isExpanded = expanded.has(index);

          if (item.kind === "navigate") {
            return (
              <button
                key={index}
                onClick={() => handleNavigate(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded border text-left transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${sev.border} ${sev.bg} ${sev.hoverBg}`}
              >
                <div className="shrink-0">
                  {item.icon ? (ICON_MAP[item.icon] ?? sev.icon) : sev.icon}
                </div>
                <span className={`text-xs font-semibold flex-1 ${sev.text}`}>{item.title}</span>
                <ChevronRight
                  className={`h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity ${sev.text}`}
                />
              </button>
            );
          }

          // kind: "resolve"
          return (
            <div key={index} className={`rounded border ${sev.border} ${sev.bg}`}>
              <button
                onClick={() => toggleExpand(index)}
                aria-expanded={isExpanded}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-t transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${sev.hoverBg}`}
              >
                <div className="shrink-0">{sev.icon}</div>
                <span className={`text-xs font-semibold flex-1 ${sev.text}`}>{item.title}</span>
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""} ${sev.text}`}
                />
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  <p className="text-[10px] text-muted-foreground">Choose an option:</p>
                  <div className="flex flex-col gap-1.5">
                    {item.options.map((opt) => (
                      <Button
                        key={opt.id}
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(item, opt.id, opt.label)}
                        className="justify-start text-xs h-auto py-1.5"
                      >
                        <span className="font-semibold">{opt.label}</span>
                        <span className="text-muted-foreground ml-1.5">— {opt.impact}</span>
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
                    <Clock className="h-3 w-3" />
                    <span>Will auto-resolve on next tick if not chosen</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </BaseWidget>
  );
}
