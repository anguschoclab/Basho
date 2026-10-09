/**
 * CrisisModalSections.tsx
 *
 * Crisis modal action sections — the world-defined option buttons and the
 * fallback harsh/cover-up footer for non-optioned crises.
 */

import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import type { CrisisOption } from "@/engine/types/crises";

/** Crisis option buttons — one per world-defined option. */
export function CrisisOptionButtons({
  options,
  onResolve,
}: {
  options: CrisisOption[];
  onResolve: (choiceId: string, choiceLabel?: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-6">
      {options.map((opt: CrisisOption) => (
        <Button
          key={opt.id}
          variant={opt.id === "harsh" || opt.id.includes("suspend") ? "destructive" : "outline"}
          onClick={() => onResolve(opt.id, opt.label)}
          className="w-full font-bold uppercase tracking-tight"
          tooltip={opt.description}
          tooltipSide="right"
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

/** Fallback actions for crises with no explicit options. */
export function CrisisFallbackActions({
  onResolve,
}: {
  onResolve: (choiceId: string, choiceLabel?: string) => void;
}) {
  return (
    <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
      <Button
        variant="destructive"
        onClick={() => onResolve("harsh")}
        className="flex-1 font-bold"
        tooltip="Issue severe punishments to restore Association discipline"
        tooltipSide="top"
      >
        TAKE HARSH ACTION
      </Button>
      <Button
        variant="outline"
        onClick={() => onResolve("cover_up")}
        className="flex-1 font-semibold"
        tooltip="Attempt to suppress the scandal"
        tooltipSide="top"
      >
        COVER IT UP
      </Button>
    </DialogFooter>
  );
}
