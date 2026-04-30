/**
 * CrisisModal.tsx
 * ================
 * A full-screen interrupt for major events requiring player intervention.
 * Wired to digest events and welfare state for comprehensive crisis detection.
 */

import React, { useState, useMemo } from "react";
import { useGameStore } from "../../store/gameStore";
import { useGame } from "../../contexts/GameContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { TooltipWrap } from "../ui/tooltip-wrap";
import { AlertCircle, ShieldAlert } from "lucide-react";

export function CrisisModal() {
  const digest = useGameStore((state) => state.digest);
  const sendCommand = useGameStore((state) => state.sendCommand);
  const { state } = useGame();
  const world = state.world;
  const [isOpen, setIsOpen] = useState(false);

  // Get player heya welfare state
  const playerHeyaId = world?.playerHeyaId;
  const playerHeya = playerHeyaId ? world?.heyas.get(playerHeyaId) : null;
  const welfareState = playerHeya?.welfareState;

  // Check for welfare crisis (investigation, sanctioned, high risk)
  const welfareCrisis = useMemo(() => {
    if (!welfareState) return null;

    if (welfareState.complianceState === "sanctioned") {
      return {
        title: "Welfare Sanction",
        detail: `Your stable is under official sanctions. Risk level: ${welfareState.welfareRisk}%`,
        type: "welfare_sanction",
      };
    }
    if (welfareState.complianceState === "investigation" && welfareState.welfareRisk > 75) {
      return {
        title: "Welfare Investigation",
        detail: `Active investigation with critical risk level: ${welfareState.welfareRisk}%`,
        type: "welfare_investigation",
      };
    }
    return null;
  }, [welfareState]);

  // Check for crisis in digest
  const digestCrisis = digest?.sections
    ?.find((s) => s.id === "governance" || s.id === "media")
    ?.items?.find((i) => i.kind === "generic" && i.title.toLowerCase().includes("crisis"));

  // Combine both crisis sources
  const crisis = useMemo(() => {
    if (world?.pendingCrisis) {
      return {
        id: world.pendingCrisis.id,
        title: world.pendingCrisis.title,
        detail: world.pendingCrisis.description,
        type: "pending_crisis",
        options: world.pendingCrisis.options,
      };
    }
    if (welfareCrisis) return { ...welfareCrisis, id: "welfare_crisis" };
    if (digestCrisis) {
      return {
        id: "digest_crisis",
        title: digestCrisis.title,
        detail: digestCrisis.detail || "",
        type: "digest_crisis",
      };
    }
    return null;
  }, [world?.pendingCrisis, welfareCrisis, digestCrisis]);

  // Logic to auto-open if a crisis is detected
  React.useEffect(() => {
    if (crisis) {
      setIsOpen(true);
    }
  }, [crisis]);

  if (!crisis || !isOpen) return null;

  const handleResolve = (choiceId: string) => {
    if (!crisis.id) return;
    sendCommand({
      type: "RESOLVE_CRISIS",
      crisisId: crisis.id,
      choice: choiceId,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
          <div className="flex flex-col gap-2 mt-6">
            {crisis.options.map((opt: any) => (
              <Button
                key={opt.id}
                variant={
                  opt.id === "harsh" || opt.id.includes("suspend") ? "destructive" : "outline"
                }
                onClick={() => handleResolve(opt.id)}
                className="w-full font-bold uppercase tracking-tight"
                tooltip={opt.description}
                tooltipSide="right"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        {!crisis.options && (
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
            <Button
              variant="destructive"
              onClick={() => handleResolve("harsh")}
              className="flex-1 font-bold"
              tooltip="Issue severe punishments to restore Association discipline"
              tooltipSide="top"
            >
              TAKE HARSH ACTION
            </Button>
            <Button
              variant="outline"
              onClick={() => handleResolve("cover_up")}
              className="flex-1 font-semibold"
              tooltip="Attempt to suppress the scandal"
              tooltipSide="top"
            >
              COVER IT UP
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
