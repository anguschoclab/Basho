// SaveLoadDialog.tsx — In-game save/load dialog with slot management
/* eslint-disable react-refresh/only-export-components */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/hooks/use-toast";
import type { SaveSlotInfo } from "@/engine/saveload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { deleteSave, exportSave, importSave } from "@/engine/saveload";
import { Save, FolderOpen, Download, Upload, HardDrive, Loader2 } from "lucide-react";
import { SaveSlotItem, EmptySlotItem } from "./SaveLoadDialogComponents";

// Global open signal for keyboard shortcut integration
const openListeners = new Set<() => void>();
/** Open save load dialog. */
export function openSaveLoadDialog() {
  openListeners.forEach((fn) => fn());
}

/** Defines the structure for save load dialog props. */
interface SaveLoadDialogProps {
  trigger?: React.ReactNode;
}

/**
 * save load dialog.
 *  * @param { trigger } - The { trigger }.
 */
export function SaveLoadDialog({ trigger }: SaveLoadDialogProps) {
  const { state, saveToSlot, loadFromSlot, getSaveSlots, updateWorld } = useGame();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"save" | "load">("save");
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [confirmOverwrite, setConfirmOverwrite] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const refreshSlots = useCallback(() => setSlots(getSaveSlots()), [getSaveSlots]);

  const handleOpen = (newOpen: boolean) => {
    if (newOpen) refreshSlots();
    setOpen(newOpen);
  };

  // Listen for global open signal (keyboard shortcut)
  useEffect(() => {
    const handler = () => {
      refreshSlots();
      setOpen(true);
    };
    openListeners.add(handler);
    return () => {
      openListeners.delete(handler);
    };
  }, [refreshSlots]);

  const emptySlots = useMemo(() => {
    const used = slots.reduce((acc, s) => {
      if (/^slot_\d+$/.test(s.slotName)) acc.add(s.slotName);
      return acc;
    }, new Set<string>());
    const empty: string[] = [];
    for (let i = 1; i <= 10; i++) {
      if (!used.has(`slot_${i}`)) empty.push(`slot_${i}`);
    }
    return empty;
  }, [slots]);

  const doSave = useCallback(
    (slotName: string) => {
      const ok = saveToSlot(slotName);
      if (ok) {
        toast({
          title: "Game Saved",
          description: `Saved to ${slotName === "autosave" ? "Autosave" : slotName.replace("_", " ").toUpperCase()}.`,
        });
        refreshSlots();
      } else {
        toast({
          title: "Save Failed",
          description: "Could not save game.",
          variant: "destructive",
        });
      }
      setConfirmOverwrite(null);
    },
    [saveToSlot, refreshSlots, toast]
  );

  const handleSave = useCallback(
    (slotName: string) => {
      // Check if slot exists for overwrite confirmation
      const existing = slots.find((s) => s.slotName === slotName);
      if (existing && !existing.isAutosave) {
        setConfirmOverwrite(slotName);
        return;
      }
      doSave(slotName);
    },
    [slots, doSave]
  );

  const handleLoad = useCallback(
    (slotName: string) => {
      const ok = loadFromSlot(slotName);
      if (ok) {
        toast({
          title: "Game Loaded",
          description: `Loaded from ${slotName === "autosave" ? "Autosave" : slotName.replace("_", " ").toUpperCase()}.`,
        });
        setOpen(false);
      } else {
        toast({
          title: "Load Failed",
          description: "Could not load save.",
          variant: "destructive",
        });
      }
    },
    [loadFromSlot, toast]
  );

  const handleDelete = useCallback((slotName: string) => {
    setConfirmDelete(slotName);
  }, []);

  const doDelete = useCallback(
    (slotName: string) => {
      deleteSave(slotName);
      toast({
        title: "Save Deleted",
        description: `${slotName.replace("_", " ")} removed.`,
      });
      refreshSlots();
      setConfirmDelete(null);
    },
    [refreshSlots, toast]
  );

  const handleExport = () => {
    if (state.world) {
      const { json, filename } = exportSave(state.world, "Manual Save", new Date().toISOString());
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Save Exported", description: "File downloaded." });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const world = await importSave(file);
      if (world) {
        updateWorld(world);
        toast({
          title: "Save Imported",
          description: "World loaded from file.",
        });
        setOpen(false);
      } else {
        toast({
          title: "Import Failed",
          description: "Invalid save file.",
          variant: "destructive",
        });
      }
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const hasWorld = !!state.world;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Save & Load
            </DialogTitle>
            <DialogDescription>Manage your game saves.</DialogDescription>
          </DialogHeader>

          {/* Mode tabs */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <TooltipWrap content="Switch to Save Mode: Create new save points" side="top">
              <Button
                variant="ghost"
                className={`flex-1 ${mode === "save" ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-transparent"}`}
                onClick={() => setMode("save")}
              >
                <Save className="h-3.5 w-3.5 inline mr-1.5" />
                Save
              </Button>
            </TooltipWrap>
            <TooltipWrap content="Switch to Load Mode: Restore previous save points" side="top">
              <Button
                variant="ghost"
                className={`flex-1 ${mode === "load" ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-transparent"}`}
                onClick={() => setMode("load")}
              >
                <FolderOpen className="h-3.5 w-3.5 inline mr-1.5" />
                Load
              </Button>
            </TooltipWrap>
          </div>

          <ScrollArea className="max-h-[350px]">
            <div className="space-y-1.5">
              {/* Existing saves */}
              {slots.map((slot) => (
                <SaveSlotItem
                  key={slot.key}
                  slot={slot}
                  mode={mode}
                  onLoad={handleLoad}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              ))}

              {/* Empty slots (save mode only) */}
              {mode === "save" &&
                hasWorld &&
                emptySlots.map((slotName) => (
                  <EmptySlotItem key={slotName} slotName={slotName} onSave={doSave} />
                ))}

              {mode === "load" && slots.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No saved games found.
                </p>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Export / Import */}
          <div className="flex gap-2">
            {hasWorld && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleExport}
                tooltip="Download current world state as a JSON file"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            )}
            <label
              className={isImporting ? "opacity-50 cursor-not-allowed" : ""}
            >
              <input
                type="file"
                accept=".json"
                className="sr-only peer"
                onChange={handleImport}
                disabled={isImporting}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                asChild
                tooltip={
                  isImporting ? "Importing save file..." : "Upload a previously exported save file"
                }
              >
                <span>
                  {isImporting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" /> Import
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>
        </DialogContent>
      </Dialog>

      {/* Overwrite confirmation */}
      <AlertDialog open={!!confirmOverwrite} onOpenChange={(o) => !o && setConfirmOverwrite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite save?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the existing save in {confirmOverwrite?.replace("slot_", "Slot ")}.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmOverwrite && doSave(confirmOverwrite)}>
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete save?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {confirmDelete?.replace("slot_", "Slot ")}. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && doDelete(confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
