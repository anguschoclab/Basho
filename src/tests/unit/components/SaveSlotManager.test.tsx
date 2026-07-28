/**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockImportSave = vi.fn();
const mockDeleteSave = vi.fn();
const mockToast = vi.fn();

vi.mock("@/presenters/uiDigest", () => ({
  importSave: (...args: unknown[]) => mockImportSave(...args),
  deleteSave: (...args: unknown[]) => mockDeleteSave(...args),
  BASHO_CALENDAR: {
    hatsu: { nameEn: "Hatsu Basho" },
    haru: { nameEn: "Haru Basho" },
    natsu: { nameEn: "Natsu Basho" },
    nagoya: { nameEn: "Nagoya Basho" },
    aki: { nameEn: "Aki Basho" },
    kyushu: { nameEn: "Kyushu Basho" },
  },
}));

vi.mock("@/engine/utils/formatters", () => ({
  formatSaveDate: () => "2025-01-01",
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { SaveSlotManager } from "@/components/menu/SaveSlotManager";
import type { SaveSlotInfo } from "@/engine/saveload";

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

function makeSlot(overrides: Partial<SaveSlotInfo> = {}): SaveSlotInfo {
  return {
    key: "basho_save_slot_1",
    slotName: "slot_1",
    year: 2025,
    bashoName: "hatsu",
    playerHeyaName: "Test Heya",
    savedAt: "2025-01-01T00:00:00Z",
    version: "1.0.0" as SaveSlotInfo["version"],
    isAutosave: false,
    ...overrides,
  };
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    getSaveSlots: vi.fn(() => [makeSlot()]),
    loadFromSlot: vi.fn(() => true),
    loadFromAutosave: vi.fn(),
    hasAutosave: vi.fn(() => false),
    onLoadSuccess: vi.fn(),
    loadWorldDirect: vi.fn(),
    createWorld: vi.fn(),
    hideArchiveButton: false,
    ...overrides,
  };
}

describe("SaveSlotManager", () => {
  beforeEach(() => {
    mockImportSave.mockReset();
    mockDeleteSave.mockReset();
    mockToast.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Resume Career when autosave exists", () => {
    renderWithProvider(<SaveSlotManager {...makeProps({ hasAutosave: vi.fn(() => true) })} />);
    expect(screen.getByText("Resume Career")).toBeTruthy();
  });

  it("renders Archive Management button", () => {
    renderWithProvider(<SaveSlotManager {...makeProps()} />);
    expect(screen.getByText("Archive Management")).toBeTruthy();
  });

  it("renders empty state message when no slots", () => {
    renderWithProvider(<SaveSlotManager {...makeProps({ getSaveSlots: vi.fn(() => []) })} />);
    // Need to open the dialog first
    fireEvent.click(screen.getByText("Archive Management"));
    expect(screen.getByText("No archival records detected.")).toBeTruthy();
  });

  it("getSaveSlots throws → renders empty without crash", () => {
    renderWithProvider(
      <SaveSlotManager {...makeProps({ getSaveSlots: vi.fn(() => { throw new Error("fail"); }) })} />
    );
    fireEvent.click(screen.getByText("Archive Management"));
    expect(screen.getByText("No archival records detected.")).toBeTruthy();
  });

  it("successful import with loadWorldDirect", async () => {
    const mockWorld = { seed: "s1", playerHeyaId: "h1" };
    mockImportSave.mockResolvedValue(mockWorld);
    const props = makeProps();
    renderWithProvider(<SaveSlotManager {...props} />);

    // Open dialog to access the file input
    fireEvent.click(screen.getByText("Archive Management"));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    Object.defineProperty(input, "files", {
      value: [new File(["{}"], "save.json")],
      writable: false,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(props.loadWorldDirect).toHaveBeenCalledWith(mockWorld);
      expect(props.onLoadSuccess).toHaveBeenCalled();
    });
    // Button text reverts after import completes
    await waitFor(() => {
      expect(screen.getByText("External Import")).toBeTruthy();
    });
  });

  it("successful import with createWorld fallback (no loadWorldDirect)", async () => {
    const mockWorld = { seed: "s1", playerHeyaId: "h1" };
    mockImportSave.mockResolvedValue(mockWorld);
    const props = makeProps({ loadWorldDirect: undefined });
    renderWithProvider(<SaveSlotManager {...props} />);

    fireEvent.click(screen.getByText("Archive Management"));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [new File(["{}"], "save.json")],
      writable: false,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(props.createWorld).toHaveBeenCalledWith("s1", "h1");
      expect(props.onLoadSuccess).toHaveBeenCalled();
    });
  });

  it("import failure shows toast with destructive variant", async () => {
    mockImportSave.mockRejectedValue(new Error("corrupt file"));
    const props = makeProps();
    renderWithProvider(<SaveSlotManager {...props} />);

    fireEvent.click(screen.getByText("Archive Management"));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [new File(["{}"], "save.json")],
      writable: false,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" })
      );
    });
    expect(props.onLoadSuccess).not.toHaveBeenCalled();
    // isImporting reset
    await waitFor(() => {
      expect(screen.getByText("External Import")).toBeTruthy();
    });
  });

  it("import returns null → no callback called, isImporting reset", async () => {
    mockImportSave.mockResolvedValue(null);
    const props = makeProps();
    renderWithProvider(<SaveSlotManager {...props} />);

    fireEvent.click(screen.getByText("Archive Management"));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [new File(["{}"], "save.json")],
      writable: false,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("External Import")).toBeTruthy();
    });
    expect(props.loadWorldDirect).not.toHaveBeenCalled();
    expect(props.createWorld).not.toHaveBeenCalled();
    expect(props.onLoadSuccess).not.toHaveBeenCalled();
  });

  it("no file selected → importSave not called", () => {
    const props = makeProps();
    renderWithProvider(<SaveSlotManager {...props} />);

    fireEvent.click(screen.getByText("Archive Management"));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Fire change with no files
    Object.defineProperty(input, "files", { value: [], writable: false });
    fireEvent.change(input);

    expect(mockImportSave).not.toHaveBeenCalled();
  });

  it("delete slot flow calls deleteSave and refreshes", async () => {
    const slots = [makeSlot({ slotName: "slot_1" })];
    const getSaveSlots = vi.fn(() => slots);
    renderWithProvider(<SaveSlotManager {...makeProps({ getSaveSlots })} />);

    // Open dialog
    fireEvent.click(screen.getByText("Archive Management"));

    // Click delete button (aria-label="Delete Slot 1")
    const deleteBtn = screen.getByLabelText("Delete Slot 1");
    fireEvent.click(deleteBtn);

    // Confirm dialog appears
    expect(screen.getByText("Delete save?")).toBeTruthy();

    // Click Delete in the AlertDialog
    const deleteAction = screen.getByText("Delete");
    fireEvent.click(deleteAction);

    expect(mockDeleteSave).toHaveBeenCalledWith("slot_1");
    // getSaveSlots called again for refresh (initial mount + refresh)
    await waitFor(() => {
      expect(getSaveSlots.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("Continue with autosave calls loadFromAutosave and onLoadSuccess", () => {
    const props = makeProps({ hasAutosave: vi.fn(() => true) });
    renderWithProvider(<SaveSlotManager {...props} />);
    fireEvent.click(screen.getByText("Resume Career"));
    expect(props.loadFromAutosave).toHaveBeenCalled();
    expect(props.onLoadSuccess).toHaveBeenCalled();
  });

  it("Continue with no autosave but slots exist opens dialog", () => {
    const props = makeProps({ hasAutosave: vi.fn(() => false) });
    renderWithProvider(<SaveSlotManager {...props} />);
    fireEvent.click(screen.getByText("Resume Career"));
    // Dialog should open showing slot list
    expect(screen.getByText("Career Archives")).toBeTruthy();
  });
});
