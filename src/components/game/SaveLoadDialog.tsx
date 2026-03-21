// SaveLoadDialog.tsx — In-game save/load dialog with slot management
import { useState, useMemo, useEffect, useCallback } from "react";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/hooks/use-toast";
import { deleteSave, exportSave, importSave, type SaveSlotInfo } from "@/engine/saveload";
import { formatSaveDate } from "@/engine/utils/formatters";

// Global open signal for keyboard shortcut integration
const openListeners = new Set<() => void>();
/** Open save load dialog. */
export function openSaveLoadDialog() {
  openListeners.forEach((fn) => fn());
}
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  Clock,
  HardDrive,
} from "lucide-react";

/**
 * Format save date.
 *  * @param iso - The Iso.

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

  const refreshSlots = useCallback(() => setSlots(getSaveSlots()), [getSaveSlots]);

  const handleOpen = (newOpen: boolean) => {
    if (newOpen) refreshSlots();
    setOpen(newOpen);
  };

  // Listen for global open signal (keyboard shortcut)
  useEffect(() => {
    const handler = () => { refreshSlots(); setOpen(true); };
    openListeners.add(handler);
    return () => { openListeners.delete(handler); };
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

  const handleSave = (slotName: string) => {
    // Check if slot exists for overwrite confirmation
    const existing = slots.find(s => s.slotName === slotName);
    if (existing && !existing.isAutosave) {
      setConfirmOverwrite(slotName);
      return;
    }
    doSave(slotName);
  };

  const doSave = (slotName: string) => {
    const ok = saveToSlot(slotName);
    if (ok) {
      toast({ title: "Game Saved", description: `Saved to ${slotName === "autosave" ? "Autosave" : slotName.replace("_", " ").toUpperCase()}.` });
      refreshSlots();
    } else {
      toast({ title: "Save Failed", description: "Could not save game.", variant: "destructive" });
    }
    setConfirmOverwrite(null);
  };

  const handleLoad = (slotName: string) => {
    const ok = loadFromSlot(slotName);
    if (ok) {
      toast({ title: "Game Loaded", description: `Loaded from ${slotName === "autosave" ? "Autosave" : slotName.replace("_", " ").toUpperCase()}.` });
      setOpen(false);
    } else {
      toast({ title: "Load Failed", description: "Could not load save.", variant: "destructive" });
    }
  };

  const handleDelete = (slotName: string) => {
    setConfirmDelete(slotName);
  };

  const doDelete = (slotName: string) => {
    deleteSave(slotName);
    toast({ title: "Save Deleted", description: `${slotName.replace("_", " ")} removed.` });
    refreshSlots();
    setConfirmDelete(null);
  };

  const handleExport = () => {
    if (state.world) {
      exportSave(state.world, undefined, new Date().toISOString());
      toast({ title: "Save Exported", description: "File downloaded." });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const world = await importSave(file);
    if (world) {
      updateWorld(world);
      toast({ title: "Save Imported", description: "World loaded from file." });
      setOpen(false);
    } else {
      toast({ title: "Import Failed", description: "Invalid save file.", variant: "destructive" });
    }
    e.target.value = "";
  };

  const hasWorld = !!state.world;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Save / Load" aria-label="Open save and load dialog">
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
            <button
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === "save" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("save")}
            >
              <Save className="h-3.5 w-3.5 inline mr-1.5" />
              Save
            </button>
            <button
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === "load" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("load")}
            >
              <FolderOpen className="h-3.5 w-3.5 inline mr-1.5" />
              Load
            </button>
          </div>

          <ScrollArea className="max-h-[350px]">
            <div className="space-y-1.5">
              {/* Existing saves */}
              {slots.map((slot) => (
                <div
                  key={slot.key}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group"
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => mode === "load" ? handleLoad(slot.slotName) : handleSave(slot.slotName)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {slot.playerHeyaName || "Unknown"}
                      </span>
                      <Badge variant={slot.isAutosave ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0">
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

                  {!slot.isAutosave && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleDelete(slot.slotName)}
                      aria-label={`Delete save slot ${slot.slotName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              {/* Empty slots (save mode only) */}
              {mode === "save" && hasWorld && emptySlots.map((slotName) => (
                <div
                  key={slotName}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => doSave(slotName)}
                >
                  <Save className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {slotName.replace("slot_", "Slot ")} — Empty
                  </span>
                </div>
              ))}

              {mode === "load" && slots.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No saved games found.</p>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Export / Import */}
          <div className="flex gap-2">
            {hasWorld && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            )}
            <label>
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <span>
                  <Upload className="h-3.5 w-3.5" /> Import
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
              This will replace the existing save in {confirmOverwrite?.replace("slot_", "Slot ")}. This cannot be undone.
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
              This will permanently delete {confirmDelete?.replace("slot_", "Slot ")}. This cannot be undone.
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
