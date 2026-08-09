/**
 * SaveLoadDialogComponents.tsx
 *
 * Helper components for SaveLoadDialog.
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { formatSaveDate } from "@/presenters/engineAccess";
import { Save, Trash2, Clock } from "lucide-react";
import type { SaveSlotInfo } from "@/presenters/engineAccess";

export const SaveSlotItem = React.memo(
  ({
    slot,
    mode,
    onLoad,
    onSave,
    onDelete,
  }: {
    slot: SaveSlotInfo;
    mode: "save" | "load";
    onLoad: (slotName: string) => void;
    onSave: (slotName: string) => void;
    onDelete: (slotName: string) => void;
  }) => {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group">
        <TooltipWrap
          content={mode === "load" ? "Restore this game state" : "Overwrite this save slot"}
          side="left"
        >
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => (mode === "load" ? onLoad(slot.slotName) : onSave(slot.slotName))}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {slot.playerHeyaName || "Unknown"}
              </span>
              <Badge
                variant={slot.isAutosave ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0 shrink-0"
              >
                {slot.isAutosave ? "Auto" : slot.slotName.replace("slot_", "Slot ")}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>Y{slot.year}</span>
              {slot.bashoName && <span>• {slot.bashoName}</span>}
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {formatSaveDate(slot.savedAt)}
              </span>
            </div>
          </div>
        </TooltipWrap>

        {!slot.isAutosave && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0"
            onClick={() => onDelete(slot.slotName)}
            aria-label={`Delete ${slot.slotName.replace("slot_", "Slot ")}`}
            tooltip={`Delete ${slot.slotName.replace("slot_", "Slot ")} permanently`}
            tooltipSide="left"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }
);

export const EmptySlotItem = React.memo(
  ({ slotName, onSave }: { slotName: string; onSave: (slotName: string) => void }) => {
    return (
      <TooltipWrap content="Save current progress to this empty slot" side="top">
        <div
          className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
          onClick={() => onSave(slotName)}
        >
          <Save className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {slotName.replace("slot_", "Slot ")} — Empty
          </span>
        </div>
      </TooltipWrap>
    );
  }
);
