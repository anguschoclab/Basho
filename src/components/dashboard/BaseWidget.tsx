import { ReactNode } from "react";
import { type LucideIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BaseWidgetAction {
  label: string;
  onClick: () => void;
  tooltip?: string;
}

export interface BaseWidgetProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;

  /** Content to display in the top right of the widget header (e.g. badges, counts) */
  headerContent?: ReactNode;

  /** Action displayed either in the header or footer (depending on design). Here we put it in the footer if provided or in header by default, or provide both. */
  headerAction?: BaseWidgetAction;

  footerAction?: BaseWidgetAction;

  /** Generic onInteract as requested, useful for making the entire widget or an inner shell interactable, or passing through */
  onInteract?: () => void;
  loading?: boolean;
  className?: string;
  iconClassName?: string;
}

export function BaseWidget({
  title,
  icon: Icon,
  children,
  headerContent,
  headerAction,
  footerAction,
  onInteract,
  loading = false,
  className,
  iconClassName,
}: BaseWidgetProps) {
  // If no specific actions are provided but onInteract is, we could use it for a generic footer action, but let's just make it available.
  return (
    <div className={`widget-card p-4 space-y-3 ${className || ""}`} onClick={onInteract}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconClassName || "text-primary"}`} />
          <span className="text-sm font-display font-semibold text-muted-foreground">{title}</span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {headerContent}
          {headerAction && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                headerAction.onClick();
              }}
              className="h-6 text-xs gap-1 text-muted-foreground"
              aria-label={
                headerAction.tooltip || headerAction.label || `View more ${title} details`
              }
              tooltip={headerAction.tooltip || `View more ${title} details`}
              tooltipSide="left"
            >
              {headerAction.label} <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse py-2">
          <div className="h-4 bg-muted/60 rounded w-3/4"></div>
          <div className="h-4 bg-muted/60 rounded w-1/2"></div>
        </div>
      ) : (
        children
      )}

      {footerAction && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            footerAction.onClick();
          }}
          className="w-full h-7 text-xs gap-1 text-muted-foreground hover:text-primary transition-colors mt-1"
          aria-label={
            footerAction.tooltip || footerAction.label || `Navigate to ${footerAction.label}`
          }
          tooltip={footerAction.tooltip || `Navigate to ${footerAction.label}`}
          tooltipSide="top"
        >
          {footerAction.label} <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
