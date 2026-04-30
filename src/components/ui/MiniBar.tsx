/**
 * MiniBar.tsx
 * ===========
 * Micro progress bar for inline usage.
 */

import { cn } from "@/lib/utils";

interface MiniBarProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  color?: "primary" | "success" | "warning" | "destructive" | "gold";
  className?: string;
}

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
};

const colorClasses = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  gold: "bg-[hsl(var(--gold))]",
};

export function MiniBar({
  value,
  max = 100,
  size = "sm",
  color = "primary",
  className,
}: MiniBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn("w-full rounded-full bg-muted overflow-hidden", sizeClasses[size], className)}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", colorClasses[color])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
