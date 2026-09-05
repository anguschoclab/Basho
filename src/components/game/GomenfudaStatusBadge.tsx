/**
 * GomenfudaStatusBadge — shows the heya's current gomenfuda count and
 * sanction risk next to the withdraw button.
 *
 * Surfaces the real gomenfuda count from the event log (via
 * projectGomenfuda). Previously the player withdrew blind with no
 * indication of accumulating sanctions.
 */
import { AlertTriangle } from "lucide-react";
import type { GomenfudaProjection } from "@/presenters/projections/governanceProjections";

export function GomenfudaStatusBadge({ projection }: { projection: GomenfudaProjection }) {
  const { count, threshold, sanctionRiskPercent, hasSanctionWarning } = projection;

  if (count === 0) return null;

  const color =
    hasSanctionWarning
      ? "hsl(var(--destructive))"
      : sanctionRiskPercent >= 67
        ? "hsl(var(--warning))"
        : "hsl(var(--muted-foreground))";

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-widest"
      data-testid="gomenfuda-status-badge"
      style={{
        color,
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      <AlertTriangle className="h-3 w-3" />
      <span>
        Gomenfuda {count}/{threshold}
        {hasSanctionWarning && " — SANCTION RISK"}
      </span>
    </div>
  );
}
