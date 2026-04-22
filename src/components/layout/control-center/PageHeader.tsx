/**
 * PageHeader.tsx
 * ==============
 * Control Center canonical page header.
 * Eyebrow: 10px mono gold uppercase.
 * Title: Shippori/display font, 2rem bold.
 * Lede: Spectral/body, muted, optional.
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, lede, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 pb-5 border-b border-border/40",
        className
      )}
    >
      <div className="space-y-0.5">
        <p className="stat-label text-gold tracking-[0.2em]">{eyebrow}</p>
        <h1 className="font-display text-2xl font-bold leading-tight sumi-e-ink">{title}</h1>
        {lede && (
          <p className="text-sm text-muted-foreground font-body leading-snug mt-1">{lede}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 mt-1">{actions}</div>}
    </header>
  );
}
