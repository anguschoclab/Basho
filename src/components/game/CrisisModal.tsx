/**
 * CrisisModal.tsx
 * ================
 * A full-screen interrupt for major events requiring player intervention.
 * Wired to digest events and welfare state for comprehensive crisis detection.
 */

import { useGameStore } from "../../store/gameStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { decisionToastMessage } from "./decisionFeedback";
import { useCrisisDetection } from "@/hooks/useCrisisDetection";
import { CrisisOptionButtons, CrisisFallbackActions } from "./CrisisModalSections";

export function CrisisModal() {
  const sendCommand = useGameStore((state) => state.sendCommand);
  const { world, crisis, isWorldBacked, open, setIsOpen } = useCrisisDetection();

  if (!crisis || !open) return null;

  const handleResolve = (choiceId: string, choiceLabel?: string) => {
    if (!crisis.id) return;
    const isWorldBacked = crisis.type === "loop_decision" || crisis.type === "pending_crisis";
    if (isWorldBacked) {
      // pendingCrisis may be a loop_decision; check the world state
      const isLoop = world?.pendingCrisis?.type === "loop_decision";
      if (isLoop) {
        sendCommand({
          type: "RESOLVE_LOOP_DECISION",
          decisionId: crisis.id,
          optionId: choiceId,
        });
        if (choiceLabel) toast.success(decisionToastMessage(choiceLabel));
      } else {
        sendCommand({
          type: "RESOLVE_CRISIS",
          crisisId: crisis.id,
          choice: choiceId as "standard" | "lenient" | "harsh" | "cover_up",
        });
      }
      // Do NOT close optimistically: the world clears pendingCrisis on a
      // successful resolve, which closes the modal via `crisis` → null.
      // If the command was dropped (tick in progress) or failed, the
      // modal must stay open — otherwise a halted sim softlocks with no
      // way to re-attempt the resolution.
      return;
    }
    sendCommand({
      type: "RESOLVE_CRISIS",
      crisisId: crisis.id,
      choice: choiceId as "standard" | "lenient" | "harsh" | "cover_up",
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={isWorldBacked ? () => {} : setIsOpen}>
      <DialogContent className="max-w-md border-destructive/50">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <ShieldAlert className="w-6 h-6" />
            <span className="font-bold uppercase tracking-tighter">Emergency Protocol</span>
          </div>
          <DialogTitle className="text-2xl font-black">{crisis.title}</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-4">
            {crisis.detail}
          </DialogDescription>
        </DialogHeader>

        {crisis.options && crisis.options.length > 0 && (
          <CrisisOptionButtons options={crisis.options} onResolve={handleResolve} />
        )}

        {!crisis.options && <CrisisFallbackActions onResolve={handleResolve} />}
      </DialogContent>
    </Dialog>
  );
}
