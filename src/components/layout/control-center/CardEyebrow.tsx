import React from "react";
import type { LucideIcon } from "lucide-react";

export interface CardEyebrowProps {
  eyebrow: string;
  title: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function CardEyebrow({ eyebrow, title, icon: Icon, actions }: CardEyebrowProps) {
  return (
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
  );
}
