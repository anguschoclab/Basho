/**
 * GlossaryTip.tsx
 *
 * Wraps children with a tooltip showing a glossary term's definition.
 * Falls back to plain children when the term is not found.
 */

import React from "react";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { GlossaryService } from "@/presenters/engineAccess";
import { cn } from "@/lib/utils";

interface GlossaryTipProps {
  termId: string;
  children: React.ReactNode;
  className?: string;
}

export function GlossaryTip({ termId, children, className }: GlossaryTipProps) {
  const term = GlossaryService.byId(termId);

  if (!term) {
    return <span className={className}>{children}</span>;
  }

  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-semibold text-sm">{term.termJa}</p>
      <p className="text-xs text-muted-foreground">{term.definition}</p>
    </div>
  );

  return (
    <TooltipWrap content={tooltipContent}>
      <span className={cn("border-b border-dotted border-current cursor-help", className)}>
        {children}
      </span>
    </TooltipWrap>
  );
}
