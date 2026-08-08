import { useState, useEffect } from "react";
import type { SaveSlotInfo } from "@/engine/saveload";
import type { BashoName } from "@/engine/types/basho";
import { BASHO_CALENDAR, deleteSave, importSave } from "@/presenters/uiDigest";
import { toast } from "@/hooks/use-toast";

interface UseSaveSlotManagerProps {
  getSaveSlots: () => SaveSlotInfo[];
  loadFromSlot: (slotName: string) => boolean;
  loadFromAutosave: () => void;
  hasAutosave: () => boolean;
  onLoadSuccess: () => void;
  loadWorldDirect?: (world: unknown) => void;
  createWorld?: (seed: string, playerHeyaId?: string) => void;
}

export function useSaveSlotManager({
  getSaveSlots,
  loadFromSlot,
  loadFromAutosave,
  hasAutosave,
  onLoadSuccess,
  loadWorldDirect,
  createWorld,
}: UseSaveSlotManagerProps) {
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refreshSlots = () => {
    try {
      if (typeof getSaveSlots === "function") setSaveSlots(getSaveSlots());
      else setSaveSlots([]);
    } catch {
      setSaveSlots([]);
    }
  };

  useEffect(() => {
    refreshSlots();
  }, [getSaveSlots]);

  const canContinue = hasAutosave() || saveSlots.length > 0;

  const handleContinue = () => {
    if (hasAutosave()) {
      loadFromAutosave();
      onLoadSuccess();
      return;
    }
    if (saveSlots.length > 0) setShowLoadDialog(true);
  };

  const handleLoadSlot = (slotName: string) => {
    if (loadFromSlot(slotName)) {
      setShowLoadDialog(false);
      onLoadSuccess();
    }
  };

  const handleDeleteSlot = (slotName: string) => {
    setConfirmDelete(slotName);
  };

  const handleImportSave = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedWorld = await importSave(file);
      if (importedWorld) {
        if (typeof loadWorldDirect === "function") {
          loadWorldDirect(importedWorld);
        } else if (typeof createWorld === "function") {
          createWorld(importedWorld.seed, importedWorld.playerHeyaId);
        }
        onLoadSuccess();
      }
    } catch (err) {
      toast({
        title: "Import Failed",
        description: err instanceof Error ? err.message : "Could not import save file.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const getBashoDisplay = (bashoName?: BashoName) => {
    if (!bashoName) return "";
    const info = BASHO_CALENDAR[bashoName];
    return info ? `${info.nameEn}` : String(bashoName);
  };

  const confirmDeleteAction = () => {
    if (confirmDelete) {
      deleteSave(confirmDelete);
      refreshSlots();
      setConfirmDelete(null);
    }
  };

  return {
    showLoadDialog,
    setShowLoadDialog,
    saveSlots,
    isImporting,
    confirmDelete,
    setConfirmDelete,
    canContinue,
    handleContinue,
    handleLoadSlot,
    handleDeleteSlot,
    handleImportSave,
    getBashoDisplay,
    confirmDeleteAction,
  };
}
