/**
 * EraToneBadge — surfaces the real world.meta.tone in the top nav.
 *
 * Replaces the fabricated "CURRENT BIAS: OSHI-STRONG" badge that previously
 * appeared on TrendsPage. Reads the actual era tone computed by
 * EraDriftService and updated at each yearly boundary.
 */
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import type { EraTone } from "@/presenters/eraTone";
import { ERA_TONE_LABELS, ERA_TONE_COLORS } from "@/presenters/eraTone";

export function EraToneBadge({ tone }: { tone: EraTone }) {
  const label = ERA_TONE_LABELS[tone] ?? tone;
  const color = ERA_TONE_COLORS[tone] ?? "hsl(var(--muted-foreground))";

  return (
    <TooltipWrap content={`Current era: ${label}`} side="bottom">
      <div
        className="h-7 px-2.5 rounded flex items-center gap-1.5 cursor-help"
        data-testid="era-tone-badge"
        style={{
          background: `${color}18`,
          border: `1px solid ${color}35`,
        }}
      >
        <span
          className="text-[9px] uppercase leading-none"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.15em",
            color: color,
          }}
        >
          Era
        </span>
        <span
          className="text-[11px] font-semibold leading-none"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
            color: color,
          }}
        >
          {label}
        </span>
      </div>
    </TooltipWrap>
  );
}
