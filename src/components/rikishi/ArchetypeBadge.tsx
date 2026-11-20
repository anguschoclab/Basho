/**
 * ArchetypeBadge.tsx
 * ==================
 * Shared combat-archetype badge — a Badge whose TooltipContent resolves
 * `getCombatArchetypeDescription` when the archetype id is known. Two
 * variants existed: the compact outline/mono card badge and the emphasis
 * dialog badge; both now funnel through this component.
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getCombatArchetypeDescription } from "@/presenters/engineAccess";
import type { CombatArchetype } from "@/engine/types/combat";
import { cn } from "@/lib/utils";

interface ArchetypeBadgeProps {
  archetypeName?: string;
  combatArchetype?: CombatArchetype;
  /** "outline" = compact card badge; "emphasis" = dialog badge. */
  variant?: "outline" | "emphasis";
  className?: string;
}

export function ArchetypeBadge({
  archetypeName,
  combatArchetype,
  variant = "outline",
  className,
}: ArchetypeBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {variant === "outline" ? (
            <Badge variant="outline" className={cn("font-mono cursor-help", className)}>
              {archetypeName}
            </Badge>
          ) : (
            <Badge
              className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 h-6 bg-primary/80 cursor-help",
                className
              )}
            >
              {archetypeName || "Unknown"}
            </Badge>
          )}
        </TooltipTrigger>
        {combatArchetype && (
          <TooltipContent>
            <p className="max-w-xs">{getCombatArchetypeDescription(combatArchetype)}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
