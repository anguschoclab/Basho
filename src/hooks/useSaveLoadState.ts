/**
 * useSaveLoadState.ts
 *
 * SaveLoadDialog state — slot list refresh, save/load/delete/export/
 * import handlers, and the global keyboard-open signal.
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { useToast } from "@/hooks/use-toast";
import type { SaveSlotInfo } from "@/presenters/engineAccess";
import { deleteSave, exportSave, importSave } from "@/presenters/engineAccess";
import { openListeners } from "@/components/game/saveLoadDialogSignal";

/** Slot save/load/delete actions with overwrite+delete confirmation state. */
function useSlotActions(
  refreshSlots: () => void,
  setOpen: (open: boolean) => void,
  slots: SaveSlotInfo[]
) {
  const { saveToSlot, loadFromSlot } = useGame();
  const { toast } = useToast();
  const [confirmOverwrite, setConfirmOverwrite] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
    [loadFromSlot, setOpen, toast]
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

  return {
    confirmOverwrite,
    setConfirmOverwrite,
    confirmDelete,
    setConfirmDelete,
    doSave,
    handleSave,
    handleLoad,
    handleDelete,
    doDelete,
  };
}

/** Export/import file actions. */
function useTransferActions(setOpen: (open: boolean) => void) {
  const { state, updateWorld } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

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
        // Mirror loadFromSlot: push the imported world into the worker too —
        // updateWorld alone never syncs, so the next tick's WORLD_UPDATED
        // would silently revert the import while autosave persisted it.
        sendCommand({ type: "LOAD_WORLD", world });
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

  return { isImporting, hasWorld: !!state.world, handleExport, handleImport };
}

export function useSaveLoadState() {
  const { getSaveSlots } = useGame();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"save" | "load">("save");
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);

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

  const slotActions = useSlotActions(refreshSlots, setOpen, slots);
  const transferActions = useTransferActions(setOpen);

  return {
    open,
    handleOpen,
    mode,
    setMode,
    slots,
    emptySlots,
    ...slotActions,
    ...transferActions,
  };
}
