/**
 * WidgetHeader.tsx
 * ================
 * Consistent header pattern for widgets with title, icon, and action.
 */

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetHeaderProps {
  title: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    tooltip?: string;
  };
  className?: string;
}

export function WidgetHeader({ title, icon: Icon, action, className }: WidgetHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border/50",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="p-1.5 rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
        <h3 className="text-sm font-display font-bold tracking-tight">{title}</h3>
      </div>
      {action && (
        <Button
          variant="ghost"
          onClick={action.onClick}
          tooltip={action.tooltip}
          className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 h-auto p-1"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
