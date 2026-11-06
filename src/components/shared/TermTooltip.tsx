/**
 * TermTooltip.tsx — hover definition for sumo terms, backed by
 * engine/narrative/glossary/terms.ts (GLOSSARY_TERMS). Wrap any jargon
 * (rank, kimarite, role) so new players can learn terms in place.
 */

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GlossaryService } from "@/presenters/engineAccess";
import { cn } from "@/lib/utils";

const termIndex = new Map(GlossaryService.all().map((t) => [t.id, t]));
const termByLabel = new Map(GlossaryService.all().map((t) => [t.term.toLowerCase(), t]));

export function TermTooltip({
  term,
  children,
  className,
}: {
  /** Glossary term id (e.g. "yokozuna") or the displayed label itself. */
  term: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const entry = termIndex.get(term) ?? termByLabel.get(term.toLowerCase());
  const label = children ?? entry?.term ?? term;
  if (!entry) return <span className={className}>{label}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("cursor-help underline decoration-dotted underline-offset-4 decoration-muted-foreground/40", className)}>
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-semibold">
          {entry.term}
          {entry.termJa ? <span className="ml-2 text-muted-foreground">{entry.termJa}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{entry.definition}</p>
      </TooltipContent>
    </Tooltip>
  );
}
