/**
 * ActionQueueSections.tsx
 *
 * Action queue item renderers — navigate rows and expandable resolve rows
 * with option buttons. Severity styling lives in actionQueueConfig.tsx.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock } from "lucide-react";
import type { ActionItem } from "@/presenters/projections/actionQueue";
import { ACTION_ICON_MAP, SEVERITY_CONFIG } from "./actionQueueConfig";

type NavigateItem = Extract<ActionItem, { kind: "navigate" }>;
type ResolveItem = Extract<ActionItem, { kind: "resolve" }>;

/** Navigate-kind item — a severity-tinted link row. */
export function ActionNavigateRow({
  item,
  onNavigate,
}: {
  item: NavigateItem;
  onNavigate: (item: NavigateItem) => void;
}) {
  const sev = SEVERITY_CONFIG[item.severity];

  return (
    <button
      onClick={() => onNavigate(item)}
      aria-label={`Navigate to ${item.title}`}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded border text-left transition-colors group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${sev.border} ${sev.bg} ${sev.hoverBg}`}
    >
      <div className="shrink-0">
        {item.icon ? (ACTION_ICON_MAP[item.icon] ?? sev.icon) : sev.icon}
      </div>
      <span className={`text-xs font-semibold flex-1 ${sev.text}`}>{item.title}</span>
      <ChevronRight
        className={`h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity ${sev.text}`}
      />
    </button>
  );
}

/** Resolve-kind item — expandable header + option buttons + deadline note. */
export function ActionResolveRow({
  item,
  isExpanded,
  onToggle,
  onResolve,
}: {
  item: ResolveItem;
  isExpanded: boolean;
  onToggle: () => void;
  onResolve: (item: ResolveItem, optionId: string, optionLabel: string) => void;
}) {
  const sev = SEVERITY_CONFIG[item.severity];

  return (
    <div className={`rounded border ${sev.border} ${sev.bg}`}>
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.title}`}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-t transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${sev.hoverBg}`}
      >
        <div className="shrink-0">{sev.icon}</div>
        <span className={`text-xs font-semibold flex-1 ${sev.text}`}>{item.title}</span>
        {item.required && (
          <Badge
            variant="outline"
            className="border-destructive/30 text-destructive text-[9px] px-1 py-0"
          >
            Required
          </Badge>
        )}
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
                onClick={() => onResolve(item, opt.id, opt.label)}
                className="justify-start text-xs h-auto py-1.5"
              >
                <span className="font-semibold">{opt.label}</span>
                <span className="text-muted-foreground ml-1.5">— {opt.impact}</span>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
            <Clock className="h-3 w-3" />
            <span>
              {item.required
                ? "Blocks time advance — you must choose an option"
                : "Auto-resolves after its deadline if not chosen"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
