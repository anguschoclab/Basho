/**
 * SaveLoadDialogSections.tsx
 *
 * Sections of SaveLoadDialog — mode tabs, slot list, export/import
 * row, and the overwrite/delete confirmation dialogs.
 * (Slot row items live in ./SaveLoadDialogComponents.tsx.)
 */

import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { Save, FolderOpen, Download, Upload, HardDrive, Loader2 } from "lucide-react";
import { SaveSlotItem, EmptySlotItem } from "./SaveLoadDialogComponents";
import type { useSaveLoadState } from "@/hooks/useSaveLoadState";

type State = ReturnType<typeof useSaveLoadState>;

/** Save/Load mode toggle tabs. */
export function ModeTabs({ state }: { state: State }) {
  const activeCls = "bg-background text-foreground shadow-xs hover:bg-background";
  const idleCls = "text-muted-foreground hover:text-foreground hover:bg-transparent";
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      <TooltipWrap content="Switch to Save Mode: Create new save points" side="top">
        <Button
          variant="ghost"
          className={`flex-1 ${state.mode === "save" ? activeCls : idleCls}`}
          onClick={() => state.setMode("save")}
        >
          <Save className="h-3.5 w-3.5 inline mr-1.5" />
          Save
        </Button>
      </TooltipWrap>
      <TooltipWrap content="Switch to Load Mode: Restore previous save points" side="top">
        <Button
          variant="ghost"
          className={`flex-1 ${state.mode === "load" ? activeCls : idleCls}`}
          onClick={() => state.setMode("load")}
        >
          <FolderOpen className="h-3.5 w-3.5 inline mr-1.5" />
          Load
        </Button>
      </TooltipWrap>
    </div>
  );
}

/** Scrollable slot list (existing saves + empty slots in save mode). */
export function SlotList({ state }: { state: State }) {
  return (
    <ScrollArea className="max-h-[350px]">
      <div className="space-y-1.5">
        {/* Existing saves */}
        {state.slots.map((slot) => (
          <SaveSlotItem
            key={slot.key}
            slot={slot}
            mode={state.mode}
            onLoad={state.handleLoad}
            onSave={state.handleSave}
            onDelete={state.handleDelete}
          />
        ))}

        {/* Empty slots (save mode only) */}
        {state.mode === "save" &&
          state.hasWorld &&
          state.emptySlots.map((slotName) => (
            <EmptySlotItem key={slotName} slotName={slotName} onSave={state.doSave} />
          ))}

        {state.mode === "load" && state.slots.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No saved games found.</p>
        )}
      </div>
    </ScrollArea>
  );
}

/** Export / Import file row. */
export function ExportImportRow({ state }: { state: State }) {
  return (
    <div className="flex gap-2">
      {state.hasWorld && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={state.handleExport}
          tooltip="Download current world state as a JSON file"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      )}
      <label className={state.isImporting ? "opacity-50 cursor-not-allowed" : ""}>
        <input
          type="file"
          accept=".json"
          className="sr-only peer"
          onChange={state.handleImport}
          disabled={state.isImporting}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
          asChild
          tooltip={
            state.isImporting ? "Importing save file..." : "Upload a previously exported save file"
          }
        >
          <span>
            {state.isImporting ? (
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
  );
}

/** Dialog content: header + mode tabs + slots + export/import. */
export function SaveLoadDialogContent({ state }: { state: State }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Save & Load
        </DialogTitle>
        <DialogDescription>Manage your game saves.</DialogDescription>
      </DialogHeader>

      <ModeTabs state={state} />
      <SlotList state={state} />

      <Separator />

      <ExportImportRow state={state} />
    </>
  );
}

/** Overwrite + delete confirmation dialogs. */
export function SaveLoadConfirmations({ state }: { state: State }) {
  return (
    <>
      {/* Overwrite confirmation */}
      <AlertDialog
        open={!!state.confirmOverwrite}
        onOpenChange={(o) => !o && state.setConfirmOverwrite(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite save?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the existing save in{" "}
              {state.confirmOverwrite?.replace("slot_", "Slot ")}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => state.confirmOverwrite && state.doSave(state.confirmOverwrite)}
            >
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!state.confirmDelete}
        onOpenChange={(o) => !o && state.setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete save?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {state.confirmDelete?.replace("slot_", "Slot ")}. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => state.confirmDelete && state.doDelete(state.confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
