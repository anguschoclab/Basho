/**
 * SectionHeader.tsx
 * =================
 * Mid-page section divider for use within tabs and multi-section layouts.
 * Lighter than PageHeader — eyebrow 9px mono, title 14px display semibold.
 * Optional lede and inline actions (e.g. a filter button or link).
 */

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({ eyebrow, title, lede, actions, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 pb-3 border-b border-border/30",
        className
      )}
    >
      <div className="space-y-0.5">
        {eyebrow && (
          <p className="stat-label text-[9px] text-muted-foreground tracking-[0.18em]">{eyebrow}</p>
        )}
        <h2 className="font-display font-semibold text-sm leading-tight">{title}</h2>
        {lede && <p className="text-[11px] text-muted-foreground font-body leading-snug">{lede}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
