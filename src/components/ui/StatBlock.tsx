/**
 * StatBlock.tsx
 * ============
 * Number + label pattern with optional trend indicator.
 */

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatBlockProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: { value: "text-base", label: "text-[10px]", sub: "text-[9px]" },
  md: { value: "text-lg", label: "text-xs", sub: "text-[10px]" },
  lg: { value: "text-2xl", label: "text-sm", sub: "text-xs" },
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const trendColors = {
  up: "text-success",
  down: "text-destructive",
  neutral: "text-muted-foreground",
};

export function StatBlock({
  label,
  value,
  subValue,
  trend,
  size = "md",
  className,
}: StatBlockProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;
  const trendColor = trend ? trendColors[trend] : "";

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "text-muted-foreground font-mono font-bold uppercase tracking-tight",
          sizeClasses[size].label
        )}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className={cn("font-display font-bold tabular-nums", sizeClasses[size].value)}>
          {value}
        </div>
        {TrendIcon && <TrendIcon className={cn("h-3 w-3", trendColor)} />}
      </div>
      {subValue && (
        <div className={cn("text-muted-foreground tabular-nums", sizeClasses[size].sub)}>
          {subValue}
        </div>
      )}
    </div>
  );
}
