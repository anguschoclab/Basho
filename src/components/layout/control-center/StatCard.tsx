/**
 * StatCard.tsx
 * ============
 * Control Center stat summary card.
 * Displays an eyebrow label, title, a grid of stat items, and optional
 * progress indicators. Icon is optional.
 */

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface StatItem {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "gold" | "success" | "warning" | "destructive" | "east" | "west";
}

export interface ProgressItem {
  label: string;
  value: number;
  tone?: "default" | "gold" | "east" | "west" | "success" | "destructive";
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
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="stat-label tracking-[0.16em]">{eyebrow}</p>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
            <h3 className="font-display font-semibold text-sm leading-tight">{title}</h3>
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

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
              <div className="h-1 w-full rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
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
