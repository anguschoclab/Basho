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
    if (welfareCrisis) return welfareCrisis;
    if (digestCrisis) {
      return {
        title: digestCrisis.title,
        detail: digestCrisis.detail || "",
        type: "digest_crisis",
      };
    }
    return null;
  }, [welfareCrisis, digestCrisis]);

  // Logic to auto-open if a crisis is detected
  React.useEffect(() => {
    if (crisis) {
      setIsOpen(true);
    }
  }, [crisis]);

  if (!crisis || !isOpen) return null;

  const handleResolve = () => {
    sendCommand({ type: "OFFER_CONTRACT", rikishiId: "mock", heyaId: "mock" }); // Mock for resolve command
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

        <TooltipWrap
          content="Long-term consequences for your stable's growth and political capital"
          side="top"
        >
          <div className="bg-destructive/5 p-4 rounded border border-destructive/10 text-sm mt-4 cursor-help">
            <p className="font-semibold text-destructive mb-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Strategic Impact
            </p>
            <p className="text-muted-foreground/80 lowercase italic">
              This event will permanently affect your stable's reputation and koenkai support.
            </p>
          </div>
        </TooltipWrap>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
          <Button
            variant="destructive"
            onClick={() => handleResolve()}
            className="flex-1 font-bold"
            tooltip="Issue severe punishments to restore Association discipline (Reputation Down, Compliance Up)"
            tooltipSide="top"
          >
            TAKE HARSH ACTION
          </Button>
          <Button
            variant="outline"
            onClick={() => handleResolve()}
            className="flex-1 font-semibold"
            tooltip="Attempt to suppress the scandal (Reputation Neutral, Compliance Down, Risk Up)"
            tooltipSide="top"
          >
            COVER IT UP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
