// SaveLoadDialog.tsx — In-game save/load dialog with slot management
// Sections live in ./SaveLoadDialogSections.tsx; state in useSaveLoadState.
import React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HardDrive } from "lucide-react";
import { useSaveLoadState } from "@/hooks/useSaveLoadState";
import { SaveLoadDialogContent, SaveLoadConfirmations } from "./SaveLoadDialogSections";

/** Defines the structure for save load dialog props. */
interface SaveLoadDialogProps {
  trigger?: React.ReactNode;
}

/**
 * save load dialog.
 *  * @param { trigger } - The { trigger }.
 */
export function SaveLoadDialog({ trigger }: SaveLoadDialogProps) {
  const state = useSaveLoadState();

  return (
    <>
      <Dialog open={state.open} onOpenChange={state.handleOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Open save and load dialog"
              tooltip="Save / Load Game"
            >
              <HardDrive className="h-4 w-4" />
            </Button>
          )}
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <SaveLoadDialogContent state={state} />
        </DialogContent>
      </Dialog>

      <SaveLoadConfirmations state={state} />
    </>
  );
}
