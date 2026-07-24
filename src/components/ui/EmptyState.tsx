/**
 * EmptyState.tsx
 * ============
 * Consistent empty state component with illustration, title, description, and CTA.
 * Used for no data, empty search results, and feature gates.
 */

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  /** Lucide icon or custom icon component */
  icon?: LucideIcon;
  /** Icon className for custom styling */
  iconClassName?: string;
  /** Main heading */
  title: string;
  /** Supporting description */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  };
  /** Secondary action (link or subtle action) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Container className */
  className?: string;
  /** Compact mode for inline empty states */
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  iconClassName,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-12 px-6",
        className
      )}
    >
      {/* Icon container with subtle background */}
      {Icon && (
        <div
          className={cn(
            "rounded-full bg-muted/50 flex items-center justify-center mb-4",
            compact ? "h-12 w-12" : "h-16 w-16"
          )}
        >
          <Icon
            className={cn(
              "text-muted-foreground/40",
              compact ? "h-6 w-6" : "h-8 w-8",
              iconClassName
            )}
          />
        </div>
      )}

      {/* Title */}
      <h3
        className={cn(
          "font-display font-semibold text-foreground",
          compact ? "text-sm" : "text-lg"
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            "text-muted-foreground max-w-[280px]",
            compact ? "text-xs mt-1" : "text-sm mt-2"
          )}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className={cn("flex items-center gap-2", compact ? "mt-3" : "mt-4")}>
          {action && (
            <Button
              size={compact ? "sm" : "default"}
              variant={action.variant || "default"}
              onClick={action.onClick}
              className="text-xs"
              aria-label={action.label}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              size={compact ? "sm" : "default"}
              variant="ghost"
              onClick={secondaryAction.onClick}
              className="text-xs"
              aria-label={secondaryAction.label}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
