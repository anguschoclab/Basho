/**
 * SkeletonCard.tsx
 * ================
 * Skeleton placeholder for widgets and cards.
 * Matches WidgetCard dimensions to prevent layout shift.
 */

import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface SkeletonCardProps {
  /** Size variant matching WidgetCard */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Show header section */
  hasHeader?: boolean;
  /** Number of content rows */
  rows?: number;
  /** Show footer/action area */
  hasFooter?: boolean;
  /** Container className */
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: "xl:col-span-3 md:col-span-2 col-span-1",
  md: "xl:col-span-4 md:col-span-2 col-span-1",
  lg: "xl:col-span-6 md:col-span-2 col-span-1",
  xl: "xl:col-span-8 md:col-span-4 col-span-1",
  full: "col-span-full",
};

export function SkeletonCard({
  size = "md",
  hasHeader = true,
  rows = 3,
  hasFooter = false,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        sizeClasses[size],
        "flex flex-col h-full overflow-hidden",
        "bg-card border border-border rounded p-4",
        className
      )}
    >
      {/* Header */}
      {hasHeader && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <Skeleton className="h-6 w-16 rounded" />
        </div>
      )}

      {/* Content rows */}
      <div className="flex-1 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-full rounded" />
            {i === 0 && <Skeleton className="h-3 w-3/4 rounded" />}
          </div>
        ))}
      </div>

      {/* Optional chart/graphics area */}
      <Skeleton className="h-24 w-full rounded mt-3" />

      {/* Footer */}
      {hasFooter && (
        <div className="mt-3 pt-3 border-t border-border">
          <Skeleton className="h-7 w-full rounded" />
        </div>
      )}
    </div>
  );
}

export default SkeletonCard;
