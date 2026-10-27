import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ArchiveDialogContent } from "@/components/menu/SaveSlotManagerSections";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SaveSlotInfo } from "@/presenters/engineAccess";

function makeSlot(overrides: Partial<SaveSlotInfo> = {}): SaveSlotInfo {
  return {
    key: "slot_1",
    slotName: "slot_1",
    playerHeyaName: "Test Stable",
    year: 2026,
    savedAt: 1700000000000,
    ...overrides,
  } as SaveSlotInfo;
}

function renderArchive(
  saveSlots: SaveSlotInfo[],
  handlers: {
    onLoadSlot?: (s: string) => void;
    onDeleteSlot?: (s: string) => void;
  } = {}
) {
  return render(
    <TooltipProvider>
      <Dialog open>
        <DialogContent>
          <ArchiveDialogContent
            saveSlots={saveSlots}
            isImporting={false}
            onLoadSlot={handlers.onLoadSlot ?? vi.fn()}
            onDeleteSlot={handlers.onDeleteSlot ?? vi.fn()}
            onImportSave={vi.fn()}
            getBashoDisplay={(b) => b ?? ""}
          />
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

describe("ArchiveDialogContent", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders empty state when there are no saves", () => {
    renderArchive([]);
    expect(screen.getByText("No archival records detected")).toBeTruthy();
  });

  it("renders slot cards and calls onLoadSlot on click", () => {
    const onLoadSlot = vi.fn();
    renderArchive([makeSlot()], { onLoadSlot });
    fireEvent.click(screen.getByText("Test Stable"));
    expect(onLoadSlot).toHaveBeenCalledWith("slot_1");
  });

  it("calls onDeleteSlot via the delete button without triggering load", () => {
    const onLoadSlot = vi.fn();
    const onDeleteSlot = vi.fn();
    renderArchive([makeSlot()], { onLoadSlot, onDeleteSlot });
    fireEvent.click(screen.getByLabelText("Delete Slot 1"));
    expect(onDeleteSlot).toHaveBeenCalledWith("slot_1");
    expect(onLoadSlot).not.toHaveBeenCalled();
  });

  it("hides the delete button for the autosave slot", () => {
    renderArchive([makeSlot({ key: "autosave", slotName: "autosave" })]);
    expect(screen.queryByLabelText(/Delete/)).toBeNull();
    expect(screen.getByLabelText("Load autosave")).toBeTruthy();
  });
});
