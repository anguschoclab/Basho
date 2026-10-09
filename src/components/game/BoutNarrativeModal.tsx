// BoutNarrativeModal.tsx — Polished bout detail modal with dramatic header,
// animated phase commentary, and immersive result display
// Sections live in ./BoutNarrativeModalSections.tsx; display constants in
// ./boutModalConstants.ts.

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { BoutResultDisplay } from "./BoutResultDisplay";
import type { UIRikishi } from "@/presenters/uiModels";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { PbpLine } from "@/presenters/engineAccess";
import { computeActiveLineIndices } from "./boutReplay/boutCanvas";
import type { BoutReplayProgress } from "./boutReplay/useBoutReplay";
import { BoutModalHeader, BoutModalTabs } from "./BoutNarrativeModalSections";

/** Defines the structure for bout narrative modal props. */
interface BoutNarrativeModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  east: UIRikishi;
  west: UIRikishi;
  result: BoutResult;
  bashoName?: BashoName;
  day?: number;
  autoPlay?: boolean;
  gyojiName?: string;
  gyojiAccuracy?: number;
  /** Observed share of this kimarite this era (0–100). Omit when no stats exist. */
  kimariteObservedPct?: number;
}

/**
 * bout narrative modal.
 *  * @param {
 *   open,
 *   onOpenChange,
 *   east,
 *   west,
 *   result,
 *   bashoName,
 *   day,
 * } - The {
 *   open,
 *   on open change,
 *   east,
 *   west,
 *   result,
 *   basho name,
 *   day,
 * }.
 */
export function BoutNarrativeModal({
  open,
  onOpenChange,
  onClose,
  east,
  west,
  result,
  autoPlay = true,
  gyojiName,
  gyojiAccuracy,
  kimariteObservedPct,
}: BoutNarrativeModalProps) {
  const handleClose = onClose ?? (() => onOpenChange?.(false));
  const pbpLines: PbpLine[] = useMemo(() => result.pbpLines ?? [], [result.pbpLines]);
  const narrativeLines = pbpLines.filter((l) =>
    [
      "opening",
      "pre_bout",
      "entrance",
      "ritual",
      "finish",
      "post_bout",
      "replay",
      "interview",
      "mono_ii",
      "award",
      "ceremony",
      "closing",
    ].includes(l.phase ?? "")
  );

  const [replayKey, setReplayKey] = useState(0);
  const [activeTab, setActiveTab] = useState("commentary");
  const [animProgress, setAnimProgress] = useState<BoutReplayProgress | null>(null);

  const activeLineIndices = useMemo(
    () =>
      animProgress
        ? computeActiveLineIndices(animProgress.phaseIndex, pbpLines)
        : new Set<number>(),
    [animProgress, pbpLines]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) handleClose();
        onOpenChange?.(open);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 gap-0 overflow-hidden bg-card border-border/50">
        <DialogHeader className="sr-only">
          <DialogTitle>Bout Narrative</DialogTitle>
        </DialogHeader>

        <BoutModalHeader
          result={result}
          east={east}
          west={west}
          autoPlay={autoPlay}
          gyojiName={gyojiName}
          gyojiAccuracy={gyojiAccuracy}
          replayKey={replayKey}
          onReplay={() => setReplayKey((k) => k + 1)}
          onProgressUpdate={setAnimProgress}
        />

        {/* ═══ Body ═══ */}
        <ScrollArea className="h-full max-h-[400px]">
          <div className="p-6 space-y-5">
            {/* Result card */}
            <BoutResultDisplay
              result={result}
              eastRikishi={east}
              westRikishi={west}
              className="border shadow-none"
              kimariteObservedPct={kimariteObservedPct}
            />

            <Separator />

            <BoutModalTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              pbpLines={pbpLines}
              narrativeLines={narrativeLines}
              result={result}
              activeLineIndices={activeLineIndices}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
