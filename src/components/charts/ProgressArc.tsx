/**
 * ProgressArc.tsx
 * ===============
 * Semi-circular progress gauge with center label.
 */

import { cn } from "@/lib/utils";

interface ProgressArcProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  color?: "gold" | "primary" | "success" | "warning" | "destructive";
  label?: string;
  className?: string;
}

const sizeConfig = {
  sm: { width: 60, strokeWidth: 4, fontSize: 10 },
  md: { width: 80, strokeWidth: 6, fontSize: 14 },
  lg: { width: 120, strokeWidth: 8, fontSize: 18 },
};

const colorMap = {
  gold: "hsl(var(--gold))",
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
};

export function ProgressArc({
  value,
  max = 100,
  size = "md",
  color = "primary",
  label,
  className,
}: ProgressArcProps) {
  const config = sizeConfig[size];
  const strokeColor = colorMap[color];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const strokeDashoffset = circumference * (1 - percentage / 100);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={config.width}
        height={config.width / 2}
        viewBox={`0 0 ${config.width} ${config.width / 2}`}
      >
        {/* Background arc */}
        <path
          d={`M ${config.strokeWidth / 2} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M ${config.strokeWidth / 2} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {label && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 font-mono font-bold text-muted-foreground"
          style={{ fontSize: config.fontSize }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
