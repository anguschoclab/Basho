/**
 * KimariteTag.tsx
 *
 * Displays a kimarite name with a tooltip showing its Japanese name and description.
 * Falls back to plain text when the kimarite is not in the registry or has no real description.
 */

import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { getKimarite } from "@/presenters/uiDigest";
import { cn } from "@/lib/utils";

interface KimariteTagProps {
  kimariteId: string;
  kimariteName?: string;
  className?: string;
}

function isPlaceholderDescription(name: string, description: string): boolean {
  return description === `${name} technique.`;
}

export function KimariteTag({ kimariteId, kimariteName, className }: KimariteTagProps) {
  const def = getKimarite(kimariteId);
  const displayName = kimariteName ?? def?.name ?? kimariteId;

  const hasRealDescription =
    def?.description && !isPlaceholderDescription(def.name, def.description);

  if (!def || !hasRealDescription) {
    return <span className={className}>{displayName}</span>;
  }

  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-semibold text-sm">{def.nameJa}</p>
      <p className="text-xs text-muted-foreground">{def.description}</p>
    </div>
  );

  return (
    <TooltipWrap content={tooltipContent}>
      <span className={cn("border-b border-dotted border-current cursor-help", className)}>
        {displayName}
      </span>
    </TooltipWrap>
  );
}
