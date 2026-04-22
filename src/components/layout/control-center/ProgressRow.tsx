/**
 * ProgressRow.tsx
 * ===============
 * Single progress bar row: name, optional subtitle, value 0-100, tone color.
 * Used inside StatCard or standalone in lists.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface ProgressRowProps {
  name: string;
  subtitle?: string;
  value: number;
  tone?: "default" | "gold" | "east" | "west" | "success" | "warning" | "destructive";
  showValue?: boolean;
  className?: string;
}

const BAR_TONE: Record<string, string> = {
  default: "bg-primary",
  gold: "bg-[hsl(var(--gold))]",
  east: "bg-[hsl(var(--east))]",
  west: "bg-[hsl(var(--west))]",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const TEXT_TONE: Record<string, string> = {
  default: "text-primary",
  gold: "text-gold",
  east: "text-east",
  west: "text-west",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function ProgressRow({
  name,
  subtitle,
  value,
  tone = "default",
  showValue = true,
  className,
}: ProgressRowProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-medium truncate block">{name}</span>
          {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
        </div>
        {showValue && (
          <span
            className={cn("text-[10px] font-mono font-bold tabular-nums shrink-0", TEXT_TONE[tone])}
          >
            {clamped}%
          </span>
        )}
      </div>
      <div className="h-1 w-full rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", BAR_TONE[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
