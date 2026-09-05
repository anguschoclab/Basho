/**
 * KihakuStatRow — displays the kihaku isen (fighting spirit) score.
 *
 * Surfaces the real rikishi.kihakuIsenScore computed by KihakuService
 * and written by BanzukePublisher. Previously this score was hidden and
 * only fed Yokozuna Deliberation Council statements internally.
 */
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { Flame } from "lucide-react";

const SCORE_COLORS: Record<string, string> = {
  high: "hsl(var(--gold))",
  mid: "hsl(var(--primary))",
  low: "hsl(var(--muted-foreground))",
  critical: "hsl(var(--destructive))",
};

function scoreTier(score: number): keyof typeof SCORE_COLORS {
  if (score >= 65) return "high";
  if (score >= 50) return "mid";
  if (score >= 35) return "low";
  return "critical";
}

export function KihakuStatRow({
  kihakuIsenScore,
  label,
}: {
  kihakuIsenScore: number;
  label: string;
}) {
  const tier = scoreTier(kihakuIsenScore);
  const color = SCORE_COLORS[tier];

  return (
    <TooltipWrap
      content={`Kihaku Isen (fighting spirit): ${kihakuIsenScore}/100 — ${label}. Computed from comeback wins, edge crisis survivals, playoff wins, and yusho-contention bouts.`}
      side="top"
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-help"
        data-testid="kihaku-stat-row"
        style={{
          background: `${color}12`,
          border: `1px solid ${color}30`,
        }}
      >
        <Flame className="h-4 w-4" style={{ color }} />
        <div className="flex flex-col">
          <span
            className="text-[9px] uppercase leading-none"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.15em",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            Kihaku
          </span>
          <span
            className="text-[14px] font-bold leading-tight tabular-nums"
            style={{ fontFamily: "var(--font-mono)", color }}
          >
            {kihakuIsenScore}
          </span>
        </div>
        <span
          className="text-[10px] font-medium leading-none"
          style={{ color }}
        >
          {label}
        </span>
      </div>
    </TooltipWrap>
  );
}
