/**
 * ListCard.tsx
 * ============
 * Control Center generic list card.
 * Accepts typed rows; renders eyebrow, title, and a scrollable list of items.
 * Each row: label (left), value (right), optional sub-label and tone color.
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CardEyebrow } from "./CardEyebrow";

export interface ListRow {
  id: string;
  label: ReactNode;
  value?: ReactNode;
  sub?: string;
  tone?: "default" | "gold" | "success" | "warning" | "destructive" | "east" | "west";
  onClick?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
}

interface ListCardProps {
  eyebrow: string;
  title: string;
  rows: ListRow[];
  icon?: LucideIcon;
  emptyText?: string;
  maxRows?: number;
  actions?: ReactNode;
  className?: string;
}

const ROW_VALUE_TONE: Record<string, string> = {
  default: "text-foreground",
  gold: "text-gold",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  east: "text-east",
  west: "text-west",
};

export function ListCard({
  eyebrow,
  title,
  rows,
  icon: Icon,
  emptyText = "No data.",
  maxRows,
  actions,
  className,
}: ListCardProps) {
  const displayRows = maxRows ? rows.slice(0, maxRows) : rows;

  return (
    <div className={cn("paper rounded p-4 space-y-3", className)}>
      <CardEyebrow eyebrow={eyebrow} title={title} icon={Icon} actions={actions} />

      {displayRows.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-4">{emptyText}</p>
      ) : (
        <div className="space-y-0.5">
          {displayRows.map((row) => (
            <div
              key={row.id}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs transition-colors",
                row.onClick ? "cursor-pointer hover:bg-muted/50" : ""
              )}
              onClick={row.onClick}
            >
              {row.leading && <span className="shrink-0">{row.leading}</span>}
              <span className="flex-1 min-w-0 font-medium truncate">{row.label}</span>
              {row.sub && (
                <span className="text-[10px] text-muted-foreground shrink-0">{row.sub}</span>
              )}
              {row.value !== undefined && (
                <span
                  className={cn(
                    "font-mono font-bold tabular-nums shrink-0 text-[11px]",
                    ROW_VALUE_TONE[row.tone ?? "default"]
                  )}
                >
                  {row.value}
                </span>
              )}
              {row.trailing && <span className="shrink-0">{row.trailing}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
