/**
 * StatCard.tsx
 * ============
 * Control Center stat summary card.
 * Displays an eyebrow label, title, a grid of stat items, and optional
 * progress indicators. Icon is optional.
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { CardEyebrow } from "./CardEyebrow";

export interface StatItem {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "gold" | "success" | "warning" | "destructive" | "east" | "west";
}

export interface ProgressItem {
  label: string;
  value: number;
  tone?: "default" | "gold" | "east" | "west" | "success" | "warning" | "destructive";
}

interface StatCardProps {
  eyebrow: string;
  title: string;
  stats: StatItem[];
  progress?: ProgressItem[];
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
  cols?: 2 | 3 | 4;
}

const VALUE_TONE: Record<string, string> = {
  default: "text-foreground",
  gold: "text-gold",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  east: "text-east",
  west: "text-west",
};

const PROGRESS_TONE: Record<string, string> = {
  default: "bg-primary",
  gold: "bg-[hsl(var(--gold))]",
  east: "bg-[hsl(var(--east))]",
  west: "bg-[hsl(var(--west))]",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const COL_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

export function StatCard({
  eyebrow,
  title,
  stats,
  progress,
  icon: Icon,
  actions,
  className,
  cols = 2,
}: StatCardProps) {
  return (
    <div className={cn("paper rounded p-4 space-y-3", className)}>
      <CardEyebrow eyebrow={eyebrow} title={title} icon={Icon} actions={actions} />

      <div className={cn("grid gap-3", COL_CLASS[cols])}>
        {stats.map((stat, i) => (
          <div key={i} className="space-y-0.5">
            <p className="stat-label text-[9px]">{stat.label}</p>
            <p
              className={cn(
                "font-mono font-bold text-sm tabular-nums leading-tight",
                VALUE_TONE[stat.tone ?? "default"]
              )}
            >
              {stat.value}
            </p>
            {stat.sub && (
              <p className="text-[10px] text-muted-foreground leading-tight">{stat.sub}</p>
            )}
          </div>
        ))}
      </div>

      {progress && progress.length > 0 && (
        <div className="space-y-2 pt-1">
          {progress.map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="stat-label text-[9px]">{p.label}</p>
                <p className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  {p.value}%
                </p>
              </div>
              <div className="h-1 w-full rounded-xs bg-muted/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-xs transition-all duration-500",
                    PROGRESS_TONE[p.tone ?? "default"]
                  )}
                  style={{ width: `${Math.min(p.value, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
