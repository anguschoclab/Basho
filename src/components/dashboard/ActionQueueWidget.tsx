import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";
import type { ActionItem } from "@/presenters/projections/actionQueue";
import { EmptyState } from "@/components/ui/EmptyState";
import { BaseWidget } from "./BaseWidget";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { decisionToastMessage } from "@/components/game/decisionFeedback";
import { SEVERITY_CONFIG } from "./actionQueueConfig";
import { ActionNavigateRow, ActionResolveRow } from "./ActionQueueSections";

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

  const blockingCount = useMemo(
    () => visibleItems.filter(({ item }) => item.kind === "resolve" && item.required).length,
    [visibleItems]
  );

  const resolveItemIndexes = useMemo(
    () => visibleItems.filter(({ item }) => item.kind === "resolve").map(({ index }) => index),
    [visibleItems]
  );

  const expandAll = () => setExpanded(new Set(resolveItemIndexes));

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
        <div className="flex items-center gap-2">
          {blockingCount > 0 && (
            <Badge variant="outline" className="border-destructive/30 text-destructive">
              {blockingCount} blocking
            </Badge>
          )}
          {resolveItemIndexes.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={expandAll}
              aria-label="Expand all decisions"
            >
              Expand all
            </Button>
          )}
          <Badge variant="outline" className={config?.badge ?? ""}>
            {visibleItems.length}
          </Badge>
        </div>
      }
    >
      <div className="space-y-2">
        {visibleItems.map(({ item, index }) =>
          item.kind === "navigate" ? (
            <ActionNavigateRow key={index} item={item} onNavigate={handleNavigate} />
          ) : (
            <ActionResolveRow
              key={index}
              item={item}
              isExpanded={expanded.has(index)}
              onToggle={() => toggleExpand(index)}
              onResolve={handleResolve}
            />
          )
        )}
      </div>
    </BaseWidget>
  );
}
