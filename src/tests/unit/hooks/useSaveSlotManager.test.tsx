import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaveSlotManager } from "@/hooks/useSaveSlotManager";
import type { SaveSlotInfo } from "@/engine/saveload";

vi.mock("@/presenters/uiDigest", () => ({
  BASHO_CALENDAR: {
    hatsu: { nameEn: "January" },
    haru: { nameEn: "March" },
  },
  deleteSave: vi.fn(),
  importSave: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

function makeSlot(overrides: Partial<SaveSlotInfo> = {}): SaveSlotInfo {
  return {
    key: "slot_1",
    slotName: "slot_1",
    playerHeyaName: "TestHeya",
    year: 2025,
    bashoName: "hatsu",
    savedAt: Date.now(),
    ...overrides,
  } as SaveSlotInfo;
}

function makeProps(overrides: Partial<any> = {}) {
  const getSaveSlots = vi.fn(() => [makeSlot()]);
  const loadFromSlot = vi.fn(() => true);
  const loadFromAutosave = vi.fn();
  const hasAutosave = vi.fn(() => false);
  const onLoadSuccess = vi.fn();
  return {
    getSaveSlots,
    loadFromSlot,
    loadFromAutosave,
    hasAutosave,
    onLoadSuccess,
    ...overrides,
  };
}

describe("useSaveSlotManager", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with empty saveSlots and refreshes from getSaveSlots", () => {
    const props = makeProps();
    const { result } = renderHook(() => useSaveSlotManager(props));
    expect(result.current.saveSlots).toHaveLength(1);
    expect(result.current.saveSlots[0].slotName).toBe("slot_1");
  });

  it("canContinue is true when hasAutosave returns true", () => {
    const props = makeProps({ hasAutosave: vi.fn(() => true) });
    const { result } = renderHook(() => useSaveSlotManager(props));
    expect(result.current.canContinue).toBe(true);
  });

  it("canContinue is true when saveSlots exist", () => {
    const props = makeProps();
    const { result } = renderHook(() => useSaveSlotManager(props));
    expect(result.current.canContinue).toBe(true);
  });

  it("canContinue is false when no autosave and no slots", () => {
    const props = makeProps({
      getSaveSlots: vi.fn(() => []),
      hasAutosave: vi.fn(() => false),
    });
    const { result } = renderHook(() => useSaveSlotManager(props));
    expect(result.current.canContinue).toBe(false);
  });

  it("handleContinue calls loadFromAutosave when autosave exists", () => {
    const loadFromAutosave = vi.fn();
    const onLoadSuccess = vi.fn();
    const props = makeProps({
      loadFromAutosave,
      onLoadSuccess,
      hasAutosave: vi.fn(() => true),
    });
    const { result } = renderHook(() => useSaveSlotManager(props));
    act(() => result.current.handleContinue());
    expect(loadFromAutosave).toHaveBeenCalledTimes(1);
    expect(onLoadSuccess).toHaveBeenCalledTimes(1);
  });

  it("handleContinue opens dialog when slots exist but no autosave", () => {
    const props = makeProps();
    const { result } = renderHook(() => useSaveSlotManager(props));
    act(() => result.current.handleContinue());
    expect(result.current.showLoadDialog).toBe(true);
  });

  it("handleLoadSlot calls loadFromSlot and closes dialog on success", () => {
    const loadFromSlot = vi.fn(() => true);
    const onLoadSuccess = vi.fn();
    const props = makeProps({ loadFromSlot, onLoadSuccess });
    const { result } = renderHook(() => useSaveSlotManager(props));
    act(() => result.current.handleContinue());
    act(() => result.current.handleLoadSlot("slot_1"));
    expect(loadFromSlot).toHaveBeenCalledWith("slot_1");
    expect(onLoadSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.showLoadDialog).toBe(false);
  });

  it("handleLoadSlot does not close dialog on failure", () => {
    const loadFromSlot = vi.fn(() => false);
    const props = makeProps({ loadFromSlot });
    const { result } = renderHook(() => useSaveSlotManager(props));
    act(() => result.current.handleContinue());
    act(() => result.current.handleLoadSlot("slot_1"));
    expect(result.current.showLoadDialog).toBe(true);
  });

  it("handleDeleteSlot sets confirmDelete", () => {
    const props = makeProps();
    const { result } = renderHook(() => useSaveSlotManager(props));
    act(() => result.current.handleDeleteSlot("slot_1"));
    expect(result.current.confirmDelete).toBe("slot_1");
  });

  it("getBashoDisplay returns nameEn from BASHO_CALENDAR", () => {
    const props = makeProps();
    const { result } = renderHook(() => useSaveSlotManager(props));
    expect(result.current.getBashoDisplay("hatsu" as any)).toBe("January");
  });

  it("getBashoDisplay returns empty string for undefined", () => {
    const props = makeProps();
    const { result } = renderHook(() => useSaveSlotManager(props));
    expect(result.current.getBashoDisplay(undefined)).toBe("");
  });

  it("confirmDeleteAction calls deleteSave and clears confirmDelete", async () => {
    const { deleteSave } = await import("@/presenters/uiDigest");
    const props = makeProps();
    const { result } = renderHook(() => useSaveSlotManager(props));
    act(() => result.current.handleDeleteSlot("slot_1"));
    act(() => result.current.confirmDeleteAction());
    expect(deleteSave).toHaveBeenCalledWith("slot_1");
    expect(result.current.confirmDelete).toBeNull();
  });

  it("isImporting starts false", () => {
    const props = makeProps();
    const { result } = renderHook(() => useSaveSlotManager(props));
    expect(result.current.isImporting).toBe(false);
  });
});
